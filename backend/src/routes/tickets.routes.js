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
const { findConversation, getHistory } = require("../services/conversations.service");
const { getTenantById } = require("../services/users.service");
const { logEvent } = require("../services/audit.service");
const { createNotification } = require("../services/notifications.service");
const { buildTicketsPdf } = require("../services/pdf.service");
const { validateOr400 } = require("../utils/validate");
const { buildCsv } = require("../utils/csv");
const { maybeGenerateKbFromTicket } = require("../services/auto-kb.service");

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

const ticketDraftSchema = z.object({
  conversation_id: z.string().optional(),
  message: z.string().min(1).optional()
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

router.post("/", authRequired, async (req, res, next) => {
  try {
    const payload = validateOr400(ticketSchema, res, req.body);
    if (!payload) {
      return;
    }

    const tenantId = req.user.tenant_id;
    const ticket = await createTicket({
      tenantId,
      conversationId: null,
      userId: req.user.sub,
      draft: payload
    });

    await logEvent({
      tenantId,
      userId: req.user.sub,
      action: "ticket_created",
      meta: { ticket_id: ticket.id }
    });

    await createNotification({
      tenantId,
      userId: req.user.sub,
      type: "ticket_created",
      channel: "email",
      payload: { ticket, subject: `Nouveau ticket: ${ticket.title}`, body: ticket.description }
    });

    return res.status(201).json(ticket);
  } catch (err) {
    next(err);
  }
});

router.post("/draft", authRequired, async (req, res, next) => {
  try {
    const payload = validateOr400(ticketDraftSchema, res, req.body);
    if (!payload) {
      return;
    }
    const tenantId = req.user.tenant_id;
    const { conversation_id, message } = payload;
    let sourceMessage = message || "";
    if (!sourceMessage && conversation_id) {
      const conversation = await findConversation({ tenantId, conversationId: conversation_id });
      if (!conversation) {
        return res.status(404).json({ error: "conversation_not_found" });
      }
      if (req.user.role === "user" && conversation.user_id !== req.user.sub) {
        return res.status(403).json({ error: "forbidden" });
      }
      const messages = await getHistory({ tenantId, conversationId: conversation_id });
      const lastUser = [...messages].reverse().find((msg) => msg.role === "user");
      sourceMessage = lastUser ? lastUser.content : "Demande utilisateur";
    }
    const draft = draftTicket({ message: sourceMessage || "Demande utilisateur" });
    return res.json({ draft });
  } catch (err) {
    next(err);
  }
});

router.get("/", authRequired, requireStaff, async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const items = filterTickets(await listTickets({ tenantId }), req.query || {});
    return res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.get("/export.csv", authRequired, requireStaff, async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const items = filterTickets(await listTickets({ tenantId }), req.query || {});
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
  } catch (err) {
    next(err);
  }
});

router.get("/export.pdf", authRequired, requireStaff, async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const items = filterTickets(await listTickets({ tenantId }), req.query || {});
    const tenant = await getTenantById(tenantId);
    const pdf = await buildTicketsPdf({
      tickets: items,
      filters: req.query || {},
      tenantName: tenant ? tenant.name : null
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=\"tickets.pdf\"");
    return res.send(pdf);
  } catch (err) {
    next(err);
  }
});

router.patch("/:id", authRequired, requireStaff, async (req, res, next) => {
  try {
    const payload = validateOr400(ticketUpdateSchema, res, req.body);
    if (!payload) {
      return;
    }
    const tenantId = req.user.tenant_id;
    const ticketId = req.params.id;
    const updated = await updateTicket({ tenantId, ticketId, updates: payload });
    if (!updated) {
      return res.status(404).json({ error: "ticket_not_found" });
    }
    await logEvent({
      tenantId,
      userId: req.user.sub,
      action: "ticket_updated",
      meta: { ticket_id: ticketId, updates: payload }
    });
    if (payload.status === "resolved" || payload.status === "closed") {
      maybeGenerateKbFromTicket({ tenantId, ticket: updated }).catch(() => {});
    }
    return res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.get("/conversation/:id", authRequired, async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const conversationId = req.params.id;
    const conversation = await findConversation({ tenantId, conversationId });
    if (!conversation) {
      return res.status(404).json({ error: "conversation_not_found" });
    }
    if (req.user.role === "user" && conversation.user_id !== req.user.sub) {
      return res.status(403).json({ error: "forbidden" });
    }
    const items = await listTicketsByConversation({ tenantId, conversationId });
    return res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.get("/user/:id", authRequired, requireStaff, async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.params.id;
    const items = await listTicketsByUser({ tenantId, userId });
    return res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.get("/mine", authRequired, async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.sub;
    const items = await listTicketsByUser({ tenantId, userId });
    return res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.get("/mine/export.csv", authRequired, async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.sub;
    const items = await listTicketsByUser({ tenantId, userId });
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
    res.setHeader("Content-Disposition", "attachment; filename=\"mes_tickets.csv\"");
    return res.send(csv);
  } catch (err) {
    next(err);
  }
});

router.get("/mine/export.pdf", authRequired, async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.sub;
    const items = await listTicketsByUser({ tenantId, userId });
    const tenant = await getTenantById(tenantId);
    const pdf = await buildTicketsPdf({
      tickets: items,
      filters: { owner: "me" },
      tenantName: tenant ? tenant.name : null
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=\"mes_tickets.pdf\"");
    return res.send(pdf);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", authRequired, async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const { db } = require("../config/db");
    const ticket = await db("tickets").where({ id: req.params.id, tenant_id: tenantId }).first();
    if (!ticket) return res.status(404).json({ error: "ticket_not_found" });
    if (req.user.role === "user") {
      // Check ownership via user_id (direct), or via conversation owner
      const isDirectOwner = ticket.user_id && ticket.user_id === req.user.sub;
      if (!isDirectOwner) {
        const conv = ticket.conversation_id
          ? await db("conversations").where({ id: ticket.conversation_id, tenant_id: tenantId }).first()
          : null;
        if (!conv || conv.user_id !== req.user.sub) {
          return res.status(403).json({ error: "forbidden" });
        }
      }
    }
    return res.json(ticket);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
