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
const { hashPassword, verifyPassword } = require("../utils/crypto");
const { db } = require("../config/db");

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

router.get("/", authRequired, requireAdmin, async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const items = await listUsers({ tenantId });
    return res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.post("/", authRequired, requireAdmin, async (req, res, next) => {
  try {
    const payload = validateOr400(userSchema, res, req.body);
    if (!payload) {
      return;
    }
    const tenantId = req.user.tenant_id;
    const result = await createUser({
      tenantId,
      email: payload.email,
      password: payload.password,
      role: payload.role || "user"
    });
    if (result.error === "email_exists") {
      return res.status(409).json({ error: "email_exists" });
    }

    await logEvent({
      tenantId,
      userId: req.user.sub,
      action: "user_created",
      meta: { user_id: result.user.id, email: result.user.email }
    });
    return res.status(201).json(result.user);
  } catch (err) {
    next(err);
  }
});

router.get("/invites", authRequired, requireAdmin, async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const items = await listInvites({ tenantId });
    return res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.post("/invite", authRequired, requireAdmin, async (req, res, next) => {
  try {
    const payload = validateOr400(inviteSchema, res, req.body);
    if (!payload) {
      return;
    }
    const tenantId = req.user.tenant_id;
    const result = await createInvite({
      tenantId,
      email: payload.email,
      role: payload.role || "user",
      expiresHours: payload.expires_hours || 72,
      createdBy: req.user.sub
    });
    if (result.error === "email_exists") {
      return res.status(409).json({ error: "email_exists" });
    }

    await logEvent({
      tenantId,
      userId: req.user.sub,
      action: "invite_created",
      meta: { email: payload.email, role: payload.role || "user" }
    });

    const inviteUrl = `/app/?invite=${result.invite.token}`;
    return res.status(201).json({ invite: result.invite, invite_url: inviteUrl });
  } catch (err) {
    next(err);
  }
});

router.delete("/invite/:id", authRequired, requireAdmin, async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const updated = await revokeInvite({ tenantId, inviteId: req.params.id });
    if (!updated) {
      return res.status(404).json({ error: "invite_not_found" });
    }
    await logEvent({
      tenantId,
      userId: req.user.sub,
      action: "invite_revoked",
      meta: { invite_id: req.params.id }
    });
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.put("/me/password", authRequired, async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body || {};
    if (!current_password || !new_password || new_password.length < 6) {
      return res.status(400).json({ error: "invalid_payload" });
    }
    const user = await db("users").where({ id: req.user.sub }).first();
    if (!user) return res.status(404).json({ error: "user_not_found" });
    if (!verifyPassword(current_password, user.password_hash)) {
      return res.status(401).json({ error: "invalid_current_password" });
    }
    await db("users").where({ id: req.user.sub }).update({ password_hash: hashPassword(new_password) });
    await logEvent({
      tenantId: req.user.tenant_id,
      userId: req.user.sub,
      action: "user_password_changed",
      meta: {}
    });
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post("/invite/accept", async (req, res, next) => {
  try {
    const payload = validateOr400(acceptSchema, res, req.body);
    if (!payload) {
      return;
    }
    const result = await acceptInvite({
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
  } catch (err) {
    next(err);
  }
});

module.exports = router;
