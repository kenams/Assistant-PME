const express = require("express");
const { z } = require("zod");
const { authRequired } = require("../middleware/auth");
const { requireStaff } = require("../middleware/roles");
const {
  createTicket,
  listTickets,
  listTicketsByConversation,
  listTicketsByUser,
  updateTicket
} = require("../services/tickets.service");
const { findConversation } = require("../services/conversations.service");
const { getTenantById } = require("../services/users.service");
const { logEvent } = require("../services/audit.service");
const { createNotification } = require("../services/notifications.service");
const { buildTicketsPdf } = require("../services/pdf.service");
const { validateOr400 } = require("../utils/validate");
const { buildCsv } = require("../utils/csv");

const router = express.Router();

const ticketSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  category: z.string().min(1),
  priority: z.enum(["low", "medium", "high"])
});

const ticketUpdateSchema = z.object({
  status: z.enum(["open", "pending", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  category: z.string().min(1).optional()
});

function parseDateParam(value, endOfDay) {
  if (!value) return null;
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  if (isDateOnly && endOfDay) {
    date.setHours(23, 59, 59, 999);
  }
  return date;
}

function filterTickets(items, query) {
  const from = parseDateParam(query.from, false);
  const to = parseDateParam(query.to, true);
  const status = (query.status || "").toLowerCase();
  const category = (query.category || "").toLowerCase();
  const priority = (query.priority || "").toLowerCase();

  return items.filter((ticket) => {
    const created = ticket.created_at ? new Date(ticket.created_at) : null;
    if (from && created && created < from) return false;
    if (to && created && created > to) return false;
    if (status && (ticket.status || "").toLowerCase() !== status) return false;
    if (category && (ticket.category || "").toLowerCase() !== category) return false;
    if (priority && (ticket.priority || "").toLowerCase() !== priority) return false;
    return true;
  });
}

router.post("/", authRequired, async (req, res) => {
  const payload = validateOr400(ticketSchema, res, req.body);
  if (!payload) {
    return;
  }

  const tenantId = req.user.tenant_id;
  const ticket = await createTicket({
    tenantId,
    conversationId: null,
    draft: payload
  });

  logEvent({
    tenantId,
    userId: req.user.sub,
    action: "ticket_created",
    meta: { ticket_id: ticket.id }
  });

  createNotification({
    tenantId,
    userId: req.user.sub,
    type: "ticket_created",
    channel: "email_simulated",
    payload: {
      subject: `Nouveau ticket: ${ticket.title}`,
      body: ticket.description
    }
  });

  return res.status(201).json(ticket);
});

router.get("/", authRequired, requireStaff, (req, res) => {
  const tenantId = req.user.tenant_id;
  const items = filterTickets(listTickets({ tenantId }), req.query || {});
  return res.json({ items });
});

router.get("/export.csv", authRequired, requireStaff, (req, res) => {
  const tenantId = req.user.tenant_id;
  const items = filterTickets(listTickets({ tenantId }), req.query || {});
  const headers = [
    "created_at",
    "title",
    "description",
    "category",
    "priority",
    "status"
  ];
  const rows = items.map((ticket) => [
    ticket.created_at,
    ticket.title,
    ticket.description,
    ticket.category,
    ticket.priority,
    ticket.status
  ]);

  const csv = buildCsv(headers, rows);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=\"tickets.csv\"");
  return res.send(csv);
});

router.get("/export.pdf", authRequired, requireStaff, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const items = filterTickets(listTickets({ tenantId }), req.query || {});
  const tenant = getTenantById(tenantId);
  const pdf = await buildTicketsPdf({
    tickets: items,
    filters: req.query || {},
    tenantName: tenant ? tenant.name : null
  });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=\"tickets.pdf\"");
  return res.send(pdf);
});

router.patch("/:id", authRequired, requireStaff, (req, res) => {
  const payload = validateOr400(ticketUpdateSchema, res, req.body);
  if (!payload) {
    return;
  }
  const tenantId = req.user.tenant_id;
  const ticketId = req.params.id;
  const updated = updateTicket({ tenantId, ticketId, updates: payload });
  if (!updated) {
    return res.status(404).json({ error: "ticket_not_found" });
  }
  logEvent({
    tenantId,
    userId: req.user.sub,
    action: "ticket_updated",
    meta: { ticket_id: ticketId, updates: payload }
  });
  return res.json(updated);
});

router.get("/conversation/:id", authRequired, (req, res) => {
  const tenantId = req.user.tenant_id;
  const conversationId = req.params.id;
  const conversation = findConversation({ tenantId, conversationId });
  if (!conversation) {
    return res.status(404).json({ error: "conversation_not_found" });
  }
  if (req.user.role === "user" && conversation.user_id !== req.user.sub) {
    return res.status(403).json({ error: "forbidden" });
  }
  const items = listTicketsByConversation({ tenantId, conversationId });
  return res.json({ items });
});

router.get("/user/:id", authRequired, requireStaff, (req, res) => {
  const tenantId = req.user.tenant_id;
  const userId = req.params.id;
  const items = listTicketsByUser({ tenantId, userId });
  return res.json({ items });
});

router.get("/mine", authRequired, (req, res) => {
  const tenantId = req.user.tenant_id;
  const userId = req.user.sub;
  const items = listTicketsByUser({ tenantId, userId });
  return res.json({ items });
});

module.exports = router;
