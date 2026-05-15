const crypto = require("crypto");
const { db } = require("../config/db");

function todayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

async function nextNumber(table, prefix) {
  const key = todayKey();
  const count = await db(table)
    .whereRaw("number LIKE ?", [`${prefix}-${key}%`])
    .count("id as cnt")
    .first();
  const nextIndex = Number(count.cnt) + 1;
  return `${prefix}-${key}-${String(nextIndex).padStart(4, "0")}`;
}

function computeTotals(items, taxRate) {
  const subtotal = items.reduce((sum, item) => sum + item.qty * item.unit_price, 0);
  const rate = taxRate || 0;
  const taxAmount = subtotal * rate;
  const total = subtotal + taxAmount;
  return { subtotal, tax_amount: taxAmount, total };
}

function normalizeItems(items) {
  return (items || []).map((item) => ({
    label: item.label,
    qty: Number(item.qty) || 0,
    unit_price: Number(item.unit_price) || 0
  }));
}

async function createQuote({ tenantId, payload }) {
  const items = normalizeItems(payload.items);
  const totals = computeTotals(items, payload.tax_rate);
  const number = await nextNumber("quotes", "Q");
  const now = new Date().toISOString();

  const quote = {
    id: crypto.randomUUID(),
    tenant_id: tenantId,
    number,
    status: payload.status || "draft",
    title: payload.title || "Devis",
    client_name: payload.client_name,
    client_email: payload.client_email || null,
    items: JSON.stringify(items),
    tax_rate: payload.tax_rate || 0,
    subtotal: totals.subtotal,
    tax_amount: totals.tax_amount,
    total: totals.total,
    created_at: now,
    updated_at: now
  };

  const [inserted] = await db("quotes").insert(quote).returning("*");
  const result = inserted || quote;
  if (typeof result.items === "string") result.items = JSON.parse(result.items);
  return result;
}

async function updateQuote({ tenantId, id, payload }) {
  const quote = await db("quotes").where({ id, tenant_id: tenantId }).first();
  if (!quote) return null;

  const currentItems = typeof quote.items === "string" ? JSON.parse(quote.items) : (quote.items || []);
  const currentTaxRate = quote.tax_rate;

  const patch = { updated_at: new Date().toISOString() };

  if (payload.items) {
    const items = normalizeItems(payload.items);
    const totals = computeTotals(items, payload.tax_rate ?? currentTaxRate);
    patch.items = JSON.stringify(items);
    patch.subtotal = totals.subtotal;
    patch.tax_amount = totals.tax_amount;
    patch.total = totals.total;
  }

  if (payload.status !== undefined) patch.status = payload.status;
  if (payload.title !== undefined) patch.title = payload.title;
  if (payload.client_name !== undefined) patch.client_name = payload.client_name;
  if (payload.client_email !== undefined) patch.client_email = payload.client_email;
  if (payload.tax_rate !== undefined) patch.tax_rate = payload.tax_rate;

  const [updated] = await db("quotes").where({ id, tenant_id: tenantId }).update(patch).returning("*");
  if (!updated) return null;
  if (typeof updated.items === "string") updated.items = JSON.parse(updated.items);
  return updated;
}

async function listQuotes({ tenantId }) {
  const rows = await db("quotes").where({ tenant_id: tenantId }).orderBy("created_at", "desc");
  return rows.map((r) => {
    if (typeof r.items === "string") r.items = JSON.parse(r.items);
    return r;
  });
}

async function getQuoteById({ tenantId, id }) {
  const row = await db("quotes").where({ id, tenant_id: tenantId }).first();
  if (!row) return null;
  if (typeof row.items === "string") row.items = JSON.parse(row.items);
  return row;
}

async function createInvoice({ tenantId, payload }) {
  const items = normalizeItems(payload.items);
  const totals = computeTotals(items, payload.tax_rate);
  const number = await nextNumber("invoices", "F");
  const now = new Date().toISOString();

  const invoice = {
    id: crypto.randomUUID(),
    tenant_id: tenantId,
    number,
    status: payload.status || "draft",
    title: payload.title || "Facture",
    client_name: payload.client_name,
    client_email: payload.client_email || null,
    related_quote_id: payload.related_quote_id || null,
    items: JSON.stringify(items),
    tax_rate: payload.tax_rate || 0,
    subtotal: totals.subtotal,
    tax_amount: totals.tax_amount,
    total: totals.total,
    created_at: now,
    updated_at: now
  };

  const [inserted] = await db("invoices").insert(invoice).returning("*");
  const result = inserted || invoice;
  if (typeof result.items === "string") result.items = JSON.parse(result.items);
  return result;
}

async function updateInvoice({ tenantId, id, payload }) {
  const invoice = await db("invoices").where({ id, tenant_id: tenantId }).first();
  if (!invoice) return null;

  const currentTaxRate = invoice.tax_rate;
  const patch = { updated_at: new Date().toISOString() };

  if (payload.items) {
    const items = normalizeItems(payload.items);
    const totals = computeTotals(items, payload.tax_rate ?? currentTaxRate);
    patch.items = JSON.stringify(items);
    patch.subtotal = totals.subtotal;
    patch.tax_amount = totals.tax_amount;
    patch.total = totals.total;
  }

  if (payload.status !== undefined) patch.status = payload.status;
  if (payload.title !== undefined) patch.title = payload.title;
  if (payload.client_name !== undefined) patch.client_name = payload.client_name;
  if (payload.client_email !== undefined) patch.client_email = payload.client_email;
  if (payload.related_quote_id !== undefined) patch.related_quote_id = payload.related_quote_id;
  if (payload.tax_rate !== undefined) patch.tax_rate = payload.tax_rate;

  const [updated] = await db("invoices").where({ id, tenant_id: tenantId }).update(patch).returning("*");
  if (!updated) return null;
  if (typeof updated.items === "string") updated.items = JSON.parse(updated.items);
  return updated;
}

async function listInvoices({ tenantId }) {
  const rows = await db("invoices").where({ tenant_id: tenantId }).orderBy("created_at", "desc");
  return rows.map((r) => {
    if (typeof r.items === "string") r.items = JSON.parse(r.items);
    return r;
  });
}

async function getInvoiceById({ tenantId, id }) {
  const row = await db("invoices").where({ id, tenant_id: tenantId }).first();
  if (!row) return null;
  if (typeof row.items === "string") row.items = JSON.parse(row.items);
  return row;
}

module.exports = {
  createQuote,
  updateQuote,
  listQuotes,
  getQuoteById,
  createInvoice,
  updateInvoice,
  listInvoices,
  getInvoiceById
};
