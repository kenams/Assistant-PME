// Smart Dispatch Engine — cœur du produit
const { completeJSON } = require("./ai-provider.service");
const { anonymize } = require("./pii.service");
const { getKnex } = require("./store.service");

// ─── DEFAULT DISPATCH RULES (fallback si pas de règles en DB) ─────────────────
const DEFAULT_RULES = [
  { keywords: ["mot de passe", "password", "mdp", "pwd", "login", "connexion", "oublié"], group: "N1", priority: "low", autoResolve: true, response: "Pour réinitialiser votre mot de passe, accédez au portail SSO ou contactez directement le support au poste 1234." },
  { keywords: ["compte verrouillé", "locked", "bloqué", "account locked"], group: "N1", priority: "medium", autoResolve: true, response: "Votre compte a été déverrouillé. Patientez 5 minutes puis réessayez. Si le problème persiste, contactez le N1." },
  { keywords: ["vpn", "forticlient", "fortinet", "cisco anyconnect", "pulse", "globalprotect"], group: "RESEAU", priority: "medium", autoResolve: false },
  { keywords: ["bigip", "f5", "proxy", "firewall", "pare-feu", "switch", "routeur", "vlan", "dns", "dhcp", "réseau", "network", "wifi", "connexion réseau"], group: "RESEAU", priority: "medium", autoResolve: false },
  { keywords: ["fog", "fogproject", "imagerie", "déploiement", "image poste", "reinstall", "réinstallation", "pxe"], group: "DEPLOY", priority: "high", autoResolve: false },
  { keywords: ["windows 11", "w11", "migration", "upgrade windows", "maj windows"], group: "DEPLOY", priority: "medium", autoResolve: false },
  { keywords: ["sap", "erp", "sage", "odoo", "dynamics", "business central", "logiciel métier", "application métier"], group: "METIER", priority: "high", autoResolve: false },
  { keywords: ["serveur", "server", "hyperv", "vmware", "esxi", "nas", "san", "stockage", "backup", "sauvegarde"], group: "INFRA", priority: "high", autoResolve: false },
  { keywords: ["phishing", "ransomware", "virus", "malware", "hameçonnage", "suspicious", "suspect", "intrusion", "sécurité"], group: "SECU", priority: "critical", autoResolve: false },
  { keywords: ["visio", "project", "nuance", "adobe", "autocad", "solidworks", "catia", "licence", "activation", "clé produit"], group: "LICENCES", priority: "medium", autoResolve: false },
  { keywords: ["imprimante", "printer", "impression", "scanner", "copier", "hp", "ricoh", "xerox", "kyocera"], group: "IMPRIMANTES", priority: "low", autoResolve: false },
  { keywords: ["vip", "direction", "directeur", "dg", "daf", "dsi", "cto", "ceo", "president"], group: "VIP", priority: "critical", autoResolve: false },
  { keywords: ["international", "overseas", "expatrié", "remote site", "site distant", "pays", "africa", "usa", "brazil", "maroc", "senegal", "mali"], group: "INTERNATIONAL", priority: "medium", autoResolve: false },
  { keywords: ["active directory", "ad", "ldap", "groupe", "gpo", "domaine", "compte ad", "profil ad"], group: "N2", priority: "medium", autoResolve: false },
  { keywords: ["office", "microsoft 365", "teams", "outlook", "excel", "word", "sharepoint", "onedrive", "o365"], group: "N1", priority: "low", autoResolve: false },
  { keywords: ["glpi", "ticket"], group: "N1", priority: "low", autoResolve: false },
];

const BACKLOG_GROUPS = [
  { code: "N1", label: "Support N1", description: "Incidents courants, MDP, Office" },
  { code: "N2", label: "Support N2", description: "Active Directory, infrastructure légère" },
  { code: "N3", label: "Expert N3", description: "Escalades complexes" },
  { code: "RESEAU", label: "Réseau", description: "VPN, Firewall, switch, DNS" },
  { code: "INFRA", label: "Infrastructure", description: "Serveurs, virtualisation, stockage" },
  { code: "SECU", label: "Sécurité", description: "Phishing, intrusions, malwares" },
  { code: "METIER", label: "Applicatif Métier", description: "SAP, ERP, logiciels métier" },
  { code: "DEPLOY", label: "Déploiement", description: "FOG, Windows 11, images" },
  { code: "LICENCES", label: "Licences", description: "Visio, Project, Adobe, CAO" },
  { code: "IMPRIMANTES", label: "Imprimantes", description: "Impression, scan, copieurs" },
  { code: "VIP", label: "VIP", description: "Directeurs, C-Level" },
  { code: "INTERNATIONAL", label: "International", description: "Sites distants, expatriés" },
];

