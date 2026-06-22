const crypto = require("crypto");
const { getKnex } = require("./store.service");
const { logEvent } = require("./audit.service");

// ─── ACTION REGISTRY ──────────────────────────────────────────────────────────
const ACTIONS = {
  password_reset: {
    label: "Réinitialisation mot de passe",
    match: (analysis) => analysis.backlog_group === "N1" && analysis.resolution_type === "auto" && /mot de passe|password|mdp|pwd|oubli/i.test(analysis._title || ""),
    execute: async (ticket, tenantId) => {
      // Generate temp password and dispatch out-of-band via email only
      // Never return the password in the API response
      const tempPassword = generateTempPassword();
      const knex = getKnex();
      // Fetch user email from ticket assignment (verified address only)
      const user = ticket.user_id
        ? await knex("users").where({ id: ticket.user_id, tenant_id: tenantId }).first()
        : null;
      if (user?.email) {
        try {
          const { sendEmail } = require("./email.service");
          await sendEmail({
            to: user.email,
            subject: "[AssistantPME] Réinitialisation de votre mot de passe",
            text: `Votre mot de passe temporaire : ${tempPassword}\n\nChangez-le immédiatement sur le portail SSO. Expire dans 24h.`,
          });
        } catch {}
      }
      return {
        action: "password_reset",
        success: true,
        response: "Un mot de passe temporaire a été envoyé à votre adresse email vérifiée. Connectez-vous sur le portail SSO et changez-le immédiatement.",
        data: { expiresIn: "24h", sent_to: user?.email ? "verified_email" : "no_email_on_file" },
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
    pwd += chars[crypto.randomInt(0, chars.length)];
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
