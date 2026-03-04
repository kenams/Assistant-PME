const { env } = require("./config/env");
const { app, logger } = require("./app");

app.listen(env.port, () => {
  logger.info({ port: env.port }, "server_started");
});