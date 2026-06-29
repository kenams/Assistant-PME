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
    ? { connectionString: env.databaseUrl, ssl: isProd ? { rejectUnauthorized: false } : false }
    : "postgresql://nodb@127.0.0.1:1/nodb",
  pool: hasDb
    ? { min: 2, max: 10, afterCreate: (conn, done) => { conn.query("SET client_encoding = 'UTF8'", (err) => done(err, conn)); } }
    : { min: 0, max: 0 },
  acquireConnectionTimeout: hasDb ? 10000 : 100
});

module.exports = { db, hasDb };
