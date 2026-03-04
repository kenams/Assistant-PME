const crypto = require("crypto");
const { withDb, loadDb } = require("./store.service");

function addFeedback({ tenantId, conversationId, userId, resolved, rating, comment }) {
  return withDb((db) => {
    const entry = {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      conversation_id: conversationId,
      user_id: userId || null,
      resolved: Boolean(resolved),
      rating: rating || null,
      comment: comment || null,
      created_at: new Date().toISOString()
    };
    db.conversation_feedback.push(entry);
    return entry;
  });
}

function listFeedbackByConversation({ tenantId, conversationId }) {
  const db = loadDb();
  return db.conversation_feedback.filter(
    (f) => f.tenant_id === tenantId && f.conversation_id === conversationId
  );
}

module.exports = { addFeedback, listFeedbackByConversation };