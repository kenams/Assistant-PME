const API_BASE = "http://localhost:3001";

const loginCard = document.getElementById("loginCard");
const loginForm = document.getElementById("loginForm");
const loginStatus = document.getElementById("loginStatus");
const quickAdminBtn = document.getElementById("quickAdminBtn");
const refreshBtn = document.getElementById("refreshBtn");
const logoutBtn = document.getElementById("logoutBtn");
const sessionBadge = document.getElementById("sessionBadge");
const mainSections = Array.from(
  document.querySelectorAll("main > section")
);

const overviewGrid = document.getElementById("overviewGrid");
const overviewBtn = document.getElementById("overviewBtn");

const tenantsReloadBtn = document.getElementById("tenantsReloadBtn");
const globalBackupBtn = document.getElementById("globalBackupBtn");
const globalRestoreInput = document.getElementById("globalRestoreInput");
const tenantForm = document.getElementById("tenantForm");
const tenantStatus = document.getElementById("tenantStatus");
const tenantsTable = document.getElementById("tenantsTable").querySelector("tbody");
const tenantImportInput = document.getElementById("tenantImportInput");

const auditRefreshBtn = document.getElementById("auditRefreshBtn");
const auditTable = document.getElementById("auditTable").querySelector("tbody");

let pendingTenantImport = null;
let currentUserEmail = "";

function getToken() {
  return localStorage.getItem("assistant_token") || "";
}

function setToken(token) {
  if (token) {
    localStorage.setItem("assistant_token", token);
  } else {
    localStorage.removeItem("assistant_token");
  }
}

function setStatus(message, isError) {
  if (!loginStatus) return;
  loginStatus.textContent = message;
  loginStatus.className = isError ? "status error" : "status";
}

function setTenantStatus(message, isError) {
  if (!tenantStatus) return;
  tenantStatus.textContent = message;
  tenantStatus.className = isError ? "status error" : "status";
}

function setSessionBadge(text) {
  if (!sessionBadge) return;
  if (text) {
    sessionBadge.textContent = text;
    sessionBadge.classList.remove("hidden");
  } else {
    sessionBadge.classList.add("hidden");
    sessionBadge.textContent = "";
  }
}

function setSectionsVisible(isAuthed) {
  mainSections.forEach((section) => {
    if (section.id === "loginCard") {
      section.style.display = isAuthed ? "none" : "block";
      return;
    }
    section.style.display = isAuthed ? "block" : "none";
  });
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString();
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

async function fetchWithAuth(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`
    }
  });
  if (res.status === 401 || res.status === 403) {
    setToken("");
    updateAuthState();
    throw new Error("unauthorized");
  }
  return res;
}

async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    throw new Error("login_failed");
  }
  const data = await res.json();
  if (!data.user || data.user.role !== "superadmin") {
    throw new Error("not_superadmin");
  }
  setToken(data.token);
  currentUserEmail = data.user.email || "";
}

async function quickAdminLogin() {
  const res = await fetch(`${API_BASE}/auth/quick-admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });
  if (!res.ok) {
    throw new Error("quick_login_failed");
  }
  const data = await res.json();
  setToken(data.token);
  currentUserEmail = data.user && data.user.email ? data.user.email : "";
}

async function loadMe() {
  const res = await fetchWithAuth("/auth/me");
  if (!res.ok) {
    throw new Error("me_failed");
  }
  const data = await res.json();
  if (data.role !== "superadmin") {
    setToken("");
    updateAuthState();
    throw new Error("not_superadmin");
  }
  currentUserEmail = data.email || "";
  setSessionBadge(currentUserEmail || "superadmin");
}

function bootstrapTokenFromUrl() {
  const url = new URL(window.location.href);
  const token = url.searchParams.get("token");
  if (!token) return;
  setToken(token);
  url.searchParams.delete("token");
  const next =
    url.pathname +
    (url.searchParams.toString() ? `?${url.searchParams.toString()}` : "") +
    url.hash;
  window.history.replaceState({}, "", next);
}

