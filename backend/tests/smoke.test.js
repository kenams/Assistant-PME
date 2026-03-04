const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

process.env.NODE_ENV = "development";
process.env.JWT_SECRET = "test_secret";
process.env.SEED_ADMIN_EMAIL = "admin@assistant.local";
process.env.SEED_ADMIN_PASSWORD = "admin123";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "assistant-tests-"));
process.env.DATA_STORE_PATH = path.join(tmpDir, "db.json");

const { app } = require("../src/app");

let server;
let baseUrl;
let adminToken;

before(async () => {
  server = app.listen(0);
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
  const res = await fetch(`${baseUrl}/auth/quick-admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });
  if (!res.ok) {
    throw new Error("failed_to_seed_admin_token");
  }
  const data = await res.json();
  adminToken = data.token;
});

after(async () => {
  if (!server) return;
  await new Promise((resolve) => server.close(resolve));
});

test("health returns ok", async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.ok, true);
  assert.ok(typeof data.uptime === "number");
});

test("debug paths returns app index status", async () => {
  const res = await fetch(`${baseUrl}/debug/paths`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.appIndexExists, true);
  assert.ok(data.appIndex.includes("app"));
});

test("static app entry loads", async () => {
  const res = await fetch(`${baseUrl}/app/`);
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.ok(text.includes("Assistant Support IT"));
});

test("quick admin login returns token", async () => {
  const res = await fetch(`${baseUrl}/auth/quick-admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.token);
  assert.equal(data.user.role, "admin");
  assert.ok(adminToken);
});

test("quick admin redirect includes token", async () => {
  const res = await fetch(`${baseUrl}/auth/quick-admin?redirect=/app/`, {
    redirect: "manual"
  });
  assert.equal(res.status, 302);
  const location = res.headers.get("location") || "";
  assert.ok(location.startsWith("/app/"));
  assert.ok(location.includes("token="));
});

test("login + auth/me works", async () => {
  const login = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: process.env.SEED_ADMIN_EMAIL,
      password: process.env.SEED_ADMIN_PASSWORD
    })
  });
  assert.equal(login.status, 200);
  const loginData = await login.json();
  assert.ok(loginData.token);
  const me = await fetch(`${baseUrl}/auth/me`, {
    headers: { Authorization: `Bearer ${loginData.token}` }
  });
  assert.equal(me.status, 200);
  const meData = await me.json();
  assert.equal(meData.role, "admin");
});

test("admin metrics requires auth", async () => {
  const res = await fetch(`${baseUrl}/admin/metrics`);
  assert.equal(res.status, 401);
});

test("glpi test returns not configured when disabled", async () => {
  const res = await fetch(`${baseUrl}/admin/glpi/test`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(res.status, 400);
});

test("org returns tenant info", async () => {
  const res = await fetch(`${baseUrl}/org`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.id);
  assert.ok(data.name);
});

test("org settings get + update", async () => {
  const getRes = await fetch(`${baseUrl}/org/settings`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(getRes.status, 200);
  const initial = await getRes.json();
  assert.equal(initial.escalation_threshold, 2);

  const putRes = await fetch(`${baseUrl}/org/settings`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      support_email: "support@example.com",
      support_hours: "9h-18h",
      escalation_threshold: 3,
      signature: "Kah-Digital"
    })
  });
  assert.equal(putRes.status, 200);
  const updated = await putRes.json();
  assert.equal(updated.support_email, "support@example.com");
  assert.equal(updated.escalation_threshold, 3);
});

test("kb create, list, search, delete", async () => {
  const create = await fetch(`${baseUrl}/kb/documents`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: "Procedure VPN",
      source_type: "procedure",
      content: "Verifiez le VPN puis reconnectez-vous."
    })
  });
  assert.equal(create.status, 201);
  const doc = await create.json();
  assert.ok(doc.id);

  const list = await fetch(`${baseUrl}/kb/documents`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(list.status, 200);
  const listData = await list.json();
  assert.ok(listData.items.find((item) => item.id === doc.id));

  const search = await fetch(`${baseUrl}/kb/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query: "VPN" })
  });
  assert.equal(search.status, 200);
  const searchData = await search.json();
  assert.ok(searchData.items.length >= 1);

  const del = await fetch(`${baseUrl}/kb/documents/${doc.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(del.status, 204);
});

test("chat flow + history + feedback", async () => {
  const chat = await fetch(`${baseUrl}/chat`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ message: "Outlook ne marche pas", language: "fr" })
  });
  assert.equal(chat.status, 200);
  const chatData = await chat.json();
  assert.ok(chatData.conversation_id);
  assert.ok(chatData.answer);

  const history = await fetch(
    `${baseUrl}/chat/history?conversation_id=${chatData.conversation_id}`,
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );
  assert.equal(history.status, 200);
  const historyData = await history.json();
  assert.ok(historyData.items.length >= 2);

  const feedback = await fetch(`${baseUrl}/chat/feedback`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      conversation_id: chatData.conversation_id,
      resolved: true,
      rating: 5,
      comment: "OK"
    })
  });
  assert.equal(feedback.status, 200);
  const feedbackData = await feedback.json();
  assert.equal(feedbackData.ok, true);
});

