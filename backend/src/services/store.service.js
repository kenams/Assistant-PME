const fs = require("fs");
const path = require("path");
const { env } = require("../config/env");

let storeVersion = 0;

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
  org_settings: [],
  invites: [],
  quick_issues: []
});

function ensureStore() {
  const dir = path.dirname(env.dataStorePath);
  fs.mkdirSync(dir, { recursive: true });
  if (env.dataBackupEnabled) {
    fs.mkdirSync(env.dataBackupDir, { recursive: true });
  }

  if (!fs.existsSync(env.dataStorePath)) {
    const initial = baseState();
    safeWriteFile(env.dataStorePath, JSON.stringify(initial, null, 2));
    storeVersion += 1;
  }
}

function safeWriteFile(filePath, data) {
  const dir = path.dirname(filePath);
  const tempPath = path.join(
    dir,
    `.tmp-${Date.now()}-${Math.random().toString(36).slice(2)}.json`
  );
  fs.writeFileSync(tempPath, data, "utf8");
  try {
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    fs.copyFileSync(tempPath, filePath);
    fs.unlinkSync(tempPath);
  }
}

function backupFilename() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const base = path.basename(env.dataStorePath, ".json");
  return `${base}-${stamp}.json`;
}

function listBackups() {
  if (!env.dataBackupEnabled) {
    return [];
  }
  if (!fs.existsSync(env.dataBackupDir)) {
    return [];
  }
  const base = path.basename(env.dataStorePath, ".json");
  return fs
    .readdirSync(env.dataBackupDir)
    .filter((file) => file.startsWith(`${base}-`) && file.endsWith(".json"))
    .map((file) => {
      const full = path.join(env.dataBackupDir, file);
      let mtime = 0;
      let size = 0;
      try {
        const stat = fs.statSync(full);
        mtime = stat.mtimeMs || 0;
        size = stat.size || 0;
      } catch (err) {
        mtime = 0;
        size = 0;
      }
      return { file, full, mtime, size };
    })
    .sort((a, b) => b.mtime - a.mtime);
}

function createSnapshot() {
  if (!env.dataBackupEnabled) return;
  if (!fs.existsSync(env.dataStorePath)) return;
  try {
    const dest = path.join(env.dataBackupDir, backupFilename());
    fs.copyFileSync(env.dataStorePath, dest);
    pruneSnapshots();
  } catch (err) {
    // ignore snapshot errors
  }
}

function pruneSnapshots() {
  const max = Number.isFinite(env.dataBackupMax) ? env.dataBackupMax : 20;
  if (!max || max <= 0) return;
  const backups = listBackups();
  backups.slice(max).forEach((item) => {
    try {
      fs.unlinkSync(item.full);
    } catch (err) {
      // ignore cleanup errors
    }
  });
}

function restoreLatestSnapshot() {
  const backups = listBackups();
  if (!backups.length) {
    return null;
  }
  const latest = backups[0];
  try {
    const raw = fs.readFileSync(latest.full, "utf8");
    const parsed = JSON.parse(raw);
    safeWriteFile(env.dataStorePath, JSON.stringify(parsed, null, 2));
    storeVersion += 1;
    return parsed;
  } catch (err) {
    return null;
  }
}

function loadDb() {
  ensureStore();
  const raw = fs.readFileSync(env.dataStorePath, "utf8");
  try {
    return JSON.parse(raw);
  } catch (err) {
    const recovered = restoreLatestSnapshot();
    if (recovered) {
      return recovered;
    }
    const reset = baseState();
    safeWriteFile(env.dataStorePath, JSON.stringify(reset, null, 2));
    return reset;
  }
}

function saveDb(db) {
  ensureStore();
  createSnapshot();
  safeWriteFile(env.dataStorePath, JSON.stringify(db, null, 2));
  storeVersion += 1;
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
  withDb,
  getStoreVersion: () => storeVersion,
  listBackups,
  restoreLatestSnapshot
};
