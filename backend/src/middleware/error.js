const { logEvent } = require("../services/audit.service");

function errorHandler(err, req, res, next) {
  try {
    logEvent({
      tenantId: req.user ? req.user.tenant_id : null,
      userId: req.user ? req.user.sub : null,
      action: "server_error",
      meta: { message: err.message }
    });
  } catch (e) {
    // ignore
  }

  req.log.error({ err }, "unhandled_error");
  return res.status(500).json({ error: "internal_error" });
}

module.exports = { errorHandler };