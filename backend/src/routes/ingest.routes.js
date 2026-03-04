const express = require("express");
const { z } = require("zod");
const { env } = require("../config/env");
const { validateOr400 } = require("../utils/validate");
const { ingestSupport } = require("../services/ingest.service");
const { fetchMailboxOnce } = require("../services/mailbox.service");
const { authRequired } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/roles");
const { getOrgSettings } = require("../services/org.service");
const { getDefaultTenantId } = require("../services/tenants.service");
const { verifySlackSignature } = require("../services/slack.service");
const { verifyHmacSignature } = require("../services/signature.service");
const { ingestLimiter } = require("../middleware/rate-limit");

const router = express.Router();

const ingestSchema = z.object({
  from_email: z.string().email(),
  subject: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  source: z.string().min(1).optional()
});

function tokenAllowed(req) {
  if (!env.supportIngestToken && !env.requireIngestToken) {
    return true;
  }
  const headerToken = req.get("X-Ingest-Token") || "";
  const queryToken = req.query.token || "";
  const bodyToken = req.body ? req.body.token : "";
  return (
    headerToken === env.supportIngestToken ||
    queryToken === env.supportIngestToken ||
    bodyToken === env.supportIngestToken
  );
}

function getTenantSettings() {
  const tenantId = getDefaultTenantId();
  if (!tenantId) return null;
  return getOrgSettings({ tenantId });
}

function parseAllowlist(raw) {
  return (raw || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function isAllowedDomain(email, allowlist) {
  if (!allowlist.length) return true;
  const domain = (email.split("@")[1] || "").toLowerCase();
  return allowlist.includes(domain);
}

router.post("/support", ingestLimiter(), async (req, res) => {
  const payload = validateOr400(ingestSchema, res, req.body);
  if (!payload) {
    return;
  }
  if (!tokenAllowed(req)) {
    return res.status(401).json({ error: "invalid_token" });
  }
  const allowlist = parseAllowlist(env.ingestAllowlistDomains);
  if (!isAllowedDomain(payload.from_email, allowlist)) {
    return res.status(403).json({ error: "domain_not_allowed" });
  }
  try {
    const result = await ingestSupport({
      fromEmail: payload.from_email,
      subject: payload.subject,
      body: payload.body,
      category: payload.category,
      priority: payload.priority,
      source: payload.source || "email"
    });
    return res.status(201).json({
      ok: true,
      ticket_id: result.ticket.id,
      conversation_id: result.conversation.id
    });
  } catch (err) {
    return res.status(500).json({ error: "ingest_failed" });
  }
});

router.post("/slack", ingestLimiter(), async (req, res) => {
  if (!tokenAllowed(req)) {
    return res.status(401).json({ error: "invalid_token" });
  }
  const settings = getTenantSettings();
  if (settings && settings.slack_signing_secret) {
    const signature = req.get("X-Slack-Signature");
    const timestamp = req.get("X-Slack-Request-Timestamp");
    const rawBody = req.rawBody || "";
    if (
      !verifySlackSignature({
        rawBody,
        signingSecret: settings.slack_signing_secret,
        timestamp,
        signature
      })
    ) {
      return res.status(401).json({ error: "invalid_signature" });
    }
  }
  if (req.body && req.body.type === "url_verification") {
    return res.json({ challenge: req.body.challenge });
  }

  const payload = req.body || {};
  const event = payload.event || {};
  const text =
    payload.text ||
    event.text ||
    (payload.command ? `${payload.command} ${payload.text || ""}`.trim() : "");
  if (!text) {
    return res.status(400).json({ error: "missing_text" });
  }
  const user =
    payload.user_name ||
    payload.user ||
    event.user ||
    event.username ||
    "slack-user";
  const channel = payload.channel_name || payload.channel || event.channel || "slack";
  const subject = `Slack: ${channel}`;

  try {
    const result = await ingestSupport({
      fromName: user,
      subject,
      body: text,
      category: "slack",
      priority: "medium",
      source: "slack"
    });
    return res.status(201).json({
      ok: true,
      ticket_id: result.ticket.id,
      conversation_id: result.conversation.id
    });
  } catch (err) {
    return res.status(500).json({ error: "ingest_failed" });
  }
});

router.post("/teams", ingestLimiter(), async (req, res) => {
  if (!tokenAllowed(req)) {
    return res.status(401).json({ error: "invalid_token" });
  }
  const settings = getTenantSettings();
  if (settings && settings.teams_signing_secret) {
    const signature = req.get("X-Teams-Signature");
    const rawBody = req.rawBody || "";
    if (
      !verifyHmacSignature({
        rawBody,
        secret: settings.teams_signing_secret,
        signature
      })
    ) {
      return res.status(401).json({ error: "invalid_signature" });
    }
  }
  const payload = req.body || {};
  const text = payload.text || payload.summary || payload.title || "";
  if (!text) {
    return res.status(400).json({ error: "missing_text" });
  }
  const fromName =
    payload.from?.name || payload.from?.id || payload.user || "teams-user";
  const subject = payload.title || "Teams";
  try {
    const result = await ingestSupport({
      fromName,
      subject: `Teams: ${subject}`,
      body: text,
      category: "teams",
      priority: "medium",
      source: "teams"
    });
    return res.status(201).json({
      ok: true,
      ticket_id: result.ticket.id,
      conversation_id: result.conversation.id
    });
  } catch (err) {
    return res.status(500).json({ error: "ingest_failed" });
  }
});

router.post("/email/pull", authRequired, requireAdmin, async (req, res) => {
  try {
    const result = await fetchMailboxOnce();
    return res.json({ ok: true, processed: result.processed || 0 });
  } catch (err) {
    return res.status(500).json({ error: "mailbox_pull_failed" });
  }
});

module.exports = router;
