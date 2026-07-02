const crypto = require("crypto");
const { env } = require("../config/env");
const { db } = require("../config/db");
const { hashPassword, verifyPassword } = require("../utils/crypto");

function normalizeCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

async function ensureSeeded() {
  const now = new Date().toISOString();
  const desiredTenantCode = normalizeCode(env.seedTenantCode || env.seedTenantName || "DEFAULT");

  await db.transaction(async (trx) => {
    // Tenant
    let tenant = await trx("tenants")
      .whereRaw("UPPER(REGEXP_REPLACE(code, '[^A-Z0-9]', '', 'g')) = ?", [desiredTenantCode])
      .first();

    if (!tenant) {
      const tenantId = crypto.randomUUID();
      const [inserted] = await trx("tenants").insert({
        id: tenantId,
        name: env.seedTenantName || "Default",
        code: desiredTenantCode || "DEFAULT",
        plan: "starter",
        created_at: now,
        updated_at: now
      }).returning("*");
      tenant = inserted;
    } else {
      await trx("tenants").where({ id: tenant.id }).update({
        code: desiredTenantCode || tenant.code,
        name: env.seedTenantName || tenant.name,
        updated_at: now
      });
      tenant.code = desiredTenantCode || tenant.code;
    }

    const shouldResetSeed = (env.forceSeedReset || "").toString().toLowerCase() === "true";

    // Admin
    const adminExists = await trx("users")
      .whereRaw("LOWER(email) = ?", [env.seedAdminEmail.toLowerCase()])
      .first();
    const shouldResetAdmin =
      shouldResetSeed || env.seedAdminEmail.toLowerCase().endsWith("@assistant.local");

    if (!adminExists) {
      await trx("users").insert({
        id: crypto.randomUUID(),
        tenant_id: tenant.id,
        email: env.seedAdminEmail,
        password_hash: hashPassword(env.seedAdminPassword),
        role: "superadmin",
        created_at: now,
        updated_at: now
      });
    } else if (shouldResetAdmin) {
      await trx("users").where({ id: adminExists.id }).update({
        password_hash: hashPassword(env.seedAdminPassword),
        tenant_id: tenant.id,
        role: "superadmin",
        updated_at: now
      });
    }

    // User
    const userExists = await trx("users")
      .whereRaw("LOWER(email) = ?", [env.seedUserEmail.toLowerCase()])
      .first();
    const shouldResetUser =
      shouldResetSeed || env.seedUserEmail.toLowerCase().endsWith("@assistant.local");

    if (!userExists) {
      await trx("users").insert({
        id: crypto.randomUUID(),
        tenant_id: tenant.id,
        email: env.seedUserEmail,
        password_hash: hashPassword(env.seedUserPassword),
        role: "user",
        created_at: now,
        updated_at: now
      });
    } else if (shouldResetUser) {
      await trx("users").where({ id: userExists.id }).update({
        password_hash: hashPassword(env.seedUserPassword),
        tenant_id: tenant.id,
        role: "user",
        updated_at: now
      });
    }

    // Demo user
    const demoEmail = "demo@assistant.local";
    const demoExists = await trx("users")
      .whereRaw("LOWER(email) = ?", [demoEmail])
      .first();

    let demoUser = demoExists;
    if (!demoExists) {
      const demoUserId = crypto.randomUUID();
      const [inserted] = await trx("users").insert({
        id: demoUserId,
        tenant_id: tenant.id,
        email: demoEmail,
        password_hash: hashPassword("demo" + crypto.randomUUID()),
        role: "user",
        created_at: now,
        updated_at: now
      }).returning("*");
      demoUser = inserted;
    }

    // Demo tickets si aucun ticket pour ce tenant
    const [{ count }] = await trx("tickets").where({ tenant_id: tenant.id }).count("id as count");
    if (parseInt(count, 10) === 0) {
      const fallbackUser = demoUser || await trx("users")
        .where({ tenant_id: tenant.id, role: "user" })
        .first();

      if (fallbackUser) {
        const demoTickets = [
          {
            id: crypto.randomUUID(),
            tenant_id: tenant.id,
            conversation_id: null,
            user_id: fallbackUser.id,
            external_id: null,
            external_url: null,
            title: "Outlook ne s'ouvre plus depuis la mise à jour Office",
            description: "Depuis ce matin, Outlook affiche une erreur et se ferme immédiatement. J'ai besoin de mes emails pour le travail.",
            category: "email",
            priority: "high",
            status: "open",
            ai_suggestion: "Problème de profil Outlook corrompu après mise à jour. Solution : renommer %appdata%\\Microsoft\\Outlook et relancer. Taux de résolution : 87%.",
            created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
            updated_at: now
          },
          {
            id: crypto.randomUUID(),
            tenant_id: tenant.id,
            conversation_id: null,
            user_id: fallbackUser.id,
            external_id: null,
            external_url: null,
            title: "Imprimante réseau HP LaserJet plus accessible",
            description: "L'imprimante partagée du bureau ne répond plus depuis hier. Tous les collegues ont le même problème.",
            category: "printer",
            priority: "medium",
            status: "open",
            ai_suggestion: "Vérifier le spooler d'impression (services.msc) et relancer. Si persistant, supprimer et réajouter l'imprimante réseau.",
            created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
            updated_at: now
          },
          {
            id: crypto.randomUUID(),
            tenant_id: tenant.id,
            conversation_id: null,
            user_id: fallbackUser.id,
            external_id: null,
            external_url: null,
            title: "Mot de passe Windows oublié après congés",
            description: "Je n'arrive plus à me connecter à mon poste, j'ai changé de mot de passe avant les vacances et je ne m'en souviens plus.",
            category: "password",
            priority: "high",
            status: "resolved",
            ai_suggestion: "Réinitialisation via Active Directory (dsac.exe > Réinitialiser le mot de passe) ou via l'outil RSAT.",
            created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
            updated_at: new Date(Date.now() - 20 * 3600000).toISOString()
          },
          {
            id: crypto.randomUUID(),
            tenant_id: tenant.id,
            conversation_id: null,
            user_id: fallbackUser.id,
            external_id: null,
            external_url: null,
            title: "VPN Cisco AnyConnect déconnexion aléatoire",
            description: "Le VPN se déconnecte toutes les 30 minutes en télétravail, impossible de travailler correctement.",
            category: "vpn",
            priority: "high",
            status: "resolved",
            ai_suggestion: "Mettre à jour AnyConnect vers la dernière version. Vérifier les paramètres Keep Alive dans le profil VPN.",
            created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
            updated_at: new Date(Date.now() - 44 * 3600000).toISOString()
          },
          {
            id: crypto.randomUUID(),
            tenant_id: tenant.id,
            conversation_id: null,
            user_id: fallbackUser.id,
            external_id: null,
            external_url: null,
            title: "Écran bleu BSOD sur poste comptabilité",
            description: "Le PC de Sarah en comptabilité fait un écran bleu à chaque démarrage avec l'erreur KERNEL_SECURITY_CHECK_FAILURE.",
            category: "hardware",
            priority: "high",
            status: "open",
            ai_suggestion: "Lancer sfc /scannow en mode sans échec. Si persistant, vérifier la RAM avec MemTest86. Code d'erreur suggère problème de driver.",
            created_at: new Date(Date.now() - 1 * 3600000).toISOString(),
            updated_at: now
          }
        ];
        await trx("tickets").insert(demoTickets);
      }
    }
  });
}

