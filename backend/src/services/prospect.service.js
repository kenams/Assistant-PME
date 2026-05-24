const { db } = require("../config/db");
const { sendGlpiProspectEmail } = require("./email.service");
const { createLead, updateLead } = require("./leads.service");

async function sendGlpiProspect({ name, email, company, personalNote }) {
  await sendGlpiProspectEmail({ to: email, name, company, personalNote });

  const existing = await db("leads").where({ email }).first();
  if (!existing) {
    await createLead({ name: name || email, email, company, message: "glpi_prospect" }).catch(() => {});
  } else {
    await updateLead({ id: existing.id, updates: { status: "contacted", notes: "glpi_prospect_email_sent" } }).catch(() => {});
  }
}

async function getProspectStats() {
  const rows = await db("leads").where({ message: "glpi_prospect" }).select("status");
  const stats = { total: rows.length, contacted: 0, won: 0, lost: 0, new: 0 };
  for (const r of rows) {
    if (stats[r.status] !== undefined) stats[r.status]++;
  }
  return stats;
}

module.exports = { sendGlpiProspect, getProspectStats };
