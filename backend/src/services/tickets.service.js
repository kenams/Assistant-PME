const crypto = require("crypto");
const { db } = require("../config/db");
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
    text.includes("bsod") ||
    text.includes("ecran bleu") ||
    text.includes("blue screen") ||
    text.includes("kernel") ||
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
  const rawPriority = (base.priority || inferPriority(summary || title)).toString().trim();
  const priority = rawPriority === "critical" ? "high" : (["low", "medium", "high"].includes(rawPriority) ? rawPriority : "medium");
  return { title, summary, category, priority };
}

async function buildConversationSnippet({ tenantId, conversationId }) {
  if (!conversationId) return "";
  const history = await getHistory({ tenantId, conversationId });
  if (!history || !history.length) return "";
  const recent = history.slice(-8);
  const lines = recent.map((msg) => {
    const label = msg.role === "assistant" ? "Assistant" : "Utilisateur";
    const content = formatConversationContent(msg.content);
    return `- ${label}: ${content}`;
  });
  return `\n\n---\nContexte conversation\n${lines.join("\n")}`;
}

async function buildContextSnippet({ tenantId, conversationId }) {
  if (!conversationId) return "";
  const conversation = await findConversation({ tenantId, conversationId });
  if (!conversation || !conversation.context) return "";
  const ctx = typeof conversation.context === "string"
    ? JSON.parse(conversation.context)
    : conversation.context;
  const lines = [];
  if (ctx.user_login) lines.push(`Login AD: ${ctx.user_login}`);
  if (ctx.win_user) lines.push(`User Windows: ${ctx.win_user}`);
  if (ctx.device) lines.push(`Type poste: ${ctx.device}`);
  if (ctx.pc_name) lines.push(`Nom PC: ${ctx.pc_name}`);
  if (ctx.local_ip) lines.push(`IP LAN: ${ctx.local_ip}`);
  if (ctx.ip) lines.push(`IP publique: ${ctx.ip}`);
  if (ctx.os) lines.push(`OS: ${ctx.os}`);
  if (ctx.location) lines.push(`Site: ${ctx.location}`);
  if (ctx.urgency) lines.push(`Urgence: ${ctx.urgency}`);
  if (ctx.contact) lines.push(`Contact: ${ctx.contact}`);
  if (!lines.length) return "";
  return `\n\n---\n[Contexte technicien]\n${lines.join("\n")}`;
}

async function resolveGlpiConfig({ tenantId }) {
  const settings = await getOrgSettings({ tenantId });
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
    userToken: settings.glpi_user_token || "",
    login: settings.glpi_login || "",
    password: settings.glpi_password || ""
  };
}

async function createTicket({ tenantId, conversationId, userId, draft }) {
  const normalized = normalizeDraft(draft);
  const contextSnippet = await buildContextSnippet({ tenantId, conversationId });
  const snippet = await buildConversationSnippet({ tenantId, conversationId });
  const finalDescription = `${normalized.summary}${contextSnippet}${snippet}`.slice(0, 4000);

  // Resolve user_id: explicit param > conversation owner
  let resolvedUserId = userId || null;
  if (!resolvedUserId && conversationId) {
    const conv = await findConversation({ tenantId, conversationId });
    if (conv && conv.user_id) resolvedUserId = conv.user_id;
  }

  const now = new Date().toISOString();
  const [ticket] = await db("tickets").insert({
    id: crypto.randomUUID(),
    tenant_id: tenantId,
    conversation_id: conversationId || null,
    user_id: resolvedUserId,
    external_id: null,
    external_url: null,
    title: normalized.title,
    description: finalDescription,
    category: normalized.category,
    priority: normalized.priority,
    status: "open",
    created_at: now,
    updated_at: now
  }).returning("*");

  const glpiConfig = await resolveGlpiConfig({ tenantId });
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
        await db("tickets").where({ id: ticket.id }).update({
          external_id: result.id,
          external_url: url
        });
        ticket.external_id = result.id;
        ticket.external_url = url;
      }
    } catch (err) {
      // ignore GLPI errors
    }
  }

  try {
    await notifyTicketCreated({ tenantId, ticket });
  } catch (err) {
    // ignore webhook errors
  }

  return ticket;
}

async function listTickets({ tenantId }) {
  return db("tickets")
    .where({ tenant_id: tenantId })
    .orderBy("created_at", "desc");
}

async function listTicketsByConversation({ tenantId, conversationId }) {
  return db("tickets")
    .where({ tenant_id: tenantId, conversation_id: conversationId })
    .orderBy("created_at", "desc");
}

async function listTicketsByUser({ tenantId, userId }) {
  const convos = await db("conversations")
    .where({ tenant_id: tenantId, user_id: userId })
    .select("id");
  const convoIds = convos.map((c) => c.id);
  if (!convoIds.length) return [];
  return db("tickets")
    .where({ tenant_id: tenantId })
    .whereIn("conversation_id", convoIds)
    .orderBy("created_at", "desc");
}

async function findTicketByConversation({ tenantId, conversationId }) {
  const row = await db("tickets")
    .where({ tenant_id: tenantId, conversation_id: conversationId })
    .first();
  return row || null;
}

async function updateTicket({ tenantId, ticketId, updates }) {
  const ticket = await db("tickets")
    .where({ tenant_id: tenantId, id: ticketId })
    .first();
  if (!ticket) return null;

  const payload = { updated_at: new Date().toISOString() };
  if (updates.status) payload.status = updates.status;
  if (updates.priority) payload.priority = updates.priority;
  if (updates.category) payload.category = updates.category;

  const [updated] = await db("tickets")
    .where({ tenant_id: tenantId, id: ticketId })
    .update(payload)
    .returning("*");

  if (ticket.conversation_id && updates.status) {
    const status = updates.status;
    if (status === "resolved" || status === "closed") {
      await updateConversation({
        tenantId,
        conversationId: ticket.conversation_id,
        updates: { status: "resolved", failure_count: 0 }
      });
    } else if (status === "open" || status === "pending") {
      await updateConversation({
        tenantId,
        conversationId: ticket.conversation_id,
        updates: { status: "escalated" }
      });
    }
  }

  return updated;
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
