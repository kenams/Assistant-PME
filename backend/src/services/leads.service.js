const crypto = require("crypto");
const { withDb, loadDb } = require("./store.service");
const { getDefaultTenantId } = require("./tenants.service");

function createLead({ name, email, company, message }) {
  return withDb((db) => {
    const tenantId = getDefaultTenantId();
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
    db.leads.push(lead);
    return lead;
  });
}

function updateLead({ id, updates }) {
  return withDb((db) => {
    const lead = db.leads.find((item) => item.id === id);
    if (!lead) {
      return null;
    }
    lead.status = updates.status ?? lead.status;
    lead.next_action = updates.next_action ?? lead.next_action;
    lead.notes = updates.notes ?? lead.notes;
    lead.owner = updates.owner ?? lead.owner;
    return lead;
  });
}

function listLeads({ tenantId } = {}) {
  const db = loadDb();
  return db.leads
    .filter((lead) => (tenantId ? lead.tenant_id === tenantId : true))
    .map((lead) => ({
    status: "new",
    next_action: null,
    notes: null,
    owner: null,
    ...lead
  }));
}

module.exports = { createLead, updateLead, listLeads };
