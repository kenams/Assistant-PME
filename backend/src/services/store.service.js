const path = require("path");
const { db } = require("../config/db");

async function runMigrations() {
  await db.migrate.latest({
    directory: path.join(__dirname, "..", "migrations")
  });
}

async function createSnapshot() {
  // No-op in PostgreSQL mode — backups handled by Render/cloud provider
}

async function listBackups() {
  return [];
}

async function restoreLatestSnapshot() {
  return null;
}

// Kept for legacy callers that haven't been migrated yet (returns empty db shape)
function loadDb() {
  return {
    tenants: [], users: [], conversations: [], messages: [],
    tickets: [], kb_documents: [], kb_chunks: [], metrics_daily: [],
    leads: [], quotes: [], invoices: [], audit_logs: [], notifications: [],
    conversation_feedback: [], org_settings: [], invites: [], quick_issues: []
  };
}

function saveDb() {}
function withDb(fn) { return fn(loadDb()); }
function getStoreVersion() { return 0; }

module.exports = {
  runMigrations,
  createSnapshot,
  listBackups,
  restoreLatestSnapshot,
  loadDb,
  saveDb,
  withDb,
  getStoreVersion
};
