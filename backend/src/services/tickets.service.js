const crypto = require("crypto");
const { withDb, loadDb } = require("./store.service");
const { createGlpiTicket, isGlpiEnabled, buildTicketUrl } = require("./glpi.service");
const { notifyTicketCreated } = require("./integrations.service");
const {
  updateConversation,
  getHistory,
  findConversation
} = require("./conversations.service");
const { getOrgSettings } = require("./org.service");

function normalizeText(message) {
  return (message || "").toLowerCase();
}

const IMAGE_PREFIX = "__IMAGE__:";

function formatConversationContent(content) {
  const raw = (content || "").toString().trim();
  if (raw.startsWith(IMAGE_PREFIX)) {
    const url = raw.slice(IMAGE_PREFIX.length).trim();
    return url ? `Image: ${url}` : "Image jointe";
  }
  return raw;
}

function inferCategory(message) {
  const text = normalizeText(message);
  if (text.includes("outlook") || text.includes("email") || text.includes("mail")) {
    return "email";
  }
  if (text.includes("imprimante") || text.includes("printer")) {
    return "printer";
  }
  if (
    text.includes("wifi") ||
    text.includes("internet") ||
    text.includes("reseau") ||
    text.includes("network")
  ) {
    return "network";
  }
  if (text.includes("vpn") || text.includes("connexion distante")) {
    return "vpn";
  }
  if (text.includes("mot de passe") || text.includes("password") || text.includes("mdp")) {
    return "password";
  }
  if (
    text.includes("ordinateur") ||
    text.includes("pc") ||
    text.includes("ecran") ||
    text.includes("clavier") ||
    text.includes("souris") ||
    text.includes("materiel")
  ) {
    return "hardware";
  }
  if (text.includes("application") || text.includes("logiciel")) {
    return "software";
  }
  return "general";
}

function inferPriority(message) {
  const text = normalizeText(message);
  if (
    text.includes("ransomware") ||
    text.includes("pirat") ||
    text.includes("phishing") ||
    text.includes("securite") ||
    text.includes("compromis") ||
    text.includes("fuite") ||
    text.includes("data leak")
  ) {
    return "high";
  }
  if (
    text.includes("urgent") ||
    text.includes("bloque") ||
    text.includes("critique") ||
    text.includes("production") ||
    text.includes("client") ||
    text.includes("serveur") ||
    text.includes("impossible") ||
    text.includes("panne generale") ||
    text.includes("plus rien") ||
    text.includes("incident")
  ) {
    return "high";
  }
  if (
    text.includes("vpn") ||
    text.includes("reseau") ||
    text.includes("réseau") ||
    text.includes("email") ||
    text.includes("outlook") ||
    text.includes("teams")
  ) {
    return "medium";
  }
  if (text.includes("demande") || text.includes("question")) {
    return "low";
  }
  if (
    text.includes("creation") ||
    text.includes("nouvel arrivant") ||
    text.includes("onboarding") ||
    text.includes("acces") ||
    text.includes("autorisation")
  ) {
    return "low";
  }
  return "medium";
}

function draftTicket({ message }) {
  const safeMessage = message || "Demande utilisateur";
  return {
    title: `Support: ${safeMessage.slice(0, 80)}`,
    summary: safeMessage,
    category: inferCategory(safeMessage),
    priority: inferPriority(safeMessage)
  };
}

function normalizeDraft(draft, fallbackMessage) {
  const base = draft || {};
  const safeMessage = fallbackMessage || base.summary || base.title || "Demande utilisateur";
  const title =
    (base.title || `Support: ${safeMessage}`).toString().trim().slice(0, 120) ||
    "Support";
  const summary = (base.summary || safeMessage).toString().trim().slice(0, 2000);
  const category =
    (base.category || inferCategory(summary || title)).toString().trim() ||
    "general";
  const priority = (base.priority || inferPriority(summary || title)).toString().trim();
  return {
    title,
    summary,
    category,
    priority: ["low", "medium", "high"].includes(priority) ? priority : "medium"
  };
}

