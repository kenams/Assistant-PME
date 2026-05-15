const fs = require("fs");
const path = require("path");
const { env } = require("../config/env");
const { createSnapshot, withDb, loadDb } = require("./store.service");
const { listTenants } = require("./tenants.service");
const { ingestDocument } = require("./rag.service");

function startBackupScheduler() {
  const intervalMs = (env.backupIntervalHours || 6) * 60 * 60 * 1000;
  setInterval(() => {
    try {
      createSnapshot();
    } catch (err) {
      console.error("[scheduler:backup] erreur snapshot:", err.message);
    }
  }, intervalMs);
}

function closeStaleConversations() {
  const staleDays = env.staleConvDays || 7;
  const cutoff = Date.now() - staleDays * 24 * 60 * 60 * 1000;
  let closed = 0;
  withDb((db) => {
    (db.conversations || []).forEach((conv) => {
      if (conv.status !== "resolved") return;
      const updated = conv.updated_at ? new Date(conv.updated_at).getTime() : 0;
      if (updated < cutoff) {
        conv.status = "closed";
        conv.updated_at = new Date().toISOString();
        closed += 1;
      }
    });
  });
  if (closed > 0) {
    console.log(`[scheduler:cleanup] ${closed} conversations resolved → closed`);
  }
}

function deleteOldUploads() {
  const retentionDays = env.uploadRetentionDays || 30;
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const uploadDir = path.join(process.cwd(), "data", "uploads");
  if (!fs.existsSync(uploadDir)) return;
  let deleted = 0;
  try {
    const files = fs.readdirSync(uploadDir);
    files.forEach((file) => {
      const full = path.join(uploadDir, file);
      try {
        const stat = fs.statSync(full);
        if (stat.isFile() && stat.mtimeMs < cutoff) {
          fs.unlinkSync(full);
          deleted += 1;
        }
      } catch (err) {
        // ignore individual file errors
      }
    });
  } catch (err) {
    console.error("[scheduler:cleanup] erreur lecture uploads:", err.message);
  }
  if (deleted > 0) {
    console.log(`[scheduler:cleanup] ${deleted} uploads supprimés (>${retentionDays}j)`);
  }
}

function startStaleCleanupScheduler() {
  const intervalMs = 24 * 60 * 60 * 1000;
  setInterval(() => {
    try {
      closeStaleConversations();
      deleteOldUploads();
    } catch (err) {
      console.error("[scheduler:cleanup] erreur:", err.message);
    }
  }, intervalMs);
}

async function generateKbForResolvedTickets() {
  if (!env.autoKbEnabled) return;
  const db = loadDb();
  const resolved = (db.tickets || []).filter((t) => t.status === "resolved");
  const existingTitles = new Set((db.kb_documents || []).map((d) => d.title));
  const tenants = listTenants();
  const tenantMap = {};
  tenants.forEach((t) => { tenantMap[t.id] = t; });

  let generated = 0;

  for (const ticket of resolved) {
    if (!ticket.title || !ticket.summary) continue;
    const kbTitle = `[Auto] ${ticket.title}`;
    if (existingTitles.has(kbTitle)) continue;

    const tenantId = ticket.tenant_id;
    if (!tenantId) continue;

    let procedure = null;

    if (env.llmMode === "openai" && env.openaiApiKey) {
      try {
        const { answerWithLLM } = require("./openai.service");
        const result = await answerWithLLM({
          message: `Génère une procédure de résolution courte et actionnable pour ce problème IT résolu : "${ticket.title}". Contexte : ${ticket.summary}`,
          kbChunks: [],
          language: "fr",
          orgSettings: null,
          conversationHistory: [],
          userPastTickets: []
        });
        procedure = result.answer || null;
      } catch (err) {
        procedure = null;
      }
    }

    if (!procedure) {
      procedure = `Problème : ${ticket.title}\n\nContexte : ${ticket.summary}\n\nCe ticket a été résolu. Consultez l'historique pour les étapes de résolution.`;
    }

    try {
      await ingestDocument({
        tenantId,
        title: kbTitle,
        sourceType: "auto_kb",
        sourceUrl: null,
        content: procedure
      });
      existingTitles.add(kbTitle);
      generated += 1;
    } catch (err) {
      console.error(`[scheduler:auto_kb] erreur ingestion ticket ${ticket.id}:`, err.message);
    }
  }

  if (generated > 0) {
    console.log(`[scheduler:auto_kb] ${generated} entrées KB générées depuis tickets résolus`);
  }
}

function startAutoKbScheduler() {
  if (!env.autoKbEnabled) return;
  const intervalMs = 2 * 60 * 60 * 1000;
  setInterval(() => {
    generateKbForResolvedTickets().catch((err) => {
      console.error("[scheduler:auto_kb] erreur:", err.message);
    });
  }, intervalMs);
}

function startAllSchedulers() {
  startBackupScheduler();
  startStaleCleanupScheduler();
  startAutoKbScheduler();
}

module.exports = {
  startBackupScheduler,
  startStaleCleanupScheduler,
  startAutoKbScheduler,
  startAllSchedulers
};
