const express = require("express");
const rateLimit = require("express-rate-limit");
const { authRequired } = require("../middleware/auth");
const { setupMFA, verifyAndEnableMFA, validateMFAToken, getMFAStatus, generateTOTPUri } = require("../services/mfa.service");
const { logEvent } = require("../services/audit.service");

const router = express.Router();
router.use(authRequired);

const mfaRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => `mfa:${req.user?.id || req.ip}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too_many_attempts" },
});

// GET /auth/mfa/status
router.get("/status", async (req, res) => {
  const status = await getMFAStatus(req.user.id);
  return res.json(status);
});

// POST /auth/mfa/setup — generate secret + QR URI (re-enrollment requires current_token)
router.post("/setup", mfaRateLimit, async (req, res) => {
  const result = await setupMFA(req.user.id, req.body.current_token);
  if (result.error) return res.status(400).json({ error: result.error });
  const uri = generateTOTPUri(result.secret, req.user.email, "AssistantPME");
  return res.json({ secret: result.secret, uri, backup_codes: result.backupCodes });
});

// POST /auth/mfa/verify — verify first TOTP to enable MFA
router.post("/verify", mfaRateLimit, async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "token required" });
  const result = await verifyAndEnableMFA(req.user.id, token);
  if (!result.ok) return res.status(400).json({ error: result.error });
  await logEvent({ tenantId: req.user.tenantId, userId: req.user.id, action: "mfa_enabled", entity: "user", entityId: req.user.id });
  return res.json({ ok: true, message: "MFA activé avec succès" });
});

// POST /auth/mfa/validate — validate token on login
router.post("/validate", mfaRateLimit, async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "token required" });
  const result = await validateMFAToken(req.user.id, token);
  if (!result.ok) return res.status(401).json({ error: result.error });
  return res.json({ ok: true, used_backup_code: Boolean(result.usedBackupCode) });
});

module.exports = router;
