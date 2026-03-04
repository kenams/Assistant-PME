const path = require("path");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

async function extractTextFromFile(file) {
  if (!file || !file.originalname) {
    return "";
  }

  const ext = path.extname(file.originalname).toLowerCase();

  if (ext === ".pdf") {
    const data = await pdfParse(file.buffer);
    return data.text || "";
  }

  if (ext === ".docx") {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value || "";
  }

  if (ext === ".txt" || ext === ".md") {
    return file.buffer.toString("utf8");
  }

  return file.buffer.toString("utf8");
}

module.exports = { extractTextFromFile };