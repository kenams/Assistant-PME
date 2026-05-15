const crypto = require("crypto");
const { db } = require("../config/db");

async function logEvent({ tenantId, userId, action, meta }) {
  const [entry] = await db("audit_logs").insert({
    id: crypto.randomUUID(),
    tenant_id: tenantId,
    user_id: userId || null,
    action,
    meta: meta ? JSON.stringify(meta) : null,
    created_at: new Date().toISOString()
  }).returning("*");
  return entry;
}

async function listAudit({ tenantId, limit }) {
  const q = db("audit_logs")
    .where({ tenant_id: tenantId })
    .orderBy("created_at", "desc")
    .select("id", "action", "user_id", "meta", "created_at");
  if (limit) q.limit(limit);
  return q;
}

module.exports = { logEvent, listAudit };
