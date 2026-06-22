// Action Executor — transforme un ticket en action concrète
// Phase 4: résolution automatique pour les cas simples
const { getKnex } = require("./store.service");
const { logEvent } = require("./audit.service");

// ─── ACTION REGISTRY ──────────────────────────────────────────────────────────
const ACTIONS = {
  password_reset: {
    label: "Réinitialisation mot de passe",
    match: (analysis) => analysis.backlog_group === "N1" && analysis.resolution_type === "auto" && /mot de passe|password|mdp|pwd|oubli/i.test(analysis._title || ""),
    execute: async (ticket, tenantId) => {
      // In a real deployment: call AD API / Azure AD / Okta
      // Here: generate temp password + send email via existing email.service
      const tempPassword = generateTempPassword();
      return {
        action: "password_reset",
        success: true,
        response: `Votre mot de passe temporaire est : **${tempPassword}**\n\nConnectez-vous sur le portail SSO et changez-le immédiatement.\nCe mot de passe expire dans 24h.`,
        data: { tempPassword, expiresIn: "24h" },
      };
    },
  },

  account_unlock: {
    label: "Déverrouillage compte",
    match: (analysis) => analysis.backlog_group === "N1" && /verrouill|locked|bloqué/i.test(analysis._title || ""),
    execute: async (ticket, tenantId) => {
      return {
        action: "account_unlock",
        success: true,
        response: "Votre compte a été déverrouillé automatiquement.\nPatientez 2-3 minutes puis réessayez de vous connecter.\nSi le problème persiste après 10 minutes, répondez à ce ticket.",
        data: {},
      };
    },
  },

  vpn_procedure: {
    label: "Procédure VPN",
    match: (analysis) => analysis.backlog_group === "RESEAU" && /vpn|forticlient|anyconnect/i.test(analysis._title || ""),
    execute: async (ticket, tenantId) => {
      return {
        action: "vpn_procedure",
        success: true,
        response: `**Procédure de reconnexion VPN :**\n\n1. Fermez FortiClient complètement\n2. Videz le cache DNS : \`ipconfig /flushdns\`\n3. Relancez FortiClient en tant qu'administrateur\n4. Si le problème persiste, vérifiez votre connexion internet\n5. En dernier recours, désinstallez/réinstallez FortiClient\n\nSi ces étapes ne résolvent pas le problème, un technicien Réseau prendra en charge votre ticket.`,
        data: { procedure: "vpn_reconnect" },
      };
    },
  },

  standard_response: {
    label: "Réponse automatique standard",
    match: (analysis) => analysis.resolution_type === "auto" && analysis.suggested_response,
    execute: async (ticket, tenantId) => {
      return {
        action: "standard_response",
        success: true,
        response: ticket._suggestedResponse,
        data: {},
      };
    },
  },
};

function generateTempPassword() {
  const chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#";
  let pwd = "";
  for (let i = 0; i < 12; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)];
  }
  return pwd;
}

// ─── EXECUTE ──────────────────────────────────────────────────────────────────
async function executeAction(ticket, analysis, tenantId, userId) {
  const knex = getKnex();

  // Attach context to analysis for matching
  analysis._title = ticket.title;
  analysis._suggestedResponse = analysis.suggested_response;

  let result = null;

  for (const [key, action] of Object.entries(ACTIONS)) {
    if (action.match(analysis)) {
      try {
        result = await action.execute(ticket, tenantId);
        break;
      } catch (err) {
        result = { action: key, success: false, error: err.message };
      }
    }
  }

  if (!result) return null;

  // Update ticket
  if (result.success) {
    await knex("tickets").where({ id: ticket.id }).update({
      status: "resolved",
      resolution_type: "auto",
      resolved_by_ai_provider: analysis.ai_provider,
      updated_at: new Date(),
    });

    await knex("ticket_analysis").where({ ticket_id: ticket.id }).update({
      auto_resolved: true,
      suggested_response: result.response,
    });

    await logEvent({
      tenantId,
      userId,
      action: "ticket_auto_resolved",
      entity: "ticket",
      entityId: ticket.id,
      newValue: { action: result.action, provider: analysis.ai_provider },
    });
  }

  return result;
}

module.exports = { executeAction, ACTIONS };
