const crypto = require("crypto");
const { getOrgSettings } = require("./org.service");

async function fireWebhook({ tenantId, eventType, payload }) {
  const settings = getOrgSettings({ tenantId });
  if (!settings || !settings.webhook_url) {
    return;
  }

  const body = JSON.stringify({
    event: eventType,
    timestamp: new Date().toISOString(),
    data: payload
  });

  const headers = { "Content-Type": "application/json" };
  if (settings.webhook_secret) {
    const signature = crypto
      .createHmac("sha256", settings.webhook_secret)
      .update(body)
      .digest("hex");
    headers["X-Signature"] = signature;
  }

  await fetch(settings.webhook_url, {
    method: "POST",
    headers,
    body
  });
}

module.exports = { fireWebhook };
