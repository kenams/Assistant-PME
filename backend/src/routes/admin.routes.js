const express = require("express");
const multer = require("multer");
const { authRequired } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/roles");
const { env } = require("../config/env");
const {
  loadDb,
  saveDb,
  withDb,
  listBackups,
  restoreLatestSnapshot
} = require("../services/store.service");
const { listAudit, logEvent } = require("../services/audit.service");
const { testGlpiConnection, isGlpiEnabled } = require("../services/glpi.service");
const { getSnapshot } = require("../services/monitoring.service");
const { getTenantById } = require("../services/users.service");
const { buildRoiPdf, buildAnalyticsPdf } = require("../services/pdf.service");
const { computeAnalytics } = require("../services/analytics.service");
const { getOrgSettings } = require("../services/org.service");
const { testMailboxConnection } = require("../services/mailbox.service");
const { buildCsv, parseCsv } = require("../utils/csv");
const { ingestDocument } = require("../services/rag.service");
const { seedDemoData } = require("../services/demo.service");
const { sendSlaAlerts } = require("../services/sla.service");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const IMAGE_PREFIX = "__IMAGE__:";

function extractUploadUrls(text) {
  if (!text) return [];
  const matches =
    String(text).match(/https?:\/\/[^\s)]+\/uploads\/[^\s)]+|\/uploads\/[^\s)]+/g) ||
    [];
  return Array.from(new Set(matches));
}

function extractMessageImageUrl(content) {
  if (!content) return null;
  const raw = String(content).trim();
  if (raw.startsWith(IMAGE_PREFIX)) {
    const url = raw.slice(IMAGE_PREFIX.length).trim();
    return url || null;
  }
  return null;
}

function computeMetrics(tenantId) {
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

  return {
    tickets_evites: ticketsEvites,
    tickets_crees: tickets.length,
    minutes_economisees: minutesEconomisees,
    utilisateurs_actifs: activeUsers || users.length,
    conversations: conversations.length,
    resolved,
    escalated,
    resolution_rate
  };
}

async function buildDiagnostics({ tenantId, deep }) {
  const settings = getOrgSettings({ tenantId });
  const glpiConfig = {
    enabled: Boolean(settings.glpi_enabled),
    baseUrl: settings.glpi_base_url || "",
    appToken: settings.glpi_app_token || "",
    userToken: settings.glpi_user_token || ""
  };
  const diagnostics = {
    openai: {
      enabled: env.llmMode === "openai",
      configured: Boolean(env.openaiApiKey),
      model: env.openaiModel || ""
    },
    glpi: {
      enabled: isGlpiEnabled(glpiConfig),
      ok: isGlpiEnabled(glpiConfig) ? "pending" : false
    },
    mailbox: {
      enabled: Boolean(settings.mailbox_enabled),
      configured: Boolean(settings.mailbox_user && settings.mailbox_password),
      ok: settings.mailbox_enabled ? "pending" : false
    },
    ad: {
      enabled: Boolean(settings.ad_enabled),
      configured: Boolean(settings.ad_url && settings.ad_domain),
      ok: settings.ad_enabled ? "pending" : false
    },
    oauth: {
      google: {
        connected: Boolean(settings.oauth_google_access_token),
        expires_at: settings.oauth_google_expires_at || ""
      },
      outlook: {
        connected: Boolean(settings.oauth_outlook_access_token),
        expires_at: settings.oauth_outlook_expires_at || ""
      }
    },
    inbound: {
      slack_signing_secret: Boolean(settings.slack_signing_secret),
      teams_signing_secret: Boolean(settings.teams_signing_secret),
      ingest_token: Boolean(env.supportIngestToken)
    },
    outbound: {
      webhook_url: Boolean(settings.webhook_url),
      slack_webhook: Boolean(settings.slack_webhook_url),
      teams_webhook: Boolean(settings.teams_webhook_url)
    },
    security: {
      node_env: env.nodeEnv,
      jwt_secret: Boolean(env.jwtSecret),
      quick_login:
        !env.disableQuickLogin &&
        (env.nodeEnv === "development" || env.nodeEnv === "test"),
      cors_restricted: Boolean(env.corsOrigins)
    }
  };

  if (deep) {
    if (isGlpiEnabled(glpiConfig)) {
      try {
        await testGlpiConnection(glpiConfig);
        diagnostics.glpi.ok = true;
      } catch (err) {
        diagnostics.glpi.ok = false;
      }
    }
    if (settings.mailbox_enabled) {
      const result = await testMailboxConnection();
      diagnostics.mailbox.ok = Boolean(result.ok);
    }
  }

  return diagnostics;
}

