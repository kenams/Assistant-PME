#!/usr/bin/env node
/**
 * Script de prospection GLPI automatique
 * Usage:
 *   node scripts/send-glpi-campaign.mjs                   # test mode (dry run)
 *   node scripts/send-glpi-campaign.mjs --send            # envoie réellement
 *   node scripts/send-glpi-campaign.mjs --send --limit=5  # envoie les 5 premiers
 *   node scripts/send-glpi-campaign.mjs --send --from=10  # commence à l'index 10
 *
 * Prérequis:
 *   - SMTP configuré (SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM dans .env)
 *   - OU passer par l'API: TOKEN_ADMIN + API_URL définis ici ou en env
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createTransport } from "nodemailer";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

dotenv.config({ path: path.join(root, "backend", ".env") });

const args = process.argv.slice(2);
const DRY_RUN = !args.includes("--send");
const LIMIT = parseInt(args.find(a => a.startsWith("--limit="))?.split("=")[1] || "999");
const FROM_INDEX = parseInt(args.find(a => a.startsWith("--from="))?.split("=")[1] || "0");
const DELAY_MS = 3000;

// ─── Config SMTP ──────────────────────────────────────────────────────────────
const SMTP_HOST = process.env.SMTP_HOST || "";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER || "";
const SMTP_PASS = process.env.SMTP_PASS || "";
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

// ─── Lire le CSV ──────────────────────────────────────────────────────────────
function parseCsv(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.trim().split("\n");
  const headers = lines[0].split(",");
  return lines.slice(1).map(line => {
    const values = line.split(",");
    return Object.fromEntries(headers.map((h, i) => [h.trim(), (values[i] || "").trim()]));
  });
}

// ─── Template email ───────────────────────────────────────────────────────────
function buildEmail(prospect) {
  const firstName = (prospect.name || "").split(" ")[0] || "Bonjour";
  const company = prospect.company || "votre organisation";
  const note = prospect.personal_note || "";

  const subject = `${company} + IA : 70% de tickets GLPI en moins`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>GLPI + IA</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">

    <div style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:28px 36px;">
      <span style="color:#fff;font-size:14px;font-weight:600;">🤖 Assistant IT — KAH Digital</span>
    </div>

    <div style="padding:32px 36px;">
      <p style="color:#111827;font-size:16px;margin:0 0 16px;">Bonjour ${firstName},</p>

      ${note ? `<p style="color:#374151;font-size:14px;margin:0 0 18px;padding:12px 14px;background:#f9fafb;border-left:3px solid #6366f1;border-radius:0 6px 6px 0;">${note}</p>` : ""}

      <p style="color:#374151;font-size:15px;margin:0 0 16px;line-height:1.65;">
        Si vous gérez GLPI pour <strong>${company}</strong>, vous savez que le niveau 1 prend la majorité du temps de vos techniciens : réinitialisation de mots de passe, VPN, impressions, accès logiciels…
      </p>

      <p style="color:#374151;font-size:15px;margin:0 0 22px;line-height:1.65;">
        Notre assistant IA se connecte à votre GLPI en 5 minutes et prend ces demandes en charge 24h/24 : il répond à l'utilisateur et si besoin, crée automatiquement le ticket dans GLPI avec priorité, catégorie et description.
      </p>

      <div style="background:#f0f0ff;border:1px solid #c7d2fe;border-radius:8px;padding:18px 22px;margin-bottom:26px;">
        <p style="color:#4338ca;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin:0 0 12px;">Résultats chez nos clients PME</p>
        <table style="width:100%;border-collapse:collapse;text-align:center;">
          <tr>
            <td style="padding:4px;">
              <div style="font-size:22px;font-weight:900;color:#6366f1;">70%</div>
              <div style="font-size:11px;color:#6b7280;">tickets auto-résolus</div>
            </td>
            <td style="padding:4px;">
              <div style="font-size:22px;font-weight:900;color:#6366f1;">8 min</div>
              <div style="font-size:11px;color:#6b7280;">économisées/ticket</div>
            </td>
            <td style="padding:4px;">
              <div style="font-size:22px;font-weight:900;color:#6366f1;">&lt;1 mois</div>
              <div style="font-size:11px;color:#6b7280;">pour le ROI</div>
            </td>
          </tr>
        </table>
      </div>

      <div style="text-align:center;margin-bottom:24px;">
        <a href="https://kah-support.ch/glpi"
           style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:13px 30px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">
          Voir l'intégration GLPI →
        </a>
      </div>

      <p style="color:#6b7280;font-size:13px;margin:0;line-height:1.6;">
        Compatible GLPI 9.5.x et 10.x — on-premise et cloud. Aucun plugin à installer.
      </p>
    </div>

    <div style="padding:18px 36px;background:#f9fafb;border-top:1px solid #e5e7eb;">
      <p style="color:#6b7280;font-size:13px;margin:0;">
        <strong>PS :</strong> Si vous voulez une démo de 10 min avec votre GLPI réel, répondez simplement à cet email.
      </p>
    </div>

    <div style="padding:14px 36px;text-align:center;">
      <p style="color:#9ca3af;font-size:11px;margin:0;">
        KAH Digital · <a href="https://kah-support.ch" style="color:#9ca3af;">kah-support.ch</a>
      </p>
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const csvPath = path.join(root, "prospects-glpi.csv");
  if (!fs.existsSync(csvPath)) {
    console.error("❌ Fichier prospects-glpi.csv introuvable.");
    process.exit(1);
  }

  const prospects = parseCsv(csvPath).slice(FROM_INDEX, FROM_INDEX + LIMIT);
  console.log(`\n📋 ${prospects.length} prospects chargés (index ${FROM_INDEX} → ${FROM_INDEX + prospects.length - 1})`);

  if (DRY_RUN) {
    console.log("\n🔍 MODE TEST (dry run) — aucun email envoyé\n");
    for (const p of prospects) {
      const { subject } = buildEmail(p);
      console.log(`  ✉  ${p.email.padEnd(45)} | ${p.company.padEnd(30)} | "${subject}"`);
    }
    console.log(`\n✅ ${prospects.length} emails prêts. Lancez avec --send pour envoyer.`);
    return;
  }

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.error("❌ SMTP non configuré. Définissez SMTP_HOST, SMTP_USER, SMTP_PASS dans backend/.env");
    process.exit(1);
  }

  const transporter = createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });

  console.log(`\n🚀 Envoi en cours (délai ${DELAY_MS / 1000}s entre chaque)...\n`);
  let sent = 0, failed = 0;

  for (let i = 0; i < prospects.length; i++) {
    const p = prospects[i];
    const { subject, html } = buildEmail(p);
    try {
      await transporter.sendMail({
        from: SMTP_FROM,
        to: p.email,
        subject,
        html,
        text: html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
      });
      sent++;
      console.log(`  ✅ [${i + 1}/${prospects.length}] ${p.email} (${p.company})`);
    } catch (err) {
      failed++;
      console.log(`  ❌ [${i + 1}/${prospects.length}] ${p.email} — ${err.message}`);
    }

    if (i < prospects.length - 1) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\n📊 Résultat: ${sent} envoyés / ${failed} échoués / ${prospects.length} total`);
  console.log(`📁 Rapport: consultez https://kah-support.ch/app/admin (section Leads)`);
}

main().catch(err => { console.error(err); process.exit(1); });
