const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const uploadDir = path.join(process.cwd(), "data", "uploads");

function extractUploadUrls(text) {
  if (!text) return [];
  const matches =
    String(text).match(/https?:\/\/[^\s)]+\/uploads\/[^\s)]+|\/uploads\/[^\s)]+/g) ||
    [];
  return Array.from(new Set(matches));
}

function resolveUploadPath(url) {
  const filename = path.basename(url || "");
  if (!filename) return null;
  const fullPath = path.join(uploadDir, filename);
  if (!fullPath.startsWith(uploadDir)) {
    return null;
  }
  if (!fs.existsSync(fullPath)) {
    return null;
  }
  return fullPath;
}

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

    const ticketsWithImages = tickets.filter((ticket) => {
      const urls = extractUploadUrls(ticket.description || "");
      return urls.length > 0;
    });

    if (ticketsWithImages.length) {
      doc.addPage();
      doc.fontSize(14).fillColor("#111").text("Pieces jointes");
      doc.moveDown(0.6);

      ticketsWithImages.forEach((ticket) => {
        const urls = extractUploadUrls(ticket.description || "");
        if (!urls.length) return;
        if (doc.y > 700) {
          doc.addPage();
        }
        doc.fontSize(11).fillColor("#111").text(ticket.title || "Ticket");
        doc.fontSize(9).fillColor("#444").text(
          `${ticket.category || "-"} | ${ticket.priority || "-"} | ${ticket.status || "-"}`
        );
        doc.moveDown(0.3);
        if (ticket.description) {
          doc.fontSize(9).fillColor("#333").text(ticket.description.slice(0, 600));
          doc.moveDown(0.4);
        }

        urls.forEach((url) => {
          const filePath = resolveUploadPath(url);
          if (!filePath) {
            doc.fontSize(9).fillColor("#777").text(`Image introuvable: ${url}`);
            doc.moveDown(0.2);
            return;
          }
          try {
            doc.image(filePath, {
              fit: [500, 320],
              align: "left"
            });
            doc.moveDown(0.4);
          } catch (err) {
            doc.fontSize(9).fillColor("#777").text(`Image invalide: ${url}`);
            doc.moveDown(0.2);
          }
          if (doc.y > 720) {
            doc.addPage();
          }
        });

        doc.moveDown(0.6);
      });
    }

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

function buildAnalyticsPdf({ tenantName, analytics }) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    doc.fontSize(20).text("Rapport Analytics Support IT", { align: "left" });
    doc.fontSize(10).fillColor("#666").text("Concu par Kah-Digital");
    doc.moveDown(0.5);
    doc.fillColor("#111").fontSize(12).text(`Organisation: ${tenantName || "PME"}`);
    doc.fontSize(10).fillColor("#444").text(`Date: ${new Date().toLocaleString("fr-FR")}`);
    doc.moveDown(1);

    const items = [
      ["Temps reponse moyen (min)", analytics.response_avg_minutes || 0],
      ["Temps resolution moyen (min)", analytics.resolution_avg_minutes || 0],
      ["Feedback total", analytics.feedback?.count || 0],
      ["Note moyenne", analytics.feedback?.average_rating || 0],
      ["Taux feedback resolu", `${analytics.feedback?.resolved_rate || 0}%`]
    ];

    doc.fontSize(12).fillColor("#111").text("Performance");
    doc.moveDown(0.4);
    items.forEach(([label, value]) => {
      doc.fontSize(10).fillColor("#333").text(label, { continued: true, width: 240 });
      doc.fontSize(10).fillColor("#111").text(`: ${value}`);
    });

    doc.moveDown(1);
    doc.fontSize(12).fillColor("#111").text("Tickets par categorie");
    doc.moveDown(0.4);

    const categories = analytics.tickets_by_category || {};
    Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .forEach(([category, count]) => {
        doc.fontSize(10).fillColor("#333").text(category, { continued: true, width: 200 });
        doc.fontSize(10).fillColor("#111").text(`: ${count}`);
      });

    doc.end();
  });
}

function buildUserGuidePdf({ tenantName, support }) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));

    doc.fontSize(20).text("Guide utilisateur - Support IT", { align: "left" });
    doc.fontSize(10).fillColor("#666").text("Concu par Kah-Digital");
    doc.moveDown(0.5);
    doc.fillColor("#111").fontSize(12).text(`Organisation: ${tenantName || "PME"}`);
    doc.fontSize(10).fillColor("#444").text(`Date: ${new Date().toLocaleString("fr-FR")}`);
    doc.moveDown(1);

    doc.fontSize(12).fillColor("#111").text("Demarrage rapide");
    doc.moveDown(0.4);
    const steps = [
      "1. Decrivez votre probleme avec des mots simples.",
      "2. Suivez les solutions proposees par l'assistant.",
      "3. Si le probleme persiste, creez un ticket en un clic.",
      "4. Un technicien vous recontacte avec un suivi."
    ];
    steps.forEach((step) => {
      doc.fontSize(10).fillColor("#333").text(step);
    });

    doc.moveDown(0.8);
    doc.fontSize(12).fillColor("#111").text("Quand creer un ticket ?");
    doc.moveDown(0.4);
    const hints = [
      "Si le probleme revient apres plusieurs essais.",
      "Si un message d'erreur bloque votre travail.",
      "Si le probleme concerne plusieurs postes."
    ];
    hints.forEach((hint) => {
      doc.fontSize(10).fillColor("#333").text(`- ${hint}`);
    });

    doc.moveDown(0.8);
    doc.fontSize(12).fillColor("#111").text("Support");
    doc.moveDown(0.4);
    const supportEmail = support && support.support_email ? support.support_email : "Non defini";
    const supportPhone = support && support.support_phone ? support.support_phone : "Non defini";
    const supportHours = support && support.support_hours ? support.support_hours : "Non defini";
    doc.fontSize(10).fillColor("#333").text(`Email: ${supportEmail}`);
    doc.fontSize(10).fillColor("#333").text(`Telephone: ${supportPhone}`);
    doc.fontSize(10).fillColor("#333").text(`Horaires: ${supportHours}`);

    if (support && support.signature) {
      doc.moveDown(0.6);
      doc.fontSize(10).fillColor("#444").text("Signature");
      doc.fontSize(10).fillColor("#333").text(support.signature);
    }

    doc.end();
  });
}

module.exports = {
  buildTicketsPdf,
  buildRoiPdf,
  buildAnalyticsPdf,
  buildUserGuidePdf
};
