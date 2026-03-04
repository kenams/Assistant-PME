const crypto = require("crypto");
const { ensureSeeded, findUserByEmail } = require("./users.service");
const { loadDb, withDb } = require("./store.service");
const { hashPassword } = require("../utils/crypto");

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

function listTenants() {
  ensureSeeded();
  const db = loadDb();
  return db.tenants.map((tenant) => ({
    id: tenant.id,
    name: tenant.name,
    plan: tenant.plan,
    created_at: tenant.created_at,
    updated_at: tenant.updated_at || null
  }));
}

function createTenant({ name, plan, adminEmail, adminPassword }) {
  return withDb((db) => {
    if (findUserByEmail(adminEmail)) {
      return { error: "email_exists" };
    }
    const tenantId = crypto.randomUUID();
    db.tenants.push({
      id: tenantId,
      name,
      plan: plan || "starter",
      created_at: new Date().toISOString()
    });
    const userId = crypto.randomUUID();
    db.users.push({
      id: userId,
      tenant_id: tenantId,
      email: adminEmail,
      password_hash: hashPassword(adminPassword),
      role: "admin",
      created_at: new Date().toISOString()
    });
    return { tenant_id: tenantId, admin_id: userId };
  });
}

module.exports = { getDefaultTenantId, updateTenant, listTenants, createTenant };
