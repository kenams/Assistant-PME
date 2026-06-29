const path = require("path");
const knex = require("knex");
const { env } = require("./env");

let db;

if (env.databaseUrl) {
  const isProd = env.nodeEnv === "production" || env.databaseUrl.includes("render.com") || env.databaseUrl.includes("supabase");
  db = knex({
    client: "pg",
    connection: {
      connectionString: env.databaseUrl,
      ssl: isProd ? { rejectUnauthorized: false } : false
    },
    pool: {
      min: 2,
      max: 10,
      afterCreate: (conn, done) => {
        conn.query("SET client_encoding = 'UTF8'", (err) => done(err, conn));
      }
    },
    acquireConnectionTimeout: 10000
  });
  console.log("[db] Using PostgreSQL");
} else {
  const dbPath = env.dataStorePath
    ? path.join(path.dirname(env.dataStorePath), "assistant.db")
    : path.join(process.cwd(), "data", "assistant.db");
  db = knex({
    client: "better-sqlite3",
    connection: { filename: dbPath },
    useNullAsDefault: true,
    pool: { min: 1, max: 1 }
  });
  console.log("[db] No DATABASE_URL — using SQLite at", dbPath);
}

module.exports = { db };