function normalize(text) {
  return (text || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// ─── RULE-BASED MATCHING (fast, no AI) ────────────────────────────────────────
function matchRules(title, description, dbRules = []) {
  const text = normalize(`${title} ${description}`);
  const allRules = dbRules.length ? dbRules : DEFAULT_RULES;

  let best = null;
  let bestScore = 0;

  for (const rule of allRules) {
    const kws = Array.isArray(rule.keywords) ? rule.keywords : (rule.keywords || []);
    let hits = 0;
    for (const kw of kws) {
      if (text.includes(normalize(kw))) hits++;
    }
    if (hits > 0) {
      const score = (hits / kws.length) * 100;
      if (score > bestScore) {
        bestScore = score;
        best = { rule, score };
      }
    }
  }

  return best;
}

// ─── AI CLASSIFICATION ────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Tu es un moteur de classification de tickets IT pour une PME/DSI.
Tu dois analyser le ticket et retourner UNIQUEMENT un JSON valide (aucun texte autour).

Backlogs disponibles: N1, N2, N3, RESEAU, INFRA, SECU, METIER, DEPLOY, LICENCES, IMPRIMANTES, VIP, INTERNATIONAL

JSON attendu:
{
  "backlog_group": "CODE_BACKLOG",
  "priority": "low|medium|high|critical",
  "confidence": 0-100,
  "resolution_type": "auto|question|dispatch|escalate",
  "justification": "max 150 caractères",
  "suggested_response": "réponse si auto, null sinon",
  "clarification_question": "question si besoin, null sinon"
}

Règles:
- confidence < 60 → resolution_type = "question" ou "escalate"
- Phishing/sécurité → toujours "escalate", priority "critical"
- MDP simple → "auto", priority "low"
- VIP → priority "critical"
- Ne jamais inclure de PII dans la réponse
- Réponds UNIQUEMENT en JSON`;

async function classifyWithAI(title, description) {
  const anonTitle = anonymize(title || "");
  const anonDesc = anonymize(description || "");
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `Titre: ${anonTitle}\nDescription: ${anonDesc}` },
  ];
  const { data, provider, ms, parseError } = await completeJSON(messages, { maxTokens: 400 });
  return { data, provider, ms, parseError };
}

// ─── MAIN ANALYZE FUNCTION ────────────────────────────────────────────────────
async function analyzeTicket(ticket, tenantId) {
  const start = Date.now();
  const knex = getKnex();

  // 1. Load DB rules for this tenant
  let dbRules = [];
  try {
    const rows = await knex("dispatch_rules").where({ tenant_id: tenantId, active: true }).orderBy("sort_order");
    dbRules = rows.map((r) => ({
      keywords: r.keywords,
      group: r.backlog_group_code,
      priority: r.priority_override,
      autoResolve: r.can_auto_resolve,
      response: r.auto_resolve_response,
      confidenceThreshold: r.confidence_threshold,
    }));
  } catch {}

  // 2. Rule-based matching first (instant, no AI cost)
  const ruleMatch = matchRules(ticket.title, ticket.description, dbRules);

  let result = {
    backlog_group: "N1",
    priority: "medium",
    confidence: 0,
    resolution_type: "dispatch",
    justification: "Dispatch par défaut",
    suggested_response: null,
    clarification_question: null,
    ai_provider: "rule",
    pii_anonymized: true,
    processing_ms: 0,
  };

  if (ruleMatch && ruleMatch.score >= 80) {
    // High confidence rule match → no need for AI
    result = {
      backlog_group: ruleMatch.rule.group || ruleMatch.rule.backlog_group_code || "N1",
      priority: ruleMatch.rule.priority || ruleMatch.rule.priority_override || "medium",
      confidence: Math.min(Math.round(ruleMatch.score), 95),
      resolution_type: (ruleMatch.rule.autoResolve || ruleMatch.rule.can_auto_resolve) ? "auto" : "dispatch",
      justification: `Règle: ${(ruleMatch.rule.keywords || []).slice(0, 3).join(", ")}`,
      suggested_response: ruleMatch.rule.response || ruleMatch.rule.auto_resolve_response || null,
      clarification_question: null,
      ai_provider: "rule",
      pii_anonymized: true,
      processing_ms: Date.now() - start,
    };
  } else {
    // AI classification
    try {
      const { data, provider, ms } = await classifyWithAI(ticket.title, ticket.description);
      if (data && data.backlog_group) {
        result = {
          backlog_group: data.backlog_group || "N1",
          priority: data.priority || "medium",
          confidence: data.confidence || 70,
          resolution_type: data.resolution_type || "dispatch",
          justification: (data.justification || "").slice(0, 200),
          suggested_response: data.suggested_response || null,
          clarification_question: data.clarification_question || null,
          ai_provider: provider,
          pii_anonymized: true,
          processing_ms: ms,
        };
        // If rule also matched, boost confidence
        if (ruleMatch && ruleMatch.rule.group === result.backlog_group) {
          result.confidence = Math.min(result.confidence + 10, 99);
        }
      }
    } catch (err) {
      // Rule fallback if AI fails
      if (ruleMatch) {
        result.backlog_group = ruleMatch.rule.group || "N1";
        result.confidence = Math.round(ruleMatch.score * 0.7);
        result.ai_provider = "rule_fallback";
      }
    }
  }

  result.processing_ms = Date.now() - start;
  return result;
}

// ─── PERSIST ANALYSIS ─────────────────────────────────────────────────────────
async function saveAnalysis(ticketId, tenantId, analysis) {
  const knex = getKnex();
  const existing = await knex("ticket_analysis").where({ ticket_id: ticketId }).first();
  const payload = {
    ticket_id: ticketId,
    tenant_id: tenantId,
    backlog_group_code: analysis.backlog_group,
    priority_computed: analysis.priority,
    confidence_score: analysis.confidence,
    resolution_type: analysis.resolution_type,
    justification: analysis.justification,
    suggested_response: analysis.suggested_response,
    clarification_question: analysis.clarification_question,
    ai_provider: analysis.ai_provider,
    pii_anonymized: analysis.pii_anonymized,
    auto_resolved: analysis.resolution_type === "auto",
    processing_ms: analysis.processing_ms,
    analyzed_at: new Date(),
  };

  if (existing) {
    await knex("ticket_analysis").where({ ticket_id: ticketId }).update(payload);
  } else {
    await knex("ticket_analysis").insert({ id: require("crypto").randomUUID(), ...payload });
  }

  // Update ticket backlog_group
  await knex("tickets").where({ id: ticketId }).update({
    backlog_group_code: analysis.backlog_group,
    priority: analysis.priority === "critical" ? "high" : analysis.priority,
  });

  return payload;
}

// ─── DISPATCH TO BACKLOG ───────────────────────────────────────────────────────
async function dispatchTicket(ticketId, tenantId, backlockGroupCode) {
  const knex = getKnex();
  await knex("backlog_assignments").insert({
    id: require("crypto").randomUUID(),
    ticket_id: ticketId,
    tenant_id: tenantId,
    backlog_group_code: backlockGroupCode,
    assigned_by: "smart_dispatch",
    assigned_at: new Date(),
  });
}

// ─── FULL PIPELINE ────────────────────────────────────────────────────────────
async function processTicket(ticket, tenantId) {
  const analysis = await analyzeTicket(ticket, tenantId);
  await saveAnalysis(ticket.id, tenantId, analysis);
  await dispatchTicket(ticket.id, tenantId, analysis.backlog_group);
  return analysis;
}

// ─── SEED DEFAULT BACKLOG GROUPS ──────────────────────────────────────────────
async function seedBacklogGroups(tenantId) {
  const knex = getKnex();
  for (const g of BACKLOG_GROUPS) {
    const exists = await knex("backlog_groups").where({ tenant_id: tenantId, code: g.code }).first();
    if (!exists) {
      await knex("backlog_groups").insert({
        id: require("crypto").randomUUID(),
        tenant_id: tenantId,
        code: g.code,
        label: g.label,
        description: g.description,
      });
    }
  }
}

module.exports = {
  analyzeTicket,
  saveAnalysis,
  dispatchTicket,
  processTicket,
  seedBacklogGroups,
  matchRules,
  DEFAULT_RULES,
  BACKLOG_GROUPS,
};
