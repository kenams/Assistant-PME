const express = require("express");
const { z } = require("zod");
const { authRequired } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/roles");
const { validateOr400 } = require("../utils/validate");
const { createUser, listUsers } = require("../services/users.service");
const { logEvent } = require("../services/audit.service");

const router = express.Router();

const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["admin", "agent", "user"]).optional()
});

router.get("/", authRequired, requireAdmin, (req, res) => {
  const tenantId = req.user.tenant_id;
  const items = listUsers({ tenantId });
  return res.json({ items });
});

router.post("/", authRequired, requireAdmin, (req, res) => {
  const payload = validateOr400(userSchema, res, req.body);
  if (!payload) {
    return;
  }
  const tenantId = req.user.tenant_id;
  const result = createUser({
    tenantId,
    email: payload.email,
    password: payload.password,
    role: payload.role || "user"
  });
  if (result.error === "email_exists") {
    return res.status(409).json({ error: "email_exists" });
  }

  logEvent({
    tenantId,
    userId: req.user.sub,
    action: "user_created",
    meta: { user_id: result.user.id, email: result.user.email }
  });
  return res.status(201).json(result.user);
});

module.exports = router;
