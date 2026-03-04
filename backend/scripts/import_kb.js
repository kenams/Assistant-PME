const fs = require("fs");
const path = require("path");
const { env } = require("../src/config/env");
const { getDefaultTenantId } = require("../src/services/tenants.service");
const { ingestDocument } = require("../src/services/rag.service");

function usage() {
  console.log("Usage: node scripts/import_kb.js <file> <title> [source_type]");
  console.log("Example: node scripts/import_kb.js ./notes.txt \"Procedure VPN\" note");
}

async function main() {
  const args = process.argv.slice(2);
  const filePath = args[0];
  const title = args[1];
  const sourceType = args[2] || "note";

  if (!filePath || !title) {
    usage();
    process.exit(1);
  }

  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    console.error("File not found:", resolved);
    process.exit(1);
  }

  const content = fs.readFileSync(resolved, "utf8");
  const tenantId = getDefaultTenantId();
  if (!tenantId) {
    console.error("No tenant found. Check seed settings in .env.");
    process.exit(1);
  }

  const doc = await ingestDocument({
    tenantId,
    title,
    sourceType,
    sourceUrl: null,
    content
  });

  console.log("Imported:", doc.id, "chunks:", doc.chunk_count);
  console.log("Data store:", env.dataStorePath);
}

main();