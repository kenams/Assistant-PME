const Imap = require("imap");
const { simpleParser } = require("mailparser");
const { env } = require("../config/env");
const { getOrgSettings } = require("./org.service");
const { getDefaultTenantId } = require("./tenants.service");
const { ingestSupport } = require("./ingest.service");
const { getValidAccessToken } = require("./oauth.service");

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

function stripHtml(input) {
  return (input || "").replace(/<[^>]+>/g, " ");
}

function decodeGmailBody(data) {
  if (!data) return "";
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + (4 - (normalized.length % 4)) % 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

function findGmailBody(payload) {
  if (!payload) return "";
  if (payload.body && payload.body.data) {
    return decodeGmailBody(payload.body.data);
  }
  if (payload.parts && payload.parts.length) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeGmailBody(part.body.data);
      }
    }
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        return stripHtml(decodeGmailBody(part.body.data));
      }
    }
    for (const part of payload.parts) {
      const found = findGmailBody(part);
      if (found) return found;
    }
  }
  return "";
}

async function fetchGmailMessages({ tenantId, subjectPrefix }) {
  const tokenResult = await getValidAccessToken({ provider: "google", tenantId });
  if (tokenResult.error) {
    return { processed: 0, error: tokenResult.error };
  }
  const accessToken = tokenResult.accessToken;
  const listRes = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?labelIds=INBOX&q=is:unread&maxResults=10",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!listRes.ok) {
    return { processed: 0, error: "gmail_list_failed" };
  }
  const listData = await listRes.json();
  const messages = listData.messages || [];
  let processed = 0;

  for (const msg of messages) {
    const msgRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!msgRes.ok) {
      continue;
    }
    const msgData = await msgRes.json();
    const headers = msgData.payload?.headers || [];
    const subjectHeader = headers.find((h) => h.name === "Subject");
    const fromHeader = headers.find((h) => h.name === "From");
    const subject = subjectHeader?.value || "Demande support";
    const from = fromHeader?.value || "gmail-user";
    const body = findGmailBody(msgData.payload);

    await ingestSupport({
      tenantId,
      fromEmail: from,
      subject: `${subjectPrefix || ""}${subject}`,
      body,
      category: "gmail",
      priority: "medium",
      source: "gmail"
    });

    await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}/modify`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ removeLabelIds: ["UNREAD"] })
      }
    );
    processed += 1;
  }

  return { processed };
}

async function fetchOutlookMessages({ tenantId, subjectPrefix }) {
  const tokenResult = await getValidAccessToken({ provider: "outlook", tenantId });
  if (tokenResult.error) {
    return { processed: 0, error: tokenResult.error };
  }
  const accessToken = tokenResult.accessToken;
  const listRes = await fetch(
    "https://graph.microsoft.com/v1.0/me/mailFolders/Inbox/messages?$top=10&$filter=isRead eq false",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!listRes.ok) {
    return { processed: 0, error: "outlook_list_failed" };
  }
  const listData = await listRes.json();
  const messages = listData.value || [];
  let processed = 0;

  for (const msg of messages) {
    const subject = msg.subject || "Demande support";
    const from = msg.from?.emailAddress?.address || "outlook-user";
    const body = msg.body?.contentType === "html" ? stripHtml(msg.body.content) : msg.body?.content || "";

    await ingestSupport({
      tenantId,
      fromEmail: from,
      subject: `${subjectPrefix || ""}${subject}`,
      body,
      category: "outlook",
      priority: "medium",
      source: "outlook"
    });

    await fetch(`https://graph.microsoft.com/v1.0/me/messages/${msg.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ isRead: true })
    });
    processed += 1;
  }

  return { processed };
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

  const settings = getOrgSettings({ tenantId: config.tenantId });
  if (settings.mailbox_provider === "gmail" && settings.oauth_google_access_token) {
    return fetchGmailMessages({
      tenantId: config.tenantId,
      subjectPrefix: config.subjectPrefix
    });
  }
  if (settings.mailbox_provider === "outlook" && settings.oauth_outlook_access_token) {
    return fetchOutlookMessages({
      tenantId: config.tenantId,
      subjectPrefix: config.subjectPrefix
    });
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

function testMailboxConnection() {
  const config = buildConfig();
  if (!config) {
    return Promise.resolve({ ok: false, error: "not_configured" });
  }
  return new Promise((resolve) => {
    const imap = createImap(config);
    let resolved = false;

    function finish(result) {
      if (resolved) return;
      resolved = true;
      resolve(result);
    }

    imap.once("ready", () => {
      imap.openBox(config.folder, false, (err) => {
        if (err) {
          imap.end();
          return finish({ ok: false, error: "open_box_failed" });
        }
        imap.end();
        return finish({ ok: true });
      });
    });

    imap.once("error", () => {
      finish({ ok: false, error: "connection_failed" });
    });

    imap.connect();
  });
}

module.exports = { startMailboxPolling, fetchMailboxOnce, testMailboxConnection };
