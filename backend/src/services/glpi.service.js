const { env } = require("../config/env");

function normalizeBaseUrl(raw) {
  let base = raw || "";
  if (!base) return "";
  base = base.replace(/\/+$/, "");
  if (!base.endsWith("/apirest.php")) {
    base = `${base}/apirest.php`;
  }
  return base;
}

function resolveConfig(overrides) {
  if (!overrides) {
    return {
      enabled: Boolean(env.glpiEnabled),
      baseUrl: env.glpiBaseUrl || "",
      appToken: env.glpiAppToken || "",
      userToken: env.glpiUserToken || ""
    };
  }
  return {
    enabled: Boolean(overrides.enabled),
    baseUrl: overrides.baseUrl || "",
    appToken: overrides.appToken || "",
    userToken: overrides.userToken || ""
  };
}

function buildApiUrl(pathname, config) {
  const base = normalizeBaseUrl(config.baseUrl);
  if (!base) return "";
  return `${base}${pathname}`;
}

function getHeaders(extra = {}, config) {
  const headers = { ...extra };
  if (config.appToken) {
    headers["App-Token"] = config.appToken;
  }
  if (config.userToken) {
    headers["Authorization"] = `user_token ${config.userToken}`;
  }
  return headers;
}

function isGlpiEnabled(configOverride) {
  const config = resolveConfig(configOverride);
  return Boolean(config.enabled && config.baseUrl && config.userToken);
}

async function initSession(configOverride) {
  const config = resolveConfig(configOverride);
  const url = buildApiUrl("/initSession?session_write=true", config);
  if (!url) {
    throw new Error("glpi_not_configured");
  }
  const res = await fetch(url, { headers: getHeaders({}, config) });
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

async function killSession(sessionToken, configOverride) {
  if (!sessionToken) return;
  const config = resolveConfig(configOverride);
  const url = buildApiUrl("/killSession", config);
  if (!url) return;
  await fetch(url, {
    headers: getHeaders({ "Session-Token": sessionToken }, config)
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

function buildTicketUrl(externalId, configOverride) {
  if (!externalId) return null;
  const config = resolveConfig(configOverride);
  let base = config.baseUrl || "";
  base = base.replace(/\/+$/, "");
  if (base.endsWith("/apirest.php")) {
    base = base.replace(/\/apirest\.php$/, "");
  }
  if (!base) return null;
  return `${base}/front/ticket.form.php?id=${externalId}`;
}

async function createGlpiTicket({ title, description, priority, config }) {
  const sessionToken = await initSession(config);
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

    const resolved = resolveConfig(config);
    const res = await fetch(buildApiUrl("/Ticket", resolved), {
      method: "POST",
      headers: getHeaders(
        {
          "Content-Type": "application/json",
          "Session-Token": sessionToken
        },
        resolved
      ),
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
    await killSession(sessionToken, config);
  }
}

async function testGlpiConnection(config) {
  const sessionToken = await initSession(config);
  await killSession(sessionToken, config);
  return { ok: true };
}

module.exports = {
  isGlpiEnabled,
  createGlpiTicket,
  testGlpiConnection,
  buildTicketUrl
};
