const express = require("express");
const { z } = require("zod");
const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const { authRequired } = require("../middleware/auth");
const {
  findUserByEmail,
  findUserByEmailInTenant,
  findUserById,
  verifyPassword,
  createUser
} = require("../services/users.service");
const { getDefaultTenantId, getTenantByCode } = require("../services/tenants.service");
const { logEvent } = require("../services/audit.service");
const { validateOr400 } = require("../utils/validate");
const { loginLimiter } = require("../middleware/rate-limit");

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

    if (!user) {
      const email = payload.email.toLowerCase();
      const isDemo = email.endsWith("@assistant.local");
      if (isDemo) {
        user = await findUserByEmail(payload.email);
      }
    }
    if (!user || !verifyPassword(payload.password, user.password_hash)) {
      return res.status(401).json({ error: "invalid_credentials" });
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
      action: "auth_login",
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

router.post("/quick-admin", async (req, res, next) => {
  try {
    if (
      env.disableQuickLogin ||
      (env.nodeEnv !== "development" && env.nodeEnv !== "test" && !isLocalRequest(req))
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
      (env.nodeEnv !== "development" && env.nodeEnv !== "test" && !isLocalRequest(req))
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
      (env.nodeEnv !== "development" && env.nodeEnv !== "test" && !isLocalRequest(req))
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

module.exports = router;
