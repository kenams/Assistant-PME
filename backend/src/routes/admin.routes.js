const express = require("express");
const multer = require("multer");
const { authRequired } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/roles");
const { loadDb, saveDb, withDb } = require("../services/store.service");
const { listAudit, logEvent } = require("../services/audit.service");
const { testGlpiConnection, isGlpiEnabled } = require("../services/glpi.service");
const { getSnapshot } = require("../services/monitoring.service");
const { buildCsv } = require("../utils/csv");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.get("/metrics", authRequired, (req, res) => {
  const tenantId = req.user.tenant_id;
  const db = loadDb();
  const tickets = db.tickets.filter((t) => t.tenant_id === tenantId);
  const users = db.users.filter((u) => u.tenant_id === tenantId);
  const conversations = db.conversations.filter(
    (c) => c.tenant_id === tenantId
  );
  const ticketConversations = new Set(
    tickets.map((ticket) => ticket.conversation_id).filter(Boolean)
  );
  const ticketsEvites = conversations.filter(
    (c) => c.status === "resolved" && !ticketConversations.has(c.id)
  ).length;
  const activeUsers = new Set(conversations.map((c) => c.user_id)).size;
  const resolved = conversations.filter((c) => c.status === "resolved").length;
  const escalated = conversations.filter((c) => c.status === "escalated").length;
  const resolution_rate =
    conversations.length > 0 ? Math.round((resolved / conversations.length) * 100) : 0;
  const minutesEconomisees = ticketsEvites * 8;

  return res.json({
    tickets_evites: ticketsEvites,
    tickets_crees: tickets.length,
    minutes_economisees: minutesEconomisees,
    utilisateurs_actifs: activeUsers || users.length,
    conversations: conversations.length,
    resolved,
    escalated,
    resolution_rate
  });
});

router.get("/metrics/system", authRequired, requireAdmin, (req, res) => {
  return res.json(getSnapshot());
});

router.get("/audit", authRequired, requireAdmin, (req, res) => {
  const tenantId = req.user.tenant_id;
  const limit = req.query.limit ? Number(req.query.limit) : 200;
  const items = listAudit({ tenantId, limit });
  return res.json({ items });
});

router.get("/activity/users", authRequired, requireAdmin, (req, res) => {
  const tenantId = req.user.tenant_id;
  const db = loadDb();
  const users = (db.users || []).filter((u) => u.tenant_id === tenantId);
  const conversations = (db.conversations || []).filter((c) => c.tenant_id === tenantId);
  const messages = (db.messages || []).filter((m) => m.tenant_id === tenantId);
  const tickets = (db.tickets || []).filter((t) => t.tenant_id === tenantId);

  const items = users.map((user) => {
    const convoIds = new Set(
      conversations.filter((c) => c.user_id === user.id).map((c) => c.id)
    );
    const userMessages = messages.filter(
      (m) => convoIds.has(m.conversation_id) && m.role === "user"
    );
    const allMessages = messages.filter((m) => convoIds.has(m.conversation_id));
    const userTickets = tickets.filter((t) => convoIds.has(t.conversation_id));
    const lastActive = allMessages
      .map((m) => m.created_at)
      .sort()
      .slice(-1)[0];

    return {
      user_id: user.id,
      email: user.email,
      role: user.role,
      conversations: convoIds.size,
      messages: userMessages.length,
      tickets: userTickets.length,
      last_active: lastActive || null
    };
  });

  items.sort((a, b) => {
    const aTime = a.last_active ? new Date(a.last_active).getTime() : 0;
    const bTime = b.last_active ? new Date(b.last_active).getTime() : 0;
    return bTime - aTime;
  });

  return res.json({ items });
});

router.get("/backup", authRequired, requireAdmin, (req, res) => {
  const db = loadDb();
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=\"backup.json\"");
  return res.send(JSON.stringify(db, null, 2));
});

router.get("/kb/export.json", authRequired, requireAdmin, (req, res) => {
  const tenantId = req.user.tenant_id;
  const db = loadDb();
  const payload = {
    kb_documents: (db.kb_documents || []).filter((d) => d.tenant_id === tenantId),
    kb_chunks: (db.kb_chunks || []).filter((c) => c.tenant_id === tenantId)
  };
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=\"kb_export.json\"");
  return res.send(JSON.stringify(payload, null, 2));
});

