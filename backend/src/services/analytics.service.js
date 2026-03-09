const { loadDb, getStoreVersion } = require("./store.service");
const { getOrgSettings } = require("./org.service");

const analyticsCache = new Map();

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

function computeRoi({ conversations, tickets, settings }) {
  const ticketConversations = new Set(
    tickets.map((ticket) => ticket.conversation_id).filter(Boolean)
  );
  const ticketsEvites = conversations.filter(
    (c) => c.status === "resolved" && !ticketConversations.has(c.id)
  ).length;
  const minutesSaved = ticketsEvites * 8;
  const hoursSaved = round(minutesSaved / 60, 1);
  const costPerTicket = Number(settings.cost_per_ticket || 0);
  const savingsEstimate = costPerTicket > 0 ? ticketsEvites * costPerTicket : 0;

  return {
    tickets_evites: ticketsEvites,
    minutes_saved: minutesSaved,
    hours_saved: hoursSaved,
    cost_per_ticket: costPerTicket,
    savings_estimate: round(savingsEstimate, 2)
  };
}

function computeSla({ tickets, settings }) {
  const slaHours = Number(settings.sla_hours || 24);
  const warningPct = Number(settings.sla_warning_pct || 80);
  const warningHours = (slaHours * warningPct) / 100;
  const now = Date.now();

  let breached = 0;
  let atRisk = 0;
  let openCount = 0;
  let breachedOpen = 0;
  let breachedClosed = 0;
  const alerts = [];

  tickets.forEach((ticket) => {
    const createdAt = ticket.created_at ? new Date(ticket.created_at).getTime() : null;
    if (!createdAt || Number.isNaN(createdAt)) {
      return;
    }
    const status = ticket.status || "open";
    const isOpen = status === "open" || status === "pending";
    const updatedAt = ticket.updated_at ? new Date(ticket.updated_at).getTime() : null;
    const ageHours = (now - createdAt) / 3600000;
    const durationHours =
      updatedAt && !Number.isNaN(updatedAt)
        ? (updatedAt - createdAt) / 3600000
        : ageHours;

    if (isOpen) {
      openCount += 1;
      if (ageHours >= slaHours) {
        breached += 1;
        breachedOpen += 1;
        alerts.push({
          id: ticket.id,
          title: ticket.title,
          status,
          age_hours: round(ageHours, 1),
          type: "breach"
        });
      } else if (ageHours >= warningHours) {
        atRisk += 1;
        alerts.push({
          id: ticket.id,
          title: ticket.title,
          status,
          age_hours: round(ageHours, 1),
          type: "warning"
        });
      }
    } else if (durationHours >= slaHours) {
      breached += 1;
      breachedClosed += 1;
    }
  });

  alerts.sort((a, b) => b.age_hours - a.age_hours);

  return {
    hours: slaHours,
    warning_pct: warningPct,
    breached_count: breached,
    at_risk_count: atRisk,
    open_count: openCount,
    breached_open_count: breachedOpen,
    breached_closed_count: breachedClosed,
    alerts: alerts.slice(0, 6)
  };
}

function computeAnalytics(tenantId) {
  const version = getStoreVersion();
  const cached = analyticsCache.get(tenantId);
  if (cached && cached.version === version) {
    return cached.data;
  }

  const db = loadDb();
  const conversations = (db.conversations || []).filter(
    (c) => c.tenant_id === tenantId
  );
  const messages = (db.messages || []).filter((m) => m.tenant_id === tenantId);
  const tickets = (db.tickets || []).filter((t) => t.tenant_id === tenantId);
  const feedback = (db.conversation_feedback || []).filter(
    (f) => f.tenant_id === tenantId
  );
  const settings = getOrgSettings({ tenantId });

  let responseSum = 0;
  let responseCount = 0;
  let resolutionSum = 0;
  let resolutionCount = 0;

  const firstTimes = new Map();
  messages.forEach((msg) => {
    if (!msg.conversation_id || !msg.created_at) return;
    const entry =
      firstTimes.get(msg.conversation_id) || {
        userTime: null,
        assistantTime: null
      };
    const createdAt = new Date(msg.created_at).getTime();
    if (Number.isNaN(createdAt)) return;
    if (msg.role === "user") {
      if (!entry.userTime || createdAt < entry.userTime) {
        entry.userTime = createdAt;
      }
    } else if (msg.role === "assistant") {
      if (!entry.assistantTime || createdAt < entry.assistantTime) {
        entry.assistantTime = createdAt;
      }
    }
    firstTimes.set(msg.conversation_id, entry);
  });

  conversations.forEach((conversation) => {
    const times = firstTimes.get(conversation.id);
    if (times && times.userTime && times.assistantTime) {
      const diff = times.assistantTime - times.userTime;
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

  const result = {
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
    volume_last_14_days: volume,
    sla: computeSla({ tickets, settings }),
    roi: computeRoi({ conversations, tickets, settings })
  };

  analyticsCache.set(tenantId, { version, data: result });
  return result;
}

module.exports = { computeAnalytics };