function buildChecklist({ diagnostics, settings, orgInfo, kbCount }) {
  return [
    {
      label: "Organisation configuree",
      ok: Boolean(orgInfo && orgInfo.name),
      hint: "Renseignez le nom et le plan dans Organisation."
    },
    {
      label: "JWT secret configure",
      ok: Boolean(diagnostics.security?.jwt_secret),
      hint: "Ajoutez JWT_SECRET pour securiser les sessions."
    },
    {
      label: "Acces rapides desactives",
      ok: diagnostics.security?.quick_login === false,
      hint: "En production, desactivez les connexions rapides."
    },
    {
      label: "Mode production",
      ok: diagnostics.security?.node_env === "production",
      hint: "Passez NODE_ENV en production pour durcir l'app."
    },
    {
      label: "Base de connaissances",
      ok: kbCount > 0,
      hint: "Ajoutez au moins une procedure ou FAQ."
    },
    {
      label: "IA configuree",
      ok: diagnostics.openai.configured || diagnostics.openai.enabled === false,
      hint: "Activez OpenAI si vous sortez du mode mock."
    },
    {
      label: "GLPI connecte",
      ok: diagnostics.glpi.enabled,
      hint: "Activez GLPI pour l'escalade automatique."
    },
    {
      label: "Boite mail support",
      ok: diagnostics.mailbox.enabled && diagnostics.mailbox.configured,
      hint: "Activez IMAP ou OAuth pour la boite support."
    },
    {
      label: "OAuth Gmail/Outlook",
      ok: diagnostics.oauth.google.connected || diagnostics.oauth.outlook.connected,
      hint: "Connectez au moins un fournisseur pour lire les emails."
    },
    {
      label: "Webhooks sortants",
      ok: Boolean(settings.webhook_url),
      hint: "Configurez un webhook pour les alertes."
    },
    {
      label: "CORS restreint",
      ok: Boolean(diagnostics.security?.cors_restricted),
      hint: "Limitez les origines autorisees via CORS_ORIGINS."
    },
    {
      label: "Slack/Teams inbound",
      ok: Boolean(settings.slack_signing_secret || settings.teams_signing_secret),
      hint: "Ajoutez un secret pour recevoir des tickets entrants."
    },
    {
      label: "SLA defini",
      ok: Number(settings.sla_hours || 0) > 0,
      hint: "Definissez un SLA pour le suivi des tickets."
    }
  ];
}

router.get("/metrics", authRequired, (req, res) => {
  const tenantId = req.user.tenant_id;
  return res.json(computeMetrics(tenantId));
});

router.get("/metrics/system", authRequired, requireAdmin, (req, res) => {
  return res.json(getSnapshot());
});

router.get("/analytics", authRequired, requireAdmin, (req, res) => {
  const tenantId = req.user.tenant_id;
  return res.json(computeAnalytics(tenantId));
});

router.get("/analytics/pdf", authRequired, requireAdmin, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const tenant = getTenantById(tenantId);
  const analytics = computeAnalytics(tenantId);
  const pdf = await buildAnalyticsPdf({
    tenantName: tenant ? tenant.name : null,
    analytics
  });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=\"analytics_report.pdf\""
  );
  return res.send(pdf);
});

router.get("/analytics/summary.csv", authRequired, requireAdmin, (req, res) => {
  const tenantId = req.user.tenant_id;
  const metrics = computeMetrics(tenantId);
  const analytics = computeAnalytics(tenantId);
  const row = {
    tickets_evites: analytics.roi?.tickets_evites || metrics.tickets_evites || 0,
    tickets_crees: metrics.tickets_crees || 0,
    minutes_economisees: analytics.roi?.minutes_saved || metrics.minutes_economisees || 0,
    heures_gagnees: analytics.roi?.hours_saved || 0,
    gain_estime: analytics.roi?.savings_estimate || 0,
    response_avg_minutes: analytics.response_avg_minutes || 0,
    resolution_avg_minutes: analytics.resolution_avg_minutes || 0,
    feedback_avg: analytics.feedback?.average_rating || 0,
    feedback_resolved_rate: analytics.feedback?.resolved_rate || 0,
    sla_hours: analytics.sla?.hours || 0,
    sla_breached_open: analytics.sla?.breached_open_count || 0,
    sla_at_risk: analytics.sla?.at_risk_count || 0
  };
  const headers = Object.keys(row);
  const csv = buildCsv(headers, [headers.map((key) => row[key])]);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=\"analytics_summary.csv\"");
  return res.send(csv);
});

router.get("/backups", authRequired, requireAdmin, (req, res) => {
  const items = listBackups().map((item) => ({
    file: item.file,
    mtime: item.mtime,
    size: item.size
  }));
  return res.json({ items });
});

router.post("/backups/restore-latest", authRequired, requireAdmin, (req, res) => {
  const restored = restoreLatestSnapshot();
  if (!restored) {
    return res.status(404).json({ error: "backup_not_found" });
  }
  return res.json({ ok: true });
});

