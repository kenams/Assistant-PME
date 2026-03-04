const crypto = require("crypto");
const { withDb, loadDb } = require("./store.service");
const { fireWebhook } = require("./webhook.service");

function createNotification({ tenantId, userId, type, channel, payload }) {
  const notification = withDb((db) => {
    const notification = {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      user_id: userId || null,
      type,
      channel,
      payload: payload || null,
      created_at: new Date().toISOString()
    };
    db.notifications.push(notification);
    return notification;
  });

  fireWebhook({
    tenantId,
    eventType: `notification.${type}`,
    payload: notification
  }).catch(() => {});

  return notification;
}

function listNotifications({ tenantId, limit }) {
  const db = loadDb();
  const items = (db.notifications || [])
    .filter((n) => n.tenant_id === tenantId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return (limit ? items.slice(0, limit) : items).map((n) => ({
    id: n.id,
    type: n.type,
    channel: n.channel,
    payload: n.payload,
    created_at: n.created_at
  }));
}

module.exports = { createNotification, listNotifications };
