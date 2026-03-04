const crypto = require("crypto");
const { env } = require("../config/env");
const { withDb, loadDb } = require("./store.service");
const { hashPassword, verifyPassword } = require("../utils/crypto");

function ensureSeeded() {
  return withDb((db) => {
    if (db.users.length > 0) {
      return;
    }

    const tenantId = crypto.randomUUID();
    db.tenants.push({
      id: tenantId,
      name: env.seedTenantName,
      plan: "starter",
      created_at: new Date().toISOString()
    });

    const userId = crypto.randomUUID();
    db.users.push({
      id: userId,
      tenant_id: tenantId,
      email: env.seedAdminEmail,
      password_hash: hashPassword(env.seedAdminPassword),
      role: "admin",
      created_at: new Date().toISOString()
    });
  });
}

function findUserByEmail(email) {
  ensureSeeded();
  const db = loadDb();
  return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
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
