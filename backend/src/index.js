const { env } = require("./config/env");
const { app, logger } = require("./app");

process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection] caught (not crashing):", reason?.message || reason);
});
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException] caught (not crashing):", err.message);
});
const { hasDb } = require("./config/db");
const { runMigrations } = require("./services/store.service");
const { ensureSeeded } = require("./services/users.service");

async function start() {
  if (hasDb) {
    try {
      await runMigrations();
      await ensureSeeded();
    } catch (err) {
      logger.error({ err }, "startup_db_error");
    }
  }
  app.listen(env.port, () => {
    logger.info({ port: env.port }, "server_started");
  });
}

start();