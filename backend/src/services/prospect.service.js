const { sendEmail } = require("./email.service");
const { createLead, updateLead } = require("./leads.service");
const { db } = require("../config/db");

function escapeHtml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildGlpiEmailHtml({ name, company, personalNote }) {
  const safeName = escapeHtml(name || "");
  const safeCompany = escapeHtml(company || "votre organisation");
  const safeNote = personalNote ? escapeHtml(personalNote) : null;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Votre GLPI + IA</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

    <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 40px;">
      <div style="display:inline-flex;align-items:center;gap:12px;">
        <div style="width:36px;height:36px;background:rgba(255,255,255,0.2);border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-size:18px;">🤖</div>
        <span style="color:rgba(255,255,255,0.9);font-size:14px;font-weight:600;">Assistant IT — KAH Digital</span>
      </div>
    </div>

    <div style="padding:36px 40px;">
      <p style="color:#111827;font-size:16px;margin:0 0 20px;">Bonjour ${safeName},</p>

      ${safeNote ? `<p style="color:#374151;font-size:14px;margin:0 0 20px;padding:14px 16px;background:#f9fafb;border-left:3px solid #6366f1;border-radius:0 6px 6px 0;">${safeNote}</p>` : ""}

      <p style="color:#374151;font-size:15px;margin:0 0 16px;line-height:1.6;">
        Si vous gérez GLPI pour <strong>${safeCompany}</strong>, vous savez que le niveau 1 prend la majorité du temps de vos techniciens — réinitialisation de mots de passe, problèmes VPN, imprimantes, accès logiciels.
      </p>

      <p style="color:#374151;font-size:15px;margin:0 0 24px;line-height:1.6;">
        Notre assistant IA se connecte directement à votre GLPI en 5 minutes et prend en charge ces demandes 24h/24 : il répond à l'utilisateur, et si besoin, crée automatiquement le ticket dans GLPI avec la bonne priorité, catégorie et description.
      </p>

      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px 24px;margin-bottom:28px;">
        <p style="color:#6b7280;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 14px;">Résultats constatés sur nos clients PME</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="text-align:center;padding:4px;">
              <div style="font-size:24px;font-weight:900;color:#6366f1;letter-spacing:-0.04em;">70%</div>
              <div style="font-size:11px;color:#6b7280;margin-top:2px;">tickets résolus sans technicien</div>
            </td>
            <td style="text-align:center;padding:4px;">
              <div style="font-size:24px;font-weight:900;color:#6366f1;letter-spacing:-0.04em;">8 min</div>
              <div style="font-size:11px;color:#6b7280;margin-top:2px;">économisées par ticket</div>
            </td>
            <td style="text-align:center;padding:4px;">
              <div style="font-size:24px;font-weight:900;color:#6366f1;letter-spacing:-0.04em;">&lt;1 mois</div>
              <div style="font-size:11px;color:#6b7280;margin-top:2px;">pour atteindre le ROI</div>
            </td>
          </tr>
        </table>
      </div>

      <div style="text-align:center;margin-bottom:28px;">
        <a href="https://kah-support.ch/app/glpi"
           style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;box-shadow:0 4px 16px rgba(99,102,241,0.3);">
          Tester avec votre GLPI →
        </a>
      </div>

      <p style="color:#6b7280;font-size:13px;margin:0;line-height:1.6;">
        Compatible GLPI 9.5.x et 10.x — on-premise et cloud. Aucun plugin à installer.
      </p>
    </div>

    <div style="padding:20px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;">
      <p style="color:#6b7280;font-size:13px;margin:0;line-height:1.6;">
        <strong>PS :</strong> Si vous voulez voir comment ça fonctionne sur un GLPI réel, je peux vous faire une démo en 10 minutes, sans engagement. Répondez simplement à cet email.
      </p>
    </div>

    <div style="padding:16px 40px;text-align:center;">
      <p style="color:#9ca3af;font-size:11px;margin:0;">
        KAH Digital — Assistant IA Support Informatique<br />
        <a href="https://kah-support.ch" style="color:#9ca3af;">kah-support.ch</a> ·
        <a href="https://kah-support.ch/app/glpi" style="color:#9ca3af;">Page GLPI</a>
      </p>
    </div>

  </div>
</body>
</html>`;
}

async function sendGlpiProspectEmail({ to, name, company, personalNote }) {
  if (!to || !name) {
    throw new Error("sendGlpiProspectEmail: to et name sont requis");
  }
  const subject = "Votre GLPI + IA : 70% de tickets en moins dès la semaine prochaine";
  const html = buildGlpiEmailHtml({ name, company, personalNote });
  return sendEmail({ to, subject, html, replyTo: "kahdigital42@gmail.com" });
}

async function getProspectStats() {
  const rows = await db("leads").where({ message: "glpi_prospect" }).select("status");
  const sent = rows.length;
  const replied = rows.filter(r => r.status === "demo" || r.status === "proposal" || r.status === "won").length;
  const pending = rows.filter(r => r.status === "contacted" || r.status === "new").length;
  return { sent, pending, replied };
}

module.exports = { sendGlpiProspectEmail, getProspectStats, buildGlpiEmailHtml };
