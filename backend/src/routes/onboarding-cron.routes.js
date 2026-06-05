const express = require("express");
const router = express.Router();
const { pool } = require("../config/db");
const { sendOnboardingJ0, sendOnboardingJ3, sendOnboardingJ7 } = require("../services/email.service");
const { env } = require("../config/env");

const APP_URL = env.appUrl || "https://kah-support.ch/app";

// Protégé par CRON_SECRET
router.get("/cron/onboarding", async (req, res) => {
  if (req.headers.authorization !== `Bearer ${env.cronSecret}`) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const now = new Date();
  const report = { j0: 0, j3: 0, j7: 0, errors: 0 };

  try {
    // J0 — bienvenue immédiat (tenants créés il y a moins de 10 min qui n'ont pas reçu l'email)
    const j0 = await pool.query(`
      SELECT id, name, admin_email, created_at
      FROM tenants
      WHERE onboarding_j0_sent_at IS NULL
        AND created_at <= NOW() - INTERVAL '1 minute'
        AND status != 'suspended'
      LIMIT 20
    `);
    for (const t of j0.rows) {
      try {
        await sendOnboardingJ0({ email: t.admin_email, tenantName: t.name, loginUrl: `${APP_URL}/login.html` });
        await pool.query("UPDATE tenants SET onboarding_j0_sent_at = NOW() WHERE id = $1", [t.id]);
        report.j0++;
      } catch { report.errors++; }
    }

    // J3 — astuce + stats
    const j3 = await pool.query(`
      SELECT t.id, t.name, t.admin_email, t.created_at,
        COUNT(tk.id) FILTER (WHERE tk.created_at >= t.created_at) AS ticket_count
      FROM tenants t
      LEFT JOIN tickets tk ON tk.tenant_id = t.id
      WHERE t.onboarding_j0_sent_at IS NOT NULL
        AND t.onboarding_j3_sent_at IS NULL
        AND t.created_at <= NOW() - INTERVAL '3 days'
      GROUP BY t.id
      LIMIT 20
    `);
    for (const t of j3.rows) {
      try {
        await sendOnboardingJ3({ email: t.admin_email, tenantName: t.name, loginUrl: `${APP_URL}/login.html`, ticketCount: parseInt(t.ticket_count) || 0 });
        await pool.query("UPDATE tenants SET onboarding_j3_sent_at = NOW() WHERE id = $1", [t.id]);
        report.j3++;
      } catch { report.errors++; }
    }

    // J7 — bilan + CTA conversion
    const j7 = await pool.query(`
      SELECT t.id, t.name, t.admin_email, t.created_at,
        COUNT(tk.id) FILTER (WHERE tk.created_at >= t.created_at) AS ticket_count
      FROM tenants t
      LEFT JOIN tickets tk ON tk.tenant_id = t.id
      WHERE t.onboarding_j3_sent_at IS NOT NULL
        AND t.onboarding_j7_sent_at IS NULL
        AND t.created_at <= NOW() - INTERVAL '7 days'
        AND t.plan = 'trial'
      GROUP BY t.id
      LIMIT 20
    `);
    for (const t of j7.rows) {
      try {
        const tickets = parseInt(t.ticket_count) || 0;
        const savedHours = Math.round(tickets * 25 / 60);
        await sendOnboardingJ7({ email: t.admin_email, tenantName: t.name, loginUrl: `${APP_URL}/login.html`, ticketCount: tickets, savedHours });
        await pool.query("UPDATE tenants SET onboarding_j7_sent_at = NOW() WHERE id = $1", [t.id]);
        report.j7++;
      } catch { report.errors++; }
    }

    res.json({ ok: true, ...report });
  } catch (err) {
    console.error("[onboarding-cron]", err);
    res.status(500).json({ error: String(err) });
  }
});

module.exports = router;
