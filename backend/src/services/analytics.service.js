const { loadDb } = require("./store.service");

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function groupByDay(items, dateKey) {
  const map = new Map();
  items.forEach((item) => {
    const raw = item[dateKey];
    if (!raw) return;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return;
    const key = date.toISOString().slice(0, 10);
    map.set(key, (map.get(key) || 0) + 1);
  });
  return map;
}

function rangeDays(days) {
  const list = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    list.push(date.toISOString().slice(0, 10));
  }
  return list;
}

function computeAnalytics(tenantId) {
  const db = loadDb();
  const conversations = (db.conversations || []).filter(
    (c) => c.tenant_id === tenantId
  );
  const messages = (db.messages || []).filter((m) => m.tenant_id === tenantId);
  const tickets = (db.tickets || []).filter((t) => t.tenant_id === tenantId);
  const feedback = (db.conversation_feedback || []).filter(
    (f) => f.tenant_id === tenantId
  );

  const messagesByConversation = new Map();
  messages.forEach((msg) => {
    if (!messagesByConversation.has(msg.conversation_id)) {
      messagesByConversation.set(msg.conversation_id, []);
    }
    messagesByConversation.get(msg.conversation_id).push(msg);
  });

  let responseSum = 0;
  let responseCount = 0;
  let resolutionSum = 0;
  let resolutionCount = 0;

  conversations.forEach((conversation) => {
    const convoMessages = (messagesByConversation.get(conversation.id) || []).slice();
    convoMessages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const firstUser = convoMessages.find((m) => m.role === "user");
    const firstAssistant = convoMessages.find((m) => m.role === "assistant");
    if (firstUser && firstAssistant) {
      const diff =
        new Date(firstAssistant.created_at).getTime() -
        new Date(firstUser.created_at).getTime();
      if (diff >= 0) {
        responseSum += diff;
        responseCount += 1;
      }
    }
    if (conversation.status === "resolved") {
      const diff =
        new Date(conversation.updated_at).getTime() -
        new Date(conversation.created_at).getTime();
      if (diff >= 0) {
        resolutionSum += diff;
        resolutionCount += 1;
      }
    }
  });

  const responseAvgMinutes =
    responseCount > 0 ? round(responseSum / responseCount / 60000, 1) : 0;
  const resolutionAvgMinutes =
    resolutionCount > 0 ? round(resolutionSum / resolutionCount / 60000, 1) : 0;

  const ticketsByStatus = {};
  const ticketsByPriority = {};
  const ticketsByCategory = {};
  tickets.forEach((ticket) => {
    const status = ticket.status || "open";
    const priority = ticket.priority || "medium";
    const category = ticket.category || "general";
    ticketsByStatus[status] = (ticketsByStatus[status] || 0) + 1;
    ticketsByPriority[priority] = (ticketsByPriority[priority] || 0) + 1;
    ticketsByCategory[category] = (ticketsByCategory[category] || 0) + 1;
  });

  const feedbackCount = feedback.length;
  const feedbackAvg =
    feedbackCount > 0
      ? round(
          feedback.reduce((acc, item) => acc + (item.rating || 0), 0) /
            feedbackCount,
          1
        )
      : 0;
  const feedbackResolvedRate =
    feedbackCount > 0
      ? Math.round(
          (feedback.filter((item) => item.resolved).length / feedbackCount) * 100
        )
      : 0;

  const convoByDay = groupByDay(conversations, "created_at");
  const ticketsByDay = groupByDay(tickets, "created_at");
  const days = rangeDays(14);
  const volume = days.map((day) => ({
    day,
    conversations: convoByDay.get(day) || 0,
    tickets: ticketsByDay.get(day) || 0
  }));

  return {
    response_avg_minutes: responseAvgMinutes,
    resolution_avg_minutes: resolutionAvgMinutes,
    tickets_by_status: ticketsByStatus,
    tickets_by_priority: ticketsByPriority,
    tickets_by_category: ticketsByCategory,
    feedback: {
      count: feedbackCount,
      average_rating: feedbackAvg,
      resolved_rate: feedbackResolvedRate
    },
    volume_last_14_days: volume
  };
}

module.exports = { computeAnalytics };