router.post("/backups/restore/:file", authRequired, requireAdmin, (req, res) => {
  const file = req.params.file;
  const match = listBackups().find((item) => item.file === file);
  if (!match) {
    return res.status(404).json({ error: "backup_not_found" });
  }
  try {
    const raw = require("fs").readFileSync(match.full, "utf8");
    const parsed = JSON.parse(raw);
    saveDb(parsed);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "backup_restore_failed" });
  }
});

router.get("/backups/download/:file", authRequired, requireAdmin, (req, res) => {
  const file = req.params.file;
  const match = listBackups().find((item) => item.file === file);
  if (!match) {
    return res.status(404).json({ error: "backup_not_found" });
  }
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${match.file}"`
  );
  return res.sendFile(match.full);
});

router.get("/diagnostics", authRequired, requireAdmin, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const deep = String(req.query.deep || "") === "1";
  const diagnostics = await buildDiagnostics({ tenantId, deep });
  return res.json(diagnostics);
});

router.get("/checklist", authRequired, requireAdmin, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const diagnostics = await buildDiagnostics({ tenantId, deep: false });
  const settings = getOrgSettings({ tenantId });
  const db = loadDb();
  const kbCount = (db.kb_documents || []).filter((doc) => doc.tenant_id === tenantId)
    .length;
  const orgInfo = getTenantById(tenantId);
  const items = buildChecklist({ diagnostics, settings, orgInfo, kbCount });
  const completed = items.filter((item) => item.ok).length;
  return res.json({ completed, total: items.length, items });
});

router.get("/checklist/export.csv", authRequired, requireAdmin, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const diagnostics = await buildDiagnostics({ tenantId, deep: false });
  const settings = getOrgSettings({ tenantId });
  const db = loadDb();
  const kbCount = (db.kb_documents || []).filter((doc) => doc.tenant_id === tenantId)
    .length;
  const orgInfo = getTenantById(tenantId);
  const items = buildChecklist({ diagnostics, settings, orgInfo, kbCount });
  const headers = ["label", "ok", "hint"];
  const csv = buildCsv(
    headers,
    items.map((item) => [item.label, item.ok ? "OK" : "A faire", item.hint])
  );
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=\"checklist_config.csv\"");
  return res.send(csv);
});

router.post("/sla/notify", authRequired, requireAdmin, (req, res) => {
  const tenantId = req.user.tenant_id;
  const userId = req.user.sub;
  try {
    const result = sendSlaAlerts({ tenantId, userId, windowHours: 24 });
    return res.json({ ok: true, sent: result.sent, alerts: result.alerts });
  } catch (err) {
    return res.status(500).json({ error: "sla_notify_failed" });
  }
});

router.post("/demo/seed", authRequired, requireAdmin, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const userId = req.user.sub;
  const mode = req.body && req.body.mode ? String(req.body.mode) : "append";
  try {
    const result = await seedDemoData({ tenantId, userId, mode });
    return res.json({ ok: true, result });
  } catch (err) {
    return res.status(500).json({ error: "demo_seed_failed" });
  }
});

router.get("/metrics/roi.pdf", authRequired, requireAdmin, async (req, res) => {
  const tenantId = req.user.tenant_id;
  const tenant = getTenantById(tenantId);
  const metrics = computeMetrics(tenantId);
  const pdf = await buildRoiPdf({
    tenantName: tenant ? tenant.name : null,
    metrics
  });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=\"roi_report.pdf\"");
  return res.send(pdf);
});

