const crypto = require("crypto");
const { getDefaultTenantId } = require("./tenants.service");
const { findUserByEmailInTenant, createUser } = require("./users.service");
const {
  createConversation,
  addMessage,
  updateConversation
} = require("./conversations.service");
const { createTicket } = require("./tickets.service");
const { logEvent } = require("./audit.service");
const { createNotification } = require("./notifications.service");

function buildFallbackEmail({ source, fromId }) {
  const safeSource = (source || "support").replace(/[^a-z0-9]/gi, "").toLowerCase();
  const suffix = fromId ? `-${fromId}` : "";
  return `${safeSource}${suffix}@assistant.local`;
}

async function ingestSupport({
  tenantId,
  fromEmail,
  fromName,
  subject,
  body,
  category,
  priority,
  source
}) {
  const finalTenantId = tenantId || getDefaultTenantId();
  if (!finalTenantId) {
    throw new Error("tenant_not_found");
  }

  const normalizedEmail =
    fromEmail || buildFallbackEmail({ source, fromId: fromName || "user" });

  let user = findUserByEmailInTenant({
    tenantId: finalTenantId,
    email: normalizedEmail
  });
  if (!user) {
    const tempPassword = crypto.randomBytes(9).toString("base64url");
    const created = createUser({
      tenantId: finalTenantId,
      email: normalizedEmail,
      password: tempPassword,
      role: "user"
    });
    if (created.user) {
      user = created.user;
    }
  }

  const conversation = createConversation({
    tenantId: finalTenantId,
    userId: user ? user.id : null
  });

  const safeSubject = subject || "Demande support";
  const safeBody = body || "";
  const message = `Source: ${source || "support"}\nDe: ${
    fromName || normalizedEmail
  }\nSujet: ${safeSubject}\n\n${safeBody}`.trim();

  addMessage({
    tenantId: finalTenantId,
    conversationId: conversation.id,
    role: "user",
    content: message
  });

  const draft = {
    title: `${source ? `${source}: ` : ""}${safeSubject}`.slice(0, 120),
    summary: `Demande de ${fromName || normalizedEmail}\n\n${safeBody}`.trim(),
    category: category || source || "email",
    priority: priority || "medium"
  };

  const ticket = await createTicket({
    tenantId: finalTenantId,
    conversationId: conversation.id,
    draft
  });

  updateConversation({
    tenantId: finalTenantId,
    conversationId: conversation.id,
    updates: { status: "escalated" }
  });

  logEvent({
    tenantId: finalTenantId,
    userId: user ? user.id : null,
    action: "ticket_ingested",
    meta: { ticket_id: ticket.id, source: source || "support" }
  });

  createNotification({
    tenantId: finalTenantId,
    userId: user ? user.id : null,
    type: "ticket_ingested",
    channel: "support_ingest",
    payload: {
      subject: safeSubject,
      from: normalizedEmail
    }
  });

  return {
    ticket,
    conversation,
    user
  };
}

module.exports = { ingestSupport };
