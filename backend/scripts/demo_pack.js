const { ensureSeeded } = require("../src/services/users.service");
const { loadDb } = require("../src/services/store.service");
const { seedDemoData } = require("../src/services/demo.service");
const { env } = require("../src/config/env");

function pickTenantAndUser(db) {
  const tenant = db.tenants && db.tenants.length ? db.tenants[0] : null;
  if (!tenant) {
    return { tenant: null, user: null };
  }
  const admin =
    db.users.find(
      (item) =>
        item.tenant_id === tenant.id &&
        item.email &&
        item.email.toLowerCase() === env.seedAdminEmail.toLowerCase()
    ) || db.users.find((item) => item.tenant_id === tenant.id) || null;
  return { tenant, user: admin };
}

async function run() {
  ensureSeeded();
  const db = loadDb();
  const { tenant, user } = pickTenantAndUser(db);
  if (!tenant || !user) {
    console.error("Impossible de trouver un tenant ou un admin.");
    process.exit(1);
  }

  const modeArg = process.argv[2] || "reset";
  const mode = modeArg === "append" ? "append" : "reset";
  const result = await seedDemoData({
    tenantId: tenant.id,
    userId: user.id,
    mode
  });

  console.log(`Demo pack termine (${mode}).`);
  console.log(result);
}

run().catch((err) => {
  console.error("Erreur demo pack:", err);
  process.exit(1);
});
