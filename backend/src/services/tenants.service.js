const crypto = require("crypto");
const { ensureSeeded, findUserByEmail } = require("./users.service");
const { loadDb, withDb } = require("./store.service");
const { hashPassword } = require("../utils/crypto");

function normalizeTenantCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function generateTenantCode(name, existingCodes) {
  const base = normalizeTenantCode(name).slice(0, 8) || "TENANT";
  let code = base;
  let counter = 1;
  while (existingCodes.has(code)) {
    code = `${base}${counter}`;
    counter += 1;
  }
  existingCodes.add(code);
  return code;
}

function ensureTenantCodes() {
  ensureSeeded();
  const db = loadDb();
  const missing = db.tenants.some((tenant) => !tenant.code);
  if (!missing) {
    return;
  }
  withDb((mutable) => {
    const existingCodes = new Set(
      mutable.tenants
        .map((tenant) => normalizeTenantCode(tenant.code))
        .filter(Boolean)
    );
    mutable.tenants.forEach((tenant) => {
      if (!tenant.code) {
        tenant.code = generateTenantCode(tenant.name, existingCodes);
        tenant.updated_at = new Date().toISOString();
      } else {
        tenant.code = normalizeTenantCode(tenant.code);
      }
    });
  });
}

function getDefaultTenantId() {
  ensureTenantCodes();
  const db = loadDb();
  if (db.tenants.length === 0) {
    return null;
  }
  return db.tenants[0].id;
}

function getTenantByCode(code) {
  ensureTenantCodes();
  const normalized = normalizeTenantCode(code);
  if (!normalized) {
    return null;
  }
  const db = loadDb();
  return db.tenants.find((tenant) => normalizeTenantCode(tenant.code) === normalized) || null;
}

function updateTenant({ tenantId, updates }) {
  return withDb((db) => {
    const tenant = db.tenants.find((t) => t.id === tenantId);
    if (!tenant) return null;
    if (updates.name) tenant.name = updates.name;
    if (updates.plan) tenant.plan = updates.plan;
    if (updates.code) tenant.code = normalizeTenantCode(updates.code);
    tenant.updated_at = new Date().toISOString();
    return tenant;
  });
}

function listTenants() {
  ensureTenantCodes();
  const db = loadDb();
  return db.tenants.map((tenant) => ({
    id: tenant.id,
    name: tenant.name,
    code: tenant.code || null,
    plan: tenant.plan,
    created_at: tenant.created_at,
    updated_at: tenant.updated_at || null
  }));
}

function createTenant({ name, plan, adminEmail, adminPassword, code }) {
  return withDb((db) => {
    if (findUserByEmail(adminEmail)) {
      return { error: "email_exists" };
    }
    const existingCodes = new Set(
      db.tenants
        .map((tenant) => normalizeTenantCode(tenant.code))
        .filter(Boolean)
    );
    let finalCode = null;
    if (code) {
      finalCode = normalizeTenantCode(code);
      if (finalCode && existingCodes.has(finalCode)) {
        return { error: "code_exists" };
      }
      if (finalCode) {
        existingCodes.add(finalCode);
      }
    } else {
      finalCode = generateTenantCode(name, existingCodes);
    }
    const tenantId = crypto.randomUUID();
    db.tenants.push({
      id: tenantId,
      name,
      code: finalCode,
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

module.exports = {
  getDefaultTenantId,
  getTenantByCode,
  updateTenant,
  listTenants,
  createTenant
};
