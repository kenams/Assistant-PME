const PDFDocument = require("pdfkit");

function buildTicketsPdf({ tickets, filters, tenantName }) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    doc.fontSize(18).text("Assistant Support IT", { align: "left" });
    doc.fontSize(10).fillColor("#666").text("Concu par Kah-Digital", {
      align: "left"
    });
    doc.moveDown(0.5);
    doc.fillColor("#111").fontSize(12).text(`Organisation: ${tenantName || "PME"}`);
    doc.moveDown(0.5);

    const filterSummary = [];
    if (filters.from) filterSummary.push(`Depuis: ${filters.from}`);
    if (filters.to) filterSummary.push(`Jusqu'au: ${filters.to}`);
    if (filters.status) filterSummary.push(`Statut: ${filters.status}`);
    if (filters.category) filterSummary.push(`Categorie: ${filters.category}`);
    if (filters.priority) filterSummary.push(`Priorite: ${filters.priority}`);
    doc
      .fontSize(10)
      .fillColor("#444")
      .text(
        filterSummary.length ? `Filtres: ${filterSummary.join(" | ")}` : "Filtres: aucun"
      );
    doc.moveDown(1);

    doc.fillColor("#111").fontSize(12).text(`Tickets: ${tickets.length}`);
    doc.moveDown(0.5);

    const tableTop = doc.y + 6;
    const colX = [40, 120, 310, 390, 460];
    doc.fontSize(10).fillColor("#000");
    doc.text("Date", colX[0], tableTop);
    doc.text("Titre", colX[1], tableTop);
    doc.text("Categorie", colX[2], tableTop);
    doc.text("Priorite", colX[3], tableTop);
    doc.text("Statut", colX[4], tableTop);
    doc.moveDown(0.5);
    doc.strokeColor("#ddd").moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.3);

    tickets.forEach((ticket) => {
      const date = ticket.created_at
        ? new Date(ticket.created_at).toLocaleString("fr-FR")
        : "";
      doc
        .fontSize(9)
        .fillColor("#111")
        .text(date, colX[0], doc.y, { width: 70 });
      doc.text(ticket.title || "", colX[1], doc.y, { width: 170 });
      doc.text(ticket.category || "", colX[2], doc.y, { width: 70 });
      doc.text(ticket.priority || "", colX[3], doc.y, { width: 60 });
      doc.text(ticket.status || "", colX[4], doc.y, { width: 70 });
      doc.moveDown(0.6);
      if (doc.y > 760) {
        doc.addPage();
      }
    });

    doc.end();
  });
}

function buildRoiPdf({ tenantName, metrics }) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    doc.fontSize(20).text("Rapport ROI Support IT", { align: "left" });
    doc.fontSize(10).fillColor("#666").text("Concu par Kah-Digital");
    doc.moveDown(0.5);
    doc.fillColor("#111").fontSize(12).text(`Organisation: ${tenantName || "PME"}`);
    doc.fontSize(10).fillColor("#444").text(`Date: ${new Date().toLocaleString("fr-FR")}`);
    doc.moveDown(1);

    const minutes = metrics.minutes_economisees || 0;
    const hours = Math.round((minutes / 60) * 10) / 10;

    const rows = [
      ["Tickets evites", metrics.tickets_evites || 0],
      ["Tickets crees", metrics.tickets_crees || 0],
      ["Minutes economisees", minutes],
      ["Heures economisees", hours],
      ["Utilisateurs actifs", metrics.utilisateurs_actifs || 0],
      ["Conversations", metrics.conversations || 0],
      ["Resolues", metrics.resolved || 0],
      ["Escaladees", metrics.escalated || 0],
      ["Taux resolution", `${metrics.resolution_rate || 0}%`]
    ];

    doc.fontSize(12).fillColor("#111").text("Synthese");
    doc.moveDown(0.5);
    rows.forEach(([label, value]) => {
      doc.fontSize(10).fillColor("#333").text(label, { continued: true, width: 220 });
      doc.fontSize(10).fillColor("#111").text(`: ${value}`);
    });

    doc.moveDown(1);
    doc.fontSize(11).fillColor("#111").text("Impact");
    doc
      .fontSize(10)
      .fillColor("#444")
      .text(
        "Ce rapport estime le temps economise par l'assistant. Utilisez-le pour communiquer le ROI aux equipes IT et direction."
      );

    doc.end();
  });
}

module.exports = { buildTicketsPdf, buildRoiPdf };
