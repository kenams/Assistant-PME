const Imap = require("imap");
const { simpleParser } = require("mailparser");
const { env } = require("../config/env");
const { getOrgSettings } = require("./org.service");
const { getDefaultTenantId } = require("./tenants.service");
const { ingestSupport } = require("./ingest.service");

let poller = null;

function buildConfig() {
  const tenantId = getDefaultTenantId();
  if (!tenantId) return null;
  const settings = getOrgSettings({ tenantId });
  if (!settings.mailbox_enabled) return null;
  const provider = settings.mailbox_provider || "gmail";
  const host =
    settings.mailbox_host ||
    (provider === "outlook"
      ? "outlook.office365.com"
      : "imap.gmail.com");
  const port = settings.mailbox_port || 993;
  const tls =
    typeof settings.mailbox_tls === "boolean" ? settings.mailbox_tls : true;
  if (!settings.mailbox_user || !settings.mailbox_password) {
    return null;
  }
  return {
    tenantId,
    host,
    port,
    tls,
    user: settings.mailbox_user,
    password: settings.mailbox_password,
    folder: settings.mailbox_folder || "INBOX",
    subjectPrefix: settings.mailbox_subject_prefix || ""
  };
}

function createImap(config) {
  return new Imap({
    user: config.user,
    password: config.password,
    host: config.host,
    port: config.port,
    tls: config.tls
  });
}

function normalizeText(text) {
  if (!text) return "";
  return text.replace(/\s+/g, " ").trim();
}

async function fetchMailboxOnce() {
  const config = buildConfig();
  if (!config) {
    return { processed: 0 };
  }

  return new Promise((resolve, reject) => {
    const imap = createImap(config);
    let processed = 0;

    function done(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve({ processed });
    }

    imap.once("ready", () => {
      imap.openBox(config.folder, false, (err) => {
        if (err) {
          imap.end();
          return done(err);
        }
        imap.search(["UNSEEN"], (errSearch, results) => {
          if (errSearch) {
            imap.end();
            return done(errSearch);
          }
          if (!results || results.length === 0) {
            imap.end();
            return done();
          }
          const fetcher = imap.fetch(results, { bodies: "", markSeen: true });
          fetcher.on("message", (msg) => {
            let raw = "";
            msg.on("body", (stream) => {
              stream.on("data", (chunk) => {
                raw += chunk.toString("utf8");
              });
            });
            msg.once("end", async () => {
              try {
                const parsed = await simpleParser(raw);
                const from =
                  parsed.from?.value?.[0]?.address ||
                  parsed.from?.text ||
                  config.user;
                const subject = parsed.subject || "Demande support";
                const body =
                  normalizeText(parsed.text) ||
                  normalizeText(parsed.html ? parsed.html.replace(/<[^>]+>/g, " ") : "") ||
                  "";
                await ingestSupport({
                  tenantId: config.tenantId,
                  fromEmail: from,
                  subject: `${config.subjectPrefix}${subject}`,
                  body,
                  category: "email",
                  priority: "medium",
                  source: "email"
                });
                processed += 1;
              } catch (err) {
                // ignore individual email errors
              }
            });
          });
          fetcher.once("error", (errFetch) => {
            imap.end();
            done(errFetch);
          });
          fetcher.once("end", () => {
            imap.end();
            done();
          });
        });
      });
    });

    imap.once("error", (err) => {
      done(err);
    });

    imap.connect();
  });
}

function startMailboxPolling() {
  if (poller) return;
  const intervalMin = Number(env.mailPollIntervalMin || 5);
  if (Number.isNaN(intervalMin) || intervalMin <= 0) {
    return;
  }
  poller = setInterval(() => {
    fetchMailboxOnce().catch(() => {});
  }, intervalMin * 60 * 1000);
  fetchMailboxOnce().catch(() => {});
}

module.exports = { startMailboxPolling, fetchMailboxOnce };
