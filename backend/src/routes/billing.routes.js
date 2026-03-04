const express = require("express");
const { z } = require("zod");
const { authRequired } = require("../middleware/auth");
const { validateOr400 } = require("../utils/validate");
const { buildCsv } = require("../utils/csv");
const {
  createQuote,
  updateQuote,
  listQuotes,
  getQuoteById,
  createInvoice,
  updateInvoice,
  listInvoices,
  getInvoiceById
} = require("../services/billing.service");
const { quoteEmailTemplate, invoiceEmailTemplate, formatMoney } = require("../utils/templates");

const router = express.Router();

const itemSchema = z.object({
  label: z.string().min(1),
  qty: z.number().min(0),
  unit_price: z.number().min(0)
});

const quoteSchema = z.object({
  title: z.string().min(1).optional(),
  client_name: z.string().min(1),
  client_email: z.string().email().optional(),
  status: z.enum(["draft", "sent", "accepted", "rejected"]).optional(),
  tax_rate: z.number().min(0).optional(),
  items: z.array(itemSchema).min(1)
});

const quoteUpdateSchema = quoteSchema.partial();

const invoiceSchema = z.object({
  title: z.string().min(1).optional(),
  client_name: z.string().min(1),
  client_email: z.string().email().optional(),
  status: z.enum(["draft", "sent", "paid", "overdue"]).optional(),
  tax_rate: z.number().min(0).optional(),
  related_quote_id: z.string().optional(),
  items: z.array(itemSchema).min(1)
});

const invoiceUpdateSchema = invoiceSchema.partial();

router.get("/quotes", authRequired, (req, res) => {
  const tenantId = req.user.tenant_id;
  const items = listQuotes({ tenantId });
  return res.json({ items });
});

router.post("/quotes", authRequired, (req, res) => {
  const payload = validateOr400(quoteSchema, res, req.body);
  if (!payload) {
    return;
  }
  const tenantId = req.user.tenant_id;
  const quote = createQuote({ tenantId, payload });
  return res.status(201).json(quote);
});

router.put("/quotes/:id", authRequired, (req, res) => {
  const payload = validateOr400(quoteUpdateSchema, res, req.body);
  if (!payload) {
    return;
  }
  const tenantId = req.user.tenant_id;
  const quote = updateQuote({ tenantId, id: req.params.id, payload });
  if (!quote) {
    return res.status(404).json({ error: "quote_not_found" });
  }
  return res.json(quote);
});

router.get("/quotes/export.csv", authRequired, (req, res) => {
  const tenantId = req.user.tenant_id;
  const items = listQuotes({ tenantId });
  const headers = [
    "number",
    "status",
    "title",
    "client_name",
    "client_email",
    "subtotal",
    "tax_rate",
    "tax_amount",
    "total",
    "created_at"
  ];
  const rows = items.map((quote) => [
    quote.number,
    quote.status,
    quote.title,
    quote.client_name,
    quote.client_email,
    quote.subtotal,
    quote.tax_rate,
    quote.tax_amount,
    quote.total,
    quote.created_at
  ]);
  const csv = buildCsv(headers, rows);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", "attachment; filename=\"quotes.csv\"");
  return res.send(csv);
});

router.get("/quotes/:id/email", authRequired, (req, res) => {
  const tenantId = req.user.tenant_id;
  const quote = getQuoteById({ tenantId, id: req.params.id });
  if (!quote) {
    return res.status(404).json({ error: "quote_not_found" });
  }
  return res.json(quoteEmailTemplate(quote));
});

