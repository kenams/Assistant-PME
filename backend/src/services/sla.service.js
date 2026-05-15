const { env } = require("../config/env");
const { db } = require("../config/db");
const { computeAnalytics } = require("./analytics.service");
const { createNotification } = require("./notifications.service");
const { logEvent } = require("./audit.service");
const { listTenants } = require("./tenants.service");
const { notifySlaBreach } = require("./email.service");

async function isDuplicateNotification({ tenantId, ticketId, windowMs }) {
  const now = Date.now();
  const since = new Date(now - windowMs).toISOString();
  const row = await db("notifications")
    .where({ tenant_id: tenantId, type: "sla_alert" })
    .whereRaw("payload->>'ticket_id' = ?", [ticketId])
    .where("created_at", ">=", since)
    .first();
  return !!row;
}

async function sendSlaAlerts({ tenantId, userId, windowHours = 24 }) {
  const analytics = await computeAnalytics(tenantId);
  const alerts = analytics.sla?.alerts || [];
  const windowMs = windowHours * 60 * 60 * 1000;
  let sent = 0;

  for (const alert of alerts) {
    if (!alert.id) continue;
    const isDup = await isDuplicateNotification({ tenantId, ticketId: alert.id, windowMs });
    if (isDup) continue;

    const slaHours = analytics.sla?.hours || 24;
    await createNotification({
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
        sla_hours: slaHours
      }
    });
    notifySlaBreach({
      ticket: { id: alert.id, title: alert.title, status: alert.status, priority: alert.type },
      ageHours: alert.age_hours,
      slaHours
    }).catch(() => {});
    sent += 1;
  }

  if (sent > 0) {
    await logEvent({
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
  if (!intervalMin || Number.isNaN(intervalMin) || intervalMin <= 0) return;

  setInterval(async () => {
    try {
      const tenants = await listTenants();
      for (const tenant of tenants) {
        try {
          await sendSlaAlerts({ tenantId: tenant.id, userId: null });
        } catch (err) {
          // ignore individual tenant errors
        }
      }
    } catch (err) {
      // ignore scheduler errors
    }
  }, intervalMin * 60 * 1000);
}

module.exports = { sendSlaAlerts, startSlaAlertScheduler };
