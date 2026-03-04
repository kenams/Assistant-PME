const express = require("express");
const { z } = require("zod");
const { authRequired } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/roles");
const { validateOr400 } = require("../utils/validate");
const { createUser, listUsers } = require("../services/users.service");
const {
  createInvite,
  listInvites,
  revokeInvite,
  acceptInvite
} = require("../services/invites.service");
const { logEvent } = require("../services/audit.service");

const router = express.Router();

const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["admin", "agent", "user"]).optional()
});

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "agent", "user"]).optional(),
  expires_hours: z.number().int().min(1).max(168).optional()
});

const acceptSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(6)
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

router.get("/invites", authRequired, requireAdmin, (req, res) => {
  const tenantId = req.user.tenant_id;
  const items = listInvites({ tenantId });
  return res.json({ items });
});

router.post("/invite", authRequired, requireAdmin, (req, res) => {
  const payload = validateOr400(inviteSchema, res, req.body);
  if (!payload) {
    return;
  }
  const tenantId = req.user.tenant_id;
  const result = createInvite({
    tenantId,
    email: payload.email,
    role: payload.role || "user",
    expiresHours: payload.expires_hours || 72,
    createdBy: req.user.sub
  });
  if (result.error === "email_exists") {
    return res.status(409).json({ error: "email_exists" });
  }

  logEvent({
    tenantId,
    userId: req.user.sub,
    action: "invite_created",
    meta: { email: payload.email, role: payload.role || "user" }
  });

  const inviteUrl = `/app/?invite=${result.invite.token}`;
  return res.status(201).json({ invite: result.invite, invite_url: inviteUrl });
});

router.delete("/invite/:id", authRequired, requireAdmin, (req, res) => {
  const tenantId = req.user.tenant_id;
  const updated = revokeInvite({ tenantId, inviteId: req.params.id });
  if (!updated) {
    return res.status(404).json({ error: "invite_not_found" });
  }
  logEvent({
    tenantId,
    userId: req.user.sub,
    action: "invite_revoked",
    meta: { invite_id: req.params.id }
  });
  return res.json({ ok: true });
});

router.post("/invite/accept", (req, res) => {
  const payload = validateOr400(acceptSchema, res, req.body);
  if (!payload) {
    return;
  }
  const result = acceptInvite({
    token: payload.token,
    password: payload.password
  });
  if (result.error === "invalid_token") {
    return res.status(404).json({ error: "invalid_token" });
  }
  if (result.error === "invite_expired") {
    return res.status(410).json({ error: "invite_expired" });
  }
  if (result.error === "invite_not_active") {
    return res.status(409).json({ error: "invite_not_active" });
  }
  if (result.error === "email_exists") {
    return res.status(409).json({ error: "email_exists" });
  }
  return res.status(201).json({ ok: true, email: result.user.email });
});

module.exports = router;
