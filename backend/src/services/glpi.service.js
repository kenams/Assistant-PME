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
      userToken: env.glpiUserToken || "",
      login: env.glpiLogin || "",
      password: env.glpiPassword || ""
    };
  }
  return {
    enabled: Boolean(overrides.enabled),
    baseUrl: overrides.baseUrl || "",
    appToken: overrides.appToken || "",
    userToken: overrides.userToken || "",
    login: overrides.login || "",
    password: overrides.password || ""
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
  if (config.login && config.password) {
    headers["Authorization"] = `Basic ${Buffer.from(`${config.login}:${config.password}`).toString("base64")}`;
  } else if (config.userToken) {
    headers["Authorization"] = `user_token ${config.userToken}`;
  }
  return headers;
}

function isGlpiEnabled(configOverride) {
  const config = resolveConfig(configOverride);
  const hasAuth = Boolean(config.userToken || (config.login && config.password));
  return Boolean(config.enabled && config.baseUrl && hasAuth);
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

const GLPI_STATUS_LABELS = {
  1: "Nouveau",
  2: "En cours (assigné)",
  3: "En cours (planifié)",
  4: "En attente",
  5: "Résolu",
  6: "Fermé"
};

function mapStatusToGlpi(status) {
  const map = { new: 1, open: 2, pending: 4, resolved: 5, closed: 6 };
  return map[status] || null;
}

async function listTickets({ limit = 20, status, configOverride } = {}) {
  const config = resolveConfig(configOverride);
  const sessionToken = await initSession(configOverride);
  try {
    let url = buildApiUrl(`/Ticket?sort=id&order=desc&range=0-${limit - 1}&is_deleted=0`, config);
    if (status) {
      const glpiStatus = mapStatusToGlpi(status);
      if (glpiStatus) url += `&criteria[0][field]=12&criteria[0][searchtype]=equals&criteria[0][value]=${glpiStatus}`;
    }
    const res = await fetch(url, {
      headers: getHeaders({ "Session-Token": sessionToken }, config)
    });
    if (res.status === 206 || res.ok) {
      const data = await res.json();
      return (Array.isArray(data) ? data : []).map(t => ({
        id: t.id,
        title: t.name || "",
        status: t.status,
        status_label: GLPI_STATUS_LABELS[t.status] || String(t.status),
        priority: t.priority,
        date_creation: t.date_creation,
        date_mod: t.date_mod,
        closedate: t.closedate,
        solvedate: t.solvedate
      }));
    }
    return [];
  } finally {
    await killSession(sessionToken, configOverride);
  }
}

async function getTicket(ticketId, configOverride) {
  const config = resolveConfig(configOverride);
  const sessionToken = await initSession(configOverride);
  try {
    const [ticketRes, followupsRes] = await Promise.all([
      fetch(buildApiUrl(`/Ticket/${ticketId}`, config), {
        headers: getHeaders({ "Session-Token": sessionToken }, config)
      }),
      fetch(buildApiUrl(`/Ticket/${ticketId}/TicketFollowup`, config), {
        headers: getHeaders({ "Session-Token": sessionToken }, config)
      })
    ]);

    const ticket = ticketRes.ok ? await ticketRes.json() : null;
    let followups = [];
    if (followupsRes.ok || followupsRes.status === 206) {
      const raw = await followupsRes.json();
      followups = Array.isArray(raw) ? raw : [];
    }

    if (!ticket) throw new Error(`glpi_ticket_not_found_${ticketId}`);

    return {
      id: ticket.id,
      title: ticket.name || "",
      content: ticket.content || "",
      status: ticket.status,
      status_label: GLPI_STATUS_LABELS[ticket.status] || String(ticket.status),
      priority: ticket.priority,
      date_creation: ticket.date_creation,
      date_mod: ticket.date_mod,
      closedate: ticket.closedate,
      solvedate: ticket.solvedate,
      followups: followups.map(f => ({
        id: f.id,
        content: f.content || "",
        date: f.date,
        date_mod: f.date_mod,
        users_id: f.users_id
      }))
    };
  } finally {
    await killSession(sessionToken, configOverride);
  }
}

async function updateTicketStatus(ticketId, status, configOverride) {
  const config = resolveConfig(configOverride);
  const glpiStatus = mapStatusToGlpi(status);
  if (!glpiStatus) throw new Error(`invalid_status: ${status}`);
  const sessionToken = await initSession(configOverride);
  try {
    const res = await fetch(buildApiUrl(`/Ticket/${ticketId}`, config), {
      method: "PUT",
      headers: getHeaders({ "Content-Type": "application/json", "Session-Token": sessionToken }, config),
      body: JSON.stringify({ input: { status: glpiStatus } })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`glpi_update_failed_${res.status}: ${text.slice(0, 200)}`);
    }
    return { ok: true };
  } finally {
    await killSession(sessionToken, configOverride);
  }
}

async function addFollowup(ticketId, content, configOverride) {
  const config = resolveConfig(configOverride);
  const sessionToken = await initSession(configOverride);
  try {
    const res = await fetch(buildApiUrl("/TicketFollowup", config), {
      method: "POST",
      headers: getHeaders({ "Content-Type": "application/json", "Session-Token": sessionToken }, config),
      body: JSON.stringify({ input: { items_id: ticketId, itemtype: "Ticket", content, is_private: 0 } })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`glpi_followup_failed_${res.status}: ${text.slice(0, 200)}`);
    }
    const data = await res.json();
    const id = data && (data.id || (Array.isArray(data) && data[0] && data[0].id));
    return { id: id ? String(id) : null };
  } finally {
    await killSession(sessionToken, configOverride);
  }
}

module.exports = {
  isGlpiEnabled,
  createGlpiTicket,
  testGlpiConnection,
  buildTicketUrl,
  listTickets,
  getTicket,
  updateTicketStatus,
  addFollowup,
  GLPI_STATUS_LABELS
};
