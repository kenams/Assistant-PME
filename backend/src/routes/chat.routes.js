const express = require("express");
const { z } = require("zod");
const { authRequired } = require("../middleware/auth");
const { answerWithLLM } = require("../services/openai.service");
const { getOrgSettings } = require("../services/org.service");
const { searchKb } = require("../services/rag.service");
const {
  draftTicket,
  createTicket,
  findTicketByConversation
} = require("../services/tickets.service");
const { logEvent } = require("../services/audit.service");
const { createNotification } = require("../services/notifications.service");
const { addFeedback } = require("../services/feedback.service");
const {
  createConversation,
  findConversation,
  addMessage,
  getHistory,
  listConversations,
  searchMessages,
  incrementFailure,
  resetFailure,
  updateConversation
} = require("../services/conversations.service");
const { validateOr400 } = require("../utils/validate");

const router = express.Router();

const chatSchema = z.object({
  message: z.string().min(1),
  conversation_id: z.string().optional(),
  language: z.enum(["fr", "en"]).optional()
});

const feedbackSchema = z.object({
  conversation_id: z.string(),
  resolved: z.boolean(),
  rating: z.number().min(1).max(5).optional(),
  comment: z.string().min(1).optional()
});

function isFailureMessage(message) {
  const text = (message || "").toLowerCase();
  return (
    text.includes("marche pas") ||
    text.includes("ne marche pas") ||
    text.includes("toujours") ||
    text.includes("encore") ||
    text.includes("impossible") ||
    text.includes("doesn't work") ||
    text.includes("still") ||
    text.includes("not working") ||
    text.includes("failed")
  );
}

function isSuccessMessage(message) {
  const text = (message || "").toLowerCase();
  return (
    text.includes("merci") ||
    text.includes("ok") ||
    text.includes("c'est bon") ||
    text.includes("resolu") ||
    text.includes("resolved") ||
    text.includes("thanks") ||
    text.includes("fixed")
  );
}

router.post("/", authRequired, async (req, res) => {
  const payload = validateOr400(chatSchema, res, req.body);
  if (!payload) {
    return;
  }

  const tenantId = req.user.tenant_id;
  const userId = req.user.sub;
  const { message, conversation_id, language } = payload;
  const orgSettings = getOrgSettings({ tenantId });

  let conversation = null;
  if (conversation_id) {
    conversation = findConversation({ tenantId, conversationId: conversation_id });
    if (conversation && req.user.role === "user" && conversation.user_id !== userId) {
      return res.status(403).json({ error: "forbidden" });
    }
  }
  if (!conversation) {
    conversation = createConversation({ tenantId, userId });
    logEvent({
      tenantId,
      userId,
      action: "conversation_created",
      meta: { conversation_id: conversation.id }
    });
  }

  addMessage({
    tenantId,
    conversationId: conversation.id,
    role: "user",
    content: message
  });
  logEvent({
    tenantId,
    userId,
    action: "chat_user_message",
    meta: { conversation_id: conversation.id }
  });

  if (isSuccessMessage(message)) {
    updateConversation({
      tenantId,
      conversationId: conversation.id,
      updates: { status: "resolved", failure_count: 0 }
    });
  }

  let failureCount = null;
  if (isFailureMessage(message)) {
    failureCount = incrementFailure({
      tenantId,
      conversationId: conversation.id
    });
  } else {
    resetFailure({ tenantId, conversationId: conversation.id });
  }

  const kbChunks = await searchKb({ tenantId, query: message });
  const llm = await answerWithLLM({
    message,
    kbChunks,
    language: language || "fr",
    orgSettings
  });

  addMessage({
    tenantId,
    conversationId: conversation.id,
    role: "assistant",
    content: llm.answer
  });

  const threshold =
    orgSettings && orgSettings.escalation_threshold
      ? orgSettings.escalation_threshold
      : 2;
  const autoEscalate = failureCount !== null && failureCount >= threshold;
  let ticket = null;
  if (llm.needs_ticket || autoEscalate) {
    const draft = llm.ticket_draft || draftTicket({ message });
    const existing = findTicketByConversation({
      tenantId,
      conversationId: conversation.id
    });
    ticket =
      existing ||
      (await createTicket({
        tenantId,
        conversationId: conversation.id,
        draft
      }));
    updateConversation({
      tenantId,
      conversationId: conversation.id,
      updates: { status: "escalated" }
    });
    logEvent({
      tenantId,
      userId,
      action: "ticket_created",
      meta: { ticket_id: ticket.id }
    });
    createNotification({
      tenantId,
      userId,
      type: "ticket_created",
      channel: "email_simulated",
      payload: {
        subject: `Nouveau ticket: ${ticket.title}`,
        body: ticket.description
      }
    });
  }

  const needsTicket = llm.needs_ticket || autoEscalate;
  return res.json({
    conversation_id: conversation.id,
    answer: llm.answer,
    needs_ticket: needsTicket,
    ticket,
    sources: kbChunks
  });
});

