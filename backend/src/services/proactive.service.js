// Détection proactive — pics d'incidents, pannes globales, anomalies
const { getKnex } = require("./store.service");

const ALERT_THRESHOLDS = {
  incident_peak: { count: 10, window_minutes: 60 },    // 10 tickets même catégorie/1h
  vip_peak: { count: 3, window_minutes: 30 },           // 3 tickets VIP/30min
  secu_any: { count: 1, window_minutes: 1 },            // 1 ticket sécu → alerte immédiate
  backlog_saturation: { percent: 80, check_count: 20 }, // >80% des tickets sur 1 backlog
};

async function detectIncidentPeaks(tenantId) {
  const knex = getKnex();
  const alerts = [];
  const now = new Date();

  // ─── PEAK DETECTION ─────────────────────────────────────────────────────────
  const windowStart = new Date(now - ALERT_THRESHOLDS.incident_peak.window_minutes * 60000);

  try {
    // Group tickets by backlog in the last window
    const recent = await knex("ticket_analysis")
      .join("tickets", "ticket_analysis.ticket_id", "tickets.id")
      .where("tickets.tenant_id", tenantId)
      .where("tickets.created_at", ">=", windowStart)
      .select("ticket_analysis.backlog_group_code")
      .count("* as cnt")
      .groupBy("ticket_analysis.backlog_group_code");

    for (const row of recent) {
      const count = parseInt(row.cnt, 10);
      const group = row.backlog_group_code;

      // Security — any count triggers alert
      if (group === "SECU" && count >= ALERT_THRESHOLDS.secu_any.count) {
        alerts.push({
          type: "incident_peak",
          category: "Sécurité",
          backlog_group_code: group,
          ticket_count: count,
          window_minutes: ALERT_THRESHOLDS.incident_peak.window_minutes,
          severity: count >= 5 ? "critical" : "high",
          message: `🚨 ${count} ticket(s) de sécurité en ${ALERT_THRESHOLDS.incident_peak.window_minutes} minutes — investigation immédiate requise`,
        });
      }
      // VIP
      else if (group === "VIP" && count >= ALERT_THRESHOLDS.vip_peak.count) {
        alerts.push({
          type: "incident_peak",
          category: "VIP",
          backlog_group_code: group,
          ticket_count: count,
          window_minutes: ALERT_THRESHOLDS.vip_peak.window_minutes,
          severity: "critical",
          message: `⚡ ${count} tickets VIP en ${ALERT_THRESHOLDS.vip_peak.window_minutes} minutes`,
        });
      }
      // General peak
      else if (count >= ALERT_THRESHOLDS.incident_peak.count) {
        alerts.push({
          type: "incident_peak",
          category: group,
          backlog_group_code: group,
          ticket_count: count,
          window_minutes: ALERT_THRESHOLDS.incident_peak.window_minutes,
          severity: count >= 25 ? "critical" : count >= 15 ? "high" : "medium",
          message: `📈 ${count} tickets ${group} en ${ALERT_THRESHOLDS.incident_peak.window_minutes} min — panne possible`,
        });
      }
    }

    // ─── SATURATION DETECTION ─────────────────────────────────────────────────
    const totalRecent = recent.reduce((s, r) => s + parseInt(r.cnt, 10), 0);
    if (totalRecent >= ALERT_THRESHOLDS.backlog_saturation.check_count) {
      for (const row of recent) {
        const count = parseInt(row.cnt, 10);
        const pct = (count / totalRecent) * 100;
        if (pct >= ALERT_THRESHOLDS.backlog_saturation.percent) {
          alerts.push({
            type: "saturation",
            category: row.backlog_group_code,
            backlog_group_code: row.backlog_group_code,
            ticket_count: count,
            window_minutes: ALERT_THRESHOLDS.incident_peak.window_minutes,
            severity: "high",
            message: `🔴 Saturation ${row.backlog_group_code}: ${Math.round(pct)}% des tickets (${count}/${totalRecent})`,
          });
        }
      }
    }
  } catch {}

  // ─── PERSIST NEW ALERTS ───────────────────────────────────────────────────
  for (const alert of alerts) {
    // Dedup: don't create same alert twice in 30 min
    const existing = await knex("proactive_alerts")
      .where({ tenant_id: tenantId, type: alert.type, backlog_group_code: alert.backlog_group_code, acknowledged: false })
      .where("created_at", ">=", new Date(now - 30 * 60000))
      .first();

    if (!existing) {
      await knex("proactive_alerts").insert({
        id: require("crypto").randomUUID(),
        tenant_id: tenantId,
        ...alert,
        created_at: new Date(),
      });
    }
  }

  return alerts;
}

async function getUnacknowledgedAlerts(tenantId, limit = 20) {
  const knex = getKnex();
  return knex("proactive_alerts")
    .where({ tenant_id: tenantId, acknowledged: false })
    .orderBy("created_at", "desc")
    .limit(limit);
}

async function acknowledgeAlert(alertId, userId) {
  const knex = getKnex();
  await knex("proactive_alerts").where({ id: alertId }).update({
    acknowledged: true,
    acknowledged_by: userId,
  });
}

module.exports = { detectIncidentPeaks, getUnacknowledgedAlerts, acknowledgeAlert };
