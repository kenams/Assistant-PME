const crypto = require("crypto");
const { withDb, loadDb } = require("./store.service");

function createConversation({ tenantId, userId }) {
  return withDb((db) => {
    const conversation = {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      user_id: userId,
      status: "open",
      failure_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.conversations.push(conversation);
    return conversation;
  });
}

function findConversation({ tenantId, conversationId }) {
  const db = loadDb();
  return (
    db.conversations.find(
      (c) => c.id === conversationId && c.tenant_id === tenantId
    ) || null
  );
}

function addMessage({ tenantId, conversationId, role, content }) {
  return withDb((db) => {
    const message = {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      conversation_id: conversationId,
      role,
      content,
      created_at: new Date().toISOString()
    };
    db.messages.push(message);
    const convo = db.conversations.find((c) => c.id === conversationId);
    if (convo) {
      convo.updated_at = new Date().toISOString();
    }
    return message;
  });
}

function updateConversation({ tenantId, conversationId, updates }) {
  return withDb((db) => {
    const convo = db.conversations.find(
      (c) => c.id === conversationId && c.tenant_id === tenantId
    );
    if (!convo) {
      return null;
    }
    Object.assign(convo, updates);
    convo.updated_at = new Date().toISOString();
    return convo;
  });
}

function incrementFailure({ tenantId, conversationId }) {
  return withDb((db) => {
    const convo = db.conversations.find(
      (c) => c.id === conversationId && c.tenant_id === tenantId
    );
    if (!convo) {
      return null;
    }
    convo.failure_count = (convo.failure_count || 0) + 1;
    convo.updated_at = new Date().toISOString();
    return convo.failure_count;
  });
}

function resetFailure({ tenantId, conversationId }) {
  return updateConversation({
    tenantId,
    conversationId,
    updates: { failure_count: 0 }
  });
}

function getHistory({ tenantId, conversationId }) {
  const db = loadDb();
  return db.messages
    .filter(
      (m) => m.tenant_id === tenantId && m.conversation_id === conversationId
    )
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

module.exports = {
  createConversation,
  findConversation,
  addMessage,
  updateConversation,
  incrementFailure,
  resetFailure,
  getHistory,
  listConversations: ({ tenantId, query, userId, role }) => {
    const db = loadDb();
    const search = (query || "").toLowerCase().trim();
    let conversations = db.conversations.filter((c) => c.tenant_id === tenantId);

    if (role === "user") {
      conversations = conversations.filter((c) => c.user_id === userId);
    }

    if (search) {
      const matchedConversationIds = new Set(
        db.messages
          .filter((m) => m.tenant_id === tenantId && m.content)
          .filter((m) => m.content.toLowerCase().includes(search))
          .map((m) => m.conversation_id)
      );
      conversations = conversations.filter((c) => matchedConversationIds.has(c.id));
    }

    return conversations
      .filter((c) => c.tenant_id === tenantId)
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .map((conversation) => {
        const lastMessage = db.messages
          .filter((m) => m.conversation_id === conversation.id)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
        return {
          id: conversation.id,
          status: conversation.status,
          failure_count: conversation.failure_count || 0,
          created_at: conversation.created_at,
          updated_at: conversation.updated_at,
          last_message: lastMessage ? lastMessage.content : ""
        };
      });
  },
  searchMessages: ({ tenantId, query, userId, role }) => {
    const db = loadDb();
    const search = (query || "").toLowerCase().trim();
    if (!search) {
      return [];
    }
    let messages = db.messages
      .filter((m) => m.tenant_id === tenantId && m.content);

    if (role === "user") {
      const allowedConversations = new Set(
        db.conversations
          .filter((c) => c.tenant_id === tenantId && c.user_id === userId)
          .map((c) => c.id)
      );
      messages = messages.filter((m) => allowedConversations.has(m.conversation_id));
    }

    return messages
      .filter((m) => m.content.toLowerCase().includes(search))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 50)
      .map((m) => ({
        id: m.id,
        conversation_id: m.conversation_id,
        role: m.role,
        content: m.content,
        created_at: m.created_at
      }));
  }
};
