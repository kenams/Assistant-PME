const { recordRequest } = require("../services/monitoring.service");

function monitoringMiddleware(req, res, next) {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1e6;
    recordRequest({
      path: req.path,
      method: req.method,
      status: res.statusCode,
      durationMs
    });
  });
  next();
}

module.exports = { monitoringMiddleware };
