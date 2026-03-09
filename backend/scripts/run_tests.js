const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

process.env.DATA_STORE_PATH = path.join(
  os.tmpdir(),
  `assistant-test-${Date.now()}-${Math.random().toString(16).slice(2)}.json`
);
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";

const { withDb, loadDb } = require("../src/services/store.service");
const {
  draftTicket,
  createTicket,
  listTicketsByUser
} = require("../src/services/tickets.service");
const { createConversation } = require("../src/services/conversations.service");

function resetDb() {
  withDb((db) => {
    db.tenants = [];
    db.users = [];
    db.conversations = [];
    db.messages = [];
    db.tickets = [];
    db.kb_documents = [];
    db.kb_chunks = [];
    db.metrics_daily = [];
    db.leads = [];
    db.quotes = [];
    db.invoices = [];
    db.audit_logs = [];
    db.notifications = [];
    db.conversation_feedback = [];
    db.org_settings = [];
    db.invites = [];
    return db;
  });
}

function testDraftTicket() {
  const email = draftTicket({ message: "Outlook ne s'ouvre pas" });
  assert.equal(email.category, "email");

  const urgent = draftTicket({ message: "Serveur bloque urgent" });
  assert.equal(urgent.priority, "high");

  const printer = draftTicket({ message: "Question: imprimante" });
  assert.equal(printer.category, "printer");
  assert.equal(printer.priority, "low");
}

async function testListTicketsByUser() {
  resetDb();
  const tenantId = "tenant-test";
  const userId = "user-1";
  const otherUser = "user-2";

  const convoUser = createConversation({ tenantId, userId });
  const convoOther = createConversation({ tenantId, userId: otherUser });

  await createTicket({
    tenantId,
    conversationId: convoUser.id,
    draft: draftTicket({ message: "Outlook ne s'ouvre pas" })
  });
  await createTicket({
    tenantId,
    conversationId: convoOther.id,
    draft: draftTicket({ message: "VPN ne se connecte pas" })
  });

  const items = listTicketsByUser({ tenantId, userId });
  assert.equal(items.length, 1);
  assert.equal(items[0].conversation_id, convoUser.id);

  const db = loadDb();
  assert.equal(db.tickets.length, 2);
}

async function run() {
  try {
    testDraftTicket();
    await testListTicketsByUser();
    console.log("OK - tests passes");
    process.exit(0);
  } catch (err) {
    console.error("FAILED - tests");
    console.error(err);
    process.exit(1);
  } finally {
    const file = process.env.DATA_STORE_PATH;
    if (file && fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
      } catch (cleanupErr) {
        // ignore cleanup errors
      }
    }
  }
}

run();
