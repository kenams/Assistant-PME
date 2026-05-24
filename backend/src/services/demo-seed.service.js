const crypto = require("crypto");
const { db } = require("../config/db");

const DEMO_TICKETS = [
  {
    title: "Impossible de se connecter au VPN",
    description: "Depuis ce matin, impossible de se connecter au VPN de l'entreprise. Le message d'erreur indique \"auth failed\". J'ai réinitialisé mon mot de passe mais rien n'y fait.",
    category: "network",
    priority: "high",
    status: "open"
  },
  {
    title: "Outlook ne synchronise plus les emails",
    description: "Outlook 365 ne reçoit plus de nouveaux emails depuis hier matin. La boîte s'actualise manuellement mais rien n'arrive. J'attends des devis importants.",
    category: "email",
    priority: "medium",
    status: "open"
  },
  {
    title: "Imprimante partagée HP hors ligne",
    description: "L'imprimante HP LaserJet du bureau 3 apparaît hors ligne sur tous les postes. Elle était fonctionnelle vendredi dernier. Le voyant clignote en orange.",
    category: "hardware",
    priority: "low",
    status: "open"
  },
  {
    title: "Excel plante à l'ouverture de gros fichiers",
    description: "Excel 365 se ferme inopinément quand j'ouvre un fichier de plus de 15 Mo. Cela arrive systématiquement depuis la mise à jour de vendredi dernier.",
    category: "software",
    priority: "medium",
    status: "resolved"
  },
  {
    title: "Demande d'accès SharePoint projet Beta",
    description: "J'ai besoin d'accéder au SharePoint du projet Beta pour collaborer avec l'équipe marketing. Mon manager a validé la demande par email ce matin.",
    category: "access",
    priority: "low",
    status: "open"
  }
];

async function seedDemoTickets(tenantId, userId) {
  try {
    const row = await db("tickets").where({ tenant_id: tenantId }).count("id as c").first();
    if (Number(row.c) > 0) return;

    const now = Date.now();
    for (const tpl of DEMO_TICKETS) {
      const daysAgo = Math.floor(Math.random() * 6) + 1;
      const createdAt = new Date(now - daysAgo * 86400000).toISOString();
      await db("tickets").insert({
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        conversation_id: null,
        user_id: userId,
        external_id: null,
        external_url: null,
        title: tpl.title,
        description: tpl.description,
        category: tpl.category,
        priority: tpl.priority,
        status: tpl.status,
        created_at: createdAt,
        updated_at: createdAt
      });
    }
  } catch (_) {}
}

module.exports = { seedDemoTickets };
