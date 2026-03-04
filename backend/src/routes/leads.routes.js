const express = require("express");
const { z } = require("zod");
const { authRequired } = require("../middleware/auth");
const { createLead, updateLead, listLeads } = require("../services/leads.service");
const { createNotification } = require("../services/notifications.service");
const { validateOr400 } = require("../utils/validate");
const { buildCsv } = require("../utils/csv");
const { env } = require("../config/env");

const router = express.Router();

const leadSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  company: z.string().min(1).optional(),
  message: z.string().min(1).optional()
});

const leadUpdateSchema = z.object({
  status: z
    .enum(["new", "contacted", "demo", "proposal", "won", "lost"])
    .optional(),
  next_action: z.string().min(1).optional(),
  notes: z.string().min(1).optional(),
  owner: z.string().min(1).optional()
});

const leadChallenges = new Map();

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

function createChallenge() {
  const a = Math.floor(Math.random() * 8) + 2;
  const b = Math.floor(Math.random() * 8) + 2;
  const id = Math.random().toString(36).slice(2, 10);
  const expiresAt = Date.now() + 10 * 60 * 1000;
  leadChallenges.set(id, { answer: String(a + b), expiresAt });
  return { id, question: `${a} + ${b} = ?` };
}

function cleanChallenges() {
  const now = Date.now();
  for (const [id, entry] of leadChallenges.entries()) {
    if (entry.expiresAt <= now) {
      leadChallenges.delete(id);
    }
  }
}

function verifyChallenge(id, answer) {
  cleanChallenges();
  if (!id || !answer) return false;
  const entry = leadChallenges.get(id);
  if (!entry) return false;
  const ok = entry.answer === String(answer).trim();
  if (ok) {
    leadChallenges.delete(id);
  }
  return ok;
}

function leadTokenAllowed(req) {
  if (!env.leadToken && !env.requireLeadToken) {
    return true;
  }
  const headerToken = req.get("X-Lead-Token") || "";
  const bodyToken = req.body ? req.body.token : "";
  return headerToken === env.leadToken || bodyToken === env.leadToken;
}

router.get("/challenge", (req, res) => {
  const challenge = createChallenge();
  return res.json(challenge);
});

router.post("/", (req, res) => {
  const payload = validateOr400(leadSchema, res, req.body);
  if (!payload) {
    return;
  }

  if (!leadTokenAllowed(req)) {
    return res.status(401).json({ error: "invalid_token" });
  }

  const honeypot = req.body ? req.body.company_website : "";
  if (honeypot) {
    return res.status(204).send();
  }

  const allowlist = parseAllowlist(env.leadAllowlistDomains);
  if (!isAllowedDomain(payload.email, allowlist)) {
    return res.status(403).json({ error: "domain_not_allowed" });
  }

  if (env.requireLeadChallenge) {
    const challengeId = req.body ? req.body.challenge_id : "";
    const answer = req.body ? req.body.challenge_answer : "";
    if (!verifyChallenge(challengeId, answer)) {
      return res.status(400).json({ error: "invalid_challenge" });
    }
  }

  const lead = createLead(payload);
  createNotification({
    tenantId: lead.tenant_id,
    userId: null,
    type: "lead_created",
    channel: "email_simulated",
    payload: {
      subject: `Nouveau lead: ${lead.name}`,
      body: `${lead.email} - ${lead.company || ""}`
    }
  });
  return res.status(201).json({ id: lead.id });
});

router.get("/", authRequired, (req, res) => {
  const tenantId = req.user.tenant_id;
  const items = listLeads({ tenantId });
  return res.json({ items });
});

router.put("/:id", authRequired, (req, res) => {
  const payload = validateOr400(leadUpdateSchema, res, req.body);
  if (!payload) {
    return;
  }
  const lead = updateLead({ id: req.params.id, updates: payload });
  if (!lead) {
    return res.status(404).json({ error: "lead_not_found" });
  }
  return res.json(lead);
});

router.get("/export.csv", authRequired, (req, res) => {
  const tenantId = req.user.tenant_id;
  const items = listLeads({ tenantId });
  const headers = [
    "created_at",
    "name",
    "email",
    "company",
    "message",
    "status",
    "next_action",
    "notes",
    "owner"
  ];
  const rows = items.map((lead) => [
    lead.created_at,
    lead.name,
    lead.email,
    lead.company,
    lead.message,
    lead.status,
    lead.next_action,
    lead.notes,
    lead.owner
  ]);

  const csv = buildCsv(headers, rows);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=\"leads.csv\"");
  return res.send(csv);
});

module.exports = router;
