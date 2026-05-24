const express = require("express");
const { z } = require("zod");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { env } = require("../config/env");
const { authRequired } = require("../middleware/auth");
const {
  findUserByEmail,
  findUserByEmailInTenant,
  findUserById,
  verifyPassword,
  createUser,
  clearMustChangePassword
} = require("../services/users.service");
const { getDefaultTenantId, getTenantByCode } = require("../services/tenants.service");
const { logEvent } = require("../services/audit.service");
const { validateOr400 } = require("../utils/validate");
const { loginLimiter } = require("../middleware/rate-limit");
const { hashPassword } = require("../utils/crypto");
const { db } = require("../config/db");
const { sendPasswordResetEmail } = require("../services/email.service");

const { createRateLimiter } = require("../middleware/rate-limit");
const router = express.Router();

function isLocalRequest(req) {
  const host = (req.hostname || "").toLowerCase();
  if (host === "localhost" || host === "127.0.0.1") {
    return true;
  }
  const ip = (req.ip || "").toLowerCase();
  return ip === "::1" || ip === "127.0.0.1" || ip.endsWith("::1");
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  tenant_code: z.string().min(2).optional()
});

router.post("/login", loginLimiter(), async (req, res, next) => {
  try {
    const payload = validateOr400(loginSchema, res, req.body);
    if (!payload) {
      return;
    }

    if (!env.jwtSecret) {
      return res.status(500).json({ error: "missing_jwt_secret" });
    }

    let user = null;
    if (payload.tenant_code) {
      const tenant = await getTenantByCode(payload.tenant_code);
      if (tenant) {
        user = await findUserByEmailInTenant({ tenantId: tenant.id, email: payload.email });
      }
    } else {
      user = await findUserByEmail(payload.email);
    }

    if (!user || !verifyPassword(payload.password, user.password_hash)) {
      return res.status(401).json({ error: "invalid_credentials" });
    }

    const effectiveRole =
      env.superAdminEmail && user.email === env.superAdminEmail
        ? "superadmin"
        : user.role;

    const mustChange = Boolean(user.must_change_password);

    const token = jwt.sign(
      {
        sub: user.id,
        tenant_id: user.tenant_id,
        role: effectiveRole,
        ...(mustChange ? { mcp: 1 } : {})
      },
      env.jwtSecret,
      { expiresIn: "8h" }
    );

    await logEvent({
      tenantId: user.tenant_id,
      userId: user.id,
      action: "auth_login",
      meta: { email: user.email }
    });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: effectiveRole,
        tenant_id: user.tenant_id,
        must_change_password: mustChange
      }
    });
  } catch (err) {
    next(err);
  }
});

router.post("/quick-admin", async (req, res, next) => {
  try {
    if (
      env.disableQuickLogin ||
      (env.nodeEnv !== "development" && env.nodeEnv !== "test")
    ) {
      return res.status(403).json({ error: "forbidden" });
    }
    if (!env.jwtSecret) {
      return res.status(500).json({ error: "missing_jwt_secret" });
    }

    const user = await findUserByEmail(env.seedAdminEmail);
    if (!user) {
      return res.status(404).json({ error: "user_not_found" });
    }

    const effectiveRole =
      env.superAdminEmail && user.email === env.superAdminEmail
        ? "superadmin"
        : user.role;

    const token = jwt.sign(
      {
        sub: user.id,
        tenant_id: user.tenant_id,
        role: effectiveRole
      },
      env.jwtSecret,
      { expiresIn: "8h" }
    );

    await logEvent({
      tenantId: user.tenant_id,
      userId: user.id,
      action: "auth_quick_admin",
      meta: { email: user.email }
    });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: effectiveRole,
        tenant_id: user.tenant_id
      }
    });
  } catch (err) {
    next(err);
  }
});

