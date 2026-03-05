const { env } = require("../config/env");
const { loadDb } = require("./store.service");
const { computeAnalytics } = require("./analytics.service");
const { createNotification } = require("./notifications.service");
const { logEvent } = require("./audit.service");
const { listTenants } = require("./tenants.service");

function isDuplicateNotification({ tenantId, ticketId, windowMs }) {
  const db = loadDb();
  const now = Date.now();
  return (db.notifications || []).some((item) => {
    if (item.tenant_id !== tenantId) return false;
    if (item.type !== "sla_alert") return false;
    if (!item.payload || item.payload.ticket_id !== ticketId) return false;
    const created = item.created_at ? new Date(item.created_at).getTime() : 0;
    return now - created < windowMs;
  });
}

function sendSlaAlerts({ tenantId, userId, windowHours = 24 }) {
  const analytics = computeAnalytics(tenantId);
  const alerts = analytics.sla?.alerts || [];
  const windowMs = windowHours * 60 * 60 * 1000;
  let sent = 0;

  alerts.forEach((alert) => {
    if (!alert.id) return;
    if (isDuplicateNotification({ tenantId, ticketId: alert.id, windowMs })) return;
    createNotification({
      tenantId,
      userId: userId || null,
      type: "sla_alert",
      channel: "system",
      payload: {
        ticket_id: alert.id,
        title: alert.title,
        status: alert.status,
        age_hours: alert.age_hours,
        severity: alert.type,
        sla_hours: analytics.sla?.hours || 24
      }
    });
    sent += 1;
  });

  if (sent > 0) {
    logEvent({
      tenantId,
      userId: userId || null,
      action: "sla_alerts_sent",
      meta: { count: sent }
    });
  }

  return { sent, alerts };
}

function startSlaAlertScheduler() {
  const intervalMin = Number(env.slaNotifyIntervalMin || 0);
  if (!intervalMin || Number.isNaN(intervalMin) || intervalMin <= 0) {
    return;
  }
  setInterval(() => {
    const tenants = listTenants();
    tenants.forEach((tenant) => {
      try {
        sendSlaAlerts({ tenantId: tenant.id, userId: null });
      } catch (err) {
        // ignore scheduler errors
      }
    });
  }, intervalMin * 60 * 1000);
}

module.exports = { sendSlaAlerts, startSlaAlertScheduler };
