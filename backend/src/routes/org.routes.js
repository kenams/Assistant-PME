const express = require("express");
const { z } = require("zod");
const { authRequired } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/roles");
const { getTenantById } = require("../services/users.service");
const { updateTenant } = require("../services/tenants.service");
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
  teams_webhook_url: z.string().url().optional().or(z.literal("")),
  mailbox_enabled: z.boolean().optional(),
  mailbox_provider: z.enum(["gmail", "outlook", "custom"]).optional(),
  mailbox_host: z.string().min(1).optional().or(z.literal("")),
  mailbox_port: z.number().int().min(1).max(65535).optional(),
  mailbox_tls: z.boolean().optional(),
  mailbox_user: z.string().min(1).optional().or(z.literal("")),
  mailbox_password: z.string().min(1).optional().or(z.literal("")),
  mailbox_folder: z.string().min(1).optional().or(z.literal("")),
  mailbox_subject_prefix: z.string().optional().or(z.literal("")),
  slack_signing_secret: z.string().min(6).optional().or(z.literal("")),
  teams_signing_secret: z.string().min(6).optional().or(z.literal("")),
  oauth_google_client_id: z.string().min(1).optional().or(z.literal("")),
  oauth_google_client_secret: z.string().min(1).optional().or(z.literal("")),
  oauth_google_redirect_uri: z.string().url().optional().or(z.literal("")),
  oauth_google_scopes: z.string().optional().or(z.literal("")),
  oauth_outlook_client_id: z.string().min(1).optional().or(z.literal("")),
  oauth_outlook_client_secret: z.string().min(1).optional().or(z.literal("")),
  oauth_outlook_redirect_uri: z.string().url().optional().or(z.literal("")),
  oauth_outlook_scopes: z.string().optional().or(z.literal(""))
});

function sanitizeSettings(settings) {
  const safe = { ...settings };
  delete safe.oauth_google_access_token;
  delete safe.oauth_google_refresh_token;
  delete safe.oauth_google_state;
  delete safe.oauth_outlook_access_token;
  delete safe.oauth_outlook_refresh_token;
  delete safe.oauth_outlook_state;
  return {
    ...safe,
    oauth_google_connected: Boolean(settings.oauth_google_access_token),
    oauth_google_expires_at: settings.oauth_google_expires_at || "",
    oauth_outlook_connected: Boolean(settings.oauth_outlook_access_token),
    oauth_outlook_expires_at: settings.oauth_outlook_expires_at || ""
  };
}

const orgUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  plan: z.string().min(1).optional()
});

router.get("/settings", authRequired, (req, res) => {
  const tenantId = req.user.tenant_id;
  const settings = getOrgSettings({ tenantId });
  return res.json(sanitizeSettings(settings));
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

router.put("/", authRequired, requireAdmin, (req, res) => {
  const payload = validateOr400(orgUpdateSchema, res, req.body);
  if (!payload) {
    return;
  }
  const tenantId = req.user.tenant_id;
  const updated = updateTenant({ tenantId, updates: payload });
  if (!updated) {
    return res.status(404).json({ error: "tenant_not_found" });
  }
  return res.json(updated);
});

module.exports = router;
