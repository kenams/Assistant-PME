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
const { getTenantById } = require("./users.service");

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
    if (Array.isArray(db.quick_issues)) {
      db.quick_issues = db.quick_issues.filter(keep);
    }
  });
}

function ensureQuickIssues(db) {
  if (!Array.isArray(db.quick_issues)) {
    db.quick_issues = [];
  }
}

function seedQuickIssues({ tenantId, issues }) {
  if (!issues || !issues.length) return 0;
  let seeded = 0;
  const now = new Date().toISOString();
  withDb((db) => {
    ensureQuickIssues(db);
    issues.forEach((issue) => {
      const exists = db.quick_issues.find(
        (item) => item.tenant_id === tenantId && item.key === issue.key
      );
      if (exists) return;
      db.quick_issues.push({
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        key: issue.key,
        label: issue.label,
        example: issue.example,
        count: issue.count || 1,
        created_at: now,
        last_seen: now
      });
      seeded += 1;
    });
  });
  return seeded;
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
    invoices: 0,
    quick_issues: 0
  };

  const tenantInfo = getTenantById(tenantId);
  const tenantCode = tenantInfo && tenantInfo.code ? String(tenantInfo.code).toUpperCase() : "";
  const isAdf =
    tenantCode === "ADF" ||
    (tenantInfo && String(tenantInfo.name || "").toUpperCase().includes("ADF"));

  const dbSnapshot = loadDb();
  const hasKb = dbSnapshot.kb_documents.some((doc) => doc.tenant_id === tenantId);
  const hasAdfKb = dbSnapshot.kb_documents.some(
    (doc) =>
      doc.tenant_id === tenantId &&
      doc.title &&
      String(doc.title).toUpperCase().startsWith("ADF -")
  );
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
  if (isAdf && !hasAdfKb) {
    await ingestDocument({
      tenantId,
      title: "ADF - Acces SharePoint Projets",
      sourceType: "procedure",
      content:
        "1. Verifier le compte Microsoft 365.\n2. S'assurer d'etre dans le bon groupe AD.\n3. Tester l'acces via le navigateur.\n4. Si refus, demander un ajout de droits."
    });
    await ingestDocument({
      tenantId,
      title: "ADF - Demande VPN",
      sourceType: "procedure",
      content:
        "1. Confirmer l'autorisation du manager.\n2. Installer le client VPN.\n3. Tester le MFA.\n4. Si erreur, escalader au support reseau."
    });
    await ingestDocument({
      tenantId,
      title: "ADF - Onboarding nouvel arrivant",
      sourceType: "procedure",
      content:
        "1. Creer compte AD.\n2. Activer Office 365.\n3. Attribuer poste HP + Windows 11.\n4. Ajouter acces SharePoint et Teams."
    });
    seeded.kb += 3;
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
  if (isAdf) {
    ingestSamples.push(
      {
        fromName: "adf-support",
        subject: "Acces SharePoint refuse",
        body: "Besoin d'acces au site Projets ADF.",
        category: "sharepoint",
        priority: "medium",
        source: "portal"
      },
      {
        fromName: "adf-it",
        subject: "Nouvel arrivant - Creation compte",
        body: "Compte AD + O365 pour nouvel arrivant.",
        category: "onboarding",
        priority: "high",
        source: "portal"
      }
    );
  }

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

  if (isAdf) {
    const quickIssuesSeeded = seedQuickIssues({
      tenantId,
      issues: [
        {
          key: "teams",
          label: "Teams ne s'ouvre pas",
          example: "Teams ne s'ouvre pas sur mon poste ADF."
        },
        {
          key: "sharepoint",
          label: "Acces SharePoint",
          example: "Je n'ai pas acces au site SharePoint ADF."
        },
        {
          key: "vpn",
          label: "VPN ne se connecte pas",
          example: "Le VPN ADF ne se connecte pas."
        },
        {
          key: "access",
          label: "Demande d'acces",
          example: "J'ai besoin d'acces a un dossier reseau."
        },
        {
          key: "account",
          label: "Creation de compte",
          example: "Creation d'un compte AD."
        },
        {
          key: "onboarding",
          label: "Nouvel arrivant",
          example: "Preparation poste HP + Windows 11."
        },
        {
          key: "return",
          label: "Retour poste informatique",
          example: "Retour d'un poste ADF."
        }
      ]
    });
    seeded.quick_issues += quickIssuesSeeded;
  }

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
