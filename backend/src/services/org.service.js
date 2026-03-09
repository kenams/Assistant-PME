const { loadDb, withDb } = require("./store.service");

function defaultSettings(tenantId) {
  return {
    tenant_id: tenantId,
    support_email: "",
    support_phone: "",
    support_hours: "",
    logo_url: "",
    escalation_threshold: 2,
    quick_issue_threshold: 4,
    signature: "",
    notify_on_ticket_created: false,
    webhook_url: "",
    webhook_secret: "",
    slack_webhook_url: "",
    teams_webhook_url: "",
    sla_hours: 24,
    sla_warning_pct: 80,
    cost_per_ticket: 12,
    reminder_hours: 72,
    mailbox_enabled: false,
    mailbox_provider: "gmail",
    mailbox_host: "",
    mailbox_port: 993,
    mailbox_tls: true,
    mailbox_user: "",
    mailbox_password: "",
    mailbox_folder: "INBOX",
    mailbox_subject_prefix: "",
    slack_signing_secret: "",
    teams_signing_secret: "",
    oauth_google_client_id: "",
    oauth_google_client_secret: "",
    oauth_google_redirect_uri: "",
    oauth_google_scopes: "https://www.googleapis.com/auth/gmail.readonly",
    oauth_google_access_token: "",
    oauth_google_refresh_token: "",
    oauth_google_expires_at: "",
    oauth_google_state: "",
    oauth_outlook_client_id: "",
    oauth_outlook_client_secret: "",
    oauth_outlook_redirect_uri: "",
    oauth_outlook_scopes: "offline_access https://graph.microsoft.com/Mail.Read",
    oauth_outlook_access_token: "",
    oauth_outlook_refresh_token: "",
    oauth_outlook_expires_at: "",
    oauth_outlook_state: "",
    glpi_enabled: false,
    glpi_base_url: "",
    glpi_app_token: "",
    glpi_user_token: "",
    ad_enabled: false,
    ad_url: "",
    ad_domain: "",
    ad_base_dn: "",
    ad_bind_user: "",
    ad_bind_password: "",
    updated_at: null
  };
}

function getOrgSettings({ tenantId }) {
  const db = loadDb();
  const settings = (db.org_settings || []).find((s) => s.tenant_id === tenantId);
  const defaults = defaultSettings(tenantId);
  return settings ? { ...defaults, ...settings } : defaults;
}

function updateOrgSettings({ tenantId, payload }) {
  return withDb((db) => {
    db.org_settings = db.org_settings || [];
    const index = db.org_settings.findIndex((s) => s.tenant_id === tenantId);
    const current = index >= 0 ? db.org_settings[index] : defaultSettings(tenantId);
    const next = {
      ...current,
      ...payload,
      tenant_id: tenantId,
      updated_at: new Date().toISOString()
    };
    if (index >= 0) {
      db.org_settings[index] = next;
    } else {
      db.org_settings.push(next);
    }
    return next;
  });
}

module.exports = { getOrgSettings, updateOrgSettings };
