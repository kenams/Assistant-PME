const { ensureSeeded } = require("./users.service");
const { loadDb, withDb } = require("./store.service");

function getDefaultTenantId() {
  ensureSeeded();
  const db = loadDb();
  if (db.tenants.length === 0) {
    return null;
  }
  return db.tenants[0].id;
}

function updateTenant({ tenantId, updates }) {
  return withDb((db) => {
    const tenant = db.tenants.find((t) => t.id === tenantId);
    if (!tenant) return null;
    if (updates.name) tenant.name = updates.name;
    if (updates.plan) tenant.plan = updates.plan;
    tenant.updated_at = new Date().toISOString();
    return tenant;
  });
}

module.exports = { getDefaultTenantId, updateTenant };