test("tickets create, list, update, export", async () => {
  const create = await fetch(`${baseUrl}/tickets`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: "Test ticket",
      summary: "Impossible de se connecter au VPN",
      category: "network",
      priority: "high"
    })
  });
  assert.equal(create.status, 201);
  const ticket = await create.json();
  assert.ok(ticket.id);

  const list = await fetch(`${baseUrl}/tickets`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(list.status, 200);
  const listData = await list.json();
  assert.ok(listData.items.find((item) => item.id === ticket.id));

  const update = await fetch(`${baseUrl}/tickets/${ticket.id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ status: "resolved", priority: "medium" })
  });
  assert.equal(update.status, 200);
  const updated = await update.json();
  assert.equal(updated.status, "resolved");

  const exportCsv = await fetch(`${baseUrl}/tickets/export.csv`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(exportCsv.status, 200);
  const csv = await exportCsv.text();
  assert.ok(csv.includes("created_at"));
});

test("leads create, list, update, export", async () => {
  const create = await fetch(`${baseUrl}/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Test Lead",
      email: "lead@example.com",
      company: "Acme",
      message: "Besoin d'une demo"
    })
  });
  assert.equal(create.status, 201);
  const lead = await create.json();
  assert.ok(lead.id);

  const list = await fetch(`${baseUrl}/leads`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(list.status, 200);
  const listData = await list.json();
  assert.ok(listData.items.find((item) => item.id === lead.id));

  const update = await fetch(`${baseUrl}/leads/${lead.id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ status: "contacted" })
  });
  assert.equal(update.status, 200);
  const updated = await update.json();
  assert.equal(updated.status, "contacted");

  const exportCsv = await fetch(`${baseUrl}/leads/export.csv`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(exportCsv.status, 200);
  const csv = await exportCsv.text();
  assert.ok(csv.includes("email"));
});

test("billing quotes and invoices", async () => {
  const quoteRes = await fetch(`${baseUrl}/billing/quotes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_name: "Client A",
      client_email: "client@example.com",
      title: "Installation",
      tax_rate: 0.2,
      items: [{ label: "Setup", qty: 1, unit_price: 1500 }]
    })
  });
  assert.equal(quoteRes.status, 201);
  const quote = await quoteRes.json();
  assert.ok(quote.id);

  const quoteEmail = await fetch(`${baseUrl}/billing/quotes/${quote.id}/email`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(quoteEmail.status, 200);
  const quoteEmailData = await quoteEmail.json();
  assert.ok(quoteEmailData.subject);

  const quotePrint = await fetch(`${baseUrl}/billing/quotes/${quote.id}/print`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(quotePrint.status, 200);
  const quoteHtml = await quotePrint.text();
  assert.ok(quoteHtml.includes("Devis"));

  const invoiceRes = await fetch(`${baseUrl}/billing/invoices`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_name: "Client B",
      client_email: "clientb@example.com",
      title: "Support",
      tax_rate: 0.2,
      items: [{ label: "Support", qty: 2, unit_price: 120 }]
    })
  });
  assert.equal(invoiceRes.status, 201);
  const invoice = await invoiceRes.json();
  assert.ok(invoice.id);

  const invoiceEmail = await fetch(
    `${baseUrl}/billing/invoices/${invoice.id}/email`,
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );
  assert.equal(invoiceEmail.status, 200);
  const invoiceEmailData = await invoiceEmail.json();
  assert.ok(invoiceEmailData.subject);

  const invoicePrint = await fetch(
    `${baseUrl}/billing/invoices/${invoice.id}/print`,
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );
  assert.equal(invoicePrint.status, 200);
  const invoiceHtml = await invoicePrint.text();
  assert.ok(invoiceHtml.includes("Facture"));
});

test("notifications list and create", async () => {
  const create = await fetch(`${baseUrl}/notifications/test`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(create.status, 201);

  const list = await fetch(`${baseUrl}/notifications`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(list.status, 200);
  const data = await list.json();
  assert.ok(Array.isArray(data.items));
});

test("users create and list", async () => {
  const create = await fetch(`${baseUrl}/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: "agent@example.com",
      password: "agent123",
      role: "agent"
    })
  });
  assert.equal(create.status, 201);
  const user = await create.json();
  assert.equal(user.role, "agent");

  const list = await fetch(`${baseUrl}/users`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(list.status, 200);
  const listData = await list.json();
  assert.ok(listData.items.find((item) => item.email === "agent@example.com"));
});
