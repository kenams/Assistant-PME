const { testGlpiConnection } = require("./glpi.service");

async function testJira({ url, email, apiToken }) {
  const base = url.replace(/\/+$/, "");
  const res = await fetch(`${base}/rest/api/2/myself`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${email}:${apiToken}`).toString("base64")}`,
      Accept: "application/json"
    },
    signal: AbortSignal.timeout(8000)
  });
  if (!res.ok) throw new Error(`jira_auth_failed_${res.status}`);
  const data = await res.json();
  return { ok: true, account: data.displayName || data.emailAddress || email };
}

async function testZendesk({ subdomain, email, apiToken }) {
  const base = `https://${subdomain.replace(/\.zendesk\.com$/, "")}.zendesk.com`;
  const res = await fetch(`${base}/api/v2/users/me.json`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${email}/token:${apiToken}`).toString("base64")}`,
      Accept: "application/json"
    },
    signal: AbortSignal.timeout(8000)
  });
  if (!res.ok) throw new Error(`zendesk_auth_failed_${res.status}`);
  const data = await res.json();
  return { ok: true, account: data.user?.name || email };
}

async function testFreshdesk({ subdomain, apiKey }) {
  const base = `https://${subdomain.replace(/\.freshdesk\.com$/, "")}.freshdesk.com`;
  const res = await fetch(`${base}/api/v2/agents/me`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${apiKey}:X`).toString("base64")}`,
      Accept: "application/json"
    },
    signal: AbortSignal.timeout(8000)
  });
  if (!res.ok) throw new Error(`freshdesk_auth_failed_${res.status}`);
  const data = await res.json();
  return { ok: true, account: data.contact?.name || data.email || subdomain };
}

async function testFreshservice({ subdomain, apiKey }) {
  const base = `https://${subdomain.replace(/\.freshservice\.com$/, "")}.freshservice.com`;
  const res = await fetch(`${base}/api/v2/agents/me`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${apiKey}:X`).toString("base64")}`,
      Accept: "application/json"
    },
    signal: AbortSignal.timeout(8000)
  });
  if (!res.ok) throw new Error(`freshservice_auth_failed_${res.status}`);
  const data = await res.json();
  return { ok: true, account: data.agent?.contact?.name || subdomain };
}

async function testServiceNow({ instance, username, password }) {
  const base = `https://${instance.replace(/\.service-now\.com$/, "")}.service-now.com`;
  const res = await fetch(`${base}/api/now/table/incident?sysparm_limit=1&sysparm_fields=number`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
      Accept: "application/json"
    },
    signal: AbortSignal.timeout(10000)
  });
  if (!res.ok) throw new Error(`servicenow_auth_failed_${res.status}`);
  return { ok: true, account: username };
}

async function testOsticket({ url, apiKey }) {
  const base = url.replace(/\/+$/, "");
  const res = await fetch(`${base}/api/tickets.json`, {
    headers: { "X-API-Key": apiKey, Accept: "application/json" },
    signal: AbortSignal.timeout(8000)
  });
  if (res.status === 401 || res.status === 403) throw new Error(`osticket_auth_failed_${res.status}`);
  return { ok: true, account: new URL(base).hostname };
}

async function testGlpi({ url, appToken, userToken }) {
  return testGlpiConnection({ baseUrl: url, appToken, userToken, enabled: true });
}

async function testTicketingConnection({ tool, config }) {
  switch (tool) {
    case "glpi":         return testGlpi(config);
    case "jira":        return testJira(config);
    case "zendesk":     return testZendesk(config);
    case "freshdesk":   return testFreshdesk(config);
    case "freshservice":return testFreshservice(config);
    case "servicenow":  return testServiceNow(config);
    case "osticket":    return testOsticket(config);
    default:            throw new Error(`unsupported_tool: ${tool}`);
  }
}

function buildOrgPayload(tool, config) {
  const base = { ticketing_tool: tool };
  switch (tool) {
    case "glpi":
      return { ...base, glpi_enabled: true, glpi_base_url: config.url, glpi_app_token: config.appToken, glpi_user_token: config.userToken };
    case "jira":
      return { ...base, jira_url: config.url, jira_email: config.email, jira_api_token: config.apiToken };
    case "zendesk":
      return { ...base, zendesk_subdomain: config.subdomain, zendesk_email: config.email, zendesk_api_token: config.apiToken };
    case "freshdesk":
      return { ...base, freshdesk_subdomain: config.subdomain, freshdesk_api_key: config.apiKey };
    case "freshservice":
      return { ...base, freshservice_subdomain: config.subdomain, freshservice_api_key: config.apiKey };
    case "servicenow":
      return { ...base, servicenow_instance: config.instance, servicenow_username: config.username, servicenow_password: config.password };
    case "osticket":
      return { ...base, osticket_url: config.url, osticket_api_key: config.apiKey };
    default:
      return base;
  }
}

module.exports = { testTicketingConnection, buildOrgPayload };