router.get("/quick-admin", async (req, res, next) => {
  try {
    if (
      env.disableQuickLogin ||
      (env.nodeEnv !== "development" && env.nodeEnv !== "test")
    ) {
      return res.status(403).json({ error: "forbidden" });
    }
    if (!env.jwtSecret) {
      return res.status(500).json({ error: "missing_jwt_secret" });
    }

    const user = await findUserByEmail(env.seedAdminEmail);
    if (!user) {
      return res.status(404).json({ error: "user_not_found" });
    }

    const effectiveRole =
      env.superAdminEmail && user.email === env.superAdminEmail
        ? "superadmin"
        : user.role;

    const token = jwt.sign(
      {
        sub: user.id,
        tenant_id: user.tenant_id,
        role: effectiveRole
      },
      env.jwtSecret,
      { expiresIn: "8h" }
    );

    const rawRedirect = typeof req.query.redirect === "string" ? req.query.redirect : "";
    const redirectPath = rawRedirect && rawRedirect.startsWith("/") ? rawRedirect : "/app/";
    const joiner = redirectPath.includes("?") ? "&" : "?";

    await logEvent({
      tenantId: user.tenant_id,
      userId: user.id,
      action: "auth_quick_admin_redirect",
      meta: { email: user.email, redirect: redirectPath }
    });

    return res.redirect(`${redirectPath}${joiner}token=${encodeURIComponent(token)}`);
  } catch (err) {
    next(err);
  }
});

router.get("/me", authRequired, async (req, res, next) => {
  try {
    const user = await findUserById(req.user.sub);
    if (!user) {
      return res.status(404).json({ error: "user_not_found" });
    }
    const effectiveRole =
      env.superAdminEmail && user.email === env.superAdminEmail
        ? "superadmin"
        : user.role;
    return res.json({
      id: user.id,
      email: user.email,
      role: effectiveRole,
      tenant_id: user.tenant_id
    });
  } catch (err) {
    next(err);
  }
});

// Demo public route — rate limited, no IP check, creates a read-only demo session
const demoLimiter = createRateLimiter({ max: 10, windowSec: 60 });

router.get("/demo", demoLimiter, async (req, res, next) => {
  try {
    if (!env.jwtSecret) {
      return res.status(500).json({ error: "missing_jwt_secret" });
    }

    let user = await findUserByEmail("demo@assistant.local");
    if (!user) {
      // Auto-create demo user in DEFAULT tenant if it doesn't exist yet
      const demoTenant = await getTenantByCode("DEFAULT");
      if (demoTenant) {
        const created = await createUser({
          tenantId: demoTenant.id,
          email: "demo@assistant.local",
          password: "demo" + Math.random(),
          role: "user"
        });
        user = created.user || null;
      }
    }

    if (!user) {
      return res.status(503).json({ error: "demo_unavailable" });
    }

    const token = jwt.sign(
      { sub: user.id, tenant_id: user.tenant_id, role: "user", demo: true },
      env.jwtSecret,
      { expiresIn: "2h" }
    );

    const rawRedirect = typeof req.query.redirect === "string" ? req.query.redirect : "";
    const redirectPath = rawRedirect && rawRedirect.startsWith("/") ? rawRedirect : "/app/user/";
    const joiner = redirectPath.includes("?") ? "&" : "?";
    return res.redirect(`${redirectPath}${joiner}token=${encodeURIComponent(token)}`);
  } catch (err) {
    next(err);
  }
});

router.post("/quick-user", async (req, res, next) => {
  try {
    if (
      env.disableQuickLogin ||
      (env.nodeEnv !== "development" && env.nodeEnv !== "test")
    ) {
      return res.status(403).json({ error: "forbidden" });
    }

    const requestedTenant =
      (req.body && req.body.tenant_code ? String(req.body.tenant_code) : "") ||
      (req.query && req.query.tenant_code ? String(req.query.tenant_code) : "") ||
      (req.query && req.query.tenant ? String(req.query.tenant) : "");
    const tenant = requestedTenant ? await getTenantByCode(requestedTenant) : null;
    const tenantId = tenant ? tenant.id : await getDefaultTenantId();
    if (!tenantId) {
      return res.status(404).json({ error: "tenant_not_found" });
    }

    const requestedEmail = req.body && req.body.email ? String(req.body.email).trim() : "";
    const email = requestedEmail || env.seedUserEmail;
    let user = await findUserByEmailInTenant({ tenantId, email });
    if (!user) {
      const created = await createUser({
        tenantId,
        email,
        password: env.seedUserPassword,
        role: "user"
      });
      user = created.user || null;
    }

    if (!user) {
      return res.status(404).json({ error: "user_not_found" });
    }

    if (!env.jwtSecret) {
      return res.status(500).json({ error: "missing_jwt_secret" });
    }

    const token = jwt.sign(
      {
        sub: user.id,
        tenant_id: user.tenant_id,
        role: "user"
      },
      env.jwtSecret,
      { expiresIn: "8h" }
    );

    await logEvent({
      tenantId: user.tenant_id,
      userId: user.id,
      action: "auth_quick_user",
      meta: { email: user.email }
    });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: "user",
        tenant_id: user.tenant_id
      }
    });
  } catch (err) {
    next(err);
  }
});

