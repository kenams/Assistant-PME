const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { z } = require("zod");
const { authRequired } = require("../middleware/auth");
const { answerWithLLM } = require("../services/openai.service");
const { getOrgSettings } = require("../services/org.service");
const { searchKb, ensureProcedureForQuickIssue } = require("../services/rag.service");
const {
  draftTicket,
  createTicket,
  findTicketByConversation
} = require("../services/tickets.service");
const { logEvent } = require("../services/audit.service");
const { createNotification } = require("../services/notifications.service");
const { addFeedback } = require("../services/feedback.service");
const {
  trackQuickIssue,
  listQuickIssues,
  searchQuickIssues
} = require("../services/quick-issues.service");
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

const uploadDir = path.join(process.cwd(), "data", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase() || ".png";
      cb(null, `${crypto.randomUUID()}${ext}`);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("invalid_file_type"));
    }
  }
});

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  conversation_id: z.string().optional(),
  language: z.enum(["fr", "en"]).optional(),
  context: z
    .object({
      device: z.string().min(1).optional(),
      os: z.string().min(1).optional(),
      location: z.string().min(1).optional(),
      urgency: z.string().min(1).optional(),
      contact: z.string().min(1).optional()
    })
    .optional()
});

const feedbackSchema = z.object({
  conversation_id: z.string(),
  resolved: z.boolean(),
  rating: z.number().min(1).max(5).optional(),
  comment: z.string().min(1).optional()
});