router.get("/uploads", authRequired, requireAdmin, (req, res) => {
  const tenantId = req.user.tenant_id;
  const limit = Number(req.query.limit || 50);
  const days = Number(req.query.days || 0);
  const since = days > 0 ? Date.now() - days * 24 * 60 * 60 * 1000 : null;
  const db = loadDb();
  const map = new Map();

  (db.messages || [])
    .filter((m) => m.tenant_id === tenantId)
    .forEach((msg) => {
      const url = extractMessageImageUrl(msg.content);
      if (!url) return;
      const existing = map.get(url) || {
        url,
        occurrences: 0,
        first_seen: msg.created_at,
        last_seen: msg.created_at,
        sources: [],
        conversation_ids: new Set(),
        ticket_ids: new Set()
      };
      existing.occurrences += 1;
      existing.last_seen = msg.created_at;
      existing.sources.push({
        type: "message",
        conversation_id: msg.conversation_id,
        created_at: msg.created_at
      });
      if (msg.conversation_id) {
        existing.conversation_ids.add(msg.conversation_id);
      }
      map.set(url, existing);
    });

  (db.tickets || [])
    .filter((t) => t.tenant_id === tenantId)
    .forEach((ticket) => {
      const urls = extractUploadUrls(ticket.description || "");
      urls.forEach((url) => {
        const existing = map.get(url) || {
          url,
          occurrences: 0,
          first_seen: ticket.created_at,
          last_seen: ticket.created_at,
          sources: [],
          conversation_ids: new Set(),
          ticket_ids: new Set()
        };
        existing.occurrences += 1;
        existing.last_seen = ticket.updated_at || ticket.created_at;
        existing.sources.push({
          type: "ticket",
          ticket_id: ticket.id,
          created_at: ticket.created_at
        });
        if (ticket.id) {
          existing.ticket_ids.add(ticket.id);
        }
        if (ticket.conversation_id) {
          existing.conversation_ids.add(ticket.conversation_id);
        }
        map.set(url, existing);
      });
    });

  let items = Array.from(map.values()).map((item) => ({
    ...item,
    conversation_ids: Array.from(item.conversation_ids || []),
    ticket_ids: Array.from(item.ticket_ids || [])
  }));
  if (since) {
    items = items.filter((item) => {
      const last = item.last_seen ? new Date(item.last_seen).getTime() : 0;
      return last >= since;
    });
  }
  items = items
    .sort((a, b) => new Date(b.last_seen) - new Date(a.last_seen))
    .slice(0, Number.isNaN(limit) ? 50 : limit);

  return res.json({ items, total: map.size });
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
  const query = (req.query.query || "").toString().toLowerCase().trim();
  const level = (req.query.level || "all").toString().toLowerCase().trim();
  const matchLevel = (title) => {
    const text = (title || "").toString().toLowerCase();
    const isInfra = text.includes("infra") || text.includes("reseau") || text.includes("réseau");
    if (level === "infra") return isInfra;
    if (level === "n1") return text.includes("(n1)");
    if (level === "n2") return text.includes("(n2)");
    if (level === "n3") return text.includes("(n3)") || isInfra;
    return true;
  };
  const headers = ["document_id", "title", "chunk_text"];
  const rows = (db.kb_chunks || [])
    .filter((chunk) => chunk.tenant_id === tenantId)
    .map((chunk) => {
      const doc = (db.kb_documents || []).find((d) => d.id === chunk.document_id);
      return [chunk.document_id, doc ? doc.title : "", chunk.chunk_text];
    })
    .filter((row) => {
      const title = (row[1] || "").toString();
      const text = (row[2] || "").toString();
      if (!matchLevel(title)) return false;
      if (!query) return true;
      return (
        title.toLowerCase().includes(query) || text.toLowerCase().includes(query)
      );
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
  const settings = getOrgSettings({ tenantId: req.user.tenant_id });
  const glpiConfig = {
    enabled: Boolean(settings.glpi_enabled),
    baseUrl: settings.glpi_base_url || "",
    appToken: settings.glpi_app_token || "",
    userToken: settings.glpi_user_token || ""
  };
  if (!isGlpiEnabled(glpiConfig)) {
    return res.status(400).json({ ok: false, error: "glpi_not_configured" });
  }
  try {
    await testGlpiConnection(glpiConfig);
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
    parsed.invites = parsed.invites || [];

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

router.post(
  "/kb/import-csv",
  authRequired,
  requireAdmin,
  upload.single("file"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "missing_file" });
    }
    const raw = req.file.buffer.toString("utf8");
    const { headers, rows } = parseCsv(raw);
    const headerIndex = headers.reduce((acc, name, idx) => {
      acc[name.toLowerCase()] = idx;
      return acc;
    }, {});
    if (
      headerIndex.title === undefined ||
      headerIndex.content === undefined
    ) {
      return res.status(400).json({ error: "missing_headers" });
    }
    const tenantId = req.user.tenant_id;
    const items = [];
    for (const row of rows) {
      const title = row[headerIndex.title] || "";
      const content = row[headerIndex.content] || "";
      if (!title.trim() || !content.trim()) {
        continue;
      }
      const sourceType =
        (headerIndex.source_type !== undefined
          ? row[headerIndex.source_type]
          : "") || "procedure";
      const sourceUrl =
        headerIndex.source_url !== undefined ? row[headerIndex.source_url] : "";
      const doc = await ingestDocument({
        tenantId,
        title: title.trim(),
        sourceType: sourceType.trim() || "procedure",
        sourceUrl: sourceUrl ? sourceUrl.trim() : null,
        content
      });
      items.push(doc);
    }
    logEvent({
      tenantId: req.user.tenant_id,
      userId: req.user.sub,
      action: "kb_imported_csv",
      meta: { filename: req.file.originalname, count: items.length }
    });
    return res.json({ ok: true, count: items.length });
  }
);

module.exports = router;
