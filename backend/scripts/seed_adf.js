const { ensureSeeded } = require("../src/services/users.service");
const { loadDb } = require("../src/services/store.service");
const { seedDemoData } = require("../src/services/demo.service");
const { getTenantByCode } = require("../src/services/tenants.service");

function pickAdminUser(db, tenantId) {
  return (
    db.users.find((u) => u.tenant_id === tenantId && u.role === "admin") ||
    db.users.find((u) => u.tenant_id === tenantId) ||
    null
  );
}

async function run() {
  ensureSeeded();
  const db = loadDb();
  const tenant = getTenantByCode("ADF");
  if (!tenant) {
    console.error("Tenant ADF introuvable. Creez-le d'abord.");
    process.exit(1);
  }
  const admin = pickAdminUser(db, tenant.id);
  if (!admin) {
    console.error("Aucun utilisateur admin pour ADF.");
    process.exit(1);
  }
  const modeArg = process.argv[2] || "reset";
  const mode = modeArg === "append" ? "append" : "reset";
  const result = await seedDemoData({
    tenantId: tenant.id,
    userId: admin.id,
    mode
  });
  console.log(`Demo ADF terminee (${mode}).`);
  console.log(result);
}

run().catch((err) => {
  console.error("Erreur demo ADF:", err);
  process.exit(1);
});
