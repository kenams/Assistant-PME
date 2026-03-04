const crypto = require("crypto");
const { withDb, loadDb } = require("./store.service");
const { createGlpiTicket, isGlpiEnabled, buildTicketUrl } = require("./glpi.service");
const { notifyTicketCreated } = require("./integrations.service");

function draftTicket({ message }) {
  return {
    title: `Support: ${message.slice(0, 80)}`,
    summary: message,
    category: "general",
    priority: "medium"
  };
}

async function createTicket({ tenantId, conversationId, draft }) {
  const ticket = withDb((db) => {
    const ticket = {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      conversation_id: conversationId,
      external_id: null,
      external_url: null,
      title: draft.title,
      description: draft.summary,
      category: draft.category,
      priority: draft.priority,
      status: "open",
      created_at: new Date().toISOString()
    };
    db.tickets.push(ticket);
    return ticket;
  });

  if (isGlpiEnabled()) {
    try {
      const result = await createGlpiTicket({
        title: ticket.title,
        description: ticket.description,
        priority: ticket.priority
      });
      if (result && result.id) {
        const url = buildTicketUrl(result.id);
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
  return db.tickets.filter((t) => t.tenant_id === tenantId);
}

function listTicketsByConversation({ tenantId, conversationId }) {
  const db = loadDb();
  return db.tickets.filter(
    (t) => t.tenant_id === tenantId && t.conversation_id === conversationId
  );
}

function listTicketsByUser({ tenantId, userId }) {
  const db = loadDb();
  const convoIds = new Set(
    db.conversations
      .filter((c) => c.tenant_id === tenantId && c.user_id === userId)
      .map((c) => c.id)
  );
  return db.tickets.filter(
    (t) => t.tenant_id === tenantId && convoIds.has(t.conversation_id)
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
