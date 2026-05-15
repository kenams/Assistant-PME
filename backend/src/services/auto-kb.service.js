const { env } = require("../config/env");
const { loadDb } = require("./store.service");
const { ingestDocument } = require("./rag.service");

const AUTO_KB_PREFIX = "auto-kb:";
const MAX_TICKETS_PER_RUN = 5;

function buildSourceUrl(ticketId) {
  return `${AUTO_KB_PREFIX}${ticketId}`;
}

function kbEntryExists({ tenantId, ticketId }) {
  const sourceUrl = buildSourceUrl(ticketId);
  return loadDb().kb_documents.some(
    (doc) => doc.tenant_id === tenantId && doc.source_url === sourceUrl
  );
}

async function callOpenAiForProcedure({ title, description }) {
  const apiKey = env.openaiApiKey;
  if (env.llmMode !== "openai" || !apiKey) {
    return null;
  }

  const model = env.openaiModel || "gpt-4o-mini";
  const baseUrl = env.openaiBaseUrl || "https://api.openai.com/v1";

  const prompt =
    `Voici un ticket IT résolu. Extrait une procédure de résolution courte et claire pour la base de connaissances:\n` +
    `Titre: ${title}\n` +
    `Description: ${description}\n\n` +
    `Réponds UNIQUEMENT avec:\n` +
    `Symptomes: ...\n` +
    `Diagnostic: ...\n` +
    `Résolution: ...\n` +
    `Escalade: ...`;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || null;
}

async function maybeGenerateKbFromTicket({ tenantId, ticket }) {
  if (!tenantId || !ticket || !ticket.id) return null;

  const description = (ticket.description || "").trim();
  if (description.length < 50) {
    return null;
  }

  if (kbEntryExists({ tenantId, ticketId: ticket.id })) {
    return null;
  }

  let content;
  try {
    content = await callOpenAiForProcedure({
      title: ticket.title || "",
      description
    });
  } catch (err) {
    console.error(`[auto-kb] OpenAI error for ticket ${ticket.id}:`, err.message);
    return null;
  }

  if (!content) {
    return null;
  }

  try {
    const doc = await ingestDocument({
      tenantId,
      title: `Procédure auto - ${ticket.title || ticket.id}`,
      sourceType: "procedure",
      sourceUrl: buildSourceUrl(ticket.id),
      content
    });
    console.log(`[auto-kb] KB entry created for ticket ${ticket.id} — doc ${doc.id} (${doc.chunk_count} chunk(s))`);
    return doc;
  } catch (err) {
    console.error(`[auto-kb] ingestDocument error for ticket ${ticket.id}:`, err.message);
    return null;
  }
}

async function runAutoKbForTenant({ tenantId }) {
  if (!tenantId) return;

  const db = loadDb();
  const resolved = db.tickets.filter(
    (t) =>
      t.tenant_id === tenantId &&
      (t.status === "resolved" || t.status === "closed") &&
      !kbEntryExists({ tenantId, ticketId: t.id })
  );

  const batch = resolved.slice(0, MAX_TICKETS_PER_RUN);
  if (batch.length === 0) {
    return;
  }

  console.log(`[auto-kb] Processing ${batch.length} ticket(s) for tenant ${tenantId}`);

  for (const ticket of batch) {
    await maybeGenerateKbFromTicket({ tenantId, ticket });
  }
}

module.exports = { maybeGenerateKbFromTicket, runAutoKbForTenant };
