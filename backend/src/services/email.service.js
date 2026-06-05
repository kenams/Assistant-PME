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

async function sendEmail({ to, subject, html, text, replyTo }) {
  const transport = getTransporter();
  if (!transport) {
    console.log(`[email] SMTP non configuré — email non envoyé: ${subject} → ${Array.isArray(to) ? to.join(", ") : to}`);
    return null;
  }
  const recipients = Array.isArray(to) ? to.join(", ") : to;
  const result = await transport.sendMail({
    from: env.smtpFrom || env.smtpUser,
    to: recipients,
    replyTo: replyTo || undefined,
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
    html,
    replyTo: "kahdigital42@gmail.com"
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
    html,
    replyTo: "kahdigital42@gmail.com"
  });
}

async function sendWelcomeEmail({ email, tempPassword, tenantName, loginUrl }) {
  const appUrl = env.appUrl || "http://localhost:3001";
  const url = loginUrl || `${appUrl}/app/login/`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Bienvenue sur Assistant IT</title></head>
<body style="font-family:Arial,sans-serif;background:#f3f4f6;margin:0;padding:24px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <div style="background:#6366f1;padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:22px;">Bienvenue sur Assistant IT !</h1>
      <p style="color:rgba(255,255,255,.8);margin:8px 0 0;font-size:14px;">Votre compte est prêt.</p>
    </div>
    <div style="padding:32px;">
      <p style="color:#374151;margin:0 0 24px;">Bonjour,</p>
      <p style="color:#374151;margin:0 0 24px;">Votre abonnement a bien été activé. Voici vos identifiants de connexion :</p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;color:#6b7280;width:120px;font-size:14px;">Org.</td>
            <td style="padding:8px 0;font-weight:600;font-size:14px;">${escapeHtml(tenantName || email)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:14px;">Email</td>
            <td style="padding:8px 0;font-weight:600;font-family:monospace;font-size:14px;">${escapeHtml(email)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#6b7280;font-size:14px;">Mot de passe</td>
            <td style="padding:8px 0;font-weight:600;font-family:monospace;font-size:14px;">${escapeHtml(tempPassword)}</td>
          </tr>
        </table>
      </div>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:12px 16px;margin-bottom:24px;">
        <p style="margin:0;color:#92400e;font-size:13px;"><strong>Important :</strong> Changez votre mot de passe dès la première connexion.</p>
      </div>
      <a href="${url}" style="display:inline-block;background:#6366f1;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Accéder à l'application →</a>
    </div>
    <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">Assistant IA Support Informatique — paiement confirmé</p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail({
    to: email,
    subject: "Bienvenue sur Assistant IT — vos identifiants de connexion",
    html,
    replyTo: "kahdigital42@gmail.com"
  });
}

async function sendInviteEmail({ email, inviteUrl, inviterEmail, tenantName, role }) {
  const appUrl = env.appUrl || "http://localhost:3001";
  const fullUrl = inviteUrl.startsWith("http") ? inviteUrl : `${appUrl}${inviteUrl}`;
  const roleLabel = { admin: "Administrateur", agent: "Agent support", user: "Utilisateur" }[role] || role || "Utilisateur";

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Invitation — Assistant IT</title></head>
<body style="font-family:Arial,sans-serif;background:#f3f4f6;margin:0;padding:24px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <div style="background:#1e40af;padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:20px;">Invitation à rejoindre Assistant IT</h1>
    </div>
    <div style="padding:32px;">
      <p style="color:#374151;margin:0 0 16px;">Bonjour,</p>
      <p style="color:#374151;margin:0 0 24px;">
        ${inviterEmail ? `<strong>${escapeHtml(inviterEmail)}</strong> vous invite à rejoindre l'espace <strong>${escapeHtml(tenantName || "")}</strong> en tant que <strong>${escapeHtml(roleLabel)}</strong>.` : `Vous avez été invité à rejoindre <strong>${escapeHtml(tenantName || "l'application")}</strong> en tant que <strong>${escapeHtml(roleLabel)}</strong>.`}
      </p>
      <p style="color:#374151;margin:0 0 24px;">Cliquez sur le bouton ci-dessous pour créer votre compte. Ce lien est valable 72 heures.</p>
      <a href="${fullUrl}" style="display:inline-block;background:#1e40af;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Accepter l'invitation →</a>
      <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;word-break:break-all;">Ou copiez ce lien : ${fullUrl}</p>
    </div>
    <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">Assistant IA Support Informatique — invitation automatique</p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail({
    to: email,
    subject: `Invitation à rejoindre ${tenantName || "Assistant IT"}`,
    html,
    replyTo: "kahdigital42@gmail.com"
  });
}

