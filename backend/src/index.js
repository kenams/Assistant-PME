const { env } = require("./config/env");
const { app, logger } = require("./app");
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