const crypto = require("crypto");
const { withDb, loadDb } = require("./store.service");
const { tokenize, chunkText, normalizeText } = require("../utils/text");

async function ingestDocument({ tenantId, title, sourceType, sourceUrl, content }) {
  return withDb((db) => {
    const documentId = crypto.randomUUID();
    const document = {
      id: documentId,
      tenant_id: tenantId,
      title,
      source_type: sourceType,
      source_url: sourceUrl || null,
      created_at: new Date().toISOString()
    };
    db.kb_documents.push(document);

    const chunks = chunkText(content || "", 800);
    chunks.forEach((chunk) => {
      db.kb_chunks.push({
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        document_id: documentId,
        chunk_text: chunk,
        created_at: new Date().toISOString()
      });
    });

    return {
      ...document,
      chunk_count: chunks.length
    };
  });
}

async function searchKb({ tenantId, query }) {
  const tokens = tokenize(query || "");
  if (tokens.length === 0) {
    return [];
  }

  const db = loadDb();
  const phrase = normalizeText(query || "");
  const results = db.kb_chunks
    .filter((chunk) => chunk.tenant_id === tenantId)
    .map((chunk) => {
      const text = normalizeText(chunk.chunk_text);
      const doc = db.kb_documents.find((d) => d.id === chunk.document_id);
      const titleText = normalizeText(doc ? doc.title : "");
      let score = 0;
      tokens.forEach((token) => {
        if (text.includes(token)) {
          score += 1;
        }
        if (titleText && titleText.includes(token)) {
          score += 2;
        }
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
    const doc = db.kb_documents.find((d) => d.id === chunk.document_id);
    const snippet = chunk.chunk_text.slice(0, 240);
    return {
      id: chunk.id,
      document_id: chunk.document_id,
      document_title: doc ? doc.title : "",
      chunk_text: chunk.chunk_text,
      snippet,
      score: chunk.score
    };
  });
}

function listDocuments({ tenantId }) {
  const db = loadDb();
  return db.kb_documents
    .filter((doc) => doc.tenant_id === tenantId)
    .map((doc) => {
      const chunkCount = db.kb_chunks.filter(
        (chunk) => chunk.document_id === doc.id
      ).length;
      return { ...doc, chunk_count: chunkCount };
    });
}

function deleteDocument({ tenantId, documentId }) {
  return withDb((db) => {
    const index = db.kb_documents.findIndex(
      (doc) => doc.id === documentId && doc.tenant_id === tenantId
    );
    if (index === -1) {
      return false;
    }
    db.kb_documents.splice(index, 1);
    db.kb_chunks = db.kb_chunks.filter((chunk) => chunk.document_id !== documentId);
    return true;
  });
}

module.exports = { ingestDocument, searchKb, listDocuments, deleteDocument };
