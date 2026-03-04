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
  superAdminEmail: process.env.SUPER_ADMIN_EMAIL || "",
  supportIngestToken: process.env.SUPPORT_INGEST_TOKEN || "",
  mailPollIntervalMin: process.env.MAIL_POLL_INTERVAL_MIN || "5",
  rateLimitWindowSec: parseInt(process.env.RATE_LIMIT_WINDOW_SEC || "60", 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || "120", 10),
  rateLimitIngestMax: parseInt(process.env.RATE_LIMIT_INGEST_MAX || "30", 10),
  rateLimitLoginMax: parseInt(process.env.RATE_LIMIT_LOGIN_MAX || "10", 10),
  requireIngestToken: (process.env.REQUIRE_INGEST_TOKEN || "").toLowerCase() === "true",
  leadAllowlistDomains: process.env.LEAD_ALLOWLIST_DOMAINS || "",
  leadToken: process.env.LEAD_TOKEN || "",
  requireLeadToken: (process.env.REQUIRE_LEAD_TOKEN || "").toLowerCase() === "true",
  requireLeadChallenge:
    (process.env.REQUIRE_LEAD_CHALLENGE || "").toLowerCase() === "true",
  ingestAllowlistDomains: process.env.INGEST_ALLOWLIST_DOMAINS || "",
  glpiBaseUrl: process.env.GLPI_BASE_URL || "",
  glpiAppToken: process.env.GLPI_APP_TOKEN || "",
  glpiUserToken: process.env.GLPI_USER_TOKEN || "",
  glpiEnabled: (process.env.GLPI_ENABLED || "").toLowerCase() === "true"
};

module.exports = { env };
