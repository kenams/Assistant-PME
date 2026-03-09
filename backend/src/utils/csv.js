function escapeCsvValue(value) {
  if (value === null || value === undefined) {
    return "";
  }
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildCsv(headers, rows) {
  const headerLine = headers.map(escapeCsvValue).join(",");
  const lines = rows.map((row) =>
    row.map(escapeCsvValue).join(",")
  );
  return [headerLine, ...lines].join("\n");
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (inQuotes) {
      if (char === "\"" && next === "\"") {
        current += "\"";
        i += 1;
      } else if (char === "\"") {
        inQuotes = false;
      } else {
        current += char;
      }
    } else if (char === "\"") {
      inQuotes = true;
    } else if (char === ",") {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function parseCsv(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) {
    return { headers: [], rows: [] };
  }
  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  const rows = lines.slice(1).map((line) => parseCsvLine(line));
  return { headers, rows };
}

module.exports = { buildCsv, parseCsv };
