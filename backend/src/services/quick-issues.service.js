const crypto = require("crypto");
const { withDb, loadDb } = require("./store.service");

const ISSUE_CATALOG = [
  {
    key: "outlook",
    label: "Outlook ne s'ouvre pas",
    example: "Outlook ne s'ouvre pas sur mon poste.",
    keywords: ["outlook", "boite mail", "boite mail", "email", "mail"]
  },
  {
    key: "internet",
    label: "Plus d'internet",
    example: "Je n'ai plus internet sur mon poste.",
    keywords: ["internet", "connexion", "reseau", "réseau", "wifi", "wi-fi"]
  },
  {
    key: "printer",
    label: "Imprimante ne repond pas",
    example: "L'imprimante ne repond pas et rien ne sort.",
    keywords: ["imprimante", "impression", "printer"]
  },
  {
    key: "password",
    label: "Mot de passe oublie",
    example: "J'ai oublie mon mot de passe.",
    keywords: ["mot de passe", "mdp", "password", "reinitialiser", "reset"]
  },
  {
    key: "vpn",
    label: "VPN ne se connecte pas",
    example: "Le VPN ne se connecte pas.",
    keywords: ["vpn", "connexion distante", "teletravail", "télétravail"]
  },
  {
    key: "teams",
    label: "Teams ne s'ouvre pas",
    example: "Teams ne s'ouvre pas sur mon poste.",
    keywords: ["teams", "microsoft teams"]
  }
];

const IGNORED_MESSAGES = new Set([
  "bonjour",
  "salut",
  "merci",
  "ok",
  "daccord",
  "d'accord",
  "test",
  "hello",
  "oui",
  "non"
]);

function normalizeText(text) {
  return (text || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeSpacing(text) {
  return (text || "").toString().replace(/\s+/g, " ").trim();
}

function detectKnownIssue(message) {
  const normalized = normalizeText(message);
  if (!normalized) return null;
  for (const issue of ISSUE_CATALOG) {
    if (issue.keywords.some((keyword) => normalized.includes(normalizeText(keyword)))) {
      return issue;
    }
  }
  return null;
}

function buildCustomKey(message) {
  const normalized = normalizeText(message);
  const words = normalized
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4);
  const slug = words.join("-");
  return slug ? `custom:${slug}` : "custom";
}

function buildCustomLabel(message) {
  const trimmed = normalizeSpacing(message);
  if (!trimmed) return "Autre probleme";
  return trimmed.length > 48 ? `${trimmed.slice(0, 47)}…` : trimmed;
}

function shouldTrackMessage(message) {
  const normalized = normalizeText(message);
  if (!normalized) return false;
  if (normalized.length < 6) return false;
  if (IGNORED_MESSAGES.has(normalized)) return false;
  const words = normalized.split(/\s+/).filter(Boolean);
  return words.length >= 2;
}

function ensureQuickIssues(db) {
  if (!Array.isArray(db.quick_issues)) {
    db.quick_issues = [];
  }
}

function trackQuickIssue({ tenantId, message }) {
  if (!shouldTrackMessage(message)) return null;
  const known = detectKnownIssue(message);
  const key = known ? known.key : buildCustomKey(message);
  const label = known ? known.label : buildCustomLabel(message);
  const example = known ? known.example : normalizeSpacing(message);
  const now = new Date().toISOString();

  return withDb((db) => {
    ensureQuickIssues(db);
    const existing = db.quick_issues.find(
      (item) => item.tenant_id === tenantId && item.key === key
    );
    if (existing) {
      existing.count += 1;
      existing.last_seen = now;
      if (!existing.label && label) {
        existing.label = label;
      }
      if (!existing.example && example) {
        existing.example = example;
      }
      return { record: existing, isNew: false };
    }
    const record = {
      id: crypto.randomUUID(),
      tenant_id: tenantId,
      key,
      label,
      example,
      count: 1,
      created_at: now,
      last_seen: now
    };
    db.quick_issues.push(record);
    return { record, isNew: true };
  });
}

function listQuickIssues({ tenantId, limit = 6 }) {
  const db = loadDb();
  ensureQuickIssues(db);
  const sanitizedLimit = Math.min(Math.max(Number(limit) || 6, 2), 12);
  return db.quick_issues
    .filter((item) => item.tenant_id === tenantId)
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime();
    })
    .slice(0, sanitizedLimit)
    .map((item) => ({
      key: item.key,
      label: item.label || "Probleme",
      message: item.example || item.label || ""
    }));
}

function searchQuickIssues({ tenantId, query, limit = 12 }) {
  const db = loadDb();
  ensureQuickIssues(db);
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return listQuickIssues({ tenantId, limit });
  }
  const sanitizedLimit = Math.min(Math.max(Number(limit) || 12, 2), 24);
  return db.quick_issues
    .filter((item) => item.tenant_id === tenantId)
    .filter((item) => {
      const label = normalizeText(item.label || "");
      const example = normalizeText(item.example || "");
      return label.includes(normalizedQuery) || example.includes(normalizedQuery);
    })
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime();
    })
    .slice(0, sanitizedLimit)
    .map((item) => ({
      key: item.key,
      label: item.label || "Probleme",
      message: item.example || item.label || ""
    }));
}

module.exports = { trackQuickIssue, listQuickIssues, searchQuickIssues };
