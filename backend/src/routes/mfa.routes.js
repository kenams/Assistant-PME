const express = require("express");
const { authRequired } = require("../middleware/auth");
const { setupMFA, verifyAndEnableMFA, validateMFAToken, getMFAStatus, generateTOTPUri } = require("../services/mfa.service");
const { logEvent } = require("../services/audit.service");

const router = express.Router();
router.use(authRequired);

// GET /auth/mfa/status
router.get("/status", async (req, res) => {
  const status = await getMFAStatus(req.user.id);
  return res.json(status);
});

// POST /auth/mfa/setup — generate secret + QR URI
router.post("/setup", async (req, res) => {
  const { secret, backupCodes } = await setupMFA(req.user.id);
  const uri = generateTOTPUri(secret, req.user.email, "AssistantPME");
  return res.json({ secret, uri, backup_codes: backupCodes });
});

// POST /auth/mfa/verify — verify first TOTP to enable MFA
router.post("/verify", async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "token required" });
  const result = await verifyAndEnableMFA(req.user.id, token);
  if (!result.ok) return res.status(400).json({ error: result.error });
  await logEvent({ tenantId: req.user.tenantId, userId: req.user.id, action: "mfa_enabled", entity: "user", entityId: req.user.id });
  return res.json({ ok: true, message: "MFA activé avec succès" });
});

// POST /auth/mfa/validate — validate token on login
router.post("/validate", async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "token required" });
  const result = await validateMFAToken(req.user.id, token);
  if (!result.ok) return res.status(401).json({ error: result.error });
  return res.json({ ok: true, used_backup_code: Boolean(result.usedBackupCode) });
});

module.exports = router;