async function sendPasswordResetEmail({ email, resetUrl }) {
  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Réinitialisation du mot de passe</title></head>
<body style="font-family:Arial,sans-serif;background:#f3f4f6;margin:0;padding:24px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <div style="background:#374151;padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:20px;">Réinitialisation du mot de passe</h1>
    </div>
    <div style="padding:32px;">
      <p style="color:#374151;margin:0 0 16px;">Bonjour,</p>
      <p style="color:#374151;margin:0 0 24px;">Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe. Ce lien est valable <strong>1 heure</strong>.</p>
      <a href="${resetUrl}" style="display:inline-block;background:#374151;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Réinitialiser mon mot de passe →</a>
      <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;">Si vous n'avez pas fait cette demande, ignorez cet email. Votre mot de passe ne sera pas modifié.</p>
      <p style="margin:8px 0 0;color:#9ca3af;font-size:12px;word-break:break-all;">Lien : ${resetUrl}</p>
    </div>
    <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">Assistant IA Support Informatique — sécurité compte</p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail({
    to: email,
    subject: "Réinitialisation de votre mot de passe — Assistant IT",
    html,
    replyTo: "kahdigital42@gmail.com"
  });
}

async function sendGlpiProspectEmail({ to, name, company, personalNote }) {
  const firstName = (name || "").split(" ")[0] || "Bonjour";
  const companyStr = company ? ` pour ${escapeHtml(company)}` : "";
  const noteBlock = personalNote
    ? `<p style="color:#374151;margin:0 0 16px;font-style:italic;">${escapeHtml(personalNote)}</p>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>GLPI + IA</title></head>
<body style="font-family:Arial,sans-serif;background:#f3f4f6;margin:0;padding:24px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
    <div style="background:#1e1b4b;padding:24px 32px;display:flex;align-items:center;gap:12px;">
      <div style="font-size:28px;">🤖</div>
      <div>
        <h1 style="color:#fff;margin:0;font-size:18px;">Assistant IA pour GLPI</h1>
        <p style="color:rgba(255,255,255,.6);margin:0;font-size:13px;">KAH Digital — kah-support.ch</p>
      </div>
    </div>
    <div style="padding:32px;">
      <p style="color:#374151;margin:0 0 16px;">Bonjour ${escapeHtml(firstName)},</p>
      ${noteBlock}
      <p style="color:#374151;margin:0 0 16px;">
        Si vous gérez GLPI${companyStr}, vous savez que le support niveau 1 mobilise une bonne partie de votre équipe pour des problèmes répétitifs : VPN, impressions, mots de passe, accès…
      </p>
      <p style="color:#374151;margin:0 0 16px;">
        Nous avons construit un assistant IA qui se connecte directement à votre GLPI :
      </p>
      <ul style="color:#374151;margin:0 0 20px;padding-left:20px;line-height:1.8;">
        <li>Répond aux demandes utilisateurs <strong>24h/24</strong>, même le week-end</li>
        <li>Crée les tickets dans GLPI avec catégorie, priorité et description complète</li>
        <li>Indexe votre base de connaissances pour accélérer les réponses</li>
        <li>Escalade vers vos techniciens uniquement si nécessaire</li>
      </ul>
      <div style="background:#f0f0ff;border:1px solid #c7d2fe;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0;color:#3730a3;font-weight:600;font-size:14px;">
          Résultat moyen chez nos clients : <strong>70% des tickets N1 résolus sans technicien</strong>, 8 minutes économisées par ticket.
        </p>
      </div>
      <p style="color:#374151;margin:0 0 24px;">
        Connexion en 5 minutes (URL GLPI + App Token + User Token). Aucune installation serveur.
      </p>
      <a href="https://kah-support.ch/glpi" style="display:inline-block;background:#6366f1;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Voir l'intégration GLPI →</a>
      <p style="margin:20px 0 0;color:#6b7280;font-size:13px;">
        <strong>P.S.</strong> — Une démo de 10 minutes avec votre propre GLPI est possible. Répondez simplement à cet email.
      </p>
    </div>
    <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;color:#9ca3af;font-size:11px;">
        KAH Digital · kah-support.ch ·
        <a href="https://kah-support.ch/unsubscribe" style="color:#9ca3af;">Se désabonner</a>
      </p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail({
    to,
    subject: `Votre GLPI + IA : 70% de tickets N1 en moins${company ? ` — pour ${company}` : ""}`,
    html,
    replyTo: "kahdigital42@gmail.com"
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

// ── SÉQUENCE ONBOARDING ────────────────────────────────────────────────────────
const ACCENT = "#6366f1";
const DARK = "#0f1117";

function onboardingWrap(content) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><style>
    body{margin:0;padding:0;background:#f4f4f8;font-family:Inter,Arial,sans-serif}
    .wrap{max-width:580px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden}
    .header{background:${DARK};padding:28px 36px;text-align:center}
    .logo{color:${ACCENT};font-size:20px;font-weight:800;letter-spacing:0.08em}
    .body{padding:36px}
    h1{font-size:24px;font-weight:800;color:${DARK};margin:0 0 12px;line-height:1.25}
    p{font-size:15px;line-height:1.7;color:#444;margin:0 0 14px}
    .btn{display:inline-block;background:${ACCENT};color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-size:14px;font-weight:700;margin:8px 0}
    .tip{background:#f7f7fd;border-left:3px solid ${ACCENT};border-radius:0 8px 8px 0;padding:14px 16px;margin:18px 0;font-size:14px;color:#333}
    .footer{padding:20px 36px;background:#f9f9f9;font-size:12px;color:#999;text-align:center}
  </style></head><body><div style="padding:20px">
  <div class="wrap">
    <div class="header"><div class="logo">KAH Support</div></div>
    ${content}
    <div class="footer">KAH Digital · kah-support.ch · Se désabonner</div>
  </div></div></body></html>`;
}

