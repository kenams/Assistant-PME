const crypto = require("crypto");
const { db } = require("../config/db");
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

async function getDefaultTenantId() {
  const tenant = await db("tenants").orderBy("created_at", "asc").first();
  return tenant ? tenant.id : null;
}

async function getTenantByCode(code) {
  const normalized = normalizeTenantCode(code);
  if (!normalized) return null;
  const tenants = await db("tenants").select("*");
  return tenants.find((t) => normalizeTenantCode(t.code) === normalized) || null;
}

async function updateTenant({ tenantId, updates }) {
  const tenant = await db("tenants").where({ id: tenantId }).first();
  if (!tenant) return null;

  const patch = { updated_at: new Date().toISOString() };
  if (updates.name) patch.name = updates.name;
  if (updates.plan) patch.plan = updates.plan;
  if (updates.code) patch.code = normalizeTenantCode(updates.code);

  const [updated] = await db("tenants").where({ id: tenantId }).update(patch).returning("*");
  return updated || null;
}

async function listTenants() {
  const tenants = await db("tenants").orderBy("created_at", "asc").select("*");
  return tenants.map((tenant) => ({
    id: tenant.id,
    name: tenant.name,
    code: tenant.code || null,
    plan: tenant.plan,
    created_at: tenant.created_at,
    updated_at: tenant.updated_at || null
  }));
}

async function createTenant({ name, plan, adminEmail, adminPassword, code }) {
  // Check email uniqueness
  const existingUser = await db("users").where({ email: adminEmail }).first();
  if (existingUser) return { error: "email_exists" };

  const existingTenants = await db("tenants").select("code");
  const existingCodes = new Set(
    existingTenants.map((t) => normalizeTenantCode(t.code)).filter(Boolean)
  );

  let finalCode = null;
  if (code) {
    finalCode = normalizeTenantCode(code);
    if (finalCode && existingCodes.has(finalCode)) {
      return { error: "code_exists" };
    }
    if (finalCode) existingCodes.add(finalCode);
  } else {
    finalCode = generateTenantCode(name, existingCodes);
  }

  const tenantId = crypto.randomUUID();
  const now = new Date().toISOString();

  await db("tenants").insert({
    id: tenantId,
    name,
    code: finalCode,
    plan: plan || "starter",
    created_at: now,
    updated_at: now
  });

  const userId = crypto.randomUUID();
  await db("users").insert({
    id: userId,
    tenant_id: tenantId,
    email: adminEmail,
    password_hash: hashPassword(adminPassword),
    role: "admin",
    created_at: now
  });

  return { tenant_id: tenantId, admin_id: userId };
}

module.exports = {
  getDefaultTenantId,
  getTenantByCode,
  updateTenant,
  listTenants,
  createTenant
};
