const { ensureSeeded } = require("./users.service");
const { loadDb } = require("./store.service");

function getDefaultTenantId() {
  ensureSeeded();
  const db = loadDb();
  if (db.tenants.length === 0) {
    return null;
  }
  return db.tenants[0].id;
}

module.exports = { getDefaultTenantId };