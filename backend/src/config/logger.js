const pino = require("pino");
const { env } = require("./env");

function createLogger() {
  return pino({ level: env.logLevel });
}

module.exports = { createLogger };