async function loadOverview() {
  const res = await fetchWithAuth("/tenants/overview");
  if (!res.ok) {
    throw new Error("overview_failed");
  }
  const data = await res.json();
  if (!overviewGrid) return;
  const items = [
    { label: "Tenants", value: data.tenants },
    { label: "Utilisateurs", value: data.users },
    { label: "Conversations", value: data.conversations },
    { label: "Messages", value: data.messages },
    { label: "Tickets", value: data.tickets },
    { label: "Leads", value: data.leads },
    { label: "Documents KB", value: data.kb_documents }
  ];
  overviewGrid.innerHTML = items
    .map(
      (item) =>
        `<div class="metric"><span>${item.label}</span><strong>${
          item.value ?? 0
        }</strong></div>`
    )
    .join("");
}

async function loadTenants() {
  const res = await fetchWithAuth("/tenants");
  if (!res.ok) {
    throw new Error("tenants_failed");
  }
  const data = await res.json();
  const rows = (data.items || []).map((tenant) => {
    const id = tenant.id;
    return `<tr>
      <td>${tenant.name}</td>
      <td>${tenant.plan || ""}</td>
      <td><code>${id}</code></td>
      <td>
        <button class="btn ghost" data-action="token" data-id="${id}">Token admin</button>
        <button class="btn ghost" data-action="export" data-id="${id}">Exporter</button>
        <button class="btn ghost" data-action="import" data-id="${id}">Importer</button>
      </td>
    </tr>`;
  });
  tenantsTable.innerHTML = rows.join("");
}

async function loadAuditLogs() {
  const res = await fetchWithAuth("/admin/audit");
  if (!res.ok) {
    throw new Error("audit_failed");
  }
  const data = await res.json();
  const rows = (data.items || []).map((item) => {
    return `<tr>
      <td>${formatDate(item.created_at)}</td>
      <td>${item.action}</td>
      <td>${item.user_id || "-"}</td>
      <td><pre>${JSON.stringify(item.meta || {}, null, 2)}</pre></td>
    </tr>`;
  });
  auditTable.innerHTML = rows.join("");
}

async function downloadGlobalBackup() {
  const res = await fetchWithAuth("/tenants/export.json");
  if (!res.ok) {
    throw new Error("backup_failed");
  }
  const blob = await res.blob();
  downloadBlob(blob, "global_backup.json");
}

async function restoreGlobalBackup(file) {
  const body = new FormData();
  body.append("file", file);
  const res = await fetchWithAuth("/tenants/import", {
    method: "POST",
    body
  });
  if (!res.ok) {
    throw new Error("restore_failed");
  }
}

async function downloadTenantBackup(tenantId) {
  const res = await fetchWithAuth(`/tenants/${tenantId}/export.json`);
  if (!res.ok) {
    throw new Error("tenant_backup_failed");
  }
  const blob = await res.blob();
  downloadBlob(blob, `tenant_${tenantId}.json`);
}

async function restoreTenantBackup(tenantId, file) {
  const body = new FormData();
  body.append("file", file);
  const res = await fetchWithAuth(`/tenants/${tenantId}/import`, {
    method: "POST",
    body
  });
  if (!res.ok) {
    throw new Error("tenant_restore_failed");
  }
}