const escalateSchema = z.object({
  conversation_id: z.string(),
  reason: z.string().optional()
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

function formatContextBlock(context) {
  if (!context) return "";
  const lines = [];
  if (context.device) lines.push(`Poste: ${context.device}`);
  if (context.os) lines.push(`OS: ${context.os}`);
  if (context.location) lines.push(`Site: ${context.location}`);
  if (context.urgency) lines.push(`Urgence: ${context.urgency}`);
  if (context.contact) lines.push(`Contact: ${context.contact}`);
  if (!lines.length) return "";
  return `Contexte utilisateur\n${lines.join("\n")}`;
}

router.post("/", authRequired, async (req, res) => {
  const payload = validateOr400(chatSchema, res, req.body);
  if (!payload) {
    return;
  }

  const tenantId = req.user.tenant_id;
  const userId = req.user.sub;
  const message = payload.message.trim();
  const { conversation_id, language, context } = payload;
  if (!message) {
    return res.status(400).json({ error: "empty_message" });
  }
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
  } else if (conversation.status === "resolved") {
    updateConversation({
      tenantId,
      conversationId: conversation.id,
      updates: { status: "open", failure_count: 0 }
    });
  }

  addMessage({
    tenantId,
    conversationId: conversation.id,
    role: "user",
    content: message
  });
  const trackedIssue = trackQuickIssue({ tenantId, message });
  const quickIssueThreshold =
    orgSettings && orgSettings.quick_issue_threshold
      ? orgSettings.quick_issue_threshold
      : 4;
  if (trackedIssue && trackedIssue.record) {
    try {
      await ensureProcedureForQuickIssue({
        tenantId,
        issue: trackedIssue.record,
        threshold: quickIssueThreshold
      });
    } catch (err) {
      // ignore auto-procedure failures
    }
  }
  logEvent({
    tenantId,
    userId,
    action: "chat_user_message",
    meta: { conversation_id: conversation.id }
  });

  let failureCount = null;
  if (isFailureMessage(message)) {
    failureCount = incrementFailure({
      tenantId,
      conversationId: conversation.id
    });
  }

  if (isSuccessMessage(message)) {
    updateConversation({
      tenantId,
      conversationId: conversation.id,
      updates: { status: "resolved", failure_count: 0 }
    });
  }

  const activeContext = context || conversation.context || null;
  const contextBlock = formatContextBlock(activeContext);
  const messageWithContext = contextBlock
    ? `${message}\n\n${contextBlock}`
    : message;
  const kbChunks = await searchKb({ tenantId, query: message });
  const llm = await answerWithLLM({
    message: messageWithContext,
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
  const currentFailureCount =
    failureCount !== null
      ? failureCount
      : (conversation && conversation.failure_count) || 0;
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
  const quickIssue =
    trackedIssue && trackedIssue.record
      ? {
          key: trackedIssue.record.key,
          label: trackedIssue.record.label,
          message: trackedIssue.record.example || trackedIssue.record.label || "",
          count: trackedIssue.record.count || 1,
          is_new: Boolean(trackedIssue.isNew)
        }
      : null;
  return res.json({
    conversation_id: conversation.id,
    answer: llm.answer,
    needs_ticket: needsTicket,
    ticket,
    sources: kbChunks,
    failure_count: currentFailureCount,
    threshold,
    quick_issue: quickIssue
  });
});

router.post("/feedback", authRequired, (req, res) => {
  const payload = feedbackSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ error: "invalid_payload" });
  }

  const tenantId = req.user.tenant_id;
  const { conversation_id, resolved, rating, comment } = payload.data;
  const orgSettings = getOrgSettings({ tenantId });
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

  const threshold =
    orgSettings && orgSettings.escalation_threshold
      ? orgSettings.escalation_threshold
      : 2;
  let failureCount = conversation.failure_count || 0;
  let createdTicket = null;

  if (resolved) {
    updateConversation({
      tenantId,
      conversationId: conversation_id,
      updates: { status: "resolved", failure_count: 0 }
    });
    failureCount = 0;
  } else {
    const count = incrementFailure({ tenantId, conversationId: conversation_id });
    failureCount = count !== null ? count : failureCount + 1;
    if (count !== null && count >= threshold) {
      const existing = findTicketByConversation({
        tenantId,
        conversationId: conversation_id
      });
      if (!existing) {
        const draft = draftTicket({ message: comment || "Issue unresolved" });
        const ticket = createTicket({
          tenantId,
          conversationId: conversation_id,
          draft
        });
        createdTicket = ticket;
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
      } else {
        createdTicket = existing;
        updateConversation({
          tenantId,
          conversationId: conversation_id,
          updates: { status: "escalated" }
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

  return res.json({
    ok: true,
    failure_count: failureCount,
    threshold,
    ticket_created: Boolean(createdTicket),
    ticket: createdTicket || null
  });
});

router.post("/attachments", authRequired, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "missing_file" });
  }
  const tenantId = req.user.tenant_id;
  const userId = req.user.sub;
  const conversationId = req.body.conversation_id;

  let conversation = null;
  if (conversationId) {
    conversation = findConversation({ tenantId, conversationId });
    if (conversation && req.user.role === "user" && conversation.user_id !== userId) {
      return res.status(403).json({ error: "forbidden" });
    }
  }
  if (!conversation) {
    conversation = createConversation({ tenantId, userId });
  } else if (conversation.status === "resolved") {
    updateConversation({
      tenantId,
      conversationId: conversation.id,
      updates: { status: "open", failure_count: 0 }
    });
  }

  const url = `/uploads/${req.file.filename}`;
  addMessage({
    tenantId,
    conversationId: conversation.id,
    role: "user",
    content: `__IMAGE__:${url}`
  });

  logEvent({
    tenantId,
    userId,
    action: "chat_attachment",
    meta: { conversation_id: conversation.id, file: req.file.originalname }
  });

  return res.json({ conversation_id: conversation.id, url });
});

router.post("/escalate", authRequired, async (req, res) => {
  const payload = escalateSchema.safeParse(req.body);
  if (!payload.success) {
    return res.status(400).json({ error: "invalid_payload" });
  }

  const tenantId = req.user.tenant_id;
  const { conversation_id, reason } = payload.data;
  const conversation = findConversation({ tenantId, conversationId: conversation_id });
  if (!conversation) {
    return res.status(404).json({ error: "conversation_not_found" });
  }
  if (req.user.role === "user" && conversation.user_id !== req.user.sub) {
    return res.status(403).json({ error: "forbidden" });
  }

  const existing = findTicketByConversation({
    tenantId,
    conversationId: conversation_id
  });
  if (existing) {
    return res.json({ created: false, ticket: existing });
  }

  const history = getHistory({ tenantId, conversationId: conversation_id });
  const lastUser = [...history].reverse().find((msg) => msg.role === "user");
  const draft = draftTicket({
    message: lastUser ? lastUser.content : reason || "Demande escalade utilisateur"
  });
  const ticket = await createTicket({
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
    meta: { ticket_id: ticket.id, reason: reason || "manual_escalation" }
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

  return res.json({ created: true, ticket });
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

router.get("/quick-issues", authRequired, (req, res) => {
  const tenantId = req.user.tenant_id;
  const limit = Number(req.query.limit || 6);
  const items = listQuickIssues({ tenantId, limit });
  return res.json({ items });
});

router.get("/quick-issues/search", authRequired, (req, res) => {
  const tenantId = req.user.tenant_id;
  const query = req.query.query || "";
  const limit = Number(req.query.limit || 12);
  const items = searchQuickIssues({ tenantId, query, limit });
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
