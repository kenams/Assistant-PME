function normalizeText(text) {
  return (text || "").toLowerCase();
}

const STOPWORDS = new Set([
  "les",
  "des",
  "une",
  "un",
  "pour",
  "dans",
  "avec",
  "sans",
  "sur",
  "pas",
  "plus",
  "moins",
  "tres",
  "tout",
  "toute",
  "tous",
  "toutes",
  "est",
  "sont",
  "etre",
  "avoir",
  "oui",
  "non",
  "quoi",
  "comment",
  "pourquoi",
  "when",
  "what",
  "which",
  "with",
  "this",
  "that",
  "these",
  "those",
  "there",
  "their",
  "your",
  "yours",
  "the",
  "and",
  "are",
  "was",
  "were",
  "not",
  "but",
  "from",
  "into",
  "onto",
  "about"
]);

function tokenize(text) {
  return normalizeText(text)
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length > 2)
    .filter((token) => !STOPWORDS.has(token));
}

function chunkText(text, maxLen) {
  const chunks = [];
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (!clean) {
    return chunks;
  }

  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + maxLen, clean.length);
    chunks.push(clean.slice(start, end));
    start = end;
  }

  return chunks;
}

module.exports = { normalizeText, tokenize, chunkText };
