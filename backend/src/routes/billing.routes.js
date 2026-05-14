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
const { createCheckoutSession, createPortalSession, handleWebhook, isConfigured, PLANS } = require("../services/stripe.service");
const { loadDb, saveDb } = require("../services/store.service");

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

// ── Stripe SaaS subscription ──────────────────────────────────────────────────

router.get("/plans", (req, res) => {
  return res.json({
    configured: isConfigured(),
    plans: Object.entries(PLANS).map(([key, p]) => ({
      id: key,
      name: p.name,
      amount_eur: (p.amount / 100).toFixed(2),
    })),
  });
});

router.post("/subscribe", authRequired, async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: "stripe_not_configured" });
  }
  const { plan, success_url, cancel_url } = req.body || {};
  try {
    const session = await createCheckoutSession({
      tenantId: req.user.tenant_id,
      plan: plan || "starter",
      customerEmail: undefined,
      successUrl: success_url,
      cancelUrl: cancel_url,
    });
    return res.json(session);
  } catch (err) {
    return res.status(500).json({ error: "stripe_error", message: err.message });
  }
});

router.post("/portal", authRequired, async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: "stripe_not_configured" });
  }
  const { customer_id, return_url } = req.body || {};
  if (!customer_id) {
    return res.status(400).json({ error: "customer_id_required" });
  }
  try {
    const session = await createPortalSession({ customerId: customer_id, returnUrl: return_url });
    return res.json(session);
  } catch (err) {
    return res.status(500).json({ error: "stripe_error", message: err.message });
  }
});

// ── Statut abonnement du tenant ───────────────────────────────────────────────
router.get("/status", authRequired, (req, res) => {
  const db = loadDb();
  const tenant = db.tenants.find(t => t.id === req.user.tenant_id);
  if (!tenant) return res.status(404).json({ error: "tenant_not_found" });
  return res.json({
    plan: tenant.subscription_plan || "free",
    status: tenant.subscription_status || "inactive",
    stripe_customer_id: tenant.stripe_customer_id || null,
    subscription_id: tenant.stripe_subscription_id || null,
    current_period_end: tenant.subscription_period_end || null,
  });
});

router.post("/webhook/stripe", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  try {
    const event = await handleWebhook({ rawBody: req.body, signature: sig });
    if (!event) return res.status(400).json({ error: "stripe_not_configured" });

    const db = loadDb();

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const tenantId = session.metadata?.tenant_id;
      const plan = session.metadata?.plan || "starter";
      if (tenantId) {
        const tenant = db.tenants.find(t => t.id === tenantId);
        if (tenant) {
          tenant.stripe_customer_id = session.customer;
          tenant.stripe_subscription_id = session.subscription;
          tenant.subscription_plan = plan;
          tenant.subscription_status = "active";
          tenant.subscription_updated_at = new Date().toISOString();
          saveDb(db);
        }
      }
    } else if (event.type === "customer.subscription.updated") {
      const sub = event.data.object;
      const tenant = db.tenants.find(t => t.stripe_customer_id === sub.customer);
      if (tenant) {
        tenant.subscription_status = sub.status;
        tenant.subscription_period_end = new Date(sub.current_period_end * 1000).toISOString();
        tenant.subscription_updated_at = new Date().toISOString();
        saveDb(db);
      }
    } else if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object;
      const tenant = db.tenants.find(t => t.stripe_customer_id === sub.customer);
      if (tenant) {
        tenant.subscription_status = "cancelled";
        tenant.subscription_plan = "free";
        tenant.subscription_updated_at = new Date().toISOString();
        saveDb(db);
      }
    }

    return res.json({ received: true });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

module.exports = router;
