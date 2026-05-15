const knex = require("knex");
const { env } = require("./env");

const isProd = env.nodeEnv === "production" || (env.databaseUrl || "").includes("render.com");

const db = knex({
  client: "pg",
  connection: {
    connectionString: env.databaseUrl,
    ssl: isProd ? { rejectUnauthorized: false } : false
  },
  pool: { min: 2, max: 10 },
  acquireConnectionTimeout: 10000
});

module.exports = { db };
