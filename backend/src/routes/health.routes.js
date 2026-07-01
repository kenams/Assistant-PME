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
  if (!hasDb) return res.json({ hasDb: false, tables: [] });
  try {
    const rows = await db.raw("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
    const tables = rows.rows.map(r => r.tablename);
    const userCount = tables.includes("users") ? (await db("users").count("id as c").first()).c : null;
    return res.json({ ok: true, hasDb: true, tables, userCount });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;