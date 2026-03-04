const express = require("express");
const { z } = require("zod");
const { authRequired } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/roles");
const { getTenantById } = require("../services/users.service");
const { getOrgSettings, updateOrgSettings } = require("../services/org.service");
const { validateOr400 } = require("../utils/validate");

const router = express.Router();

router.get("/", authRequired, (req, res) => {
  const tenant = getTenantById(req.user.tenant_id);
  if (!tenant) {
    return res.status(404).json({ error: "tenant_not_found" });
  }
  return res.json(tenant);
});

const settingsSchema = z.object({
  support_email: z.string().email().optional().or(z.literal("")),
  support_phone: z.string().min(1).optional().or(z.literal("")),
  support_hours: z.string().min(1).optional().or(z.literal("")),
  escalation_threshold: z.number().int().min(1).max(5).optional(),
  signature: z.string().min(1).optional().or(z.literal("")),
  notify_on_ticket_created: z.boolean().optional(),
  webhook_url: z.string().url().optional().or(z.literal("")),
  webhook_secret: z.string().min(6).optional().or(z.literal("")),
  slack_webhook_url: z.string().url().optional().or(z.literal("")),
  teams_webhook_url: z.string().url().optional().or(z.literal(""))
});

router.get("/settings", authRequired, (req, res) => {
  const tenantId = req.user.tenant_id;
  return res.json(getOrgSettings({ tenantId }));
});

router.put("/settings", authRequired, requireAdmin, (req, res) => {
  const payload = validateOr400(settingsSchema, res, req.body);
  if (!payload) {
    return;
  }
  const tenantId = req.user.tenant_id;
  const next = updateOrgSettings({ tenantId, payload });
  return res.json(next);
});

module.exports = router;
