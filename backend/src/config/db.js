const knex = require("knex");
const { env } = require("./env");

if (!env.databaseUrl) {
  console.error("FATAL: DATABASE_URL is not set. Add it to your environment variables.");
  process.exit(1);
}

const isProd = env.nodeEnv === "production" || (env.databaseUrl || "").includes("render.com");

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
