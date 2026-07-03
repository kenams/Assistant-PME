const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const { db } = require("../config/db");

async function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) {
    return res.status(401).json({ error: "missing_token" });
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    return res.status(401).json({ error: "invalid_token" });
  }

  // Enforce deactivation: reject existing tokens for disabled accounts
  if (payload.sub) {
    const user = await db("users").where({ id: payload.sub }).select("active").first().catch(() => null);
    if (user && user.active === false) {
      return res.status(403).json({ error: "account_disabled" });
    }
  }

  req.user = payload;
  return next();
}

module.exports = { authRequired };