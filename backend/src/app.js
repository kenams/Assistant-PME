const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const pinoHttp = require("pino-http");
const path = require("path");

const { env } = require("./config/env");
const { createLogger } = require("./config/logger");
const { ensureSeeded } = require("./services/users.service");
const { errorHandler } = require("./middleware/error");
const { monitoringMiddleware } = require("./middleware/monitoring");
const { defaultLimiter } = require("./middleware/rate-limit");
const { startMailboxPolling } = require("./services/mailbox.service");
const { startSlaAlertScheduler } = require("./services/sla.service");

const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");
const orgRoutes = require("./routes/org.routes");
const kbRoutes = require("./routes/kb.routes");
const chatRoutes = require("./routes/chat.routes");
const ticketsRoutes = require("./routes/tickets.routes");
const adminRoutes = require("./routes/admin.routes");
const leadsRoutes = require("./routes/leads.routes");
const billingRoutes = require("./routes/billing.routes");
const usersRoutes = require("./routes/users.routes");
const notificationsRoutes = require("./routes/notifications.routes");
const ingestRoutes = require("./routes/ingest.routes");
const oauthRoutes = require("./routes/oauth.routes");
const tenantsRoutes = require("./routes/tenants.routes");
const docsRoutes = require("./routes/docs.routes");
const uploadsRoutes = require("./routes/uploads.routes");

const app = express();
const logger = createLogger();

ensureSeeded();
if (env.nodeEnv !== "test") {
  startMailboxPolling();
  startSlaAlertScheduler();
}

app.use(pinoHttp({ logger }));
app.use(monitoringMiddleware);
app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:"],
        connectSrc: [
          "'self'",
          "http://localhost:3001",
          "http://127.0.0.1:3001"
        ],
        fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"]
      }
    }
  })
);
const corsOrigins = env.corsOrigins
  ? env.corsOrigins
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  : null;
app.use(
  cors(
    corsOrigins && corsOrigins.length
      ? { origin: corsOrigins, credentials: true }
      : undefined
  )
);
const rawBodySaver = (req, res, buf, encoding) => {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || "utf8");
  }
};
app.use(express.json({ limit: "1mb", verify: rawBodySaver }));
app.use(express.urlencoded({ extended: false, verify: rawBodySaver }));
app.use(defaultLimiter());

const publicRoot = path.join(__dirname, "..", "..");
const appDir = path.join(publicRoot, "app");
const uploadDir = path.join(process.cwd(), "data", "uploads");
const staticOptions = {
  index: "index.html",
  redirect: false,
  setHeaders: (res) => {
    res.setHeader("Cache-Control", "no-store");
  }
};

app.get("/app", (req, res) => {
  res.sendFile(path.join(appDir, "login.html"));
});
app.get("/app/", (req, res) => {
  res.sendFile(path.join(appDir, "login.html"));
});
app.get("/app/index.html", (req, res) => {
  res.sendFile(path.join(appDir, "index.html"));
});
app.get("/app/login", (req, res) => {
  res.sendFile(path.join(appDir, "login.html"));
});
app.get("/app/login/", (req, res) => {
  res.sendFile(path.join(appDir, "login.html"));
});
app.get("/app/login/index.html", (req, res) => {
  res.sendFile(path.join(appDir, "login.html"));
});
app.get("/app/user", (req, res) => {
  res.sendFile(path.join(appDir, "user.html"));
});
app.get("/app/user/", (req, res) => {
  res.sendFile(path.join(appDir, "user.html"));
});
app.get("/app/user/index.html", (req, res) => {
  res.sendFile(path.join(appDir, "user.html"));
});
app.get("/app/admin", (req, res) => {
  res.sendFile(path.join(appDir, "admin.html"));
});
app.get("/app/admin/", (req, res) => {
  res.sendFile(path.join(appDir, "admin.html"));
});
app.get("/app/admin/index.html", (req, res) => {
  res.sendFile(path.join(appDir, "admin.html"));
});
app.use("/app", express.static(appDir, staticOptions));
// Removed legacy static apps (landing/crm/dashboard/superadmin) to keep a single app surface.

app.get("/debug/paths", (req, res) => {
  const fs = require("fs");
  const appIndex = path.join(appDir, "index.html");
  res.json({
    publicRoot,
    appDir,
    appIndex,
    appIndexExists: fs.existsSync(appIndex)
  });
});

app.get("/", (req, res) => {
  res.redirect("/app/");
});

app.use("/health", healthRoutes);
app.use("/auth", authRoutes);
app.use("/org", orgRoutes);
app.use("/kb", kbRoutes);
app.use("/chat", chatRoutes);
app.use("/tickets", ticketsRoutes);
app.use("/admin", adminRoutes);
app.use("/leads", leadsRoutes);
app.use("/billing", billingRoutes);
app.use("/users", usersRoutes);
app.use("/notifications", notificationsRoutes);
app.use("/ingest", ingestRoutes);
app.use("/oauth", oauthRoutes);
app.use("/tenants", tenantsRoutes);
app.use("/docs", docsRoutes);
app.use("/uploads", uploadsRoutes);

app.use((req, res) => {
  return res.status(404).json({ error: "not_found" });
});

app.use(errorHandler);

module.exports = { app, logger };
