const fs = require("fs");
const path = require("path");
const { env } = require("../config/env");

const baseState = () => ({
  tenants: [],
  users: [],
  conversations: [],
  messages: [],
  tickets: [],
  kb_documents: [],
  kb_chunks: [],
  metrics_daily: [],
  leads: [],
  quotes: [],
  invoices: [],
  audit_logs: [],
  notifications: [],
  conversation_feedback: [],
  org_settings: []
});

function ensureStore() {
  const dir = path.dirname(env.dataStorePath);
  fs.mkdirSync(dir, { recursive: true });

  if (!fs.existsSync(env.dataStorePath)) {
    const initial = baseState();
    fs.writeFileSync(env.dataStorePath, JSON.stringify(initial, null, 2), "utf8");
  }
}

function loadDb() {
  ensureStore();
  const raw = fs.readFileSync(env.dataStorePath, "utf8");
  try {
    return JSON.parse(raw);
  } catch (err) {
    const reset = baseState();
    fs.writeFileSync(env.dataStorePath, JSON.stringify(reset, null, 2));
    return reset;
  }
}

function saveDb(db) {
  ensureStore();
  fs.writeFileSync(env.dataStorePath, JSON.stringify(db, null, 2));
}

function withDb(fn) {
  const db = loadDb();
  const result = fn(db);
  saveDb(db);
  return result;
}

module.exports = {
  loadDb,
  saveDb,
  withDb
};
