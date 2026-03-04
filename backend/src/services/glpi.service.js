const { env } = require("../config/env");

function normalizeBaseUrl() {
  let base = env.glpiBaseUrl || "";
  if (!base) return "";
  base = base.replace(/\/+$/, "");
  if (!base.endsWith("/apirest.php")) {
    base = `${base}/apirest.php`;
  }
  return base;
}

function buildApiUrl(pathname) {
  const base = normalizeBaseUrl();
  if (!base) return "";
  return `${base}${pathname}`;
}

function getHeaders(extra = {}) {
  const headers = { ...extra };
  if (env.glpiAppToken) {
    headers["App-Token"] = env.glpiAppToken;
  }
  if (env.glpiUserToken) {
    headers["Authorization"] = `user_token ${env.glpiUserToken}`;
  }
  return headers;
}

function isGlpiEnabled() {
  return Boolean(env.glpiEnabled && env.glpiBaseUrl && env.glpiUserToken);
}

async function initSession() {
  const url = buildApiUrl("/initSession?session_write=true");
  if (!url) {
    throw new Error("glpi_not_configured");
  }
  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`glpi_init_failed_${res.status}: ${text.slice(0, 200)}`);
  }
  let data = null;
  try {
    data = await res.json();
  } catch (err) {
    data = null;
  }
  const token = data && data.session_token ? data.session_token : null;
  if (!token) {
    throw new Error("glpi_missing_session_token");
  }
  return token;
}

async function killSession(sessionToken) {
  if (!sessionToken) return;
  const url = buildApiUrl("/killSession");
  if (!url) return;
  await fetch(url, {
    headers: getHeaders({ "Session-Token": sessionToken })
  });
}

function mapPriority(priority) {
  if (!priority) return null;
  switch (priority) {
    case "high":
      return 4;
    case "medium":
      return 3;
    case "low":
      return 2;
    default:
      return null;
  }
}

function buildTicketUrl(externalId) {
  if (!externalId) return null;
  let base = env.glpiBaseUrl || "";
  base = base.replace(/\/+$/, "");
  if (base.endsWith("/apirest.php")) {
    base = base.replace(/\/apirest\.php$/, "");
  }
  if (!base) return null;
  return `${base}/front/ticket.form.php?id=${externalId}`;
}

async function createGlpiTicket({ title, description, priority }) {
  const sessionToken = await initSession();
  try {
    const glpiPriority = mapPriority(priority);
    const payload = {
      input: {
        name: title,
        content: description
      }
    };
    if (glpiPriority) {
      payload.input.priority = glpiPriority;
      payload.input.urgency = glpiPriority;
      payload.input.impact = glpiPriority;
    }

    const res = await fetch(buildApiUrl("/Ticket"), {
      method: "POST",
      headers: getHeaders({
        "Content-Type": "application/json",
        "Session-Token": sessionToken
      }),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`glpi_ticket_failed_${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json();
    const id = data && (data.id || (Array.isArray(data) && data[0] && data[0].id));
    return { id: id ? String(id) : null };
  } finally {
    await killSession(sessionToken);
  }
}

async function testGlpiConnection() {
  const sessionToken = await initSession();
  await killSession(sessionToken);
  return { ok: true };
}

module.exports = {
  isGlpiEnabled,
  createGlpiTicket,
  testGlpiConnection,
  buildTicketUrl
};
