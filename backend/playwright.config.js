const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "assistant-e2e-"));
const dataStorePath = path.join(tmpDir, "db.json");

module.exports = {
  testDir: "./e2e",
  timeout: 60000,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:3001",
    trace: "on-first-retry"
  },
  webServer: {
    command: "node src/index.js",
    url: "http://127.0.0.1:3001/health",
    reuseExistingServer: false,
    timeout: 60000,
    env: {
      NODE_ENV: "development",
      JWT_SECRET: "test_secret",
      LLM_MODE: "mock",
      DATA_STORE_PATH: dataStorePath,
      SEED_ADMIN_EMAIL: "admin@assistant.local",
      SEED_ADMIN_PASSWORD: "admin123"
    }
  }
};
