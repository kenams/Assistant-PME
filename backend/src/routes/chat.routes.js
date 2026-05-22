const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const FormData = require("form-data");
const { z } = require("zod");
const { authRequired } = require("../middleware/auth");
const { answerWithLLM } = require("../services/openai.service");
const { env } = require("../config/env");
const { getOrgSettings } = require("../services/org.service");
const { searchKb, ensureProcedureForQuickIssue } = require("../services/rag.service");
const {
  draftTicket,
  createTicket,
  findTicketByConversation,
  listTicketsByUser
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
const { anonymize, anonymizeChunks } = require("../services/pii.service");

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
      contact: z.string().min(1).optional(),
      pc_name: z.string().min(1).optional(),
      win_user: z.string().min(1).optional(),
      local_ip: z.string().min(1).optional()
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
  if (context.user_login) lines.push(`Login AD: ${context.user_login}`);
  if (context.win_user) lines.push(`User Windows: ${context.win_user}`);
  if (context.device) lines.push(`Type poste: ${context.device}`);
  if (context.pc_name) lines.push(`Nom PC: ${context.pc_name}`);
  if (context.local_ip) lines.push(`IP LAN: ${context.local_ip}`);
  if (context.ip) lines.push(`IP publique: ${context.ip}`);
  if (context.os) lines.push(`OS: ${context.os}`);
  if (context.location) lines.push(`Site: ${context.location}`);
  if (context.urgency) lines.push(`Urgence: ${context.urgency}`);
  if (context.contact) lines.push(`Contact: ${context.contact}`);
  if (!lines.length) return "";
  return `[Contexte technicien]\n${lines.join("\n")}`;
}

