const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const rootDir = path.join(__dirname, "..", "..");
const demoMdPath = path.join(rootDir, "docs", "DEMO.md");
const outputDir = path.join(rootDir, "docs");
const outputPdf = path.join(outputDir, "DEMO.pdf");

if (!fs.existsSync(demoMdPath)) {
  console.error("DEMO.md not found:", demoMdPath);
  process.exit(1);
}

const content = fs.readFileSync(demoMdPath, "utf8");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const doc = new PDFDocument({ margin: 50 });
const stream = fs.createWriteStream(outputPdf);
doc.pipe(stream);

doc.fontSize(18).text("Assistant Support IT - Demo", { align: "left" });
doc.moveDown(0.5);
doc.fontSize(10).fillColor("#666").text(new Date().toLocaleString("fr-FR"));
doc.moveDown(1);

doc.fillColor("#111").fontSize(12);
content.split("\n").forEach((line) => {
  if (line.startsWith("# ")) {
    doc.moveDown(0.4);
    doc.fontSize(16).text(line.replace(/^# /, ""));
    doc.moveDown(0.2);
    doc.fontSize(12);
    return;
  }
  if (line.startsWith("## ")) {
    doc.moveDown(0.3);
    doc.fontSize(14).text(line.replace(/^## /, ""));
    doc.moveDown(0.1);
    doc.fontSize(12);
    return;
  }
  if (line.startsWith("- ")) {
    doc.text(`• ${line.replace(/^- /, "")}`);
    return;
  }
  if (!line.trim()) {
    doc.moveDown(0.3);
    return;
  }
  doc.text(line);
});

doc.end();

stream.on("finish", () => {
  console.log("PDF generated:", outputPdf);
});
