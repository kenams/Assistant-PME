const express = require("express");
const { z } = require("zod");
const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const { authRequired } = require("../middleware/auth");
const { requireSuperAdmin } = require("../middleware/roles");
const { listTenants, createTenant } = require("../services/tenants.service");
const { findUserByEmailInTenant } = require("../services/users.service");
const { validateOr400 } = require("../utils/validate");

const router = express.Router();

const tenantSchema = z.object({
  name: z.string().min(2),
  plan: z.string().min(1).optional(),
  admin_email: z.string().email(),
  admin_password: z.string().min(6)
});

const tokenSchema = z.object({
  email: z.string().email().optional()
});

router.get("/", authRequired, requireSuperAdmin, (req, res) => {
  return res.json({ items: listTenants() });
});

router.post("/", authRequired, requireSuperAdmin, (req, res) => {
  const payload = validateOr400(tenantSchema, res, req.body);
  if (!payload) return;
  const result = createTenant({
    name: payload.name,
    plan: payload.plan,
    adminEmail: payload.admin_email,
    adminPassword: payload.admin_password
  });
  if (result.error === "email_exists") {
    return res.status(409).json({ error: "email_exists" });
  }
  return res.status(201).json(result);
});

router.post("/:id/token", authRequired, requireSuperAdmin, (req, res) => {
  const payload = validateOr400(tokenSchema, res, req.body || {});
  if (!payload) return;
  const tenantId = req.params.id;
  const email = payload.email;
  if (!email) {
    return res.status(400).json({ error: "missing_email" });
  }
  const user = findUserByEmailInTenant({ tenantId, email });
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
      role: user.role
    },
    env.jwtSecret,
    { expiresIn: "1h" }
  );
  return res.json({ token });
});

module.exports = router;
