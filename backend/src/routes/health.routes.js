const express = require("express");
const { env } = require("../config/env");
const { db, hasDb } = require("../config/db");

const router = express.Router();

router.get("/", (req, res) => {
  return res.json({
    ok: true,
    uptime: process.uptime(),
    hasDb,
    openai_base_url: env.openaiBaseUrl || "https://api.openai.com/v1"
  });
});

router.get("/db", async (req, res) => {
  const secret = req.headers["x-debug-secret"];
  if (!secret || secret !== process.env.DEBUG_SECRET) {
    return res.status(403).json({ error: "forbidden" });
  }
  if (!hasDb) return res.json({ hasDb: false });
  try {
    await db.raw("SELECT 1");
    const rows = await db.raw("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
    return res.json({ ok: true, hasDb: true, tables: rows.rows.map(r => r.tablename) });
  } catch (err) {
    req.log?.error({ err }, "health/db failed");
    return res.status(500).json({ ok: false, error: "db_check_failed" });
  }
});

module.exports = router;