async function generateTenantToken(tenantId) {
  const email = prompt("Email admin du tenant:");
  if (!email) return;
  const res = await fetchWithAuth(`/tenants/${tenantId}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  if (!res.ok) {
    throw new Error("token_failed");
  }
  const data = await res.json();
  if (!data.token) {
    throw new Error("token_missing");
  }
  await copyText(data.token);
  alert("Token admin copie dans le presse-papier.");
}

function updateAuthState() {
  const token = getToken();
  const isAuthed = Boolean(token);
  setSectionsVisible(isAuthed);
  setSessionBadge(isAuthed ? currentUserEmail || "superadmin" : "");
}

async function refreshAll() {
  await Promise.all([loadOverview(), loadTenants(), loadAuditLogs()]);
}

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("");
    const formData = new FormData(loginForm);
    try {
      await login(formData.get("email"), formData.get("password"));
      updateAuthState();
      await loadMe();
      await refreshAll();
    } catch (err) {
      if (err.message === "not_superadmin") {
        setStatus("Ce compte n'est pas superadmin.", true);
      } else {
        setStatus("Connexion impossible.", true);
      }
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    setToken("");
    currentUserEmail = "";
    updateAuthState();
  });
}

if (refreshBtn) {
  refreshBtn.addEventListener("click", async () => {
    try {
      await refreshAll();
    } catch (err) {
      setStatus("Rafraichissement impossible.", true);
    }
  });
}

if (overviewBtn) {
  overviewBtn.addEventListener("click", async () => {
    try {
      await loadOverview();
    } catch (err) {
      setStatus("Impossible de charger la vue globale.", true);
    }
  });
}

if (tenantsReloadBtn) {
  tenantsReloadBtn.addEventListener("click", async () => {
    try {
      await loadTenants();
    } catch (err) {
      setTenantStatus("Chargement des tenants impossible.", true);
    }
  });
}

if (globalBackupBtn) {
  globalBackupBtn.addEventListener("click", async () => {
    try {
      await downloadGlobalBackup();
    } catch (err) {
      setTenantStatus("Backup global impossible.", true);
    }
  });
}

if (globalRestoreInput) {
  globalRestoreInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      await restoreGlobalBackup(file);
      setTenantStatus("Restore global termine.");
      await refreshAll();
    } catch (err) {
      setTenantStatus("Restore global impossible.", true);
    } finally {
      globalRestoreInput.value = "";
    }
  });
}

if (tenantForm) {
  tenantForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setTenantStatus("");
    const formData = new FormData(tenantForm);
    const payload = {
      name: formData.get("name"),
      plan: formData.get("plan"),
      admin_email: formData.get("admin_email"),
      admin_password: formData.get("admin_password")
    };
    try {
      const res = await fetchWithAuth("/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        if (res.status === 409) {
          setTenantStatus("Email admin deja utilise.", true);
        } else {
          setTenantStatus("Creation impossible.", true);
        }
        return;
      }
      tenantForm.reset();
      setTenantStatus("Tenant cree.");
      await loadTenants();
    } catch (err) {
      setTenantStatus("Creation impossible.", true);
    }
  });
}

if (tenantImportInput) {
  tenantImportInput.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    const tenantId = pendingTenantImport;
    if (!file || !tenantId) return;
    try {
      await restoreTenantBackup(tenantId, file);
      setTenantStatus("Import termine.");
      await loadTenants();
    } catch (err) {
      setTenantStatus("Import impossible.", true);
    } finally {
      pendingTenantImport = null;
      tenantImportInput.value = "";
    }
  });
}

if (tenantsTable) {
  tenantsTable.addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const tenantId = button.dataset.id;
    const action = button.dataset.action;
    try {
      if (action === "export") {
        await downloadTenantBackup(tenantId);
      }
      if (action === "import") {
        pendingTenantImport = tenantId;
        tenantImportInput.click();
      }
      if (action === "token") {
        await generateTenantToken(tenantId);
      }
    } catch (err) {
      setTenantStatus("Action impossible.", true);
    }
  });
}

if (auditRefreshBtn) {
  auditRefreshBtn.addEventListener("click", async () => {
    try {
      await loadAuditLogs();
    } catch (err) {
      setStatus("Chargement logs impossible.", true);
    }
  });
}

if (quickAdminBtn) {
  quickAdminBtn.addEventListener("click", async (event) => {
    event.preventDefault();
    try {
      setStatus("Connexion rapide en cours...", false);
      await quickAdminLogin();
      updateAuthState();
      await loadMe();
      await refreshAll();
      setStatus("", false);
    } catch (err) {
      const fallback = quickAdminBtn.getAttribute("href");
      if (fallback) {
        window.location.href = fallback;
        return;
      }
      setStatus("Connexion rapide impossible.", true);
    }
  });
}

bootstrapTokenFromUrl();
updateAuthState();
if (getToken()) {
  loadMe()
    .then(() => refreshAll())
    .catch(() => {
      setStatus("Session invalide.", true);
    });
}
