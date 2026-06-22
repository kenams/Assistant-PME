// MFA / TOTP — RFC 6238 implementation without external deps
const crypto = require("crypto");
const { getKnex } = require("./store.service");

// ─── TOTP IMPLEMENTATION ──────────────────────────────────────────────────────
function base32Decode(str) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleanStr = str.toUpperCase().replace(/=+$/, "");
  let bits = "";
  for (const c of cleanStr) {
    const idx = chars.indexOf(c);
    if (idx === -1) continue;
    bits += idx.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function base32Encode(buffer) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const byte of buffer) bits += byte.toString(2).padStart(8, "0");
  let result = "";
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, "0");
    result += chars[parseInt(chunk, 2)];
  }
  return result;
}

function generateSecret() {
  const bytes = crypto.randomBytes(20);
  return base32Encode(bytes);
}

function computeHOTP(secret, counter) {
  const key = base32Decode(secret);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (code % 1000000).toString().padStart(6, "0");
}

function verifyTOTP(secret, token, window = 1) {
  const counter = Math.floor(Date.now() / 1000 / 30);
  for (let i = -window; i <= window; i++) {
    if (computeHOTP(secret, counter + i) === token.replace(/\s/g, "")) return true;
  }
  return false;
}

function generateTOTPUri(secret, email, issuer = "AssistantPME") {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

// ─── BACKUP CODES ────────────────────────────────────────────────────────────
function generateBackupCodes(count = 8) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(5).toString("hex").toUpperCase();
    const formatted = raw.slice(0, 4) + "-" + raw.slice(4);
    const hashed = crypto.createHash("sha256").update(formatted).digest("hex");
    codes.push({ raw: formatted, hashed });
  }
  return codes;
}

// ─── DB OPERATIONS ────────────────────────────────────────────────────────────
async function setupMFA(userId) {
  const knex = getKnex();
  const secret = generateSecret();
  const backupCodes = generateBackupCodes();
  const existing = await knex("user_mfa").where({ user_id: userId }).first();
  if (existing) {
    await knex("user_mfa").where({ user_id: userId }).update({
      totp_secret: secret,
      verified: false,
      backup_codes: JSON.stringify(backupCodes.map((c) => c.hashed)),
      enabled_at: null,
    });
  } else {
    await knex("user_mfa").insert({
      id: crypto.randomUUID(),
      user_id: userId,
      totp_secret: secret,
      verified: false,
      backup_codes: JSON.stringify(backupCodes.map((c) => c.hashed)),
    });
  }
  return { secret, backupCodes: backupCodes.map((c) => c.raw) };
}

async function verifyAndEnableMFA(userId, token) {
  const knex = getKnex();
  const mfa = await knex("user_mfa").where({ user_id: userId }).first();
  if (!mfa) return { ok: false, error: "mfa_not_setup" };
  if (!verifyTOTP(mfa.totp_secret, token)) return { ok: false, error: "invalid_token" };
  await knex("user_mfa").where({ user_id: userId }).update({ verified: true, enabled_at: new Date() });
  await knex("users").where({ id: userId }).update({ mfa_required: false }); // MFA is now active
  return { ok: true };
}

async function validateMFAToken(userId, token) {
  const knex = getKnex();
  const mfa = await knex("user_mfa").where({ user_id: userId, verified: true }).first();
  if (!mfa) return { ok: false, error: "mfa_not_enabled" };

  // Try TOTP first
  if (verifyTOTP(mfa.totp_secret, token)) return { ok: true };

  // Try backup codes
  const tokenHash = crypto.createHash("sha256").update(token.toUpperCase()).digest("hex");
  const codes = Array.isArray(mfa.backup_codes) ? mfa.backup_codes : JSON.parse(mfa.backup_codes || "[]");
  const idx = codes.indexOf(tokenHash);
  if (idx !== -1) {
    codes.splice(idx, 1);
    await knex("user_mfa").where({ user_id: userId }).update({ backup_codes: JSON.stringify(codes) });
    return { ok: true, usedBackupCode: true };
  }

  return { ok: false, error: "invalid_token" };
}

async function getMFAStatus(userId) {
  const knex = getKnex();
  const mfa = await knex("user_mfa").where({ user_id: userId }).first();
  if (!mfa) return { enabled: false, verified: false };
  return { enabled: true, verified: Boolean(mfa.verified), enabledAt: mfa.enabled_at };
}

module.exports = { generateSecret, verifyTOTP, generateTOTPUri, setupMFA, verifyAndEnableMFA, validateMFAToken, getMFAStatus };