async function findUserByEmail(email) {
  return db("users")
    .whereRaw("LOWER(email) = ?", [email.toLowerCase()])
    .first() || null;
}

async function findUserByEmailInTenant({ tenantId, email }) {
  const row = await db("users")
    .where({ tenant_id: tenantId })
    .whereRaw("LOWER(email) = ?", [email.toLowerCase()])
    .first();
  return row || null;
}

async function findUserById(id) {
  const row = await db("users").where({ id }).first();
  return row || null;
}

async function getTenantById(id) {
  const row = await db("tenants").where({ id }).first();
  return row || null;
}

const PLAN_USER_LIMITS = { starter: 50, pro: 200, enterprise: null };

async function checkUserLimit(tenantId) {
  const tenant = await db("tenants").where({ id: tenantId }).first();
  if (!tenant) return { error: "tenant_not_found" };
  const plan = tenant.subscription_plan || tenant.plan || "starter";
  const limit = PLAN_USER_LIMITS[plan] ?? PLAN_USER_LIMITS.starter;
  if (limit === null) return { ok: true };
  const [{ count }] = await db("users").where({ tenant_id: tenantId }).count("id as count");
  const current = parseInt(count, 10);
  if (current >= limit) return { error: "user_limit_reached", plan, limit, current };
  return { ok: true };
}

async function createUser({ tenantId, email, password, role }) {
  const exists = await db("users")
    .where({ tenant_id: tenantId })
    .whereRaw("LOWER(email) = ?", [email.toLowerCase()])
    .first();
  if (exists) {
    return { error: "email_exists" };
  }
  const limitCheck = await checkUserLimit(tenantId);
  if (limitCheck.error) return limitCheck;
  const now = new Date().toISOString();
  const [user] = await db("users").insert({
    id: crypto.randomUUID(),
    tenant_id: tenantId,
    email,
    password_hash: hashPassword(password),
    role: role || "user",
    created_at: now,
    updated_at: now
  }).returning("*");
  return { user };
}

async function listUsers({ tenantId }) {
  const rows = await db("users")
    .where({ tenant_id: tenantId })
    .select("id", "email", "role", "tenant_id", "created_at");
  return rows;
}

async function clearMustChangePassword(userId) {
  await db("users").where({ id: userId }).update({
    must_change_password: false,
    updated_at: new Date().toISOString()
  });
}

module.exports = {
  ensureSeeded,
  findUserByEmail,
  findUserByEmailInTenant,
  findUserById,
  getTenantById,
  verifyPassword,
  createUser,
  listUsers,
  checkUserLimit,
  clearMustChangePassword
};