router.post("/refresh", authRequired, async (req, res, next) => {
  try {
    if (!env.jwtSecret) {
      return res.status(500).json({ error: "missing_jwt_secret" });
    }
    const user = await findUserById(req.user.sub);
    if (!user) {
      return res.status(404).json({ error: "user_not_found" });
    }
    const effectiveRole =
      env.superAdminEmail && user.email === env.superAdminEmail
        ? "superadmin"
        : user.role;
    const token = jwt.sign(
      { sub: user.id, tenant_id: user.tenant_id, role: effectiveRole },
      env.jwtSecret,
      { expiresIn: "8h" }
    );
    return res.json({ token });
  } catch (err) {
    next(err);
  }
});

// ── Mot de passe oublié ───────────────────────────────────────────────────────
const forgotLimiter = createRateLimiter({ max: 5, windowSec: 300 });

router.post("/forgot-password", forgotLimiter, async (req, res, next) => {
  try {
    const email = (req.body?.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "email_invalide" });
    }

    // Toujours retourner 200 pour ne pas révéler si l'email existe
    const user = await findUserByEmail(email);
    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const now = new Date().toISOString();
      const expires = new Date(Date.now() + 3600 * 1000).toISOString();

      // Invalider les anciens tokens de cet utilisateur
      await db("password_resets").where({ user_id: user.id, used: false }).update({ used: true });

      await db("password_resets").insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        token,
        used: false,
        created_at: now,
        expires_at: expires,
      });

      const appUrl = env.appUrl || "http://localhost:3001";
      const resetUrl = `${appUrl}/app/reset-password/?token=${token}`;
      sendPasswordResetEmail({ email, resetUrl }).catch(() => {});

      await logEvent({
        tenantId: user.tenant_id,
        userId: user.id,
        action: "auth_forgot_password",
        meta: { email }
      });
    }

    return res.json({ ok: true, message: "Si cet email existe, un lien de réinitialisation a été envoyé." });
  } catch (err) {
    next(err);
  }
});

router.post("/reset-password", async (req, res, next) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password || password.length < 6) {
      return res.status(400).json({ error: "invalid_payload" });
    }

    const reset = await db("password_resets").where({ token }).first();
    if (!reset) return res.status(404).json({ error: "token_invalide" });
    if (reset.used) return res.status(410).json({ error: "token_deja_utilise" });
    if (new Date(reset.expires_at) < new Date()) return res.status(410).json({ error: "token_expire" });

    await db("users").where({ id: reset.user_id }).update({
      password_hash: hashPassword(password)
    });

    await db("password_resets").where({ id: reset.id }).update({ used: true });

    const user = await findUserById(reset.user_id);
    if (user) {
      await logEvent({
        tenantId: user.tenant_id,
        userId: user.id,
        action: "auth_reset_password",
        meta: {}
      });
    }

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8)
});

router.post("/change-password", authRequired, async (req, res, next) => {
  try {
    const payload = validateOr400(changePasswordSchema, res, req.body);
    if (!payload) return;

    const user = await findUserById(req.user.sub);
    if (!user) return res.status(404).json({ error: "user_not_found" });

    if (!verifyPassword(payload.current_password, user.password_hash)) {
      return res.status(401).json({ error: "invalid_current_password" });
    }

    await db("users").where({ id: user.id }).update({
      password_hash: hashPassword(payload.new_password),
      must_change_password: false,
      updated_at: new Date().toISOString()
    });

    // Issue fresh token without mcp flag
    const effectiveRole = env.superAdminEmail && user.email === env.superAdminEmail
      ? "superadmin" : user.role;
    const newToken = jwt.sign(
      { sub: user.id, tenant_id: user.tenant_id, role: effectiveRole },
      env.jwtSecret,
      { expiresIn: "8h" }
    );

    await logEvent({
      tenantId: user.tenant_id,
      userId: user.id,
      action: "auth_password_changed",
      meta: { forced: Boolean(user.must_change_password) }
    });

    return res.json({ ok: true, token: newToken });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
