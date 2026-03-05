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
app.use(cors());
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
const landingDir = path.join(publicRoot, "landing");
const dashboardDir = path.join(publicRoot, "dashboard");
const crmDir = path.join(publicRoot, "crm");
const superadminDir = path.join(publicRoot, "superadmin");
const staticOptions = {
  index: "index.html",
  redirect: false,
  setHeaders: (res) => {
    res.setHeader("Cache-Control", "no-store");
  }
};

app.get("/app", (req, res) => {
  res.sendFile(path.join(appDir, "index.html"));
});
app.get("/app/", (req, res) => {
  res.sendFile(path.join(appDir, "index.html"));
});
app.get("/app/index.html", (req, res) => {
  res.sendFile(path.join(appDir, "index.html"));
});
app.use("/app", express.static(appDir, staticOptions));
app.get("/superadmin", (req, res) => {
  res.sendFile(path.join(superadminDir, "index.html"));
});
app.get("/superadmin/", (req, res) => {
  res.sendFile(path.join(superadminDir, "index.html"));
});
app.get("/superadmin/index.html", (req, res) => {
  res.sendFile(path.join(superadminDir, "index.html"));
});
app.use("/landing", express.static(landingDir, staticOptions));
app.use("/dashboard", express.static(dashboardDir, staticOptions));
app.use("/crm", express.static(crmDir, staticOptions));
app.use("/superadmin", express.static(superadminDir, staticOptions));

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

app.use((req, res) => {
  return res.status(404).json({ error: "not_found" });
});

app.use(errorHandler);

module.exports = { app, logger };
