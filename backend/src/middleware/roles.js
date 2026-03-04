function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "forbidden" });
  }
  return next();
}

function requireStaff(req, res, next) {
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "agent")) {
    return res.status(403).json({ error: "forbidden" });
  }
  return next();
}

module.exports = { requireAdmin, requireStaff };
