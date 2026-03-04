const express = require("express");
const { z } = require("zod");
const { env } = require("../config/env");
const { validateOr400 } = require("../utils/validate");
const { ingestSupport } = require("../services/ingest.service");
const { fetchMailboxOnce } = require("../services/mailbox.service");
const { authRequired } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/roles");

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
  if (!env.supportIngestToken) {
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

router.post("/support", async (req, res) => {
  const payload = validateOr400(ingestSchema, res, req.body);
  if (!payload) {
    return;
  }
  if (!tokenAllowed(req)) {
    return res.status(401).json({ error: "invalid_token" });
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

router.post("/slack", async (req, res) => {
  if (!tokenAllowed(req)) {
    return res.status(401).json({ error: "invalid_token" });
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

router.post("/teams", async (req, res) => {
  if (!tokenAllowed(req)) {
    return res.status(401).json({ error: "invalid_token" });
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
