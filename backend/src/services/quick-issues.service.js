const crypto = require("crypto");
const { db } = require("../config/db");

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
    .replace(/[̀-ͯ]/g, "")
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

async function trackQuickIssue({ tenantId, message }) {
  if (!shouldTrackMessage(message)) return null;
  const known = detectKnownIssue(message);
  const key = known ? known.key : buildCustomKey(message);
  const label = known ? known.label : buildCustomLabel(message);
  const example = known ? known.example : normalizeSpacing(message);
  const now = new Date().toISOString();

  const existing = await db("quick_issues").where({ tenant_id: tenantId, key }).first();

  if (existing) {
    const [updated] = await db("quick_issues")
      .where({ id: existing.id })
      .update({
        count: existing.count + 1,
        last_seen: now,
        label: existing.label || label || existing.label,
        example: existing.example || example || existing.example,
        updated_at: now
      })
      .returning("*");
    return { record: updated || existing, isNew: false };
  }

  const record = {
    id: crypto.randomUUID(),
    tenant_id: tenantId,
    key,
    label,
    example,
    count: 1,
    sort_order: 0,
    created_at: now,
    updated_at: now
  };
  const [inserted] = await db("quick_issues").insert(record).returning("*");
  return { record: inserted || record, isNew: true };
}

async function listQuickIssues({ tenantId, limit = 6 }) {
  const sanitizedLimit = Math.min(Math.max(Number(limit) || 6, 2), 12);
  const rows = await db("quick_issues")
    .where({ tenant_id: tenantId })
    .orderBy("sort_order", "asc")
    .orderBy("count", "desc")
    .limit(sanitizedLimit);

  return rows.map((item) => ({
    key: item.key,
    label: item.label || "Probleme",
    message: item.example || item.label || ""
  }));
}

async function searchQuickIssues({ tenantId, query, limit = 12 }) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return listQuickIssues({ tenantId, limit });
  }
  const sanitizedLimit = Math.min(Math.max(Number(limit) || 12, 2), 24);

  const rows = await db("quick_issues").where({ tenant_id: tenantId });
  return rows
    .filter((item) => {
      const lbl = normalizeText(item.label || "");
      const ex = normalizeText(item.example || "");
      return lbl.includes(normalizedQuery) || ex.includes(normalizedQuery);
    })
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
    })
    .slice(0, sanitizedLimit)
    .map((item) => ({
      key: item.key,
      label: item.label || "Probleme",
      message: item.example || item.label || ""
    }));
}

async function createQuickIssue({ tenantId, payload }) {
  const now = new Date().toISOString();
  const record = {
    id: crypto.randomUUID(),
    tenant_id: tenantId,
    label: payload.label,
    icon: payload.icon || null,
    prompt: payload.prompt || null,
    sort_order: payload.sort_order || 0,
    count: 0,
    example: payload.example || null,
    key: payload.key || buildCustomKey(payload.label || ""),
    created_at: now,
    updated_at: now
  };
  const [inserted] = await db("quick_issues").insert(record).returning("*");
  return inserted || record;
}

async function updateQuickIssue({ tenantId, id, payload }) {
  const patch = { updated_at: new Date().toISOString() };
  if (payload.label !== undefined) patch.label = payload.label;
  if (payload.icon !== undefined) patch.icon = payload.icon;
  if (payload.prompt !== undefined) patch.prompt = payload.prompt;
  if (payload.sort_order !== undefined) patch.sort_order = payload.sort_order;
  if (payload.example !== undefined) patch.example = payload.example;

  const [updated] = await db("quick_issues")
    .where({ id, tenant_id: tenantId })
    .update(patch)
    .returning("*");
  return updated || null;
}

async function deleteQuickIssue({ tenantId, id }) {
  const deleted = await db("quick_issues").where({ id, tenant_id: tenantId }).delete();
  return deleted > 0;
}

async function incrementQuickIssue({ tenantId, id }) {
  const row = await db("quick_issues").where({ id, tenant_id: tenantId }).first();
  if (!row) return null;
  const [updated] = await db("quick_issues")
    .where({ id })
    .update({ count: row.count + 1, updated_at: new Date().toISOString() })
    .returning("*");
  return updated || null;
}

module.exports = {
  trackQuickIssue,
  listQuickIssues,
  searchQuickIssues,
  createQuickIssue,
  updateQuickIssue,
  deleteQuickIssue,
  incrementQuickIssue
};
