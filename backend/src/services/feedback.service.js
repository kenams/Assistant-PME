const crypto = require("crypto");
const { db } = require("../config/db");

async function addFeedback({ tenantId, conversationId, userId, resolved, rating, comment }) {
  const [entry] = await db("conversation_feedback").insert({
    id: crypto.randomUUID(),
    tenant_id: tenantId,
    conversation_id: conversationId,
    user_id: userId || null,
    resolved: Boolean(resolved),
    rating: rating || null,
    comment: comment || null,
    created_at: new Date().toISOString()
  }).returning("*");
  return entry;
}

async function listFeedbackByConversation({ tenantId, conversationId }) {
  return db("conversation_feedback").where({ tenant_id: tenantId, conversation_id: conversationId });
}

module.exports = { addFeedback, listFeedbackByConversation };
