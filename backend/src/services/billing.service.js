const crypto = require("crypto");
const { withDb, loadDb } = require("./store.service");

function todayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function nextNumber(list, prefix) {
  const key = todayKey();
  const todayItems = list.filter((item) => item.number && item.number.includes(key));
  const nextIndex = todayItems.length + 1;
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

function createQuote({ tenantId, payload }) {
  return withDb((db) => {
    const items = normalizeItems(payload.items);
    const totals = computeTotals(items, payload.tax_rate);
    const quote = {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      number: nextNumber(db.quotes, "Q"),
      status: payload.status || "draft",
      title: payload.title || "Devis",
      client_name: payload.client_name,
      client_email: payload.client_email || null,
      items,
      tax_rate: payload.tax_rate || 0,
      ...totals,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.quotes.push(quote);
    return quote;
  });
}

function updateQuote({ tenantId, id, payload }) {
  return withDb((db) => {
    const quote = db.quotes.find(
      (item) => item.id === id && item.tenant_id === tenantId
    );
    if (!quote) {
      return null;
    }

    if (payload.items) {
      quote.items = normalizeItems(payload.items);
      const totals = computeTotals(quote.items, payload.tax_rate ?? quote.tax_rate);
      quote.subtotal = totals.subtotal;
      quote.tax_amount = totals.tax_amount;
      quote.total = totals.total;
    }

    quote.status = payload.status ?? quote.status;
    quote.title = payload.title ?? quote.title;
    quote.client_name = payload.client_name ?? quote.client_name;
    quote.client_email = payload.client_email ?? quote.client_email;
    quote.tax_rate = payload.tax_rate ?? quote.tax_rate;
    quote.updated_at = new Date().toISOString();
    return quote;
  });
}

function listQuotes({ tenantId }) {
  const db = loadDb();
  return db.quotes.filter((item) => item.tenant_id === tenantId);
}

function getQuoteById({ tenantId, id }) {
  const db = loadDb();
  return db.quotes.find((item) => item.tenant_id === tenantId && item.id === id) || null;
}

function createInvoice({ tenantId, payload }) {
  return withDb((db) => {
    const items = normalizeItems(payload.items);
    const totals = computeTotals(items, payload.tax_rate);
    const invoice = {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      number: nextNumber(db.invoices, "F"),
      status: payload.status || "draft",
      title: payload.title || "Facture",
      client_name: payload.client_name,
      client_email: payload.client_email || null,
      related_quote_id: payload.related_quote_id || null,
      items,
      tax_rate: payload.tax_rate || 0,
      ...totals,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.invoices.push(invoice);
    return invoice;
  });
}

function updateInvoice({ tenantId, id, payload }) {
  return withDb((db) => {
    const invoice = db.invoices.find(
      (item) => item.id === id && item.tenant_id === tenantId
    );
    if (!invoice) {
      return null;
    }

    if (payload.items) {
      invoice.items = normalizeItems(payload.items);
      const totals = computeTotals(
        invoice.items,
        payload.tax_rate ?? invoice.tax_rate
      );
      invoice.subtotal = totals.subtotal;
      invoice.tax_amount = totals.tax_amount;
      invoice.total = totals.total;
    }

    invoice.status = payload.status ?? invoice.status;
    invoice.title = payload.title ?? invoice.title;
    invoice.client_name = payload.client_name ?? invoice.client_name;
    invoice.client_email = payload.client_email ?? invoice.client_email;
    invoice.related_quote_id = payload.related_quote_id ?? invoice.related_quote_id;
    invoice.tax_rate = payload.tax_rate ?? invoice.tax_rate;
    invoice.updated_at = new Date().toISOString();
    return invoice;
  });
}

function listInvoices({ tenantId }) {
  const db = loadDb();
  return db.invoices.filter((item) => item.tenant_id === tenantId);
}

function getInvoiceById({ tenantId, id }) {
  const db = loadDb();
  return (
    db.invoices.find((item) => item.tenant_id === tenantId && item.id === id) ||
    null
  );
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
