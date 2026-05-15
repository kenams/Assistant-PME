const { env } = require("../config/env");

let nodemailer = null;
let transporter = null;

function isConfigured() {
  return Boolean(env.smtpHost && env.smtpUser && env.smtpPass);
}

function getTransporter() {
  if (!isConfigured()) return null;
  if (transporter) return transporter;
  if (!nodemailer) {
    nodemailer = require("nodemailer");
  }
  transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass
    }
  });
  return transporter;
}

async function sendEmail({ to, subject, html, text }) {
  const transport = getTransporter();
  if (!transport) {
    console.log(`[email] SMTP non configuré — email non envoyé: ${subject} → ${Array.isArray(to) ? to.join(", ") : to}`);
    return null;
  }
  const recipients = Array.isArray(to) ? to.join(", ") : to;
  const result = await transport.sendMail({
    from: env.smtpFrom || env.smtpUser,
    to: recipients,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  });
  return result;
}

function getNotifyEmails() {
  return (env.notifyEmails || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

function priorityLabel(priority) {
  const map = { low: "Faible", medium: "Moyen", high: "Élevé", critical: "Critique" };
  return map[priority] || priority || "—";
}

function priorityColor(priority) {
  const map = { low: "#22c55e", medium: "#f59e0b", high: "#f97316", critical: "#ef4444" };
  return map[priority] || "#6b7280";
}

async function notifyTicketCreated({ ticket, context }) {
  const recipients = getNotifyEmails();
  if (!recipients.length) return null;

  const color = priorityColor(ticket.priority);
  const label = priorityLabel(ticket.priority);
  const createdAt = ticket.created_at
    ? new Date(ticket.created_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })
    : "—";
  const baseUrl = env.appUrl || "http://localhost:3001";
  const ticketUrl = `${baseUrl}/app/admin`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Nouveau ticket IT</title></head>
<body style="font-family:Arial,sans-serif;background:#f3f4f6;margin:0;padding:24px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <div style="background:#1e40af;padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:20px;">Nouveau ticket support IT</h1>
    </div>
    <div style="padding:32px;">
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="padding:8px 0;color:#6b7280;width:140px;">Ticket</td>
          <td style="padding:8px 0;font-weight:600;">#${ticket.id ? ticket.id.slice(0, 8) : "—"}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;">Titre</td>
          <td style="padding:8px 0;font-weight:600;">${escapeHtml(ticket.title || "Sans titre")}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;">Priorité</td>
          <td style="padding:8px 0;">
            <span style="background:${color};color:#fff;padding:2px 10px;border-radius:12px;font-size:13px;">${label}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;">Catégorie</td>
          <td style="padding:8px 0;">${escapeHtml(ticket.category || "—")}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;">Statut</td>
          <td style="padding:8px 0;">${escapeHtml(ticket.status || "open")}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;">Créé le</td>
          <td style="padding:8px 0;">${createdAt}</td>
        </tr>
        ${context ? `<tr>
          <td style="padding:8px 0;color:#6b7280;">Contexte</td>
          <td style="padding:8px 0;">${escapeHtml(String(context).slice(0, 300))}</td>
        </tr>` : ""}
      </table>
      ${ticket.summary ? `<div style="background:#f9fafb;border-left:4px solid #1e40af;padding:16px;border-radius:0 4px 4px 0;margin-bottom:24px;">
        <p style="margin:0;color:#374151;font-size:14px;">${escapeHtml(ticket.summary)}</p>
      </div>` : ""}
      <a href="${ticketUrl}" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Voir le ticket</a>
    </div>
    <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">Assistant IA Support Informatique — notification automatique</p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail({
    to: recipients,
    subject: `[Support IT] Nouveau ticket : ${ticket.title || "Sans titre"}`,
    html
  });
}

async function notifySlaBreach({ ticket, ageHours, slaHours }) {
  const recipients = getNotifyEmails();
  if (!recipients.length) return null;

  const color = priorityColor(ticket.priority);
  const label = priorityLabel(ticket.priority);
  const overHours = Math.round((ageHours - slaHours) * 10) / 10;
  const baseUrl = env.appUrl || "http://localhost:3001";
  const ticketUrl = `${baseUrl}/app/admin`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Alerte SLA dépassé</title></head>
<body style="font-family:Arial,sans-serif;background:#f3f4f6;margin:0;padding:24px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <div style="background:#dc2626;padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:20px;">Alerte SLA — Ticket en retard</h1>
    </div>
    <div style="padding:32px;">
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:16px;margin-bottom:24px;">
        <p style="margin:0;color:#991b1b;font-weight:600;">Ce ticket dépasse le délai SLA de ${slaHours}h. Âge actuel : ${Math.round(ageHours * 10) / 10}h (+${overHours}h de retard)</p>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr>
          <td style="padding:8px 0;color:#6b7280;width:140px;">Ticket</td>
          <td style="padding:8px 0;font-weight:600;">#${ticket.id ? ticket.id.slice(0, 8) : "—"}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;">Titre</td>
          <td style="padding:8px 0;font-weight:600;">${escapeHtml(ticket.title || "Sans titre")}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;">Priorité</td>
          <td style="padding:8px 0;">
            <span style="background:${color};color:#fff;padding:2px 10px;border-radius:12px;font-size:13px;">${label}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;">Statut</td>
          <td style="padding:8px 0;">${escapeHtml(ticket.status || "open")}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;">SLA max</td>
          <td style="padding:8px 0;">${slaHours}h</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;">Âge actuel</td>
          <td style="padding:8px 0;color:#dc2626;font-weight:600;">${Math.round(ageHours * 10) / 10}h</td>
        </tr>
      </table>
      <a href="${ticketUrl}" style="display:inline-block;background:#dc2626;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">Traiter le ticket</a>
    </div>
    <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">Assistant IA Support Informatique — alerte automatique SLA</p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail({
    to: recipients,
    subject: `[SLA DÉPASSÉ] Ticket : ${ticket.title || "Sans titre"} (+${overHours}h)`,
    html
  });
}

function escapeHtml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

module.exports = {
  sendEmail,
  notifyTicketCreated,
  notifySlaBreach,
  isConfigured
};
