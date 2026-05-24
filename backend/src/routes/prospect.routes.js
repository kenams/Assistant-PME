const express = require("express");
const { authRequired } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/roles");
const { createRateLimiter } = require("../middleware/rate-limit");
const { createLead } = require("../services/leads.service");
const { sendGlpiProspectEmail, getProspectStats } = require("../services/prospect.service");

const router = express.Router();
const prospectLimiter = createRateLimiter({ max: 20, windowSec: 3600 });

// GET /prospect/stats
router.get("/stats", authRequired, requireAdmin, async (req, res, next) => {
  try {
    const stats = await getProspectStats();
    return res.json(stats);
  } catch (err) {
    next(err);
  }
});

// POST /prospect/send — envoie un email à un prospect et enregistre le lead
router.post("/send", authRequired, requireAdmin, prospectLimiter, async (req, res, next) => {
  try {
    const { name, email, company, personalNote } = req.body || {};
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "email_required" });
    }
    const safeName = name || email;

    await sendGlpiProspectEmail({ to: email, name: safeName, company, personalNote });

    await createLead({
      name: safeName,
      email,
      company: company || null,
      message: "glpi_prospect"
    }).catch(() => {});

    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /prospect/bulk — envoie à une liste (max 50, délai 2s entre chaque)
router.post("/bulk", authRequired, requireAdmin, prospectLimiter, async (req, res, next) => {
  try {
    const { prospects } = req.body || {};
    if (!Array.isArray(prospects) || prospects.length === 0) {
      return res.status(400).json({ error: "prospects_required" });
    }
    const batch = prospects.slice(0, 50);
    const results = [];

    for (const p of batch) {
      if (!p.email || !p.email.includes("@")) {
        results.push({ email: p.email, ok: false, error: "invalid_email" });
        continue;
      }
      const safeName = p.name || p.email;
      try {
        await sendGlpiProspectEmail({
          to: p.email,
          name: safeName,
          company: p.company,
          personalNote: p.personalNote
        });
        await createLead({
          name: safeName,
          email: p.email,
          company: p.company || null,
          message: "glpi_prospect"
        }).catch(() => {});
        results.push({ email: p.email, ok: true });
      } catch (err) {
        results.push({ email: p.email, ok: false, error: err.message });
      }
      if (batch.indexOf(p) < batch.length - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    return res.json({ ok: true, results, total: results.length, sent: results.filter(r => r.ok).length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
