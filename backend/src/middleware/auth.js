const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const { db } = require("../config/db");

function authRequired(req, res, next) {
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

  if (!payload.sub) {
    req.user = payload;
    return next();
  }

  // Enforce deactivation: reject existing tokens for disabled accounts
  db("users").where({ id: payload.sub }).select("active").first()
    .then((user) => {
      if (user && user.active === false) {
        return res.status(403).json({ error: "account_disabled" });
      }
      req.user = payload;
      return next();
    })
    .catch((err) => next(err));
}

module.exports = { authRequired };