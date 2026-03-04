const { env } = require("../config/env");

function createRateLimiter({ max, windowSec }) {
  const hits = new Map();
  const windowMs = windowSec * 1000;

  return (req, res, next) => {
    const key = req.ip || "local";
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      res.setHeader("Retry-After", Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({ error: "rate_limited" });
    }
    return next();
  };
}

function defaultLimiter() {
  return createRateLimiter({
    max: env.rateLimitMax,
    windowSec: env.rateLimitWindowSec
  });
}

function loginLimiter() {
  return createRateLimiter({
    max: env.rateLimitLoginMax,
    windowSec: env.rateLimitWindowSec
  });
}

function ingestLimiter() {
  return createRateLimiter({
    max: env.rateLimitIngestMax,
    windowSec: env.rateLimitWindowSec
  });
}

module.exports = { createRateLimiter, defaultLimiter, loginLimiter, ingestLimiter };
