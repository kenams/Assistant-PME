const express = require("express");
const crypto = require("crypto");
const { z } = require("zod");
const { env } = require("../config/env");
const { validateOr400 } = require("../utils/validate");
const { getDefaultTenantId } = require("../services/tenants.service");
const { findUserByEmailInTenant, createUser } = require("../services/users.service");
const { createConversation, addMessage, updateConversation } = require("../services/conversations.service");
const { createTicket } = require("../services/tickets.service");
const { logEvent } = require("../services/audit.service");
const { createNotification } = require("../services/notifications.service");

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
  const tenantId = getDefaultTenantId();
  if (!tenantId) {
    return res.status(500).json({ error: "tenant_not_found" });
  }

  let user = findUserByEmailInTenant({ tenantId, email: payload.from_email });
  if (!user) {
    const tempPassword = crypto.randomBytes(9).toString("base64url");
    const created = createUser({
      tenantId,
      email: payload.from_email,
      password: tempPassword,
      role: "user"
    });
    if (created.user) {
      user = created.user;
    }
  }

  const conversation = createConversation({
    tenantId,
    userId: user ? user.id : null
  });

  const body = payload.body || "";
  const subject = payload.subject || "Demande support";
  const message = `Sujet: ${subject}\n\n${body}`.trim();

  addMessage({
    tenantId,
    conversationId: conversation.id,
    role: "user",
    content: message
  });

  const draft = {
    title: `Email: ${subject}`.slice(0, 120),
    summary: `Demande depuis ${payload.from_email}\n\n${body}`.trim(),
    category: payload.category || payload.source || "email",
    priority: payload.priority || "medium"
  };

  const ticket = await createTicket({
    tenantId,
    conversationId: conversation.id,
    draft
  });

  updateConversation({
    tenantId,
    conversationId: conversation.id,
    updates: { status: "escalated" }
  });

  logEvent({
    tenantId,
    userId: user ? user.id : null,
    action: "ticket_ingested",
    meta: { ticket_id: ticket.id, source: payload.source || "email" }
  });

  createNotification({
    tenantId,
    userId: user ? user.id : null,
    type: "ticket_ingested",
    channel: "support_ingest",
    payload: {
      subject,
      from: payload.from_email
    }
  });

  return res.status(201).json({
    ok: true,
    ticket_id: ticket.id,
    conversation_id: conversation.id
  });
});

module.exports = router;
