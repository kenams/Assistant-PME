const crypto = require("crypto");
const { db } = require("../config/db");
const { tokenize, chunkText, normalizeText } = require("../utils/text");

function normalizeProcedureContent(title, content) {
  const text = (content || "").trim();
  if (!text) {
    return "";
  }
  const hasSections =
    /symptomes?:/i.test(text) ||
    /diagnostic:/i.test(text) ||
    /resolution:/i.test(text) ||
    /escalade:/i.test(text);
  if (hasSections) {
    return text;
  }
  const fallbackTitle = title ? `Probleme: ${title}` : "Probleme";
  return [
    `Symptomes: ${fallbackTitle}`,
    "Diagnostic: Identifier le contexte (poste impacte, message d'erreur, date de debut).",
    "Resolution: " + text,
    "Escalade: Si le probleme persiste apres 2 tentatives, creer un ticket."
  ].join("\n");
}

async function ingestDocument({ tenantId, title, sourceType, sourceUrl, content }) {
  const documentId = crypto.randomUUID();
  const now = new Date().toISOString();

  const normalizedContent =
    sourceType === "procedure"
      ? normalizeProcedureContent(title, content)
      : content || "";

  const document = {
    id: documentId,
    tenant_id: tenantId,
    title,
    source_type: sourceType,
    source_url: sourceUrl || null,
    created_at: now
  };

  await db("kb_documents").insert(document);

  const chunks = chunkText(normalizedContent, 800);
  if (chunks.length > 0) {
    const chunkRows = chunks.map((chunk) => ({
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      document_id: documentId,
      chunk_text: chunk,
      created_at: now
    }));
    await db("kb_chunks").insert(chunkRows);
  }

  return { ...document, chunk_count: chunks.length };
}

async function ensureProcedureForQuickIssue({ tenantId, issue, threshold }) {
  if (!issue || !issue.key || !tenantId) return null;
  const requiredCount = Number(threshold || 0);
  if (Number.isNaN(requiredCount) || requiredCount <= 0) return null;
  if ((issue.count || 0) < requiredCount) return null;

  const marker = `auto:quick_issue:${issue.key}`;
  const existing = await db("kb_documents")
    .where({ tenant_id: tenantId, source_url: marker })
    .first();
  if (existing) return null;

  const title = `Procedure - ${issue.label || issue.key}`;
  const content = [
    `Symptomes: ${issue.example || issue.label || issue.key}`,
    "Diagnostic: Identifier l'impact, le poste, et le message d'erreur.",
    "Resolution: Verifier les prerequis, redemarrer, et appliquer la procedure interne.",
    "Escalade: Si le probleme persiste apres 2 tentatives, creer un ticket."
  ].join("\n");

  return ingestDocument({
    tenantId,
    title,
    sourceType: "procedure",
    sourceUrl: marker,
    content
  });
}

async function searchKb({ tenantId, query }) {
  const tokens = tokenize(query || "");
  if (tokens.length === 0) return [];

  const phrase = normalizeText(query || "");

  const chunks = await db("kb_chunks").where({ tenant_id: tenantId });
  const docs = await db("kb_documents").where({ tenant_id: tenantId });
  const docsMap = new Map(docs.map((d) => [d.id, d]));

  const results = chunks
    .map((chunk) => {
      const text = normalizeText(chunk.chunk_text);
      const doc = docsMap.get(chunk.document_id);
      const titleText = normalizeText(doc ? doc.title : "");
      let score = 0;
      tokens.forEach((token) => {
        if (text.includes(token)) score += 1;
        if (titleText && titleText.includes(token)) score += 2;
      });
      if (phrase && phrase.length > 6 && text.includes(phrase)) {
        score += 3;
      }
      return { ...chunk, score };
    })
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return results.map((chunk) => {
    const doc = docsMap.get(chunk.document_id);
    return {
      id: chunk.id,
      document_id: chunk.document_id,
      document_title: doc ? doc.title : "",
      chunk_text: chunk.chunk_text,
      snippet: chunk.chunk_text.slice(0, 240),
      score: chunk.score
    };
  });
}

async function listDocuments({ tenantId }) {
  const docs = await db("kb_documents").where({ tenant_id: tenantId });
  const chunks = await db("kb_chunks").where({ tenant_id: tenantId }).select("document_id");

  const countMap = new Map();
  chunks.forEach((c) => {
    countMap.set(c.document_id, (countMap.get(c.document_id) || 0) + 1);
  });

  return docs.map((doc) => ({
    ...doc,
    chunk_count: countMap.get(doc.id) || 0
  }));
}

async function deleteDocument({ tenantId, documentId }) {
  const deleted = await db("kb_documents")
    .where({ id: documentId, tenant_id: tenantId })
    .delete();
  // kb_chunks supprimés par CASCADE en DB, sinon manuellement:
  if (deleted === 0) return false;
  await db("kb_chunks").where({ document_id: documentId }).delete();
  return true;
}

module.exports = {
  ingestDocument,
  searchKb,
  listDocuments,
  deleteDocument,
  ensureProcedureForQuickIssue
};
