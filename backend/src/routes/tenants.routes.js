const express = require("express");
const multer = require("multer");
const { z } = require("zod");
const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const { authRequired } = require("../middleware/auth");
const { requireSuperAdmin } = require("../middleware/roles");
const { listTenants, createTenant } = require("../services/tenants.service");
const { findUserByEmailInTenant } = require("../services/users.service");
const { db: pgDb } = require("../config/db");
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

router.get("/", authRequired, requireSuperAdmin, async (req, res, next) => {
  try {
    return res.json({ items: await listTenants() });
  } catch (err) {
    next(err);
  }
});

router.post("/", authRequired, requireSuperAdmin, async (req, res, next) => {
  try {
    const payload = validateOr400(tenantSchema, res, req.body);
    if (!payload) return;
    const result = await createTenant({
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
  } catch (err) {
    next(err);
  }
});

router.post("/:id/token", authRequired, requireSuperAdmin, async (req, res, next) => {
  try {
    const payload = validateOr400(tokenSchema, res, req.body || {});
    if (!payload) return;
    const tenantId = req.params.id;
    const email = payload.email;
    if (!email) {
      return res.status(400).json({ error: "missing_email" });
    }
    const user = await findUserByEmailInTenant({ tenantId, email });
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
  } catch (err) {
    next(err);
  }
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

router.get("/overview", authRequired, requireSuperAdmin, async (req, res, next) => {
  try {
    const counts = await Promise.all([
      pgDb("tenants").count("id as c").first(),
      pgDb("users").count("id as c").first(),
      pgDb("conversations").count("id as c").first(),
      pgDb("messages").count("id as c").first(),
      pgDb("tickets").count("id as c").first(),
      pgDb("leads").count("id as c").first(),
      pgDb("kb_documents").count("id as c").first()
    ]);
    const [tenants, users, conversations, messages, tickets, leads, kb_documents] = counts.map(r => Number(r.c));
    return res.json({ tenants, users, conversations, messages, tickets, leads, kb_documents });
  } catch (err) { next(err); }
});

router.get("/export.json", authRequired, requireSuperAdmin, async (req, res, next) => {
  try {
    const [tenants, users, conversations, messages, tickets, kb_documents, kb_chunks, leads] = await Promise.all([
      pgDb("tenants"), pgDb("users").select("id","tenant_id","email","role","created_at"),
      pgDb("conversations"), pgDb("messages"), pgDb("tickets"),
      pgDb("kb_documents"), pgDb("kb_chunks"), pgDb("leads")
    ]);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=\"global_backup.json\"");
    return res.send(JSON.stringify({ tenants, users, conversations, messages, tickets, kb_documents, kb_chunks, leads }, null, 2));
  } catch (err) { next(err); }
});

router.post("/import", authRequired, requireSuperAdmin, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "missing_file" });
  }
  return res.status(400).json({ error: "import_not_available_in_pg_mode" });
});

router.get("/:id/export.json", authRequired, requireSuperAdmin, async (req, res, next) => {
  try {
    const tenantId = req.params.id;
    const [conversations, messages, tickets, kb_documents, kb_chunks] = await Promise.all([
      pgDb("conversations").where({ tenant_id: tenantId }),
      pgDb("messages").where({ tenant_id: tenantId }),
      pgDb("tickets").where({ tenant_id: tenantId }),
      pgDb("kb_documents").where({ tenant_id: tenantId }),
      pgDb("kb_chunks").where({ tenant_id: tenantId })
    ]);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="tenant_${tenantId}.json"`);
    return res.send(JSON.stringify({ conversations, messages, tickets, kb_documents, kb_chunks }, null, 2));
  } catch (err) { next(err); }
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
    return res.status(400).json({ error: "import_not_available_in_pg_mode" });
  }
);


module.exports = router;
