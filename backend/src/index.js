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
  if (hasDb && process.env.SKIP_MIGRATIONS !== "true") {
    try {
      await runMigrations();
      await ensureSeeded();
    } catch (err) {
      logger.error({ err }, "startup_db_error");
    }
  } else if (hasDb) {
    logger.info("migrations skipped (SKIP_MIGRATIONS=true)");
  }
  app.listen(env.port, () => {
    logger.info({ port: env.port }, "server_started");
  });

  // Anti cold-start Render : self-ping via l'URL publique toutes les 8 min.
  // Le trafic entrant via l'edge Render remet le compteur de spin-down à zéro.
  // (GitHub Actions cron */10 est dépriorisé — trous de 3h constatés.)
  if (env.nodeEnv === "production" && env.appUrl) {
    setInterval(() => {
      fetch(`${env.appUrl}/health`, { signal: AbortSignal.timeout(10000) })
        .catch(() => {});
    }, 8 * 60 * 1000).unref();
  }
}

start();