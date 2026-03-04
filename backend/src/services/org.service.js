const { loadDb, withDb } = require("./store.service");

function defaultSettings(tenantId) {
  return {
    tenant_id: tenantId,
    support_email: "",
    support_phone: "",
    support_hours: "",
    escalation_threshold: 2,
    signature: "",
    notify_on_ticket_created: false,
    webhook_url: "",
    webhook_secret: "",
    slack_webhook_url: "",
    teams_webhook_url: "",
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
