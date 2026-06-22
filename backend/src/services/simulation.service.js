// Simulateur industriel — génère 250/500/1000 tickets et évalue le Smart Dispatch
const { processTicket } = require("./smart-dispatch.service");
const { getKnex } = require("./store.service");

// ─── CORPUS DE TICKETS SIMULÉS ────────────────────────────────────────────────
const TICKET_CORPUS = [
  // N1 - Mot de passe
  { title: "Mot de passe oublié", description: "Je n'arrive plus à me connecter, j'ai oublié mon mot de passe.", expected_backlog: "N1", expected_priority: "low", expected_auto: true, lang: "fr" },
  { title: "Password reset needed", description: "I forgot my password and cannot login to my workstation.", expected_backlog: "N1", expected_priority: "low", expected_auto: true, lang: "en" },
  { title: "Compte verrouillé", description: "Mon compte Active Directory est verrouillé après plusieurs tentatives.", expected_backlog: "N1", expected_priority: "medium", expected_auto: true, lang: "fr" },

  // N1 - Office/O365
  { title: "Outlook ne s'ouvre plus", description: "Outlook refuse de démarrer depuis ce matin, message d'erreur 0x800CCC0E.", expected_backlog: "N1", expected_priority: "low", expected_auto: false, lang: "fr" },
  { title: "Teams crash au lancement", description: "Microsoft Teams se ferme immédiatement après ouverture.", expected_backlog: "N1", expected_priority: "low", expected_auto: false, lang: "fr" },
  { title: "Cannot access SharePoint", description: "Getting access denied when trying to open SharePoint documents.", expected_backlog: "N1", expected_priority: "low", expected_auto: false, lang: "en" },
  { title: "Excel freeze", description: "Excel freezes when opening large files with macros.", expected_backlog: "N1", expected_priority: "low", expected_auto: false, lang: "en" },

  // RESEAU - VPN
  { title: "VPN FortiClient ne se connecte pas", description: "Le VPN FortiClient ne parvient pas à s'authentifier, erreur tunnel.", expected_backlog: "RESEAU", expected_priority: "medium", expected_auto: false, lang: "fr" },
  { title: "VPN disconnecting frequently", description: "Cisco AnyConnect drops every 10 minutes when working from home.", expected_backlog: "RESEAU", expected_priority: "medium", expected_auto: false, lang: "en" },
  { title: "Pas d'accès réseau depuis le site de Lyon", description: "Les utilisateurs du site Lyon ne peuvent pas accéder aux serveurs applicatifs.", expected_backlog: "RESEAU", expected_priority: "high", expected_auto: false, lang: "fr" },
  { title: "BigIP problem", description: "F5 BigIP load balancer showing errors, several services down.", expected_backlog: "RESEAU", expected_priority: "high", expected_auto: false, lang: "en" },

  // INFRA - Serveurs
  { title: "Serveur de fichiers inaccessible", description: "Le serveur FS01 est inaccessible depuis 9h, tous les partages réseau sont down.", expected_backlog: "INFRA", expected_priority: "high", expected_auto: false, lang: "fr" },
  { title: "Backup failure on server", description: "Veeam backup job failed last night, no backup was created for 3 days.", expected_backlog: "INFRA", expected_priority: "high", expected_auto: false, lang: "en" },
  { title: "VMware ESXi host unresponsive", description: "ESXi host ESX-PROD-02 is not responding, multiple VMs affected.", expected_backlog: "INFRA", expected_priority: "high", expected_auto: false, lang: "en" },
  { title: "Espace disque serveur plein", description: "Le serveur SQL-PROD01 est à 98% de capacité disque, risque de panne.", expected_backlog: "INFRA", expected_priority: "high", expected_auto: false, lang: "fr" },

  // SECU - Sécurité
  { title: "Email de phishing reçu", description: "J'ai reçu un email suspect me demandant mes identifiants Microsoft.", expected_backlog: "SECU", expected_priority: "high", expected_auto: false, lang: "fr" },
  { title: "Ransomware attack suspected", description: "Files on network share are encrypted and renamed with strange extensions.", expected_backlog: "SECU", expected_priority: "critical", expected_auto: false, lang: "en" },
  { title: "Connexion suspecte sur mon compte", description: "J'ai reçu une alerte de connexion depuis un pays étranger.", expected_backlog: "SECU", expected_priority: "high", expected_auto: false, lang: "fr" },

  // METIER - SAP/ERP
  { title: "SAP ne démarre plus", description: "SAP GUI affiche une erreur de connexion au serveur d'application.", expected_backlog: "METIER", expected_priority: "high", expected_auto: false, lang: "fr" },
  { title: "ERP access error", description: "Cannot login to the ERP system, getting authentication error.", expected_backlog: "METIER", expected_priority: "high", expected_auto: false, lang: "en" },
  { title: "Module SAP FI bloqué", description: "Le module Finance de SAP est inaccessible pour toute l'équipe comptabilité.", expected_backlog: "METIER", expected_priority: "critical", expected_auto: false, lang: "fr" },

  // DEPLOY - FOG/Windows 11
  { title: "Déploiement FOG échoue", description: "L'image Windows 10 via FOG Project ne se déploie pas sur les nouveaux postes.", expected_backlog: "DEPLOY", expected_priority: "high", expected_auto: false, lang: "fr" },
  { title: "Windows 11 migration issue", description: "Workstation failed to upgrade to Windows 11, stuck at 35%.", expected_backlog: "DEPLOY", expected_priority: "medium", expected_auto: false, lang: "en" },
  { title: "PXE boot not working", description: "New workstation cannot boot from network for FOG imaging.", expected_backlog: "DEPLOY", expected_priority: "medium", expected_auto: false, lang: "en" },

  // LICENCES
  { title: "Licence Visio expirée", description: "Microsoft Visio affiche un message de licence expirée.", expected_backlog: "LICENCES", expected_priority: "medium", expected_auto: false, lang: "fr" },
  { title: "AutoCAD activation needed", description: "AutoCAD 2024 requires activation, license key not working.", expected_backlog: "LICENCES", expected_priority: "medium", expected_auto: false, lang: "en" },
  { title: "Adobe Acrobat Pro manquant", description: "Nuance PDF Creator n'est pas installé sur mon nouveau poste.", expected_backlog: "LICENCES", expected_priority: "low", expected_auto: false, lang: "fr" },

  // IMPRIMANTES
  { title: "Imprimante hors ligne", description: "L'imprimante HP du bureau 3ème étage est hors ligne, personne ne peut imprimer.", expected_backlog: "IMPRIMANTES", expected_priority: "low", expected_auto: false, lang: "fr" },
  { title: "Scanner not working", description: "The Ricoh scanner in the lobby is not scanning to email.", expected_backlog: "IMPRIMANTES", expected_priority: "low", expected_auto: false, lang: "en" },
  { title: "Bourrage papier récurrent", description: "Le copieur Kyocera fait des bourrages toutes les 5 impressions.", expected_backlog: "IMPRIMANTES", expected_priority: "low", expected_auto: false, lang: "fr" },

  // N2 - Active Directory
  { title: "Droits AD à modifier", description: "Un utilisateur a besoin d'être ajouté au groupe GPO-Finance-Read.", expected_backlog: "N2", expected_priority: "medium", expected_auto: false, lang: "fr" },
  { title: "Group Policy not applying", description: "GPO is not applying on new workstations joined to the domain.", expected_backlog: "N2", expected_priority: "medium", expected_auto: false, lang: "en" },

  // VIP
  { title: "Problème urgent - Directeur Général", description: "Le DG ne peut pas accéder à ses emails depuis son déplacement à New York.", expected_backlog: "VIP", expected_priority: "critical", expected_auto: false, lang: "fr" },

  // INTERNATIONAL
  { title: "Problème réseau site Maroc", description: "Les utilisateurs du site de Casablanca n'ont pas accès aux applications depuis hier.", expected_backlog: "INTERNATIONAL", expected_priority: "high", expected_auto: false, lang: "fr" },
  { title: "Senegal office connectivity", description: "Dakar office lost connectivity to headquarters, all remote workers affected.", expected_backlog: "INTERNATIONAL", expected_priority: "high", expected_auto: false, lang: "en" },
];

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateTickets(count) {
  const tickets = [];
  const shuffled = shuffleArray(TICKET_CORPUS);
  for (let i = 0; i < count; i++) {
    const base = shuffled[i % shuffled.length];
    tickets.push({
      id: require("crypto").randomUUID(),
      title: `${base.title}${i >= shuffled.length ? ` (${Math.floor(i / shuffled.length) + 1})` : ""}`,
      description: base.description,
      language: base.lang,
      expected_backlog: base.expected_backlog,
      expected_priority: base.expected_priority,
      expected_auto_resolve: base.expected_auto,
    });
  }
  return tickets;
}

