function formatMoney(value) {
  if (value === null || value === undefined) {
    return "0";
  }
  return Number(value).toFixed(2);
}

function quoteEmailTemplate(quote) {
  const subject = `Devis ${quote.number} - ${quote.client_name}`;
  const bodyLines = [
    `Bonjour ${quote.client_name},`,
    "",
    "Voici votre devis.",
    "",
    `Reference: ${quote.number}`,
    `Objet: ${quote.title}`,
    `Total: ${formatMoney(quote.total)} EUR`,
    "",
    "Je reste disponible pour toute question.",
    "",
    "Cordialement,",
    "Kah-Digital"
  ];
  return { subject, body: bodyLines.join("\n") };
}

function invoiceEmailTemplate(invoice) {
  const subject = `Facture ${invoice.number} - ${invoice.client_name}`;
  const bodyLines = [
    `Bonjour ${invoice.client_name},`,
    "",
    "Veuillez trouver ci-joint votre facture.",
    "",
    `Reference: ${invoice.number}`,
    `Objet: ${invoice.title}`,
    `Total: ${formatMoney(invoice.total)} EUR`,
    "",
    "Merci pour votre confiance.",
    "",
    "Cordialement,",
    "Kah-Digital"
  ];
  return { subject, body: bodyLines.join("\n") };
}

module.exports = { quoteEmailTemplate, invoiceEmailTemplate, formatMoney };