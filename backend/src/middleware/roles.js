function requireAdmin(req, res, next) {
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "superadmin")) {
    return res.status(403).json({ error: "forbidden" });
  }
  return next();
}

function requireStaff(req, res, next) {
  if (
    !req.user ||
    (req.user.role !== "admin" &&
      req.user.role !== "agent" &&
      req.user.role !== "superadmin")
  ) {
    return res.status(403).json({ error: "forbidden" });
  }
  return next();
}

function requireSuperAdmin(req, res, next) {
  if (!req.user || req.user.role !== "superadmin") {
    return res.status(403).json({ error: "forbidden" });
  }
  return next();
}

module.exports = { requireAdmin, requireStaff, requireSuperAdmin };
