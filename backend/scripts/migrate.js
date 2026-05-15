const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { db } = require("../src/config/db");

async function main() {
  console.log("Running migrations...");
  await db.migrate.latest({
    directory: path.join(__dirname, "..", "src", "migrations")
  });
  console.log("Migrations complete.");
  await db.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
