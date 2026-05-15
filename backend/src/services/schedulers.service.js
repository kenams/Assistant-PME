const fs = require("fs");
const path = require("path");
const { env } = require("../config/env");
const { db } = require("../config/db");
const { listTenants } = require("./tenants.service");
const { ingestDocument } = require("./rag.service");
const { runAutoKbForTenant } = require("./auto-kb.service");

// No-op: snapshot backup is handled at DB level (PostgreSQL backups)
async function createSnapshot() {
  // no-op — PostgreSQL handles persistence, no JSON snapshot needed
}

function startBackupScheduler() {
  const intervalMs = (env.backupIntervalHours || 6) * 60 * 60 * 1000;
  setInterval(async () => {
    try {
      await createSnapshot();
    } catch (err) {
      console.error("[scheduler:backup] erreur snapshot:", err.message);
    }
  }, intervalMs);
}

async function closeStaleConversations() {
  const staleDays = env.staleConvDays || 7;
  const staleDate = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000).toISOString();

  const result = await db("conversations")
    .where("status", "resolved")
    .where("updated_at", "<", staleDate)
    .update({
      status: "archived",
      updated_at: new Date().toISOString()
    });

  if (result > 0) {
    console.log(`[scheduler:cleanup] ${result} conversations resolved → archived`);
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
  setInterval(async () => {
    try {
      await closeStaleConversations();
      deleteOldUploads();
    } catch (err) {
      console.error("[scheduler:cleanup] erreur:", err.message);
    }
  }, intervalMs);
}

async function generateKbForResolvedTickets() {
  if (!env.autoKbEnabled) return;

  const tenants = await listTenants();

  for (const tenant of tenants) {
    try {
      await runAutoKbForTenant({ tenantId: tenant.id });
    } catch (err) {
      console.error(`[scheduler:auto_kb] erreur tenant ${tenant.id}:`, err.message);
    }
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
