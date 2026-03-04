const fs = require("fs");
const path = require("path");
const terser = require("terser");

const root = path.join(__dirname, "..", "..");
const targets = [
  { src: path.join(root, "app", "app.js"), out: path.join(root, "app", "app.min.js") },
  {
    src: path.join(root, "dashboard", "dashboard.js"),
    out: path.join(root, "dashboard", "dashboard.min.js")
  },
  { src: path.join(root, "crm", "crm.js"), out: path.join(root, "crm", "crm.min.js") }
];

async function run() {
  for (const target of targets) {
    const code = fs.readFileSync(target.src, "utf8");
    const result = await terser.minify(code, {
      compress: true,
      mangle: true,
      format: { comments: false }
    });
    if (result.error) {
      throw result.error;
    }
    fs.writeFileSync(target.out, result.code + "\n", "utf8");
    console.log(`minified ${target.src} -> ${target.out}`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
