const express = require("express");
const { authRequired } = require("../middleware/auth");
const { requireStaff } = require("../middleware/roles");
const { processTicket, analyzeTicket, seedBacklogGroups, BACKLOG_GROUPS } = require("../services/smart-dispatch.service");
const { executeAction } = require("../services/action-executor.service");
const { detectIncidentPeaks, getUnacknowledgedAlerts, acknowledgeAlert } = require("../services/proactive.service");
const { logEvent } = require("../services/audit.service");
const { getKnex } = require("../services/store.service");

const router = express.Router();
router.use(authRequired);

// JWT compat: /auth/login signs tenant_id (snake), quick-admin signs tenantId (camel)
function getTenantId(req) { return req.user.tenant_id || req.user.tenantId; }
function getUserId(req) { return req.user.sub || req.user.id; }

// POST /api/tickets/analyze — analyze without saving
router.post("/tickets/analyze", async (req, res) => {
  const { title, description } = req.body;
  if (!title || !description) return res.status(400).json({ error: "title and description required" });
  try {
    const analysis = await analyzeTicket({ title, description }, getTenantId(req));
    return res.json(analysis);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/tickets/classify — classify existing ticket
router.post("/tickets/classify", requireStaff, async (req, res) => {
  const { ticket_id } = req.body;
  const knex = getKnex();
  const ticket = await knex("tickets").where({ id: ticket_id, tenant_id: getTenantId(req) }).first();
  if (!ticket) return res.status(404).json({ error: "ticket_not_found" });
  try {
    const result = await processTicket(ticket, getTenantId(req));
    await logEvent({ tenantId: getTenantId(req), userId: getUserId(req), action: "ticket_classified", entity: "ticket", entityId: ticket_id, newValue: result });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/tickets/dispatch — dispatch a ticket to a backlog
router.post("/tickets/dispatch", requireStaff, async (req, res) => {
  const { ticket_id, backlog_group_code } = req.body;
  if (!ticket_id || !backlog_group_code) return res.status(400).json({ error: "ticket_id and backlog_group_code required" });
  const knex = getKnex();
  const ticket = await knex("tickets").where({ id: ticket_id, tenant_id: getTenantId(req) }).first();
  if (!ticket) return res.status(404).json({ error: "ticket_not_found" });
  const validGroups = BACKLOG_GROUPS.map((g) => g.code);
  if (!validGroups.includes(backlog_group_code)) return res.status(400).json({ error: "invalid_backlog_group" });
  await knex("tickets").where({ id: ticket_id }).update({ backlog_group_code, updated_at: new Date() });
  await knex("backlog_assignments").insert({ id: require("crypto").randomUUID(), ticket_id, tenant_id: getTenantId(req), backlog_group_code, assigned_by: "manual", assigned_by_user_id: getUserId(req), assigned_at: new Date() });
  await logEvent({ tenantId: getTenantId(req), userId: getUserId(req), action: "ticket_dispatched", entity: "ticket", entityId: ticket_id, newValue: { backlog_group_code } });
  return res.json({ ok: true, backlog_group_code });
});

// POST /api/tickets/resolve — auto-resolve
router.post("/tickets/resolve", requireStaff, async (req, res) => {
  const { ticket_id } = req.body;
  const knex = getKnex();
  const ticket = await knex("tickets").where({ id: ticket_id, tenant_id: getTenantId(req) }).first();
  if (!ticket) return res.status(404).json({ error: "ticket_not_found" });
  const analysis = await knex("ticket_analysis").where({ ticket_id }).first();
  if (!analysis) return res.status(400).json({ error: "ticket_not_analyzed" });
  const result = await executeAction(ticket, analysis, getTenantId(req), getUserId(req));
  if (!result) return res.status(400).json({ error: "no_action_available" });
  return res.json(result);
});

// GET /api/backlogs — list backlogs with ticket counts
router.get("/backlogs", async (req, res) => {
  const knex = getKnex();
  const tenantId = getTenantId(req);

  // Seed if needed
  try { await seedBacklogGroups(tenantId); } catch {}

  const groups = await knex("backlog_groups").where({ tenant_id: tenantId, active: true }).orderBy("code");
  const counts = await knex("tickets")
    .where({ tenant_id: tenantId })
    .whereIn("status", ["open", "pending"])
    .whereNotNull("backlog_group_code")
    .select("backlog_group_code")
    .count("* as cnt")
    .groupBy("backlog_group_code");

  const countMap = {};
  for (const c of counts) countMap[c.backlog_group_code] = parseInt(c.cnt, 10);

  const result = groups.map((g) => ({ ...g, open_count: countMap[g.code] || 0 }));
  return res.json(result);
});

// GET /api/rules — list dispatch rules
router.get("/rules", requireStaff, async (req, res) => {
  const knex = getKnex();
  const rules = await knex("dispatch_rules").where({ tenant_id: getTenantId(req) }).orderBy("sort_order");
  return res.json(rules);
});

// POST /api/rules — create a dispatch rule
router.post("/rules", requireStaff, async (req, res) => {
  const { name, keywords, backlog_group_code, priority_override, can_auto_resolve, auto_resolve_response, confidence_threshold } = req.body;
  if (!name || !keywords || !backlog_group_code) return res.status(400).json({ error: "name, keywords, backlog_group_code required" });
  const knex = getKnex();
  const rule = {
    id: require("crypto").randomUUID(),
    tenant_id: getTenantId(req),
    name: String(name).slice(0, 200),
    keywords: Array.isArray(keywords) ? keywords.slice(0, 50).map((k) => String(k).slice(0, 100)) : [],
    backlog_group_code: String(backlog_group_code).slice(0, 50),
    priority_override: priority_override || null,
    can_auto_resolve: Boolean(can_auto_resolve),
    auto_resolve_response: auto_resolve_response ? String(auto_resolve_response).slice(0, 2000) : null,
    confidence_threshold: Math.min(Math.max(parseInt(confidence_threshold || 70, 10), 0), 100),
    active: true,
  };
  await knex("dispatch_rules").insert(rule);
  return res.status(201).json(rule);
});

// GET /api/kpi — KPI dashboard data
router.get("/kpi", async (req, res) => {
  const knex = getKnex();
  const tenantId = getTenantId(req);
  const days = Math.min(parseInt(req.query.days || "30", 10), 90);
  const since = new Date(Date.now() - days * 86400000);

  const [
    totalTickets,
    autoResolved,
    dispatched,
    pending,
    byBacklog,
    byPriority,
    avgConfidence,
    alerts,
  ] = await Promise.all([
    knex("tickets").where({ tenant_id: tenantId }).where("created_at", ">=", since).count("* as cnt").first(),
    knex("ticket_analysis").join("tickets", "ticket_analysis.ticket_id", "tickets.id").where("tickets.tenant_id", tenantId).where("tickets.created_at", ">=", since).where("ticket_analysis.auto_resolved", true).count("* as cnt").first(),
    knex("ticket_analysis").join("tickets", "ticket_analysis.ticket_id", "tickets.id").where("tickets.tenant_id", tenantId).where("tickets.created_at", ">=", since).whereIn("ticket_analysis.resolution_type", ["dispatch", "escalate"]).count("* as cnt").first(),
    knex("tickets").where({ tenant_id: tenantId, status: "open" }).count("* as cnt").first(),
    knex("ticket_analysis").join("tickets", "ticket_analysis.ticket_id", "tickets.id").where("tickets.tenant_id", tenantId).where("tickets.created_at", ">=", since).whereNotNull("ticket_analysis.backlog_group_code").select("ticket_analysis.backlog_group_code").count("* as cnt").groupBy("ticket_analysis.backlog_group_code").orderBy("cnt", "desc"),
    knex("tickets").where({ tenant_id: tenantId }).where("created_at", ">=", since).select("priority").count("* as cnt").groupBy("priority"),
    knex("ticket_analysis").join("tickets", "ticket_analysis.ticket_id", "tickets.id").where("tickets.tenant_id", tenantId).where("tickets.created_at", ">=", since).avg("ticket_analysis.confidence_score as avg").first(),
    knex("proactive_alerts").where({ tenant_id: tenantId, acknowledged: false }).count("* as cnt").first(),
  ]);

  const total = parseInt(totalTickets?.cnt || 0, 10);
  const auto = parseInt(autoResolved?.cnt || 0, 10);
  const disp = parseInt(dispatched?.cnt || 0, 10);
  const pend = parseInt(pending?.cnt || 0, 10);

  return res.json({
    period_days: days,
    tickets: {
      total,
      auto_resolved: auto,
      dispatched: disp,
      pending: pend,
      auto_resolve_rate: total ? Math.round((auto / total) * 100) : 0,
      dispatch_rate: total ? Math.round((disp / total) * 100) : 0,
    },
    confidence: { avg: Math.round(parseFloat(avgConfidence?.avg || 0)) },
    by_backlog: byBacklog.map((r) => ({ backlog: r.backlog_group_code, count: parseInt(r.cnt, 10) })),
    by_priority: byPriority.map((r) => ({ priority: r.priority, count: parseInt(r.cnt, 10) })),
    alerts: { unacknowledged: parseInt(alerts?.cnt || 0, 10) },
    targets: { classification: 95, dispatch: 90, auto_resolve: 60 },
  });
});

// GET /api/alerts — proactive alerts
router.get("/alerts", async (req, res) => {
  const alerts = await getUnacknowledgedAlerts(getTenantId(req));
  return res.json(alerts);
});

// POST /api/alerts/:id/acknowledge
router.post("/alerts/:id/acknowledge", requireStaff, async (req, res) => {
  await acknowledgeAlert(req.params.id, getUserId(req));
  return res.json({ ok: true });
});

// POST /api/tickets/ingest-analyze — full pipeline: receive + analyze + dispatch
router.post("/tickets/ingest-analyze", async (req, res) => {
  const { title, description, source, language, site, country, is_vip } = req.body;
  if (!title) return res.status(400).json({ error: "title required" });
  const knex = getKnex();

  const ticketId = require("crypto").randomUUID();
  const ticket = {
    id: ticketId,
    tenant_id: getTenantId(req),
    title: String(title).slice(0, 500),
    description: String(description || "").slice(0, 5000),
    source: source || "api",
    language: language || "fr",
    site: site || null,
    country: country || null,
    is_vip: Boolean(is_vip),
    status: "open",
    priority: "medium",
    category: "general",
    created_at: new Date(),
    updated_at: new Date(),
  };

  await knex("tickets").insert(ticket);
  const analysis = await processTicket(ticket, getTenantId(req));

  // Run proactive detection
  try { await detectIncidentPeaks(getTenantId(req)); } catch {}

  return res.status(201).json({ ticket: { id: ticketId }, analysis });
});

module.exports = router;