async function sendOnboardingJ0({ email, tenantName, loginUrl }) {
  await sendEmail({
    to: email,
    subject: `Bienvenue sur KAH Support, ${esc(tenantName)} — votre assistant est prêt`,
    html: onboardingWrap(`<div class="body">
      <h1>Votre assistant IT est en ligne. 🎉</h1>
      <p>Bonjour,<br>Votre espace <strong>${esc(tenantName)}</strong> est actif sur KAH Support. Voici les 3 actions à faire en 10 minutes pour voir les premiers résultats :</p>
      <div class="tip">✅ <strong>1. Connectez votre GLPI</strong> — Paramètres → Intégration GLPI → coller l'URL + clé API</div>
      <div class="tip">✅ <strong>2. Invitez un technicien</strong> — Administration → Utilisateurs → Inviter</div>
      <div class="tip">✅ <strong>3. Testez votre premier ticket</strong> — cliquez sur "Nouveau ticket" et posez une question au chatbot</div>
      <div style="text-align:center;margin:24px 0"><a href="${esc(loginUrl)}" class="btn">Accéder à mon espace →</a></div>
      <p style="font-size:13px;color:#888">Une question ? Répondez directement à cet email — notre équipe répond sous 24h.</p>
    </div>`),
  });
}

async function sendOnboardingJ3({ email, tenantName, loginUrl, ticketCount }) {
  const hasTickets = ticketCount > 0;
  await sendEmail({
    to: email,
    subject: `${hasTickets ? `${ticketCount} tickets traités ✓` : "Astuce du jour"} — KAH Support`,
    html: onboardingWrap(`<div class="body">
      <h1>${hasTickets ? `Votre assistant a traité ${ticketCount} ticket${ticketCount > 1 ? "s" : ""}.` : "3 astuces pour aller plus loin."}</h1>
      ${hasTickets
        ? `<p>En 3 jours, <strong>${ticketCount} demande${ticketCount > 1 ? "s" : ""}</strong> ont été traitées automatiquement. Chaque ticket N1 pris en charge = ~25 min de travail économisées pour votre équipe.</p>`
        : `<p>Vous n'avez pas encore de tickets dans le système. Voici comment accélérer la prise en main :</p>`
      }
      <div class="tip">💡 <strong>Base de connaissances</strong> — Importez vos procédures PDF/Word. L'IA les apprend en 2 minutes.</div>
      <div class="tip">💡 <strong>Slack/Teams</strong> — Connectez votre messagerie pour que les alertes arrivent directement dans vos channels.</div>
      <div class="tip">💡 <strong>Escalade automatique</strong> — Configurez les mots-clés qui déclenchent une escalade N2 immédiate.</div>
      <div style="text-align:center;margin:24px 0"><a href="${esc(loginUrl)}" class="btn">Configurer maintenant →</a></div>
    </div>`),
  });
}

async function sendOnboardingJ7({ email, tenantName, loginUrl, ticketCount, savedHours }) {
  await sendEmail({
    to: email,
    subject: `Votre bilan 7 jours — ${esc(tenantName)}`,
    html: onboardingWrap(`<div class="body">
      <h1>Votre assistant, 7 jours plus tard.</h1>
      <p>Voici ce que KAH Support a fait pour <strong>${esc(tenantName)}</strong> cette semaine :</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:20px 0;text-align:center">
        <div style="background:#f0f0ff;border-radius:10px;padding:16px"><p style="font-size:28px;font-weight:800;color:${ACCENT};margin:0">${ticketCount}</p><p style="font-size:12px;color:#666;margin:4px 0 0">Tickets traités</p></div>
        <div style="background:#f0fff4;border-radius:10px;padding:16px"><p style="font-size:28px;font-weight:800;color:#22c55e;margin:0">~${savedHours}h</p><p style="font-size:12px;color:#666;margin:4px 0 0">Économisées</p></div>
      </div>
      <p>Vous avez encore 7 jours d'essai gratuit. Si vous souhaitez continuer avec le plan Starter (299€/mois), votre équipe IT sera couverte 24h/24 sans aucune interruption.</p>
      <div style="text-align:center;margin:24px 0"><a href="${esc(loginUrl)}/billing" class="btn">Activer mon abonnement →</a></div>
      <p style="font-size:13px;color:#888;text-align:center">Ou <a href="mailto:contact@kah-digital.fr" style="color:${ACCENT}">demandez une démo personnalisée</a> avec notre équipe.</p>
    </div>`),
  });
}

module.exports = {
  sendEmail,
  notifyTicketCreated,
  notifySlaBreach,
  sendWelcomeEmail,
  sendInviteEmail,
  sendPasswordResetEmail,
  sendGlpiProspectEmail,
  sendOnboardingJ0,
  sendOnboardingJ3,
  sendOnboardingJ7,
  isConfigured
};