router.get("/kb/export.csv", authRequired, requireAdmin, (req, res) => {
  const tenantId = req.user.tenant_id;
  const db = loadDb();
  const headers = ["document_id", "title", "chunk_text"];
  const rows = (db.kb_chunks || [])
    .filter((chunk) => chunk.tenant_id === tenantId)
    .map((chunk) => {
      const doc = (db.kb_documents || []).find((d) => d.id === chunk.document_id);
      return [chunk.document_id, doc ? doc.title : "", chunk.chunk_text];
  });
  const csv = buildCsv(headers, rows);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=\"kb_export.csv\"");
  return res.send(csv);
});

router.get("/conversations/export.json", authRequired, requireAdmin, (req, res) => {
  const tenantId = req.user.tenant_id;
  const db = loadDb();
  const payload = {
    conversations: (db.conversations || []).filter((c) => c.tenant_id === tenantId),
    messages: (db.messages || []).filter((m) => m.tenant_id === tenantId)
  };
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=\"conversations_export.json\""
  );
  return res.send(JSON.stringify(payload, null, 2));
});

router.get("/conversations/export.csv", authRequired, requireAdmin, (req, res) => {
  const tenantId = req.user.tenant_id;
  const db = loadDb();
  const headers = [
    "conversation_id",
    "user_id",
    "status",
    "message_role",
    "message_content",
    "message_created_at"
  ];
  const rows = (db.messages || [])
    .filter((m) => m.tenant_id === tenantId)
    .map((m) => {
      const convo = (db.conversations || []).find((c) => c.id === m.conversation_id);
      return [
        m.conversation_id,
        convo ? convo.user_id : "",
        convo ? convo.status : "",
        m.role,
        m.content,
        m.created_at
      ];
    });
  const csv = buildCsv(headers, rows);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=\"conversations_export.csv\""
  );
  return res.send(csv);
});

router.get("/glpi/test", authRequired, requireAdmin, async (req, res) => {
  if (!isGlpiEnabled()) {
    return res.status(400).json({ ok: false, error: "glpi_not_configured" });
  }
  try {
    await testGlpiConnection();
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ ok: false, error: "glpi_connection_failed" });
  }
});

router.post("/restore", authRequired, requireAdmin, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "missing_file" });
  }
  try {
    const parsed = JSON.parse(req.file.buffer.toString("utf8"));
    if (!parsed || typeof parsed !== "object") {
      return res.status(400).json({ error: "invalid_backup" });
    }
    parsed.audit_logs = parsed.audit_logs || [];
    parsed.leads = parsed.leads || [];
    parsed.users = parsed.users || [];
    parsed.tenants = parsed.tenants || [];
    parsed.conversations = parsed.conversations || [];
    parsed.messages = parsed.messages || [];
    parsed.tickets = parsed.tickets || [];
    parsed.kb_documents = parsed.kb_documents || [];
    parsed.kb_chunks = parsed.kb_chunks || [];
    parsed.metrics_daily = parsed.metrics_daily || [];
    parsed.quotes = parsed.quotes || [];
    parsed.invoices = parsed.invoices || [];
    parsed.notifications = parsed.notifications || [];
    parsed.org_settings = parsed.org_settings || [];

    saveDb(parsed);
    logEvent({
      tenantId: req.user.tenant_id,
      userId: req.user.sub,
      action: "backup_restored",
      meta: { filename: req.file.originalname }
    });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(400).json({ error: "invalid_backup" });
  }
});

router.post("/kb/import", authRequired, requireAdmin, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "missing_file" });
  }
  try {
    const parsed = JSON.parse(req.file.buffer.toString("utf8"));
    if (!parsed || typeof parsed !== "object") {
      return res.status(400).json({ error: "invalid_kb" });
    }
    const tenantId = req.user.tenant_id;
    withDb((db) => {
      db.kb_documents = (parsed.kb_documents || []).map((doc) => ({
        ...doc,
        tenant_id: tenantId
      }));
      db.kb_chunks = (parsed.kb_chunks || []).map((chunk) => ({
        ...chunk,
        tenant_id: tenantId
      }));
    });
    logEvent({
      tenantId: req.user.tenant_id,
      userId: req.user.sub,
      action: "kb_imported",
      meta: { filename: req.file.originalname }
    });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(400).json({ error: "invalid_kb" });
  }
});

module.exports = router;