router.post("/feedback", authRequired, (req, res) => {
  const payload = feedbackSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ error: "invalid_payload" });
  }

  const tenantId = req.user.tenant_id;
  const { conversation_id, resolved, rating, comment } = payload.data;
  const conversation = findConversation({ tenantId, conversationId: conversation_id });
  if (!conversation) {
    return res.status(404).json({ error: "conversation_not_found" });
  }
  if (req.user.role === "user" && conversation.user_id !== req.user.sub) {
    return res.status(403).json({ error: "forbidden" });
  }

  addFeedback({
    tenantId,
    conversationId: conversation_id,
    userId: req.user.sub,
    resolved,
    rating,
    comment
  });

  if (resolved) {
    updateConversation({
      tenantId,
      conversationId: conversation_id,
      updates: { status: "resolved", failure_count: 0 }
    });
  } else {
    const count = incrementFailure({ tenantId, conversationId: conversation_id });
    if (count !== null && count >= 2) {
      const existing = findTicketByConversation({ tenantId, conversationId: conversation_id });
      if (!existing) {
        const draft = draftTicket({ message: comment || "Issue unresolved" });
        const ticket = createTicket({
          tenantId,
          conversationId: conversation_id,
          draft
        });
        updateConversation({
          tenantId,
          conversationId: conversation_id,
          updates: { status: "escalated" }
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
      }
    }
  }

  logEvent({
    tenantId,
    userId: req.user.sub,
    action: "conversation_feedback",
    meta: { conversation_id, resolved, rating: rating || null }
  });

  return res.json({ ok: true });
});
router.get("/history", authRequired, (req, res) => {
  const conversationId = req.query.conversation_id;
  if (!conversationId) {
    return res.status(400).json({ error: "missing_conversation_id" });
  }

  const tenantId = req.user.tenant_id;
  const conversation = findConversation({ tenantId, conversationId });
  if (!conversation) {
    return res.status(404).json({ error: "conversation_not_found" });
  }
  if (req.user.role === "user" && conversation.user_id !== req.user.sub) {
    return res.status(403).json({ error: "forbidden" });
  }
  const items = getHistory({ tenantId, conversationId });
  return res.json({ items });
});

router.get("/conversations", authRequired, (req, res) => {
  const tenantId = req.user.tenant_id;
  const query = req.query.query || "";
  const items = listConversations({
    tenantId,
    query,
    userId: req.user.sub,
    role: req.user.role
  });
  return res.json({ items });
});

router.get("/search", authRequired, (req, res) => {
  const tenantId = req.user.tenant_id;
  const query = req.query.query || "";
  const items = searchMessages({
    tenantId,
    query,
    userId: req.user.sub,
    role: req.user.role
  });
  return res.json({ items });
});

module.exports = router;

