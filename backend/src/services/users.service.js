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

    // Seed demo user
    const demoEmail = "demo@assistant.local";
    const demoExists = db.users.find((u) => u.email.toLowerCase() === demoEmail);
    if (!demoExists) {
      const demoUserId = crypto.randomUUID();
      db.users.push({
        id: demoUserId,
        tenant_id: tenant.id,
        email: demoEmail,
        password_hash: hashPassword("demo" + crypto.randomUUID()),
        role: "user",
        created_at: now
      });
    }

    // Seed demo tickets if none exist
    if (db.tickets.length === 0) {
      const demoUser = db.users.find((u) => u.email.toLowerCase() === demoEmail)
        || db.users.find((u) => u.tenant_id === tenant.id && u.role === "user");
      if (demoUser) {
        const demoTickets = [
          {
            id: crypto.randomUUID(), tenant_id: tenant.id, user_id: demoUser.id,
            title: "Outlook ne s'ouvre plus depuis la mise à jour Office",
            description: "Depuis ce matin, Outlook affiche une erreur et se ferme immédiatement. J'ai besoin de mes emails pour le travail.",
            category: "email", priority: "high", status: "open",
            ai_suggestion: "Problème de profil Outlook corrompu après mise à jour. Solution : renommer %appdata%\\Microsoft\\Outlook et relancer. Taux de résolution : 87%.",
            created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
            updated_at: now
          },
          {
            id: crypto.randomUUID(), tenant_id: tenant.id, user_id: demoUser.id,
            title: "Imprimante réseau HP LaserJet plus accessible",
            description: "L'imprimante partagée du bureau ne répond plus depuis hier. Tous les collegues ont le même problème.",
            category: "printer", priority: "medium", status: "open",
            ai_suggestion: "Vérifier le spooler d'impression (services.msc) et relancer. Si persistant, supprimer et réajouter l'imprimante réseau.",
            created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
            updated_at: now
          },
          {
            id: crypto.randomUUID(), tenant_id: tenant.id, user_id: demoUser.id,
            title: "Mot de passe Windows oublié après congés",
            description: "Je n'arrive plus à me connecter à mon poste, j'ai changé de mot de passe avant les vacances et je ne m'en souviens plus.",
            category: "password", priority: "high", status: "resolved",
            ai_suggestion: "Réinitialisation via Active Directory (dsac.exe > Réinitialiser le mot de passe) ou via l'outil RSAT.",
            created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
            updated_at: new Date(Date.now() - 20 * 3600000).toISOString()
          },
          {
            id: crypto.randomUUID(), tenant_id: tenant.id, user_id: demoUser.id,
            title: "VPN Cisco AnyConnect déconnexion aléatoire",
            description: "Le VPN se déconnecte toutes les 30 minutes en télétravail, impossible de travailler correctement.",
            category: "vpn", priority: "high", status: "resolved",
            ai_suggestion: "Mettre à jour AnyConnect vers la dernière version. Vérifier les paramètres Keep Alive dans le profil VPN.",
            created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
            updated_at: new Date(Date.now() - 44 * 3600000).toISOString()
          },
          {
            id: crypto.randomUUID(), tenant_id: tenant.id, user_id: demoUser.id,
            title: "Écran bleu BSOD sur poste comptabilité",
            description: "Le PC de Sarah en comptabilité fait un écran bleu à chaque démarrage avec l'erreur KERNEL_SECURITY_CHECK_FAILURE.",
            category: "hardware", priority: "critical", status: "open",
            ai_suggestion: "Lancer sfc /scannow en mode sans échec. Si persistant, vérifier la RAM avec MemTest86. Code d'erreur suggère problème de driver.",
            created_at: new Date(Date.now() - 1 * 3600000).toISOString(),
            updated_at: now
          }
        ];
        db.tickets.push(...demoTickets);
      }
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