async function runSimulation(simulationId, tenantId) {
  const knex = getKnex();
  const sim = await knex("simulations").where({ id: simulationId }).first();
  if (!sim) throw new Error("Simulation not found");

  await knex("simulations").where({ id: simulationId }).update({ status: "running" });

  const tickets = generateTickets(sim.ticket_count);
  let classificationCorrect = 0;
  let dispatchCorrect = 0;
  let autoResolveCorrect = 0;
  let total = tickets.length;

  const rows = [];

  for (const ticket of tickets) {
    let actual_backlog = "N1";
    let actual_priority = "medium";
    let actual_auto_resolve = false;
    let confidence = 0;
    let classOk = false;
    let dispOk = false;

    try {
      const fakeTicket = { id: ticket.id, title: ticket.title, description: ticket.description };
      const analysis = await analyzeTicketOnly(fakeTicket, tenantId);
      actual_backlog = analysis.backlog_group || "N1";
      actual_priority = analysis.priority || "medium";
      actual_auto_resolve = analysis.resolution_type === "auto";
      confidence = analysis.confidence || 0;
    } catch {}

    classOk = actual_backlog === ticket.expected_backlog;
    dispOk = classOk;
    if (classOk) classificationCorrect++;
    if (dispOk) dispatchCorrect++;
    if (actual_auto_resolve === ticket.expected_auto_resolve) autoResolveCorrect++;

    rows.push({
      id: require("crypto").randomUUID(),
      simulation_id: simulationId,
      title: ticket.title,
      description: ticket.description.slice(0, 300),
      language: ticket.language,
      expected_backlog: ticket.expected_backlog,
      expected_priority: ticket.expected_priority,
      expected_auto_resolve: ticket.expected_auto_resolve,
      actual_backlog,
      actual_priority,
      actual_auto_resolve,
      confidence_score: confidence,
      classification_correct: classOk,
      dispatch_correct: dispOk,
    });
  }

  // Batch insert
  for (let i = 0; i < rows.length; i += 50) {
    await knex("simulation_tickets").insert(rows.slice(i, i + 50));
  }

  const scoreClassification = (classificationCorrect / total) * 100;
  const scoreDispatch = (dispatchCorrect / total) * 100;
  const scoreAutoResolve = (autoResolveCorrect / total) * 100;
  const scoreGlobal = (scoreClassification * 0.4 + scoreDispatch * 0.4 + scoreAutoResolve * 0.2);

  await knex("simulations").where({ id: simulationId }).update({
    status: "completed",
    score_classification: Math.round(scoreClassification * 10) / 10,
    score_dispatch: Math.round(scoreDispatch * 10) / 10,
    score_auto_resolve: Math.round(scoreAutoResolve * 10) / 10,
    score_global: Math.round(scoreGlobal * 10) / 10,
    summary: JSON.stringify({
      total,
      classification_correct: classificationCorrect,
      dispatch_correct: dispatchCorrect,
      auto_resolve_correct: autoResolveCorrect,
    }),
    completed_at: new Date(),
  });

  return { scoreClassification, scoreDispatch, scoreAutoResolve, scoreGlobal, total };
}

async function analyzeTicketOnly(ticket, tenantId) {
  const { analyzeTicket } = require("./smart-dispatch.service");
  return analyzeTicket(ticket, tenantId);
}

module.exports = { generateTickets, runSimulation, TICKET_CORPUS };
