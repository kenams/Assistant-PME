#!/usr/bin/env node
/**
 * Supprime les adresses de la liste de suppression Resend puis relance l'envoi
 * node campagne/remove-suppressions.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const RESEND_API_KEY = process.env.RESEND_API_KEY;
if (!RESEND_API_KEY) { console.error("❌ RESEND_API_KEY manquant"); process.exit(1); }

function parseCsv(file) {
  const lines = fs.readFileSync(file, "utf-8").trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim());
  return lines.slice(1).map(l => {
    const vals = l.split(",");
    return Object.fromEntries(headers.map((h, i) => [h, (vals[i] || "").trim()]));
  });
}

const prospects = parseCsv(path.join(root, "prospects-glpi.csv"));
const emails = prospects.map(p => p.email).filter(e => e && e.includes("@"));

console.log(`🧹 Suppression de ${emails.length} adresses de la liste Resend...\n`);

for (const email of emails) {
  try {
    const r = await fetch(`https://api.resend.com/suppressions/${encodeURIComponent(email)}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}` }
    });
    if (r.status === 200 || r.status === 204 || r.status === 404) {
      console.log(`✅ ${email}`);
    } else {
      const d = await r.json().catch(() => ({}));
      console.log(`⚠️  ${email} : ${r.status} ${d.message || ""}`);
    }
  } catch (e) {
    console.error(`❌ ${email} : ${e.message}`);
  }
  await new Promise(r => setTimeout(r, 200));
}

console.log("\n✅ Fait. Lance maintenant :");
console.log(`   node campagne/send-glpi-humanized.mjs --send`);
