const crypto = require("crypto");
const { db } = require("../config/db");

async function createConversation({ tenantId, userId }) {
  const now = new Date().toISOString();
  const [conversation] = await db("conversations").insert({
    id: crypto.randomUUID(),
    tenant_id: tenantId,
    user_id: userId,
    status: "open",
    failure_count: 0,
    context: null,
    created_at: now,
    updated_at: now
  }).returning("*");
  return conversation;
}

async function findConversation({ tenantId, conversationId }) {
  const row = await db("conversations")
    .where({ id: conversationId, tenant_id: tenantId })
    .first();
  return row || null;
}

async function addMessage({ tenantId, conversationId, role, content }) {
  const now = new Date().toISOString();
  const [message] = await db("messages").insert({
    id: crypto.randomUUID(),
    tenant_id: tenantId,
    conversation_id: conversationId,
    role,
    content,
    created_at: now
  }).returning("*");

  await db("conversations")
    .where({ id: conversationId, tenant_id: tenantId })
    .update({ updated_at: now });

  return message;
}

async function updateConversation({ tenantId, conversationId, updates }) {
  const payload = { ...updates, updated_at: new Date().toISOString() };
  // Sérialiser context en JSON si objet
  if (payload.context && typeof payload.context === "object") {
    payload.context = JSON.stringify(payload.context);
  }
  const [updated] = await db("conversations")
    .where({ id: conversationId, tenant_id: tenantId })
    .update(payload)
    .returning("*");
  return updated || null;
}

async function incrementFailure({ tenantId, conversationId }) {
  const convo = await findConversation({ tenantId, conversationId });
  if (!convo) return null;
  const newCount = (convo.failure_count || 0) + 1;
  await db("conversations")
    .where({ id: conversationId, tenant_id: tenantId })
    .update({ failure_count: newCount, updated_at: new Date().toISOString() });
  return newCount;
}

async function resetFailure({ tenantId, conversationId }) {
  return updateConversation({
    tenantId,
    conversationId,
    updates: { failure_count: 0 }
  });
}

async function getHistory({ tenantId, conversationId }) {
  return db("messages")
    .where({ tenant_id: tenantId, conversation_id: conversationId })
    .orderBy("created_at", "asc");
}

async function listConversations({ tenantId, query, userId, role }) {
  const search = (query || "").trim();

  let convoQuery = db("conversations").where({ tenant_id: tenantId });

  if (role === "user") {
    convoQuery = convoQuery.where({ user_id: userId });
  }

  if (search) {
    const matchedRows = await db("messages")
      .where("tenant_id", tenantId)
      .whereILike("content", `%${search}%`)
      .select("conversation_id")
      .distinct();
    const matchedIds = matchedRows.map((r) => r.conversation_id);
    if (!matchedIds.length) return [];
    convoQuery = convoQuery.whereIn("id", matchedIds);
  }

  const conversations = await convoQuery.orderBy("updated_at", "desc");

  if (!conversations.length) return [];

  // Dernier message par conversation
  const convoIds = conversations.map((c) => c.id);
  const lastMessages = await db("messages")
    .where("tenant_id", tenantId)
    .whereIn("conversation_id", convoIds)
    .whereNotNull("content")
    .select(
      db.raw(
        "DISTINCT ON (conversation_id) conversation_id, content, created_at"
      )
    )
    .orderBy("conversation_id")
    .orderBy("created_at", "desc");

  const lastMsgMap = new Map();
  for (const msg of lastMessages) {
    lastMsgMap.set(msg.conversation_id, msg.content);
  }

  return conversations.map((c) => ({
    id: c.id,
    status: c.status,
    failure_count: c.failure_count || 0,
    created_at: c.created_at,
    updated_at: c.updated_at,
    last_message: lastMsgMap.get(c.id) || ""
  }));
}

async function searchMessages({ tenantId, query, userId, role }) {
  const search = (query || "").trim();
  if (!search) return [];

  let msgQuery = db("messages")
    .where("tenant_id", tenantId)
    .whereNotNull("content")
    .whereILike("content", `%${search}%`);

  if (role === "user") {
    const allowedConvos = await db("conversations")
      .where({ tenant_id: tenantId, user_id: userId })
      .select("id");
    const allowedIds = allowedConvos.map((c) => c.id);
    if (!allowedIds.length) return [];
    msgQuery = msgQuery.whereIn("conversation_id", allowedIds);
  }

  const messages = await msgQuery
    .orderBy("created_at", "desc")
    .limit(50)
    .select("id", "conversation_id", "role", "content", "created_at");

  return messages;
}

module.exports = {
  createConversation,
  findConversation,
  addMessage,
  updateConversation,
  incrementFailure,
  resetFailure,
  getHistory,
  listConversations,
  searchMessages
};
