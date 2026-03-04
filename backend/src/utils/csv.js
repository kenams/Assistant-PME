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

module.exports = { buildCsv };