const express = require("express");
const { authRequired } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/roles");
const { createRateLimiter } = require("../middleware/rate-limit");
const { sendGlpiProspect, getProspectStats } = require("../services/prospect.service");

const router = express.Router();
const prospectLimiter = createRateLimiter({ max: 20, windowSec: 3600 });

router.get("/stats", authRequired, requireAdmin, async (req, res, next) => {
  try {
    const stats = await getProspectStats();
    return res.json(stats);
  } catch (err) {
    next(err);
  }
});

router.post("/send", authRequired, requireAdmin, prospectLimiter, async (req, res, next) => {
  try {
    const { name, email, company, personalNote } = req.body || {};
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "email_required" });
    }
    await sendGlpiProspect({ name: name || email, email, company, personalNote });
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

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
      try {
        await sendGlpiProspect({ name: p.name || p.email, email: p.email, company: p.company, personalNote: p.personalNote });
        results.push({ email: p.email, ok: true });
        await new Promise(r => setTimeout(r, 2000));
      } catch (err) {
        results.push({ email: p.email, ok: false, error: err.message });
      }
    }
    return res.json({ ok: true, results });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
