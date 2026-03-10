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

router.post("/login", loginLimiter(), (req, res) => {
  const payload = validateOr400(loginSchema, res, req.body);
  if (!payload) {
    return;
  }

  if (!env.jwtSecret) {
    return res.status(500).json({ error: "missing_jwt_secret" });
  }

  const emailLower = payload.email.toLowerCase();
  const isDemo = emailLower.endsWith("@assistant.local");
  let tenant = null;
  let tenantId = null;
  let user = null;

  if (payload.tenant_code) {
    tenant = getTenantByCode(payload.tenant_code);
    tenantId = tenant ? tenant.id : null;
    if (!tenantId && isDemo) {
      tenantId = getDefaultTenantId();
    }
    if (tenantId) {
      user = findUserByEmailInTenant({ tenantId, email: payload.email });
    }
  } else {
    user = findUserByEmail(payload.email);
  }

  if (!user && isDemo && tenantId) {
    const created = createUser({
      tenantId,
      email: payload.email,
      password: env.seedUserPassword,
      role: "user"
    });
    user = created.user || null;
  }

  if (!user && isDemo) {
    user = findUserByEmail(payload.email);
  }
  if (!user || !verifyPassword(payload.password, user.password_hash)) {
    if (!(isDemo && payload.password === env.seedUserPassword)) {
      return res.status(401).json({ error: "invalid_credentials" });
    }
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
    { expiresIn: "1h" }
  );

  logEvent({
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
});

router.post("/quick-admin", (req, res) => {
  if (
    env.disableQuickLogin ||
    (env.nodeEnv !== "development" && env.nodeEnv !== "test" && !isLocalRequest(req))
  ) {
    return res.status(403).json({ error: "forbidden" });
  }
  if (!env.jwtSecret) {
    return res.status(500).json({ error: "missing_jwt_secret" });
  }

  const user = findUserByEmail(env.seedAdminEmail);
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
    { expiresIn: "1h" }
  );

  logEvent({
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
});

router.get("/quick-admin", (req, res) => {
  if (
    env.disableQuickLogin ||
    (env.nodeEnv !== "development" && env.nodeEnv !== "test" && !isLocalRequest(req))
  ) {
    return res.status(403).json({ error: "forbidden" });
  }
  if (!env.jwtSecret) {
    return res.status(500).json({ error: "missing_jwt_secret" });
  }

  const user = findUserByEmail(env.seedAdminEmail);
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
    { expiresIn: "1h" }
  );

  const rawRedirect = typeof req.query.redirect === "string" ? req.query.redirect : "";
  const redirectPath = rawRedirect && rawRedirect.startsWith("/") ? rawRedirect : "/app/";
  const joiner = redirectPath.includes("?") ? "&" : "?";

  logEvent({
    tenantId: user.tenant_id,
    userId: user.id,
    action: "auth_quick_admin_redirect",
    meta: { email: user.email, redirect: redirectPath }
  });

  return res.redirect(`${redirectPath}${joiner}token=${encodeURIComponent(token)}`);
});

router.get("/me", authRequired, (req, res) => {
  const user = findUserById(req.user.sub);
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
});

router.post("/quick-user", (req, res) => {
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
  const tenant = requestedTenant ? getTenantByCode(requestedTenant) : null;
  const tenantId = tenant ? tenant.id : getDefaultTenantId();
  if (!tenantId) {
    return res.status(404).json({ error: "tenant_not_found" });
  }

  const requestedEmail = req.body && req.body.email ? String(req.body.email).trim() : "";
  const email = requestedEmail || env.seedUserEmail;
  let user = findUserByEmailInTenant({ tenantId, email });
  if (!user) {
    const created = createUser({
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
    { expiresIn: "1h" }
  );

  logEvent({
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
});

module.exports = router;
