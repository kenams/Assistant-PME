const knex = require("knex");
const { env } = require("./env");

if (!env.databaseUrl) {
  console.warn("[db] WARNING: DATABASE_URL not set — backend API disabled. Demo mode (frontend-only) still works.");
  // Export a dummy db that throws on use — only affects API routes, not the demo frontend
  const dummy = new Proxy({}, {
    get: () => () => { throw new Error("DATABASE_URL not configured"); }
  });
  module.exports = { db: dummy };
  return;
}

const isProd = env.nodeEnv === "production" || env.databaseUrl.includes("render.com") || env.databaseUrl.includes("supabase");

const db = knex({
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

module.exports = { db };
