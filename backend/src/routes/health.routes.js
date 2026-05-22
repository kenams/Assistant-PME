const express = require("express");
const { env } = require("../config/env");

const router = express.Router();

router.get("/", (req, res) => {
  return res.json({
    ok: true,
    uptime: process.uptime(),
    openai_base_url: env.openaiBaseUrl || "https://api.openai.com/v1"
  });
});

module.exports = router;