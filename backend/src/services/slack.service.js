const crypto = require("crypto");

function timingSafeEquals(a, b) {
  const aBuf = Buffer.from(a || "", "utf8");
  const bBuf = Buffer.from(b || "", "utf8");
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function verifySlackSignature({ rawBody, signingSecret, timestamp, signature }) {
  if (!signingSecret) {
    return true;
  }
  if (!rawBody || !timestamp || !signature) {
    return false;
  }
  const ts = Number(timestamp);
  if (Number.isNaN(ts)) {
    return false;
  }
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 60 * 5) {
    return false;
  }
  const base = `v0:${timestamp}:${rawBody}`;
  const digest = crypto.createHmac("sha256", signingSecret).update(base).digest("hex");
  const expected = `v0=${digest}`;
  return timingSafeEquals(expected, signature);
}

module.exports = { verifySlackSignature };
