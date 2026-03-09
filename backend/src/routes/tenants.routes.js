const express = require("express");
const multer = require("multer");
const { z } = require("zod");
const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const { authRequired } = require("../middleware/auth");
const { requireSuperAdmin } = require("../middleware/roles");
const { listTenants, createTenant } = require("../services/tenants.service");
const { findUserByEmailInTenant } = require("../services/users.service");
const { loadDb, saveDb } = require("../services/store.service");
const { validateOr400 } = require("../utils/validate");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const tenantSchema = z.object({
  name: z.string().min(2),
  plan: z.string().min(1).optional(),
  code: z.string().min(2).optional(),
  admin_email: z.string().email(),
  admin_password: z.string().min(6)
});

const tokenSchema = z.object({
  email: z.string().email().optional()
});

router.get("/", authRequired, requireSuperAdmin, (req, res) => {
  return res.json({ items: listTenants() });
});

router.post("/", authRequired, requireSuperAdmin, (req, res) => {
  const payload = validateOr400(tenantSchema, res, req.body);
  if (!payload) return;
  const result = createTenant({
    name: payload.name,
    plan: payload.plan,
    code: payload.code,
    adminEmail: payload.admin_email,
    adminPassword: payload.admin_password
  });
  if (result.error === "email_exists") {
    return res.status(409).json({ error: "email_exists" });
  }
  if (result.error === "code_exists") {
    return res.status(409).json({ error: "code_exists" });
  }
  return res.status(201).json(result);
});

router.post("/:id/token", authRequired, requireSuperAdmin, (req, res) => {
  const payload = validateOr400(tokenSchema, res, req.body || {});
  if (!payload) return;
  const tenantId = req.params.id;
  const email = payload.email;
  if (!email) {
    return res.status(400).json({ error: "missing_email" });
  }
  const user = findUserByEmailInTenant({ tenantId, email });
  if (!user) {
    return res.status(404).json({ error: "user_not_found" });
  }
  if (!env.jwtSecret) {
    return res.status(500).json({ error: "missing_jwt_secret" });
  }
  const token = jwt.sign(
    {
      sub: user.id,
      tenant_id: user.tenant_id,
      role: user.role
    },
    env.jwtSecret,
    { expiresIn: "1h" }
  );
  return res.json({ token });
});

function normalizeBackup(payload) {
  const safe = payload && typeof payload === "object" ? payload : {};
  return {
    tenants: safe.tenants || [],
    users: safe.users || [],
    conversations: safe.conversations || [],
    messages: safe.messages || [],
    tickets: safe.tickets || [],
    kb_documents: safe.kb_documents || [],
    kb_chunks: safe.kb_chunks || [],
    metrics_daily: safe.metrics_daily || [],
    leads: safe.leads || [],
    quotes: safe.quotes || [],
    invoices: safe.invoices || [],
    audit_logs: safe.audit_logs || [],
    notifications: safe.notifications || [],
    conversation_feedback: safe.conversation_feedback || [],
    org_settings: safe.org_settings || [],
    invites: safe.invites || []
  };
}

function filterDbByTenant(db, tenantId) {
  const match = (item) => item.tenant_id === tenantId;
  const tenant = db.tenants.find((t) => t.id === tenantId);
  return {
    tenants: tenant ? [tenant] : [],
    users: db.users.filter(match),
    conversations: db.conversations.filter(match),
    messages: db.messages.filter(match),
    tickets: db.tickets.filter(match),
    kb_documents: db.kb_documents.filter(match),
    kb_chunks: db.kb_chunks.filter(match),
    metrics_daily: db.metrics_daily.filter(match),
    leads: db.leads.filter(match),
    quotes: db.quotes.filter(match),
    invoices: db.invoices.filter(match),
    audit_logs: db.audit_logs.filter(match),
    notifications: db.notifications.filter(match),
    conversation_feedback: db.conversation_feedback.filter(match),
    org_settings: db.org_settings.filter(match),
    invites: db.invites.filter(match)
  };
}

function mergeTenantData(db, tenantId, payload) {
  const data = normalizeBackup(payload);
  const tenant = data.tenants.find((t) => t.id === tenantId) || null;
  const existing = db.tenants.find((t) => t.id === tenantId);
  if (tenant) {
    if (existing) {
      existing.name = tenant.name;
      existing.plan = tenant.plan;
      existing.updated_at = new Date().toISOString();
    } else {
      db.tenants.push({
        id: tenantId,
        name: tenant.name || "Imported",
        plan: tenant.plan || "starter",
        created_at: tenant.created_at || new Date().toISOString()
      });
    }
  } else if (!existing) {
    db.tenants.push({
      id: tenantId,
      name: "Imported",
      plan: "starter",
      created_at: new Date().toISOString()
    });
  }

  const replace = (key) => {
    db[key] = db[key].filter((item) => item.tenant_id !== tenantId);
    const incoming = data[key].map((item) => ({ ...item, tenant_id: tenantId }));
    db[key].push(...incoming);
  };

  [
    "users",
    "conversations",
    "messages",
    "tickets",
    "kb_documents",
    "kb_chunks",
    "metrics_daily",
    "leads",
    "quotes",
    "invoices",
    "audit_logs",
    "notifications",
    "conversation_feedback",
    "org_settings",
    "invites"
  ].forEach(replace);
}

router.get("/overview", authRequired, requireSuperAdmin, (req, res) => {
  const db = loadDb();
  return res.json({
    tenants: db.tenants.length,
    users: db.users.length,
    conversations: db.conversations.length,
    messages: db.messages.length,
    tickets: db.tickets.length,
    leads: db.leads.length,
    kb_documents: db.kb_documents.length
  });
});

router.get("/export.json", authRequired, requireSuperAdmin, (req, res) => {
  const db = loadDb();
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=\"global_backup.json\"");
  return res.send(JSON.stringify(db, null, 2));
});

router.post("/import", authRequired, requireSuperAdmin, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "missing_file" });
  }
  try {
    const parsed = JSON.parse(req.file.buffer.toString("utf8"));
    const normalized = normalizeBackup(parsed);
    saveDb(normalized);
    return res.json({ ok: true });
  } catch (err) {
    return res.status(400).json({ error: "invalid_backup" });
  }
});

router.get("/:id/export.json", authRequired, requireSuperAdmin, (req, res) => {
  const tenantId = req.params.id;
  const db = loadDb();
  const payload = filterDbByTenant(db, tenantId);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=\"tenant_${tenantId}.json\"`
  );
  return res.send(JSON.stringify(payload, null, 2));
});

router.post(
  "/:id/import",
  authRequired,
  requireSuperAdmin,
  upload.single("file"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "missing_file" });
    }
    try {
      const parsed = JSON.parse(req.file.buffer.toString("utf8"));
      const db = loadDb();
      mergeTenantData(db, req.params.id, parsed);
      saveDb(db);
      return res.json({ ok: true });
    } catch (err) {
      return res.status(400).json({ error: "invalid_backup" });
    }
  }
);

module.exports = router;
