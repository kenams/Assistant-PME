const express = require("express");
const { z } = require("zod");
const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const { authRequired } = require("../middleware/auth");
const {
  findUserByEmail,
  findUserById,
  verifyPassword
} = require("../services/users.service");
const { logEvent } = require("../services/audit.service");
const { validateOr400 } = require("../utils/validate");
const { loginLimiter } = require("../middleware/rate-limit");

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

router.post("/login", loginLimiter(), (req, res) => {
  const payload = validateOr400(loginSchema, res, req.body);
  if (!payload) {
    return;
  }

  if (!env.jwtSecret) {
    return res.status(500).json({ error: "missing_jwt_secret" });
  }

  const user = findUserByEmail(payload.email);
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
  if (env.nodeEnv !== "development") {
    return res.status(403).json({ error: "forbidden" });
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
  if (env.nodeEnv !== "development") {
    return res.status(403).json({ error: "forbidden" });
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

module.exports = router;
