const crypto = require("crypto");
const { env } = require("../config/env");
const { withDb, loadDb } = require("./store.service");
const { hashPassword, verifyPassword } = require("../utils/crypto");

function ensureSeeded() {
  return withDb((db) => {
    const now = new Date().toISOString();
    const normalizeCode = (value) =>
      String(value || "")
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
    const desiredTenantCode = normalizeCode(env.seedTenantCode || env.seedTenantName || "DEFAULT");
    let tenant =
      db.tenants.find((item) => normalizeCode(item.code) === desiredTenantCode) ||
      null;
    if (!tenant) {
      const tenantId = crypto.randomUUID();
      tenant = {
        id: tenantId,
        name: env.seedTenantName || "Default",
        code: desiredTenantCode || "DEFAULT",
        plan: "starter",
        created_at: now
      };
      db.tenants.push(tenant);
    } else {
      tenant.code = desiredTenantCode || tenant.code;
      tenant.name = env.seedTenantName || tenant.name;
      tenant.updated_at = now;
    }

    const adminExists = db.users.find(
      (u) => u.email.toLowerCase() === env.seedAdminEmail.toLowerCase()
    );
    const shouldResetSeed =
      (env.forceSeedReset || "").toString().toLowerCase() === "true";
    const shouldResetAdmin =
      shouldResetSeed || env.seedAdminEmail.toLowerCase().endsWith("@assistant.local");
    if (!adminExists) {
      db.users.push({
        id: crypto.randomUUID(),
        tenant_id: tenant.id,
        email: env.seedAdminEmail,
        password_hash: hashPassword(env.seedAdminPassword),
        role: "admin",
        created_at: now
      });
    } else if (shouldResetAdmin) {
      adminExists.password_hash = hashPassword(env.seedAdminPassword);
      adminExists.tenant_id = tenant.id;
      adminExists.role = "admin";
      adminExists.updated_at = now;
    }

    const userExists = db.users.find(
      (u) => u.email.toLowerCase() === env.seedUserEmail.toLowerCase()
    );
    const shouldResetUser =
      shouldResetSeed || env.seedUserEmail.toLowerCase().endsWith("@assistant.local");
    if (!userExists) {
      db.users.push({
        id: crypto.randomUUID(),
        tenant_id: tenant.id,
        email: env.seedUserEmail,
        password_hash: hashPassword(env.seedUserPassword),
        role: "user",
        created_at: now
      });
    } else if (shouldResetUser) {
      userExists.password_hash = hashPassword(env.seedUserPassword);
      userExists.tenant_id = tenant.id;
      userExists.role = "user";
      userExists.updated_at = now;
    }

    const altUserEmail = (env.seedUserAltEmail || "").toLowerCase();
    const altUserExists = altUserEmail
      ? db.users.find((u) => u.email.toLowerCase() === altUserEmail)
      : null;
    const shouldResetAltUser =
      shouldResetSeed || (altUserEmail && altUserEmail.endsWith("@assistant.local"));
    if (altUserEmail && !altUserExists) {
      db.users.push({
        id: crypto.randomUUID(),
        tenant_id: tenant.id,
        email: env.seedUserAltEmail,
        password_hash: hashPassword(env.seedUserAltPassword || env.seedUserPassword),
        role: "user",
        created_at: now
      });
    } else if (altUserExists && shouldResetAltUser) {
      altUserExists.password_hash = hashPassword(
        env.seedUserAltPassword || env.seedUserPassword
      );
      altUserExists.tenant_id = tenant.id;
      altUserExists.role = "user";
      altUserExists.updated_at = now;
    }
  });
}

function findUserByEmail(email) {
  ensureSeeded();
  const db = loadDb();
  return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
}

function findUserByEmailInTenant({ tenantId, email }) {
  ensureSeeded();
  const db = loadDb();
  return (
    db.users.find(
      (u) =>
        u.tenant_id === tenantId && u.email.toLowerCase() === email.toLowerCase()
    ) || null
  );
}

function findUserById(id) {
  ensureSeeded();
  const db = loadDb();
  return db.users.find((u) => u.id === id) || null;
}

function getTenantById(id) {
  ensureSeeded();
  const db = loadDb();
  return db.tenants.find((t) => t.id === id) || null;
}

module.exports = {
  ensureSeeded,
  findUserByEmail,
  findUserByEmailInTenant,
  findUserById,
  getTenantById,
  verifyPassword,
  createUser: ({ tenantId, email, password, role }) => {
    return withDb((db) => {
      const exists = db.users.find(
        (u) => u.tenant_id === tenantId && u.email.toLowerCase() === email.toLowerCase()
      );
      if (exists) {
        return { error: "email_exists" };
      }
      const user = {
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        email,
        password_hash: hashPassword(password),
        role: role || "user",
        created_at: new Date().toISOString()
      };
      db.users.push(user);
      return { user };
    });
  },
  listUsers: ({ tenantId }) => {
    const db = loadDb();
    return db.users
      .filter((u) => u.tenant_id === tenantId)
      .map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        tenant_id: u.tenant_id,
        created_at: u.created_at
      }));
  }
};
