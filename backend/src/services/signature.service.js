const crypto = require("crypto");

function timingSafeEquals(a, b) {
  const aBuf = Buffer.from(a || "", "utf8");
  const bBuf = Buffer.from(b || "", "utf8");
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function verifyHmacSignature({ rawBody, secret, signature }) {
  if (!secret) {
    return true;
  }
  if (!rawBody || !signature) {
    return false;
  }
  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return timingSafeEquals(digest, signature);
}

module.exports = { verifyHmacSignature };