function sortByNewest(items) {
  return items
    .slice()
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

function buildConversationSnippet({ tenantId, conversationId }) {
  if (!conversationId) return "";
  const history = getHistory({ tenantId, conversationId });
  if (!history || !history.length) return "";
  const recent = history.slice(-8);
  const lines = recent.map((msg) => {
    const label = msg.role === "assistant" ? "Assistant" : "Utilisateur";
    const content = formatConversationContent(msg.content);
    return `- ${label}: ${content}`;
  });
  return `\n\n---\nContexte conversation\n${lines.join("\n")}`;
}

function buildContextSnippet({ tenantId, conversationId }) {
  if (!conversationId) return "";
  const conversation = findConversation({ tenantId, conversationId });
  if (!conversation || !conversation.context) return "";
  const ctx = conversation.context;
  const lines = [];
  if (ctx.device) lines.push(`Poste: ${ctx.device}`);
  if (ctx.os) lines.push(`OS: ${ctx.os}`);
  if (ctx.location) lines.push(`Site: ${ctx.location}`);
  if (ctx.urgency) lines.push(`Urgence: ${ctx.urgency}`);
  if (ctx.contact) lines.push(`Contact: ${ctx.contact}`);
  if (!lines.length) return "";
  return `\n\n---\nContexte utilisateur\n${lines.join("\n")}`;
}

function resolveGlpiConfig({ tenantId }) {
  const settings = getOrgSettings({ tenantId });
  const hasTenantConfig = Boolean(
    settings.glpi_enabled ||
      settings.glpi_base_url ||
      settings.glpi_user_token ||
      settings.glpi_app_token
  );
  if (!hasTenantConfig) {
    return null;
  }
  return {
    enabled: Boolean(settings.glpi_enabled),
    baseUrl: settings.glpi_base_url || "",
    appToken: settings.glpi_app_token || "",
    userToken: settings.glpi_user_token || ""
  };
}

async function createTicket({ tenantId, conversationId, draft }) {
  const normalized = normalizeDraft(draft);
  const contextSnippet = buildContextSnippet({ tenantId, conversationId });
  const snippet = buildConversationSnippet({ tenantId, conversationId });
  const finalDescription = `${normalized.summary}${contextSnippet}${snippet}`.slice(
    0,
    4000
  );
  const ticket = withDb((db) => {
    const ticket = {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      conversation_id: conversationId,
      external_id: null,
      external_url: null,
      title: normalized.title,
      description: finalDescription,
      category: normalized.category,
      priority: normalized.priority,
      status: "open",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.tickets.push(ticket);
    return ticket;
  });

  const glpiConfig = resolveGlpiConfig({ tenantId });
  if (isGlpiEnabled(glpiConfig)) {
    try {
      const result = await createGlpiTicket({
        title: ticket.title,
        description: ticket.description,
        priority: ticket.priority,
        config: glpiConfig
      });
      if (result && result.id) {
        const url = buildTicketUrl(result.id, glpiConfig);
        withDb((db) => {
          const stored = db.tickets.find((t) => t.id === ticket.id);
          if (stored) {
            stored.external_id = result.id;
            stored.external_url = url;
          }
        });
        ticket.external_id = result.id;
        ticket.external_url = url;
      }
    } catch (err) {
      // ignore GLPI errors in local mode
    }
  }

  try {
    await notifyTicketCreated({ tenantId, ticket });
  } catch (err) {
    // ignore webhook errors
  }

  return ticket;
}

function listTickets({ tenantId }) {
  const db = loadDb();
  return sortByNewest(db.tickets.filter((t) => t.tenant_id === tenantId));
}

function listTicketsByConversation({ tenantId, conversationId }) {
  const db = loadDb();
  return sortByNewest(
    db.tickets.filter(
      (t) => t.tenant_id === tenantId && t.conversation_id === conversationId
    )
  );
}

function listTicketsByUser({ tenantId, userId }) {
  const db = loadDb();
  const convoIds = new Set(
    db.conversations
      .filter((c) => c.tenant_id === tenantId && c.user_id === userId)
      .map((c) => c.id)
  );
  return sortByNewest(
    db.tickets.filter(
      (t) => t.tenant_id === tenantId && convoIds.has(t.conversation_id)
    )
  );
}

function findTicketByConversation({ tenantId, conversationId }) {
  const db = loadDb();
  return (
    db.tickets.find(
      (t) => t.tenant_id === tenantId && t.conversation_id === conversationId
    ) || null
  );
}

function updateTicket({ tenantId, ticketId, updates }) {
  return withDb((db) => {
    const ticket = db.tickets.find(
      (t) => t.tenant_id === tenantId && t.id === ticketId
    );
    if (!ticket) {
      return null;
    }
    if (updates.status) {
      ticket.status = updates.status;
    }
    if (updates.priority) {
      ticket.priority = updates.priority;
    }
    if (updates.category) {
      ticket.category = updates.category;
    }
    ticket.updated_at = new Date().toISOString();
    if (ticket.conversation_id && updates.status) {
      const status = updates.status;
      if (status === "resolved" || status === "closed") {
        updateConversation({
          tenantId,
          conversationId: ticket.conversation_id,
          updates: { status: "resolved", failure_count: 0 }
        });
      } else if (status === "open" || status === "pending") {
        updateConversation({
          tenantId,
          conversationId: ticket.conversation_id,
          updates: { status: "escalated" }
        });
      }
    }
    return ticket;
  });
}

module.exports = {
  draftTicket,
  createTicket,
  listTickets,
  listTicketsByConversation,
  listTicketsByUser,
  findTicketByConversation,
  updateTicket
};
