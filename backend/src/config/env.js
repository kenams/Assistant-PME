const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const env = {
  port: parseInt(process.env.PORT || "3001", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  logLevel: process.env.LOG_LEVEL || "info",
  dataStorePath:
    process.env.DATA_STORE_PATH ||
    path.join(process.cwd(), "data", "db.json"),
  jwtSecret: process.env.JWT_SECRET || "",
  llmMode: process.env.LLM_MODE || "mock",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiModel: process.env.OPENAI_MODEL || "",
  openaiBaseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  seedTenantName: process.env.SEED_TENANT_NAME || "Default",
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL || "admin@assistant.local",
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD || "admin123",
  supportIngestToken: process.env.SUPPORT_INGEST_TOKEN || "",
  glpiBaseUrl: process.env.GLPI_BASE_URL || "",
  glpiAppToken: process.env.GLPI_APP_TOKEN || "",
  glpiUserToken: process.env.GLPI_USER_TOKEN || "",
  glpiEnabled: (process.env.GLPI_ENABLED || "").toLowerCase() === "true"
};

module.exports = { env };
