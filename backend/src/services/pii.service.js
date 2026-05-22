// PII anonymizer — strips emails, phones, IPs, IBANs before sending to OpenAI
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const PHONE_FR = /(?:\+33|0033|0)[1-9](?:[\s.\-]?\d{2}){4}/g;
const PHONE_INTL = /\+\d{1,3}[\s\-]?\(?\d{1,4}\)?[\s\-]?\d{3,4}[\s\-]?\d{3,4}/g;
const IP_RE = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const IBAN_RE = /\b[A-Z]{2}\d{2}[A-Z0-9]{4,30}\b/g;
// French social security number (NIR)
const NIR_RE = /\b[12]\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{3}\s?\d{2}\b/g;

function anonymize(text) {
  return (text || "")
    .replace(EMAIL_RE, "[EMAIL]")
    .replace(PHONE_FR, "[TEL]")
    .replace(PHONE_INTL, "[TEL]")
    .replace(IP_RE, "[IP]")
    .replace(IBAN_RE, "[IBAN]")
    .replace(NIR_RE, "[NIR]");
}

function anonymizeChunks(kbChunks) {
  if (!kbChunks || !kbChunks.length) return kbChunks;
  return kbChunks.map(c => ({
    ...c,
    chunk_text: anonymize(c.chunk_text || "")
  }));
}

module.exports = { anonymize, anonymizeChunks };
