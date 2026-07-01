const knex = require("knex");
const { env } = require("./env");

const hasDb = Boolean(env.databaseUrl);

if (!hasDb) {
  console.warn("[db] No DATABASE_URL — API routes disabled. Frontend demo still works.");
}

const isProd = hasDb && (env.nodeEnv === "production" || env.databaseUrl.includes("render.com") || env.databaseUrl.includes("supabase"));

const db = knex({
  client: "pg",
  connection: hasDb
    ? {
        connectionString: env.databaseUrl,
        ssl: isProd ? { rejectUnauthorized: false } : false,
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000
      }
    : "postgresql://nodb@127.0.0.1:1/nodb",
  pool: hasDb
    ? {
        min: 0,
        max: 5,
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        idleTimeoutMillis: 20000,
        reapIntervalMillis: 5000,
        afterCreate: (conn, done) => {
          conn.query("SET client_encoding = 'UTF8'", (err) => done(err, conn));
        }
      }
    : { min: 0, max: 0 },
  acquireConnectionTimeout: hasDb ? 30000 : 100
});

// Prevent unhandled pool errors from crashing the process
if (hasDb) {
  db.client.pool.on("error", (err) => {
    console.error("[db] pool error (ignored):", err.message);
  });
}

module.exports = { db, hasDb };
