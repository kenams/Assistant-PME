#!/usr/bin/env node
/**
 * Campagne GLPI humanisée — emails courts, personnalisés, accrocheurs
 * node campagne/send-glpi-humanized.mjs            # dry-run
 * node campagne/send-glpi-humanized.mjs --send     # envoi réel
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const args = process.argv.slice(2);
const DRY_RUN = !args.includes("--send");

const RESEND_API_KEY = process.env.RESEND_API_KEY;
if (!RESEND_API_KEY) { console.error("❌ RESEND_API_KEY manquant"); process.exit(1); }

const FROM = `Kenams <contact@kah-digital.ch>`;
const DEMO_URL = "https://assistant-pme.vercel.app/app/demo-video";
const DELAY_MS = 3000;

// ─── Segmentation sectorielle ─────────────────────────────────────────────────
function getSegment(sector = "", company = "") {
  const s = (sector + company).toLowerCase();
  if (s.match(/restaurant|restauration|burger|pizza|food|brasserie|grill/)) return "restaurant";
  if (s.match(/retail|magasin|boutique|joué|balibaris|habitat|mode|optique|afflelou/)) return "retail";
  if (s.match(/santé|ehpad|clinique|hôpital|hospital|médic|care|domusvi|ch |soin/)) return "sante";
  if (s.match(/aéro|aviation|transavia|airbus|latecoere|mecachrome/)) return "aeronautique";
  if (s.match(/location|rent|agence|kiloutou|loxam/)) return "reseau-agences";
  if (s.match(/partenaire|intégrateur|partner|axess|atoosystem|sobrii|it services|consulting/)) return "partenaire";
  if (s.match(/conseil.état|cnaf|météo|mairie|collectivité|administration|etat|afnic|poste france|he-arc|haute.école/)) return "public";
  return "default";
}

// ─── Templates par segment ────────────────────────────────────────────────────
function buildEmail(p) {
  const rawFirstName = (p.name || "").split(" ")[0];
  const generic = ["DSI", "IT", "Responsable", "Directeur", "Helpdesk"].includes(rawFirstName);
  const firstName = generic ? null : rawFirstName;
  const company = p.company || "votre organisation";
  const segment = getSegment(p.sector, company);

  // Sujets courts et directs selon segment
  const subjects = {
    restaurant:       `${company} — qui gère les tickets IT de vos restaurants à 23h ?`,
    retail:           `${company} — vos techniciens IT passent combien d'heures sur le N1 ?`,
    sante:            `${company} — support IT 24h/24 sans technicien d'astreinte`,
    aeronautique:     `${company} — réduire la charge helpdesk de 70% sur GLPI`,
    "reseau-agences": `${company} — automatiser les tickets IT terrain`,
    partenaire:       `Intégration IA dans votre offre GLPI — ça vous intéresse ?`,
    public:           `${company} — gérer les demandes internes IT automatiquement`,
    default:          `${company} — une idée pour votre helpdesk GLPI`,
  };

  // Accroches personnalisées par secteur
  const hooks = {
    restaurant: `Chez une enseigne comme ${company}, les restaurants ouvrent tôt et ferment tard. Quand une caisse plante ou que le VPN lâche à 19h un vendredi, qui répond ?`,
    retail:     `Les équipes terrain de ${company} ont un profil clair : non-techniques, en mobilité, et qui n'ont pas le temps d'attendre un ticket. Les demandes N1 s'accumulent et vos techniciens passent leur journée dessus.`,
    sante:      `Les équipes soignantes de ${company} ne sont pas là pour gérer les tickets IT. Mais reset de MDP, accès DPI, imprimantes — ça arrive 24h/24 et ça bloque directement le soin.`,
    aeronautique: `Chez ${company}, les techniciens IT sont précieux et leur temps l'est encore plus. Pourtant une grosse partie de leur journée part sur du N1 répétitif — accès logiciels, MDP, VPN, imprimantes.`,
    "reseau-agences": `Avec un réseau d'agences comme celui de ${company}, les tickets IT arrivent de partout, souvent pour les mêmes raisons. Vos techniciens traitent les mêmes demandes en boucle.`,
    partenaire: `Vous proposez déjà GLPI à vos clients. On a développé une IA qui se branche dessus et gère le N1 automatiquement. Certains de vos clients seraient sûrement preneurs.`,
    public:     `Les agents de ${company} ont les mêmes problèmes IT que partout : MDP oubliés, VPN qui coince, imprimante qui refuse. Votre équipe informatique passe du temps sur ça.`,
    default:    `J'ai vu que ${company} utilise GLPI. Vos techniciens passent combien de temps par semaine sur des demandes N1 — reset MDP, VPN, accès logiciels ?`,
  };

  const greet = firstName ? `Bonjour ${firstName},` : `Bonjour,`;
  const hook = hooks[segment] || hooks.default;
  const subject = subjects[segment] || subjects.default;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<div style="max-width:580px;margin:32px auto;background:#fff;border-radius:10px;box-shadow:0 1px 8px rgba(0,0,0,.07);">

  <div style="padding:32px 40px 8px;">
    <p style="color:#1a1a2e;font-size:16px;margin:0 0 20px;font-weight:500;">${greet}</p>

    <p style="color:#374151;font-size:15px;line-height:1.75;margin:0 0 18px;">
      ${hook}
    </p>

    <p style="color:#374151;font-size:15px;line-height:1.75;margin:0 0 18px;">
      J'ai développé un assistant IA qui se connecte à GLPI et règle ça automatiquement : l'utilisateur pose sa question en langage naturel, l'IA répond en moins de 3 secondes, et si c'est trop complexe, le ticket est créé dans GLPI avec la bonne priorité et catégorie — sans que personne ne touche à rien.
    </p>

    <p style="color:#374151;font-size:15px;line-height:1.75;margin:0 0 24px;">
      <strong>94% des tickets N1 résolus automatiquement. -70% de charge pour vos techniciens.</strong> Déploiement en 15 minutes, données hébergées en Europe, on-premise possible.
    </p>
  </div>

  <div style="padding:0 40px 24px;text-align:center;">
    <a href="${DEMO_URL}"
       style="display:inline-block;background:#6366f1;color:#fff;padding:13px 30px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;letter-spacing:.01em;">
      Voir le workflow en 2 min →
    </a>
    <p style="color:#9ca3af;font-size:12px;margin:12px 0 0;">Sans inscription. Juste la démo.</p>
  </div>

  <div style="padding:20px 40px;border-top:1px solid #f3f4f6;">
    <p style="color:#374151;font-size:14px;line-height:1.65;margin:0;">
      <strong>PS :</strong> Si vous avez 20 minutes pour une démo sur vos cas d'usage réels chez ${company}, répondez à cet email — je m'adapte à votre agenda.
    </p>
  </div>

  <div style="padding:16px 40px;background:#f9fafb;border-top:1px solid #f0f0f0;border-radius:0 0 10px 10px;">
    <p style="color:#9ca3af;font-size:12px;margin:0;line-height:1.6;">
      Kenams — fondateur KAH Digital &nbsp;·&nbsp;
      <a href="https://kah-support.ch" style="color:#6366f1;text-decoration:none;">kah-support.ch</a>
      &nbsp;·&nbsp;
      <a href="mailto:contact@kah-digital.ch?subject=Désabonnement ${encodeURIComponent(company)}" style="color:#9ca3af;text-decoration:none;">Me désinscrire</a>
    </p>
  </div>

</div>
</body>
</html>`;

  const text = `${greet}\n\n${hook}\n\nJ'ai développé un assistant IA qui se connecte à GLPI et règle ça automatiquement : 94% des tickets N1 résolus sans technicien, -70% de charge helpdesk. Déploiement 15 min, données EU.\n\nDémo 2 min (sans inscription) : ${DEMO_URL}\n\nPS : Si vous avez 20 min pour une démo sur vos cas réels chez ${company}, répondez à cet email.\n\nKenams — KAH Digital`;

  return { subject, html, text };
}

// ─── Parser CSV ───────────────────────────────────────────────────────────────
function parseCsv(file) {
  const lines = fs.readFileSync(file, "utf-8").trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim());
  return lines.slice(1).map(l => {
    const vals = l.split(",");
    return Object.fromEntries(headers.map((h, i) => [h, (vals[i] || "").trim()]));
  });
}

// ─── Envoi Resend ─────────────────────────────────────────────────────────────
async function send(to, toName, subject, html, text) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: [toName ? `${toName} <${to}>` : to],
      reply_to: "contact@kah-digital.ch",
      subject, html, text
    })
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.message || JSON.stringify(d));
  return d.id;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const prospects = parseCsv(path.join(root, "prospects-glpi.csv"));

// Exclure les secteurs à cycle de vente trop long ou hors cible directe
const EXCLUDE_SEGMENTS = ["partenaire", "public"];
const targets = prospects.filter(p => {
  const seg = getSegment(p.sector, p.company);
  return !EXCLUDE_SEGMENTS.includes(seg);
});

console.log(`\n📧 Campagne GLPI humanisée`);
console.log(`📋 ${targets.length}/${prospects.length} prospects ciblés (partenaires + secteur public exclus)`);
console.log(DRY_RUN ? "🔍 DRY-RUN — ajoutez --send pour envoyer\n" : "🚀 ENVOI RÉEL\n");

let sent = 0, errors = 0;

for (const p of targets) {
  const email = p.email?.trim();
  if (!email || !email.includes("@")) { console.log(`⚠️  Skip (pas d'email): ${p.company}`); continue; }

  const seg = getSegment(p.sector, p.company);
  const { subject, html, text } = buildEmail(p);
  const toName = p.name?.match(/^(DSI|IT|Responsable|Directeur|Helpdesk)/) ? "" : p.name;

  if (DRY_RUN) {
    console.log(`✅ [DRY] [${seg.padEnd(16)}] ${email}`);
    console.log(`   Objet : ${subject}`);
    console.log();
    sent++;
    continue;
  }

  try {
    const id = await send(email, toName, subject, html, text);
    console.log(`✅ [${seg}] ${email} → envoyé (${id})`);
    sent++;
    await new Promise(r => setTimeout(r, DELAY_MS));
  } catch (e) {
    console.error(`❌ ${email} : ${e.message}`);
    errors++;
  }
}

console.log(`\n📊 ${sent} envoyés · ${errors} erreurs · quota utilisé: ${sent}/100`);
