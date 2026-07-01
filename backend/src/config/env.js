const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const env = {
  port: parseInt(process.env.PORT || "3001", 10),
  databaseUrl: process.env.DATABASE_URL || "",
  nodeEnv: process.env.NODE_ENV || "development",
  logLevel: process.env.LOG_LEVEL || "info",
  dataStorePath:
    process.env.DATA_STORE_PATH ||
    path.join(process.cwd(), "data", "db.json"),
  dataBackupDir:
    process.env.DATA_BACKUP_DIR ||
    path.join(process.cwd(), "data", "backups"),
  dataBackupMax: parseInt(process.env.DATA_BACKUP_MAX || "20", 10),
  dataBackupEnabled:
    (process.env.DATA_BACKUP_ENABLED || "true").toLowerCase() !== "false",
  jwtSecret: process.env.JWT_SECRET || "",
  llmMode: process.env.LLM_MODE || "mock",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiModel: process.env.OPENAI_MODEL || "",
  openaiBaseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  seedTenantName: process.env.SEED_TENANT_NAME || "Default",
  seedTenantCode: process.env.SEED_TENANT_CODE || "DEFAULT",
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL || "admin@assistant.local",
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD || "admin123",
  seedUserEmail: process.env.SEED_USER_EMAIL || "user@assistant.local",
  seedUserPassword: process.env.SEED_USER_PASSWORD || "user123",
  forceSeedReset: process.env.FORCE_SEED_RESET || "",
  superAdminEmail: process.env.SUPER_ADMIN_EMAIL || "",
  supportIngestToken: process.env.SUPPORT_INGEST_TOKEN || "",
  mailPollIntervalMin: process.env.MAIL_POLL_INTERVAL_MIN || "5",
  rateLimitWindowSec: parseInt(process.env.RATE_LIMIT_WINDOW_SEC || "60", 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || "200", 10),
  rateLimitIngestMax: parseInt(process.env.RATE_LIMIT_INGEST_MAX || "30", 10),
  rateLimitLoginMax: parseInt(process.env.RATE_LIMIT_LOGIN_MAX || "30", 10),
  corsOrigins: process.env.CORS_ORIGINS || "",
  disableQuickLogin:
    (process.env.DISABLE_QUICK_LOGIN || "").toLowerCase() === "true",
  requireIngestToken: (process.env.REQUIRE_INGEST_TOKEN || "").toLowerCase() === "true",
  leadAllowlistDomains: process.env.LEAD_ALLOWLIST_DOMAINS || "",
  leadToken: process.env.LEAD_TOKEN || "",
  requireLeadToken: (process.env.REQUIRE_LEAD_TOKEN || "").toLowerCase() === "true",
  requireLeadChallenge:
    (process.env.REQUIRE_LEAD_CHALLENGE || "").toLowerCase() === "true",
  ingestAllowlistDomains: process.env.INGEST_ALLOWLIST_DOMAINS || "",
  slaNotifyIntervalMin: process.env.SLA_NOTIFY_INTERVAL_MIN || "0",
  glpiBaseUrl: process.env.GLPI_BASE_URL || "",
  glpiAppToken: process.env.GLPI_APP_TOKEN || "",
  glpiUserToken: process.env.GLPI_USER_TOKEN || "",
  glpiLogin: process.env.GLPI_LOGIN || "",
  glpiPassword: process.env.GLPI_PASSWORD || "",
  glpiEnabled: (process.env.GLPI_ENABLED || "").toLowerCase() === "true",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  appUrl: process.env.APP_URL || "http://localhost:3001",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: parseInt(process.env.SMTP_PORT || "587", 10),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || "",
  notifyEmails: process.env.NOTIFY_EMAILS || "",
  backupIntervalHours: parseInt(process.env.BACKUP_INTERVAL_HOURS || "6", 10),
  staleConvDays: parseInt(process.env.STALE_CONV_DAYS || "7", 10),
  uploadRetentionDays: parseInt(process.env.UPLOAD_RETENTION_DAYS || "30", 10),
  autoKbEnabled: (process.env.AUTO_KB_ENABLED || "true").toLowerCase() !== "false",
  // ─── AI PROVIDER (agnostic) ────────────────────────────────────────────────
  aiProvider: process.env.AI_PROVIDER || process.env.LLM_MODE || "mock", // openai|anthropic|mistral|ollama|mock
  aiModel: process.env.AI_MODEL || "",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
  mistralApiKey: process.env.MISTRAL_API_KEY || "",
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  // ─── SMART DISPATCH ────────────────────────────────────────────────────────
  smartDispatchEnabled: (process.env.SMART_DISPATCH_ENABLED || "true").toLowerCase() !== "false",
  dispatchAutoResolveEnabled: (process.env.DISPATCH_AUTO_RESOLVE_ENABLED || "true").toLowerCase() !== "false",
  // ─── PROACTIVE DETECTION ───────────────────────────────────────────────────
  proactiveDetectionEnabled: (process.env.PROACTIVE_DETECTION_ENABLED || "true").toLowerCase() !== "false",
  proactivePeakThreshold: parseInt(process.env.PROACTIVE_PEAK_THRESHOLD || "10", 10),
  proactiveWindowMin: parseInt(process.env.PROACTIVE_WINDOW_MIN || "60", 10),
};

module.exports = { env };
