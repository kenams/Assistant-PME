const crypto = require("crypto");
const { db } = require("../config/db");
const { getDefaultTenantId } = require("./tenants.service");

async function createLead({ name, email, company, message }) {
  const tenantId = await getDefaultTenantId();
  const lead = {
    id: crypto.randomUUID(),
    tenant_id: tenantId,
    name,
    email,
    company: company || null,
    message: message || null,
    status: "new",
    next_action: null,
    notes: null,
    owner: null,
    created_at: new Date().toISOString()
  };
  const [inserted] = await db("leads").insert(lead).returning("*");
  return inserted || lead;
}

async function updateLead({ id, updates }) {
  const lead = await db("leads").where({ id }).first();
  if (!lead) return null;

  const patch = {};
  if (updates.status !== undefined) patch.status = updates.status;
  if (updates.next_action !== undefined) patch.next_action = updates.next_action;
  if (updates.notes !== undefined) patch.notes = updates.notes;
  if (updates.owner !== undefined) patch.owner = updates.owner;

  if (Object.keys(patch).length === 0) return lead;

  const [updated] = await db("leads").where({ id }).update(patch).returning("*");
  return updated || null;
}

async function listLeads({ tenantId } = {}) {
  let query = db("leads").orderBy("created_at", "desc");
  if (tenantId) query = query.where({ tenant_id: tenantId });

  const leads = await query;
  return leads.map((lead) => ({
    status: "new",
    next_action: null,
    notes: null,
    owner: null,
    ...lead
  }));
}

module.exports = { createLead, updateLead, listLeads };
