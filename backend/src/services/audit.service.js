const crypto = require("crypto");
const { withDb, loadDb } = require("./store.service");

function logEvent({ tenantId, userId, action, meta }) {
  return withDb((db) => {
    const entry = {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      user_id: userId || null,
      action,
      meta: meta || null,
      created_at: new Date().toISOString()
    };
    db.audit_logs.push(entry);
    return entry;
  });
}

function listAudit({ tenantId, limit }) {
  const db = loadDb();
  const items = db.audit_logs
    .filter((log) => log.tenant_id === tenantId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return (limit ? items.slice(0, limit) : items).map((log) => ({
    id: log.id,
    action: log.action,
    user_id: log.user_id,
    meta: log.meta,
    created_at: log.created_at
  }));
}

module.exports = { logEvent, listAudit };