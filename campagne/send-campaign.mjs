#!/usr/bin/env node
/**
 * Campagne cold email — Assistant IT IA
 * Utilise Resend API (100/jour, kah-digital.ch)
 *
 * Usage:
 *   node campagne/send-campaign.mjs                        # dry-run
 *   node campagne/send-campaign.mjs --send                 # envoie tout
 *   node campagne/send-campaign.mjs --send --limit=10      # 10 premiers
 *   node campagne/send-campaign.mjs --send --sequence=J5   # relance J5
 *   node campagne/send-campaign.mjs --send --csv=prospects-glpi.csv  # autre liste
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const args = process.argv.slice(2);
const DRY_RUN = !args.includes("--send");
const LIMIT = parseInt(args.find(a => a.startsWith("--limit="))?.split("=")[1] || "999");
const SEQUENCE = args.find(a => a.startsWith("--sequence="))?.split("=")[1] || "J0";
const CSV_FILE = args.find(a => a.startsWith("--csv="))?.split("=")[1] || "campagne/prospects-pme.csv";
const DELAY_MS = 2000;

const RESEND_API_KEY = process.env.RESEND_API_KEY;
if (!RESEND_API_KEY) { console.error("❌ RESEND_API_KEY manquant"); process.exit(1); }
const FROM = "contact@kah-digital.ch";
const FROM_NAME = "Kenams — KAH Digital Studio";
const DEMO_URL = "https://assistant-pme.vercel.app/app/demo-video";
const SITE_URL = "https://kah-support.ch";

// ─── CSV Parser ───────────────────────────────────────────────────────────────
function parseCsv(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(",");
    return Object.fromEntries(headers.map((h, i) => [h, (values[i] || "").trim()]));
  });
}

// ─── Templates ────────────────────────────────────────────────────────────────
function buildEmailJ0(p) {
  const firstName = (p.name || "").split(" ")[0];
  const isGeneric = !firstName || ["DSI", "IT", "Responsable"].includes(firstName);
  const greet = isGeneric ? `Bonjour,` : `Bonjour ${firstName},`;
  const company = p.company || "votre entreprise";
  const note = p.personal_note || "";

  const subject = `${company} — votre helpdesk IT géré par l'IA (démo 2 min)`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08);">

  <div style="background:linear-gradient(135deg,#6366f1 0%,#4f46e5 100%);padding:24px 36px;">
    <div style="color:#fff;font-size:15px;font-weight:700;">🤖 Assistant IT IA — KAH Digital Studio</div>
    <div style="color:rgba(255,255,255,.7);font-size:12px;margin-top:4px;">support IT automatisé pour PME</div>
  </div>

  <div style="padding:32px 36px;">
    <p style="color:#111827;font-size:16px;margin:0 0 18px;font-weight:500;">${greet}</p>

    ${note ? `<p style="color:#374151;font-size:14px;margin:0 0 18px;padding:12px 16px;background:#f9fafb;border-left:3px solid #6366f1;border-radius:0 8px 8px 0;">${note}</p>` : ""}

    <p style="color:#374151;font-size:15px;margin:0 0 16px;line-height:1.7;">
      Les demandes N1 — reset de mot de passe, VPN, imprimantes, accès logiciels — représentent <strong>60 à 80% du volume helpdesk</strong> de la plupart des PME.
      Ce sont des demandes répétitives, prévisibles, qui monopolisent vos techniciens.
    </p>

    <p style="color:#374151;font-size:15px;margin:0 0 24px;line-height:1.7;">
      J'ai développé un assistant IA qui prend ces demandes en charge 24h/24, répond à l'utilisateur en moins de 3 secondes et crée automatiquement le ticket dans votre ITSM si nécessaire.
    </p>

    <div style="background:#f0f0ff;border:1px solid #c7d2fe;border-radius:10px;padding:20px 24px;margin-bottom:28px;">
      <div style="color:#4338ca;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:14px;">Résultats observés</div>
      <table style="width:100%;border-collapse:collapse;text-align:center;">
        <tr>
          <td style="padding:6px 4px;">
            <div style="font-size:24px;font-weight:900;color:#6366f1;line-height:1;">94%</div>
            <div style="font-size:11px;color:#6b7280;margin-top:3px;">tickets N1 résolus sans technicien</div>
          </td>
          <td style="padding:6px 4px;">
            <div style="font-size:24px;font-weight:900;color:#6366f1;line-height:1;">2,4 min</div>
            <div style="font-size:11px;color:#6b7280;margin-top:3px;">temps de résolution moyen</div>
          </td>
          <td style="padding:6px 4px;">
            <div style="font-size:24px;font-weight:900;color:#6366f1;line-height:1;">-70%</div>
            <div style="font-size:11px;color:#6b7280;margin-top:3px;">charge helpdesk humain</div>
          </td>
        </tr>
      </table>
    </div>

    <p style="color:#374151;font-size:14px;margin:0 0 24px;line-height:1.65;">
      Intégration GLPI native, on-premise possible (Linux/Windows), données hébergées en UE, RGPD. Déploiement en 15 minutes.
    </p>

    <div style="text-align:center;margin-bottom:28px;">
      <a href="${DEMO_URL}"
         style="display:inline-block;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:.01em;">
        Voir la démo (2 min) →
      </a>
    </div>

    <p style="color:#6b7280;font-size:13px;margin:0;line-height:1.6;">
      Si ça correspond à un besoin chez <strong>${company}</strong>, une démo personnalisée de 20 min sur vos cas d'usage réels est possible. Répondez simplement à cet email.
    </p>
  </div>

  <div style="padding:16px 36px;background:#f9fafb;border-top:1px solid #e5e7eb;">
    <p style="color:#9ca3af;font-size:12px;margin:0;">
      Kenams — KAH Digital Studio · <a href="${SITE_URL}" style="color:#6366f1;text-decoration:none;">kah-support.ch</a> · <a href="mailto:contact@kah-digital.ch?subject=Désinscription" style="color:#9ca3af;">Se désinscrire</a>
    </p>
  </div>
</div>
</body>
</html>`;

  const text = `${greet}\n\n${note ? note + "\n\n" : ""}Les demandes N1 représentent 60-80% du volume helpdesk de la plupart des PME. J'ai développé un assistant IA qui les prend en charge 24h/24.\n\nRésultats : 94% tickets N1 résolus sans technicien, -70% charge helpdesk.\n\nDémo 2 min : ${DEMO_URL}\n\nRépondez à cet email pour une démo personnalisée sur vos cas réels.\n\n-- Kenams, KAH Digital Studio`;

  return { subject, html, text };
}

function buildEmailJ5(p) {
  const firstName = (p.name || "").split(" ")[0];
  const isGeneric = !firstName || ["DSI", "IT", "Responsable"].includes(firstName);
  const greet = isGeneric ? `Bonjour,` : `Bonjour ${firstName},`;
  const company = p.company || "votre entreprise";

  const subject = `Re : ${company} — une question sur votre helpdesk IT`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08);">
  <div style="padding:32px 36px;">
    <p style="color:#111827;font-size:16px;margin:0 0 16px;">${greet}</p>

    <p style="color:#374151;font-size:15px;margin:0 0 16px;line-height:1.7;">
      Je vous ai contacté il y a quelques jours au sujet de l'automatisation du helpdesk IT chez <strong>${company}</strong>. Je voulais juste m'assurer que mon message n'avait pas atterri en spam.
    </p>

    <p style="color:#374151;font-size:15px;margin:0 0 16px;line-height:1.7;">
      Une question directe : combien de tickets "réinitialisation de mot de passe" ou "problème VPN" vos techniciens traitent-ils par semaine ?
    </p>

    <p style="color:#374151;font-size:15px;margin:0 0 24px;line-height:1.7;">
      Ce sont exactement les cas que notre IA résout en moins de 3 secondes, 24h/24 — sans intervention humaine. Si ce volume est significatif chez vous, ça vaut 20 minutes de démo.
    </p>

    <div style="text-align:center;margin-bottom:24px;">
      <a href="${DEMO_URL}"
         style="display:inline-block;background:linear-gradient(135deg,#6366f1,#4f46e5);color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">
        Voir la démo →
      </a>
    </div>

    <p style="color:#6b7280;font-size:13px;margin:0;">Répondez simplement "non merci" si ce n'est pas le bon moment — je ne vous recontacterai plus.</p>
  </div>
  <div style="padding:14px 36px;background:#f9fafb;border-top:1px solid #e5e7eb;">
    <p style="color:#9ca3af;font-size:12px;margin:0;">Kenams — KAH Digital Studio · <a href="${SITE_URL}" style="color:#6366f1;text-decoration:none;">kah-support.ch</a> · <a href="mailto:contact@kah-digital.ch?subject=Désinscription" style="color:#9ca3af;">Se désinscrire</a></p>
  </div>
</div>
</body>
</html>`;

  const text = `${greet}\n\nJe vous ai contacté il y a quelques jours. Une question directe : combien de tickets répétitifs (MDP, VPN, imprimantes) vos techniciens traitent-ils par semaine ?\n\nDémo 2 min : ${DEMO_URL}\n\n-- Kenams, KAH Digital Studio`;

  return { subject, html, text };
}

function buildEmailJ10(p) {
  const firstName = (p.name || "").split(" ")[0];
  const isGeneric = !firstName || ["DSI", "IT", "Responsable"].includes(firstName);
  const greet = isGeneric ? `Bonjour,` : `Bonjour ${firstName},`;
  const company = p.company || "votre entreprise";

  const subject = `Dernier message — Assistant IT pour ${company}`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08);">
  <div style="padding:32px 36px;">
    <p style="color:#111827;font-size:16px;margin:0 0 16px;">${greet}</p>

    <p style="color:#374151;font-size:15px;margin:0 0 16px;line-height:1.7;">
      C'est mon dernier message concernant l'automatisation du support IT chez <strong>${company}</strong>.
    </p>

    <p style="color:#374151;font-size:15px;margin:0 0 16px;line-height:1.7;">
      Je laisse juste cette ressource au cas où le timing serait meilleur plus tard : <a href="${DEMO_URL}" style="color:#6366f1;">démo complète du workflow (2 min)</a>.
    </p>

    <p style="color:#374151;font-size:14px;margin:0 0 24px;line-height:1.65;">
      Si vous souhaitez qu'on en parle à un autre moment, répondez à cet email ou écrivez directement à <a href="mailto:contact@kah-digital.ch" style="color:#6366f1;">contact@kah-digital.ch</a>.
    </p>

    <p style="color:#6b7280;font-size:13px;margin:0;">Bonne continuation,<br><strong>Kenams</strong> — KAH Digital Studio</p>
  </div>
  <div style="padding:14px 36px;background:#f9fafb;border-top:1px solid #e5e7eb;">
    <p style="color:#9ca3af;font-size:12px;margin:0;">KAH Digital Studio · <a href="${SITE_URL}" style="color:#6366f1;text-decoration:none;">kah-support.ch</a></p>
  </div>
</div>
</body>
</html>`;

  const text = `${greet}\n\nDernier message de ma part. Démo au cas où : ${DEMO_URL}\n\nBonne continuation,\nKenams — KAH Digital Studio`;

  return { subject, html, text };
}

// ─── Envoi Resend ─────────────────────────────────────────────────────────────
async function sendEmail(to, toName, subject, html, text) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM}>`,
      to: [`${toName} <${to}>`],
      reply_to: "contact@kah-digital.ch",
      subject,
      html,
      text
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || JSON.stringify(data));
  return data.id;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const csvPath = path.join(root, CSV_FILE);
const prospects = parseCsv(csvPath).slice(0, LIMIT);

console.log(`\n📧 Campagne Assistant IT IA — Séquence ${SEQUENCE}`);
console.log(`📋 ${prospects.length} prospects dans ${CSV_FILE}`);
console.log(DRY_RUN ? "🔍 MODE DRY-RUN (--send pour envoyer)\n" : "🚀 MODE ENVOI RÉEL\n");

const builders = { J0: buildEmailJ0, J5: buildEmailJ5, J10: buildEmailJ10 };
const buildEmail = builders[SEQUENCE] || buildEmailJ0;

let sent = 0, errors = 0;

for (const p of prospects) {
  const email = p.email?.trim();
  if (!email || !email.includes("@")) {
    console.log(`⚠️  Skip (pas d'email) : ${p.company}`);
    continue;
  }

  const { subject, html, text } = buildEmail(p);
  const toName = p.name || p.contact_role || "";

  if (DRY_RUN) {
    console.log(`✅ [DRY] ${email} — "${subject}"`);
    sent++;
    continue;
  }

  try {
    const id = await sendEmail(email, toName, subject, html, text);
    console.log(`✅ Envoyé → ${email} (${p.company}) — id:${id}`);
    sent++;
    await new Promise(r => setTimeout(r, DELAY_MS));
  } catch (e) {
    console.error(`❌ Erreur ${email} : ${e.message}`);
    errors++;
  }
}

console.log(`\n📊 Résultat : ${sent} envoyés, ${errors} erreurs`);
console.log(`💡 Quota restant estimé : ${100 - sent}/100 aujourd'hui`);
