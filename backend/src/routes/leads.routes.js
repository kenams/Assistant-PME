const express = require("express");
const { z } = require("zod");
const { authRequired } = require("../middleware/auth");
const { createLead, updateLead, listLeads } = require("../services/leads.service");
const { createNotification } = require("../services/notifications.service");
const { validateOr400 } = require("../utils/validate");
const { buildCsv } = require("../utils/csv");

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

router.post("/", (req, res) => {
  const payload = validateOr400(leadSchema, res, req.body);
  if (!payload) {
    return;
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