router.get("/quotes/:id/print", authRequired, (req, res) => {
  const tenantId = req.user.tenant_id;
  const quote = getQuoteById({ tenantId, id: req.params.id });
  if (!quote) {
    return res.status(404).send("Quote not found");
  }

  const rows = quote.items
    .map(
      (item) =>
        `<tr><td>${item.label}</td><td>${item.qty}</td><td>${formatMoney(
          item.unit_price
        )} EUR</td><td>${formatMoney(
          item.qty * item.unit_price
        )} EUR</td></tr>`
    )
    .join("");

  const html = `<!doctype html>
  <html><head><meta charset="utf-8" />
  <title>Devis ${quote.number}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; }
    h1 { margin: 0 0 8px; }
    .meta { margin-bottom: 16px; color: #444; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; }
    .totals { margin-top: 16px; text-align: right; }
  </style>
  </head><body>
    <h1>Devis ${quote.number}</h1>
    <div class="meta">Client: ${quote.client_name}</div>
    <div class="meta">Objet: ${quote.title}</div>
    <table>
      <thead><tr><th>Libelle</th><th>Qty</th><th>Prix</th><th>Total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <div>Sous-total: ${formatMoney(quote.subtotal)} EUR</div>
      <div>TVA: ${formatMoney(quote.tax_amount)} EUR</div>
      <strong>Total: ${formatMoney(quote.total)} EUR</strong>
    </div>
    <p style="margin-top:24px;">Kah-Digital</p>
  </body></html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.send(html);
});

router.get("/invoices", authRequired, (req, res) => {
  const tenantId = req.user.tenant_id;
  const items = listInvoices({ tenantId });
  return res.json({ items });
});

router.post("/invoices", authRequired, (req, res) => {
  const payload = validateOr400(invoiceSchema, res, req.body);
  if (!payload) {
    return;
  }
  const tenantId = req.user.tenant_id;
  const invoice = createInvoice({ tenantId, payload });
  return res.status(201).json(invoice);
});

router.put("/invoices/:id", authRequired, (req, res) => {
  const payload = validateOr400(invoiceUpdateSchema, res, req.body);
  if (!payload) {
    return;
  }
  const tenantId = req.user.tenant_id;
  const invoice = updateInvoice({ tenantId, id: req.params.id, payload });
  if (!invoice) {
    return res.status(404).json({ error: "invoice_not_found" });
  }
  return res.json(invoice);
});

router.get("/invoices/export.csv", authRequired, (req, res) => {
  const tenantId = req.user.tenant_id;
  const items = listInvoices({ tenantId });
  const headers = [
    "number",
    "status",
    "title",
    "client_name",
    "client_email",
    "subtotal",
    "tax_rate",
    "tax_amount",
    "total",
    "created_at"
  ];
  const rows = items.map((invoice) => [
    invoice.number,
    invoice.status,
    invoice.title,
    invoice.client_name,
    invoice.client_email,
    invoice.subtotal,
    invoice.tax_rate,
    invoice.tax_amount,
    invoice.total,
    invoice.created_at
  ]);
  const csv = buildCsv(headers, rows);
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=\"invoices.csv\""
  );
  return res.send(csv);
});

router.get("/invoices/:id/email", authRequired, (req, res) => {
  const tenantId = req.user.tenant_id;
  const invoice = getInvoiceById({ tenantId, id: req.params.id });
  if (!invoice) {
    return res.status(404).json({ error: "invoice_not_found" });
  }
  return res.json(invoiceEmailTemplate(invoice));
});

router.get("/invoices/:id/print", authRequired, (req, res) => {
  const tenantId = req.user.tenant_id;
  const invoice = getInvoiceById({ tenantId, id: req.params.id });
  if (!invoice) {
    return res.status(404).send("Invoice not found");
  }

  const rows = invoice.items
    .map(
      (item) =>
        `<tr><td>${item.label}</td><td>${item.qty}</td><td>${formatMoney(
          item.unit_price
        )} EUR</td><td>${formatMoney(
          item.qty * item.unit_price
        )} EUR</td></tr>`
    )
    .join("");

  const html = `<!doctype html>
  <html><head><meta charset="utf-8" />
  <title>Facture ${invoice.number}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; }
    h1 { margin: 0 0 8px; }
    .meta { margin-bottom: 16px; color: #444; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; }
    .totals { margin-top: 16px; text-align: right; }
  </style>
  </head><body>
    <h1>Facture ${invoice.number}</h1>
    <div class="meta">Client: ${invoice.client_name}</div>
    <div class="meta">Objet: ${invoice.title}</div>
    <table>
      <thead><tr><th>Libelle</th><th>Qty</th><th>Prix</th><th>Total</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <div>Sous-total: ${formatMoney(invoice.subtotal)} EUR</div>
      <div>TVA: ${formatMoney(invoice.tax_amount)} EUR</div>
      <strong>Total: ${formatMoney(invoice.total)} EUR</strong>
    </div>
    <p style="margin-top:24px;">Kah-Digital</p>
  </body></html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.send(html);
});

module.exports = router;