router.post("/", authRequired, async (req, res, next) => {
  try {
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
    const orgSettings = await getOrgSettings({ tenantId });

    let conversation = null;
    if (conversation_id) {
      conversation = await findConversation({ tenantId, conversationId: conversation_id });
      if (conversation && req.user.role === "user" && conversation.user_id !== userId) {
        return res.status(403).json({ error: "forbidden" });
      }
    }
    if (!conversation) {
      conversation = await createConversation({ tenantId, userId });
      await logEvent({
        tenantId,
        userId,
        action: "conversation_created",
        meta: { conversation_id: conversation.id }
      });
    } else if (conversation.status === "resolved") {
      await updateConversation({
        tenantId,
        conversationId: conversation.id,
        updates: { status: "open", failure_count: 0 }
      });
    }

    // Snapshot history BEFORE adding current message (so it's the true "prior context")
    const conversationHistory = await getHistory({ tenantId, conversationId: conversation.id });

    await addMessage({
      tenantId,
      conversationId: conversation.id,
      role: "user",
      content: message
    });
    const trackedIssue = await trackQuickIssue({ tenantId, message });
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
    await logEvent({
      tenantId,
      userId,
      action: "chat_user_message",
      meta: { conversation_id: conversation.id }
    });

    let failureCount = null;
    if (isFailureMessage(message)) {
      failureCount = await incrementFailure({
        tenantId,
        conversationId: conversation.id
      });
    }

    if (isSuccessMessage(message)) {
      await updateConversation({
        tenantId,
        conversationId: conversation.id,
        updates: { status: "resolved", failure_count: 0 }
      });
    }

    const clientIp =
      ((req.headers["x-forwarded-for"] || "").split(",")[0].trim()) ||
      req.socket.remoteAddress ||
      req.ip ||
      "Inconnue";
    const userLogin = req.user.email || req.user.sub || "Inconnu";

    const baseContext = context || conversation.context || null;
    const activeContext = baseContext
      ? { ...baseContext, ip: clientIp, user_login: userLogin }
      : { ip: clientIp, user_login: userLogin };

    await updateConversation({
      tenantId,
      conversationId: conversation.id,
      updates: { context: activeContext }
    });

    const contextBlock = formatContextBlock(activeContext);
    const messageWithContext = contextBlock
      ? `${message}\n\n${contextBlock}`
      : message;
    const kbChunks = await searchKb({ tenantId, query: message });

    // Load user's past tickets for memory context
    let userPastTickets = [];
    try {
      userPastTickets = (await listTicketsByUser({ tenantId, userId })).slice(0, 5);
    } catch (_) { /* ignore */ }

    // Mode confidentiel : anonymise les PII avant envoi à OpenAI
    const isConfidential = Boolean(orgSettings && orgSettings.confidential_mode);
    const llmMessage = isConfidential ? anonymize(messageWithContext) : messageWithContext;
    const llmRawMessage = isConfidential ? anonymize(message) : message;
    const llmKbChunks = isConfidential ? anonymizeChunks(kbChunks) : kbChunks;

    const llm = await answerWithLLM({
      message: llmMessage,
      rawMessage: llmRawMessage,
      kbChunks: llmKbChunks,
      language: language || "fr",
      orgSettings,
      conversationHistory,
      userPastTickets
    });

    await addMessage({
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
      const existing = await findTicketByConversation({
        tenantId,
        conversationId: conversation.id
      });
      ticket =
        existing ||
        (await createTicket({
          tenantId,
          conversationId: conversation.id,
          userId,
          draft
        }));
      await updateConversation({
        tenantId,
        conversationId: conversation.id,
        updates: { status: "escalated" }
      });
      await logEvent({
        tenantId,
        userId,
        action: "ticket_created",
        meta: { ticket_id: ticket.id }
      });
      await createNotification({
        tenantId,
        userId,
        type: "ticket_created",
        channel: "email",
        payload: {
          ticket,
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
  } catch (err) {
    next(err);
  }
});

router.post("/feedback", authRequired, async (req, res, next) => {
  try {
    const payload = feedbackSchema.safeParse(req.body);
    if (!payload.success) {
      return res.status(400).json({ error: "invalid_payload" });
    }

    const tenantId = req.user.tenant_id;
    const { conversation_id, resolved, rating, comment } = payload.data;
    const orgSettings = await getOrgSettings({ tenantId });
    const conversation = await findConversation({ tenantId, conversationId: conversation_id });
    if (!conversation) {
      return res.status(404).json({ error: "conversation_not_found" });
    }
    if (req.user.role === "user" && conversation.user_id !== req.user.sub) {
      return res.status(403).json({ error: "forbidden" });
    }

    await addFeedback({
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
      await updateConversation({
        tenantId,
        conversationId: conversation_id,
        updates: { status: "resolved", failure_count: 0 }
      });
      failureCount = 0;
    } else {
      const count = await incrementFailure({ tenantId, conversationId: conversation_id });
      failureCount = count !== null ? count : failureCount + 1;
      if (count !== null && count >= threshold) {
        const existing = await findTicketByConversation({
          tenantId,
          conversationId: conversation_id
        });
        if (!existing) {
          const draft = draftTicket({ message: comment || "Issue unresolved" });
          const ticket = await createTicket({
            tenantId,
            conversationId: conversation_id,
            userId: req.user.sub,
            draft
          });
          createdTicket = ticket;
          await updateConversation({
            tenantId,
            conversationId: conversation_id,
            updates: { status: "escalated" }
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
        } else {
          createdTicket = existing;
          await updateConversation({
            tenantId,
            conversationId: conversation_id,
            updates: { status: "escalated" }
          });
        }
      }
    }

    await logEvent({
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
  } catch (err) {
    next(err);
  }
});

router.post("/attachments", authRequired, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "missing_file" });
    }
    const tenantId = req.user.tenant_id;
    const userId = req.user.sub;
    const conversationId = req.body.conversation_id;

    let conversation = null;
    if (conversationId) {
      conversation = await findConversation({ tenantId, conversationId });
      if (conversation && req.user.role === "user" && conversation.user_id !== userId) {
        return res.status(403).json({ error: "forbidden" });
      }
    }
    if (!conversation) {
      conversation = await createConversation({ tenantId, userId });
    } else if (conversation.status === "resolved") {
      await updateConversation({
        tenantId,
        conversationId: conversation.id,
        updates: { status: "open", failure_count: 0 }
      });
    }

    const url = `/uploads/${req.file.filename}`;
    await addMessage({
      tenantId,
      conversationId: conversation.id,
      role: "user",
      content: `__IMAGE__:${url}`
    });

    await logEvent({
      tenantId,
      userId,
      action: "chat_attachment",
      meta: { conversation_id: conversation.id, file: req.file.originalname }
    });

    return res.json({ conversation_id: conversation.id, url });
  } catch (err) {
    next(err);
  }
});

router.post("/escalate", authRequired, async (req, res, next) => {
  try {
    const payload = escalateSchema.safeParse(req.body);
    if (!payload.success) {
      return res.status(400).json({ error: "invalid_payload" });
    }

    const tenantId = req.user.tenant_id;
    const { conversation_id, reason } = payload.data;
    const conversation = await findConversation({ tenantId, conversationId: conversation_id });
    if (!conversation) {
      return res.status(404).json({ error: "conversation_not_found" });
    }
    if (req.user.role === "user" && conversation.user_id !== req.user.sub) {
      return res.status(403).json({ error: "forbidden" });
    }

    const existing = await findTicketByConversation({
      tenantId,
      conversationId: conversation_id
    });
    if (existing) {
      return res.json({ created: false, ticket: existing });
    }

    const history = await getHistory({ tenantId, conversationId: conversation_id });
    const lastUser = [...history].reverse().find((msg) => msg.role === "user");
    const draft = draftTicket({
      message: lastUser ? lastUser.content : reason || "Demande escalade utilisateur"
    });
    const ticket = await createTicket({
      tenantId,
      conversationId: conversation_id,
      userId: req.user.sub,
      draft
    });
    await updateConversation({
      tenantId,
      conversationId: conversation_id,
      updates: { status: "escalated" }
    });
    await logEvent({
      tenantId,
      userId: req.user.sub,
      action: "ticket_created",
      meta: { ticket_id: ticket.id, reason: reason || "manual_escalation" }
    });
    await createNotification({
      tenantId,
      userId: req.user.sub,
      type: "ticket_created",
      channel: "email",
      payload: { ticket, subject: `Nouveau ticket: ${ticket.title}`, body: ticket.description }
    });

    return res.json({ created: true, ticket });
  } catch (err) {
    next(err);
  }
});

router.get("/history", authRequired, async (req, res, next) => {
  try {
    const conversationId = req.query.conversation_id;
    if (!conversationId) {
      return res.status(400).json({ error: "missing_conversation_id" });
    }

    const tenantId = req.user.tenant_id;
    const conversation = await findConversation({ tenantId, conversationId });
    if (!conversation) {
      return res.status(404).json({ error: "conversation_not_found" });
    }
    if (req.user.role === "user" && conversation.user_id !== req.user.sub) {
      return res.status(403).json({ error: "forbidden" });
    }
    const items = await getHistory({ tenantId, conversationId });
    return res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.get("/conversations", authRequired, async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const query = req.query.query || "";
    const items = await listConversations({
      tenantId,
      query,
      userId: req.user.sub,
      role: req.user.role
    });
    return res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.get("/quick-issues", authRequired, async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const limit = Number(req.query.limit || 6);
    const items = await listQuickIssues({ tenantId, limit });
    return res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.get("/quick-issues/search", authRequired, async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const query = req.query.query || "";
    const limit = Number(req.query.limit || 12);
    const items = await searchQuickIssues({ tenantId, query, limit });
    return res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.get("/search", authRequired, async (req, res, next) => {
  try {
    const tenantId = req.user.tenant_id;
    const query = req.query.query || "";
    const items = await searchMessages({
      tenantId,
      query,
      userId: req.user.sub,
      role: req.user.role
    });
    return res.json({ items });
  } catch (err) {
    next(err);
  }
});

// ─── Whisper transcription ───────────────────────────────────────────────────
const audioUploadDir = path.join(process.cwd(), "data", "uploads", "audio");
fs.mkdirSync(audioUploadDir, { recursive: true });
const audioUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, audioUploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase() || ".webm";
      cb(null, `${crypto.randomUUID()}${ext}`);
    }
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "audio/x-wav", "audio/m4a", "audio/mp3"];
    if (allowed.includes(file.mimetype) || file.mimetype.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(new Error("invalid_audio_type"));
    }
  }
});

router.post("/transcribe", authRequired, audioUpload.single("audio"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "no_audio_file" });
    if (!env.openaiApiKey) return res.status(503).json({ error: "openai_not_configured" });

    const filePath = req.file.path;
    const fileBuffer = fs.readFileSync(filePath);

    const form = new FormData();
    form.append("file", fileBuffer, {
      filename: req.file.originalname || `audio${path.extname(req.file.path)}`,
      contentType: req.file.mimetype || "audio/webm"
    });
    form.append("model", "whisper-1");
    const lang = req.body.language || "";
    if (lang === "fr" || lang === "en") form.append("language", lang);

    const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.openaiApiKey}`,
        ...form.getHeaders()
      },
      body: form
    });

    fs.unlink(filePath, () => {});

    if (!whisperRes.ok) {
      const errText = await whisperRes.text();
      return res.status(502).json({ error: "whisper_error", detail: errText.slice(0, 200) });
    }

    const data = await whisperRes.json();
    return res.json({ text: data.text || "" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
