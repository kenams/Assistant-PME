const crypto = require("crypto");
const { db } = require("../config/db");
const { fireWebhook } = require("./webhook.service");
const emailService = require("./email.service");

async function createNotification({ tenantId, userId, type, channel, payload }) {
  const [notification] = await db("notifications").insert({
    id: crypto.randomUUID(),
    tenant_id: tenantId,
    user_id: userId || null,
    type,
    channel,
    payload: payload ? JSON.stringify(payload) : null,
    read: false,
    created_at: new Date().toISOString()
  }).returning("*");

  fireWebhook({ tenantId, eventType: `notification.${type}`, payload: notification }).catch(() => {});

  if (type === "ticket_created" && payload && payload.ticket) {
    emailService.notifyTicketCreated({ ticket: payload.ticket, context: payload.context || null }).catch(() => {});
  }

  return notification;
}

async function listNotifications({ tenantId, limit }) {
  const q = db("notifications")
    .where({ tenant_id: tenantId })
    .orderBy("created_at", "desc")
    .select("id", "type", "channel", "payload", "created_at");
  if (limit) q.limit(limit);
  return q;
}

module.exports = { createNotification, listNotifications };
