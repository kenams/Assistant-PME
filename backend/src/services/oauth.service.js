const crypto = require("crypto");
const { getOrgSettings, updateOrgSettings } = require("./org.service");

const PROVIDERS = {
  google: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token"
  },
  outlook: {
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token"
  }
};

function getProviderConfig(provider) {
  return PROVIDERS[provider] || null;
}

function getSettingsForProvider(settings, provider) {
  if (provider === "google") {
    return {
      clientId: settings.oauth_google_client_id,
      clientSecret: settings.oauth_google_client_secret,
      redirectUri: settings.oauth_google_redirect_uri,
      scopes: settings.oauth_google_scopes || ""
    };
  }
  if (provider === "outlook") {
    return {
      clientId: settings.oauth_outlook_client_id,
      clientSecret: settings.oauth_outlook_client_secret,
      redirectUri: settings.oauth_outlook_redirect_uri,
      scopes: settings.oauth_outlook_scopes || ""
    };
  }
  return null;
}

function setProviderState({ tenantId, provider, state }) {
  const key = provider === "google" ? "oauth_google_state" : "oauth_outlook_state";
  return updateOrgSettings({ tenantId, payload: { [key]: state } });
}

function storeTokens({ tenantId, provider, tokenPayload }) {
  const expiresAt = tokenPayload.expires_in
    ? new Date(Date.now() + tokenPayload.expires_in * 1000).toISOString()
    : "";
  if (provider === "google") {
    return updateOrgSettings({
      tenantId,
      payload: {
        oauth_google_access_token: tokenPayload.access_token || "",
        oauth_google_refresh_token: tokenPayload.refresh_token || "",
        oauth_google_expires_at: expiresAt
      }
    });
  }
  if (provider === "outlook") {
    return updateOrgSettings({
      tenantId,
      payload: {
        oauth_outlook_access_token: tokenPayload.access_token || "",
        oauth_outlook_refresh_token: tokenPayload.refresh_token || "",
        oauth_outlook_expires_at: expiresAt
      }
    });
  }
  return null;
}

function buildAuthorizationUrl({ provider, tenantId }) {
  const config = getProviderConfig(provider);
  if (!config) {
    return { error: "provider_not_supported" };
  }
  const settings = getOrgSettings({ tenantId });
  const providerSettings = getSettingsForProvider(settings, provider);
  if (!providerSettings || !providerSettings.clientId || !providerSettings.redirectUri) {
    return { error: "missing_oauth_config" };
  }

  const state = crypto.randomBytes(16).toString("hex");
  setProviderState({ tenantId, provider, state });
  const scope = providerSettings.scopes || "";
  const params = new URLSearchParams({
    client_id: providerSettings.clientId,
    redirect_uri: providerSettings.redirectUri,
    response_type: "code",
    scope,
    state
  });

  if (provider === "google") {
    params.set("access_type", "offline");
    params.set("prompt", "consent");
  }

  if (provider === "outlook") {
    params.set("response_mode", "query");
  }

  return { url: `${config.authUrl}?${params.toString()}`, state };
}

async function exchangeCode({ provider, tenantId, code, state }) {
  const config = getProviderConfig(provider);
  if (!config) {
    return { error: "provider_not_supported" };
  }
  const settings = getOrgSettings({ tenantId });
  const providerSettings = getSettingsForProvider(settings, provider);
  if (!providerSettings || !providerSettings.clientId || !providerSettings.clientSecret) {
    return { error: "missing_oauth_config" };
  }
  const expectedState =
    provider === "google" ? settings.oauth_google_state : settings.oauth_outlook_state;
  if (!state || !expectedState || state !== expectedState) {
    return { error: "invalid_state" };
  }

  const body = new URLSearchParams({
    client_id: providerSettings.clientId,
    client_secret: providerSettings.clientSecret,
    code,
    redirect_uri: providerSettings.redirectUri,
    grant_type: "authorization_code"
  });

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  });

  if (!response.ok) {
    return { error: "token_exchange_failed" };
  }
  const data = await response.json();
  if (!data.access_token) {
    return { error: "token_missing" };
  }
  storeTokens({ tenantId, provider, tokenPayload: data });
  return { ok: true };
}

module.exports = { buildAuthorizationUrl, exchangeCode, getProviderConfig };
