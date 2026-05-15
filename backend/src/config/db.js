const knex = require("knex");
const { env } = require("./env");

const db = knex({
  client: "pg",
  connection: env.databaseUrl,
  pool: { min: 2, max: 10 },
  acquireConnectionTimeout: 10000
});

module.exports = { db };
