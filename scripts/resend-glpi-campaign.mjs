#!/usr/bin/env node
/**
 * Campagne prospection GLPI via Resend API
 * Usage: node scripts/resend-glpi-campaign.mjs [--send] [--limit=N] [--from=N]
 */
import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

// Fix TLS on Windows (local script only)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const RESEND_API_KEY = process.env.RESEND_API_KEY;
if (!RESEND_API_KEY) { console.error("❌ RESEND_API_KEY manquant dans les variables d'env"); process.exit(1); }
const FROM = "KAH Digital <contact@kah-digital.ch>";
const REPLY_TO = "kahdigital42@gmail.com";
const DELAY_MS = 2500;

const args = process.argv.slice(2);
const DRY_RUN = !args.includes("--send");
const LIMIT = parseInt(args.find(a => a.startsWith("--limit="))?.split("=")[1] || "999");
const FROM_INDEX = parseInt(args.find(a => a.startsWith("--from="))?.split("=")[1] || "0");

function parseCsv(filePath) {
  const lines = fs.readFileSync(filePath, "utf-8").trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(",");
    return Object.fromEntries(headers.map((h, i) => [h, (values[i] || "").trim()]));
  });
}

function esc(str) {
  return (str || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function buildEmail(p) {
  const firstName = (p.name || "").split(" ")[0] || "Bonjour";
  const company = p.company || "votre organisation";
  const note = p.personal_note || "";
  const role = p.contact_role || "votre équipe IT";

  const subject = `${company} + IA : 70% de tickets GLPI en moins`;

  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>GLPI + IA</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:40px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">

  <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px 36px;">
    <span style="color:#fff;font-size:15px;font-weight:700;">🤖 Assistant IT — KAH Digital</span><br/>
    <span style="color:rgba(255,255,255,.7);font-size:12px;">kah-support.ch</span>
  </div>

  <div style="padding:32px 36px;">
    <p style="color:#111827;font-size:16px;margin:0 0 16px;">Bonjour ${esc(firstName)},</p>

    ${note ? `<p style="color:#374151;font-size:14px;margin:0 0 18px;padding:12px 14px;background:#f9fafb;border-left:3px solid #6366f1;border-radius:0 6px 6px 0;line-height:1.5;">${esc(note)}</p>` : ""}

    <p style="color:#374151;font-size:15px;margin:0 0 16px;line-height:1.65;">
      Si vous gérez GLPI pour <strong>${esc(company)}</strong>, vous savez que le niveau 1 prend la majorité du temps de ${esc(role)} — réinitialisation de mots de passe, VPN, impressions, accès logiciels.
    </p>

    <p style="color:#374151;font-size:15px;margin:0 0 22px;line-height:1.65;">
      Notre assistant IA se connecte à votre GLPI en <strong>5 minutes</strong> et prend ces demandes en charge 24h/24 : il répond à l'utilisateur, et si besoin, crée automatiquement le ticket dans GLPI avec priorité, catégorie et description complète.
    </p>

    <div style="background:#f0f0ff;border:1px solid #c7d2fe;border-radius:8px;padding:18px 22px;margin-bottom:26px;">
      <p style="color:#4338ca;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin:0 0 14px;">Résultats chez nos clients PME</p>
      <table style="width:100%;border-collapse:collapse;text-align:center;">
        <tr>
          <td style="padding:6px;">
            <div style="font-size:26px;font-weight:900;color:#6366f1;">70%</div>
            <div style="font-size:11px;color:#6b7280;margin-top:2px;">tickets auto-résolus</div>
          </td>
          <td style="padding:6px;">
            <div style="font-size:26px;font-weight:900;color:#6366f1;">8 min</div>
            <div style="font-size:11px;color:#6b7280;margin-top:2px;">économisées/ticket</div>
          </td>
          <td style="padding:6px;">
            <div style="font-size:26px;font-weight:900;color:#6366f1;">&lt;1 mois</div>
            <div style="font-size:11px;color:#6b7280;margin-top:2px;">pour atteindre le ROI</div>
          </td>
        </tr>
      </table>
    </div>

    <div style="text-align:center;margin-bottom:26px;">
      <a href="https://kah-support.ch/glpi"
         style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;box-shadow:0 4px 16px rgba(99,102,241,.3);">
        Voir l'intégration GLPI →
      </a>
    </div>

    <p style="color:#6b7280;font-size:13px;margin:0 0 0;line-height:1.6;">
      Compatible GLPI 9.5.x et 10.x — on-premise et cloud. Aucun plugin à installer.
    </p>
  </div>

  <div style="padding:18px 36px;background:#f9fafb;border-top:1px solid #e5e7eb;">
    <p style="color:#6b7280;font-size:13px;margin:0;line-height:1.6;">
      <strong>PS :</strong> Si vous voulez voir ça sur un GLPI réel, je peux vous faire une démo de 10 min. Répondez simplement à cet email.
    </p>
  </div>

  <div style="padding:14px 36px;text-align:center;border-top:1px solid #f3f4f6;">
    <p style="color:#9ca3af;font-size:11px;margin:0;">
      KAH Digital · <a href="https://kah-support.ch" style="color:#9ca3af;">kah-support.ch</a> ·
      <a href="https://kah-support.ch/glpi" style="color:#9ca3af;">Page GLPI</a>
    </p>
  </div>
</div>
</body></html>`;

  return { subject, html };
}

async function sendEmail({ to, subject, html }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ from: FROM, to: [to], reply_to: [REPLY_TO], subject, html })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

async function main() {
  const csvPath = path.join(root, "prospects-glpi.csv");
  const prospects = parseCsv(csvPath).slice(FROM_INDEX, FROM_INDEX + LIMIT);

  console.log(`\n📋 ${prospects.length} prospects (index ${FROM_INDEX}→${FROM_INDEX + prospects.length - 1})`);
  console.log(`📧 Expéditeur : ${FROM}`);
  console.log(`🌐 CTA : https://kah-support.ch/glpi\n`);

  if (DRY_RUN) {
    console.log("🔍 MODE DRY RUN — aucun email envoyé\n");
    for (const p of prospects) {
      const { subject } = buildEmail(p);
      console.log(`  ✉  ${p.email.padEnd(50)} ${p.company.padEnd(28)} "${subject}"`);
    }
    console.log(`\n✅ Prêt. Lancez avec --send pour envoyer.`);
    return;
  }

  let sent = 0, failed = 0;
  const results = [];

  for (let i = 0; i < prospects.length; i++) {
    const p = prospects[i];
    const { subject, html } = buildEmail(p);
    try {
      const r = await sendEmail({ to: p.email, subject, html });
      sent++;
      results.push({ email: p.email, company: p.company, ok: true, id: r.id });
      console.log(`  ✅ [${i+1}/${prospects.length}] ${p.email} (${p.company})`);
    } catch (err) {
      failed++;
      results.push({ email: p.email, company: p.company, ok: false, error: err.message });
      console.log(`  ❌ [${i+1}/${prospects.length}] ${p.email} — ${err.message}`);
    }
    if (i < prospects.length - 1) await new Promise(r => setTimeout(r, DELAY_MS));
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 ${sent} envoyés / ${failed} échoués / ${prospects.length} total`);
  if (failed > 0) {
    console.log(`\n❌ Échecs :`);
    results.filter(r => !r.ok).forEach(r => console.log(`   ${r.email} — ${r.error}`));
  }
  console.log(`\n📁 Suivi leads : https://kah-support.ch/app/admin`);
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
