const crypto = require("crypto");
const { withDb, loadDb } = require("./store.service");
const { ingestSupport } = require("./ingest.service");
const {
  createConversation,
  addMessage,
  updateConversation
} = require("./conversations.service");
const { ingestDocument } = require("./rag.service");
const { createQuote, createInvoice } = require("./billing.service");
const { createNotification } = require("./notifications.service");
const { logEvent } = require("./audit.service");

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function clearTenantData(tenantId) {
  return withDb((db) => {
    const keep = (item) => item.tenant_id !== tenantId;
    db.conversations = db.conversations.filter(keep);
    db.messages = db.messages.filter(keep);
    db.tickets = db.tickets.filter(keep);
    db.kb_documents = db.kb_documents.filter(keep);
    db.kb_chunks = db.kb_chunks.filter(keep);
    db.metrics_daily = db.metrics_daily.filter(keep);
    db.leads = db.leads.filter(keep);
    db.quotes = db.quotes.filter(keep);
    db.invoices = db.invoices.filter(keep);
    db.audit_logs = db.audit_logs.filter(keep);
    db.notifications = db.notifications.filter(keep);
    db.conversation_feedback = db.conversation_feedback.filter(keep);
    db.invites = db.invites.filter(keep);
  });
}

async function seedDemoData({ tenantId, userId, mode = "append" }) {
  if (mode === "reset") {
    clearTenantData(tenantId);
  }

  const seeded = {
    kb: 0,
    leads: 0,
    conversations: 0,
    tickets: 0,
    quotes: 0,
    invoices: 0
  };

  const dbSnapshot = loadDb();
  const hasKb = dbSnapshot.kb_documents.some((doc) => doc.tenant_id === tenantId);
  if (!hasKb) {
    await ingestDocument({
      tenantId,
      title: "Procedure Outlook - Acces",
      sourceType: "procedure",
      content:
        "1. Verifier la connexion internet.\n2. Redemarrer Outlook.\n3. Tester le webmail.\n4. Verifier le VPN.\n5. Si besoin, re-authentifier le compte."
    });
    await ingestDocument({
      tenantId,
      title: "Imprimante - Installation rapide",
      sourceType: "procedure",
      content:
        "1. Brancher l'imprimante au reseau.\n2. Installer le pilote depuis le site constructeur.\n3. Ajouter l'imprimante dans Windows.\n4. Lancer une page test."
    });
    seeded.kb += 2;
  }

  const resolvedConvo = createConversation({ tenantId, userId });
  addMessage({
    tenantId,
    conversationId: resolvedConvo.id,
    role: "user",
    content: "Comment reinitialiser mon mot de passe Windows ?"
  });
  addMessage({
    tenantId,
    conversationId: resolvedConvo.id,
    role: "assistant",
    content:
      "Vous pouvez utiliser la procedure interne: CTRL+ALT+SUPPR > Modifier un mot de passe. Besoin d'aide ?"
  });
  updateConversation({
    tenantId,
    conversationId: resolvedConvo.id,
    updates: { status: "resolved" }
  });
  withDb((db) => {
    db.conversation_feedback.push({
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      conversation_id: resolvedConvo.id,
      user_id: userId,
      resolved: true,
      rating: 4,
      comment: "Clair et rapide",
      created_at: new Date().toISOString()
    });
  });
  seeded.conversations += 1;

  const ingestSamples = [
    {
      fromEmail: "marie@client.fr",
      subject: "VPN ne se connecte pas",
      body: "Erreur 809 apres mise a jour Windows.",
      category: "email",
      priority: "high",
      source: "email"
    },
    {
      fromName: "lucas",
      subject: "Impossible d'imprimer",
      body: "L'imprimante HP affiche un code E1.",
      category: "slack",
      priority: "medium",
      source: "slack"
    },
    {
      fromName: "sarah",
      subject: "Teams ne demarre pas",
      body: "Ecran blanc au lancement sur le poste salle 3.",
      category: "teams",
      priority: "medium",
      source: "teams"
    }
  ];

  for (const sample of ingestSamples) {
    const result = await ingestSupport({ tenantId, ...sample });
    seeded.tickets += 1;
    seeded.conversations += 1;
    if (result && result.ticket) {
      withDb((db) => {
        const ticket = db.tickets.find((item) => item.id === result.ticket.id);
        if (ticket && sample.source === "email") {
          ticket.created_at = hoursAgo(36);
        }
        if (ticket && sample.source === "teams") {
          ticket.created_at = hoursAgo(18);
        }
      });
    }
  }

  withDb((db) => {
    db.leads.push(
      {
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        name: "Sophie Martin",
        email: "sophie@atelier-bio.fr",
        company: "Atelier Bio",
        message: "Besoin d'une demo pour notre equipe support.",
        status: "demo",
        next_action: "Envoyer proposition",
        notes: "Interessee par plan Pro",
        owner: "Kenam",
        created_at: hoursAgo(48)
      },
      {
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        name: "Pierre Lacroix",
        email: "pierre@agence-zen.fr",
        company: "Agence Zen",
        message: "On veut integrer GLPI.",
        status: "proposal",
        next_action: "Planifier call technique",
        notes: "",
        owner: "Kenam",
        created_at: hoursAgo(20)
      }
    );
  });
  seeded.leads += 2;

  createQuote({
    tenantId,
    payload: {
      client_name: "Atelier Bio",
      client_email: "sophie@atelier-bio.fr",
      title: "Setup + onboarding",
      tax_rate: 0.2,
      items: [
        { label: "Installation", qty: 1, unit_price: 1500 },
        { label: "Formation", qty: 1, unit_price: 500 }
      ]
    }
  });
  seeded.quotes += 1;

  createInvoice({
    tenantId,
    payload: {
      client_name: "Agence Zen",
      client_email: "pierre@agence-zen.fr",
      title: "Abonnement Pro",
      tax_rate: 0.2,
      items: [{ label: "Abonnement mensuel", qty: 1, unit_price: 149 }]
    }
  });
  seeded.invoices += 1;

  createNotification({
    tenantId,
    userId,
    type: "demo_seeded",
    channel: "system",
    payload: { mode, at: new Date().toISOString() }
  });

  logEvent({
    tenantId,
    userId,
    action: "demo_seeded",
    meta: seeded
  });

  return seeded;
}

module.exports = { seedDemoData };
