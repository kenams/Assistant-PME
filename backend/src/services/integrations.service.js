const { getOrgSettings } = require("./org.service");

async function postJson(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error(`webhook_failed_${res.status}`);
  }
}

function buildSlackPayload(ticket) {
  const status = ticket.status ? ticket.status.toUpperCase() : "OPEN";
  return {
    text: `Nouveau ticket (${status})\n*${ticket.title}*\nCategorie: ${ticket.category} | Priorite: ${ticket.priority}`
  };
}

function buildTeamsPayload(ticket) {
  return {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    summary: "Nouveau ticket support",
    themeColor: "0076D7",
    sections: [
      {
        activityTitle: `Nouveau ticket: ${ticket.title}`,
        facts: [
          { name: "Categorie", value: ticket.category || "-" },
          { name: "Priorite", value: ticket.priority || "-" },
          { name: "Statut", value: ticket.status || "open" }
        ],
        markdown: true
      }
    ]
  };
}

async function notifyTicketCreated({ tenantId, ticket }) {
  const settings = getOrgSettings({ tenantId });
  if (!settings.notify_on_ticket_created) {
    return;
  }

  const tasks = [];
  if (settings.slack_webhook_url) {
    tasks.push(postJson(settings.slack_webhook_url, buildSlackPayload(ticket)));
  }
  if (settings.teams_webhook_url) {
    tasks.push(postJson(settings.teams_webhook_url, buildTeamsPayload(ticket)));
  }

  if (!tasks.length) {
    return;
  }

  await Promise.allSettled(tasks);
}

module.exports = { notifyTicketCreated };
