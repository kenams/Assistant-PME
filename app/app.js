const API_BASE = "http://localhost:3001";
      const loginCard = document.getElementById("loginCard");
      const loginForm = document.getElementById("loginForm");
      const loginStatus = document.getElementById("loginStatus");
      const refreshBtn = document.getElementById("refreshBtn");
      const logoutBtn = document.getElementById("logoutBtn");
      const netStatus = document.getElementById("netStatus");
      const statusBanner = document.getElementById("statusBanner");
      const sessionBadge = document.getElementById("sessionBadge");
      const presentationToggle = document.getElementById("presentationToggle");
      const quickAdminBtn = document.getElementById("quickAdminBtn");
      const demoBtn = document.getElementById("demoBtn");
      const demoBtnInline = document.getElementById("demoBtnInline");

      const chatWindow = document.getElementById("chatWindow");
      const chatForm = document.getElementById("chatForm");
      const chatSources = document.getElementById("chatSources");
      const newChatBtn = document.getElementById("newChatBtn");
      const convoList = document.getElementById("convoList");
      const convoSearchInput = document.getElementById("convoSearchInput");
      const convoSearchBtn = document.getElementById("convoSearchBtn");
      const historySearch = document.getElementById("historySearch");
      const chatTickets = document.getElementById("chatTickets");
      const langSelect = document.getElementById("langSelect");
      const feedbackBox = document.getElementById("feedbackBox");
      const resolveYesBtn = document.getElementById("resolveYesBtn");
      const resolveNoBtn = document.getElementById("resolveNoBtn");
      const ratingSelect = document.getElementById("ratingSelect");
      const feedbackComment = document.getElementById("feedbackComment");

      const kbForm = document.getElementById("kbForm");
      const kbBulkForm = document.getElementById("kbBulkForm");
      const kbUploadForm = document.getElementById("kbUploadForm");
      const kbList = document.getElementById("kbList");
      const kbSearchInput = document.getElementById("kbSearchInput");
      const kbSearchBtn = document.getElementById("kbSearchBtn");
      const dropZone = document.getElementById("dropZone");
      const kbFilesInput = document.getElementById("kbFilesInput");

      const ticketsCard = document.getElementById("ticketsCard");
      const ticketForm = document.getElementById("ticketForm");
      const ticketsTable = document.getElementById("ticketsTable").querySelector("tbody");
      const reloadTicketsBtn = document.getElementById("reloadTicketsBtn");
      const ticketUserFilter = document.getElementById("ticketUserFilter");
      const ticketUserFilterBtn = document.getElementById("ticketUserFilterBtn");

      const usersCard = document.getElementById("usersCard");
      const userForm = document.getElementById("userForm");
      const usersTable = document.getElementById("usersTable").querySelector("tbody");
      const reloadUsersBtn = document.getElementById("reloadUsersBtn");
      const adminToolsCard = document.getElementById("adminToolsCard");
      const auditTable = document.getElementById("auditTable").querySelector("tbody");
      const activityTable = document.getElementById("activityTable").querySelector("tbody");
      const backupBtn = document.getElementById("backupBtn");
      const restoreInput = document.getElementById("restoreInput");
      const kbExportJsonBtn = document.getElementById("kbExportJsonBtn");
      const kbExportCsvBtn = document.getElementById("kbExportCsvBtn");
      const kbImportInput = document.getElementById("kbImportInput");
      const glpiTestBtn = document.getElementById("glpiTestBtn");
      const convoExportJsonBtn = document.getElementById("convoExportJsonBtn");
      const convoExportCsvBtn = document.getElementById("convoExportCsvBtn");

      const notificationsCard = document.getElementById("notificationsCard");
      const notificationsTable = document
        .getElementById("notificationsTable")
        .querySelector("tbody");
      const reloadNotificationsBtn = document.getElementById("reloadNotificationsBtn");
      const testNotificationBtn = document.getElementById("testNotificationBtn");
      const webhookNotificationBtn = document.getElementById("webhookNotificationBtn");

      const orgSettingsCard = document.getElementById("orgSettingsCard");
      const orgSettingsForm = document.getElementById("orgSettingsForm");
      const orgSettingsReloadBtn = document.getElementById("orgSettingsReloadBtn");
      const orgSettingsStatus = document.getElementById("orgSettingsStatus");
      const orgCard = document.getElementById("orgCard");
      const orgForm = document.getElementById("orgForm");
      const orgStatus = document.getElementById("orgStatus");
      const orgReloadBtn = document.getElementById("orgReloadBtn");
      const invitesCard = document.getElementById("invitesCard");
      const inviteForm = document.getElementById("inviteForm");
      const inviteStatus = document.getElementById("inviteStatus");
      const invitesTable = document.getElementById("invitesTable").querySelector("tbody");
      const invitesReloadBtn = document.getElementById("invitesReloadBtn");
      const inviteAcceptForm = document.getElementById("inviteAcceptForm");
      const inviteAcceptStatus = document.getElementById("inviteAcceptStatus");

      let conversationId = null;
      let currentRole = null;
      let currentLang = localStorage.getItem("assistant_lang") || "fr";

      langSelect.value = currentLang;
      langSelect.addEventListener("change", () => {
        currentLang = langSelect.value;
        localStorage.setItem("assistant_lang", currentLang);
      });

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
        loginStatus.textContent = message;
        loginStatus.className = isError ? "status error" : "status";
      }

      function setOrgStatus(message, isError) {
        if (!orgSettingsStatus) return;
        orgSettingsStatus.textContent = message;
        orgSettingsStatus.className = isError ? "status error" : "status";
      }

      function setOrgInfoStatus(message, isError) {
        if (!orgStatus) return;
        orgStatus.textContent = message;
        orgStatus.className = isError ? "status error" : "status";
      }

      function setInviteStatus(message, isError) {
        if (!inviteStatus) return;
        inviteStatus.textContent = message;
        inviteStatus.className = isError ? "status error" : "status";
      }

      function setInviteAcceptStatus(message, isError) {
        if (!inviteAcceptStatus) return;
        inviteAcceptStatus.textContent = message;
        inviteAcceptStatus.className = isError ? "status error" : "status";
      }

      function notify(message, type) {
        const div = document.createElement("div");
        div.className = type === "error" ? "toast error" : "toast";
        div.textContent = message;
        document.body.appendChild(div);
        setTimeout(() => div.classList.add("show"), 10);
        setTimeout(() => {
          div.classList.remove("show");
          setTimeout(() => div.remove(), 300);
        }, 2500);
      }

      async function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
          return;
        }
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.className = "copy-input";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }

      function formatDate(value) {
        if (!value) return "";
        return new Date(value).toLocaleString();
      }

      function setNetStatus(isOnline) {
        netStatus.textContent = isOnline ? "online" : "offline";
        netStatus.className = isOnline ? "net-status" : "net-status offline";
      }

      function setSessionBadge(role, email) {
        if (!sessionBadge) return;
        if (!role) {
          sessionBadge.className = "session-badge hidden";
          sessionBadge.textContent = "";
          sessionBadge.removeAttribute("title");
          return;
        }
        const label =
          role === "admin"
            ? "Admin connecte"
            : role === "agent"
              ? "Agent connecte"
              : "Utilisateur connecte";
        sessionBadge.textContent = label;
        sessionBadge.className = `session-badge ${role}`;
        if (email) {
          sessionBadge.title = email;
        }
      }

      function setBanner(message, type) {
        if (!statusBanner) return;
        if (!message) {
          statusBanner.textContent = "";
          statusBanner.className = "status-banner hidden";
          return;
        }
        statusBanner.textContent = message;
        statusBanner.className = `status-banner ${type || ""}`.trim();
      }

      function setCache(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
      }

      function getCache(key, fallback) {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        try {
          return JSON.parse(raw);
        } catch (err) {
          return fallback;
        }
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
        setToken(data.token);
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

      function bootstrapInviteFromUrl() {
        if (!inviteAcceptForm) return;
        const url = new URL(window.location.href);
        const invite = url.searchParams.get("invite");
        if (!invite) return;
        inviteAcceptForm.invite_token.value = invite;
        url.searchParams.delete("invite");
        window.history.replaceState({}, "", url.pathname + url.search);
      }

      function setPresentationMode(enabled) {
        document.body.classList.toggle("presentation", enabled);
        if (presentationToggle) {
          presentationToggle.textContent = enabled
            ? "Quitter presentation"
            : "Mode presentation";
        }
        localStorage.setItem("assistant_presentation", enabled ? "1" : "0");
      }

      function initPresentationMode() {
        const url = new URL(window.location.href);
        const param = url.searchParams.get("mode");
        const stored = localStorage.getItem("assistant_presentation") === "1";
        if (param === "presentation") {
          setPresentationMode(true);
          url.searchParams.delete("mode");
          window.history.replaceState({}, "", url.pathname + url.search);
          return;
        }
        setPresentationMode(stored);
      }

      async function loadMe() {
        const data = await fetchWithAuth("/auth/me");
        currentRole = data.role;
        applyRoleVisibility();
        setSessionBadge(data.role, data.email);
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
        if (!res.ok) {
          if (res.status === 401) {
            setToken("");
            loginCard.style.display = "block";
            setSessionBadge(null);
            setBanner("Session expiree. Merci de vous reconnecter.", "info");
          } else {
            setBanner("Erreur serveur. Verifiez le backend.", "info");
          }
          throw new Error("request_failed");
        }
        if (res.status === 204) {
          return null;
        }
        return res.json();
      }

      async function fetchTextWithAuth(path) {
        const token = getToken();
        const res = await fetch(`${API_BASE}${path}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          if (res.status === 401) {
            setToken("");
            loginCard.style.display = "block";
            setSessionBadge(null);
            setBanner("Session expiree. Merci de vous reconnecter.", "info");
          } else {
            setBanner("Erreur serveur. Verifiez le backend.", "info");
          }
          throw new Error("request_failed");
        }
        return res.text();
      }

      async function loadOrgSettings() {
        if (!orgSettingsForm) return;
        try {
          const data = await fetchWithAuth("/org/settings");
          orgSettingsForm.support_email.value = data.support_email || "";
          orgSettingsForm.support_phone.value = data.support_phone || "";
          orgSettingsForm.support_hours.value = data.support_hours || "";
          orgSettingsForm.webhook_url.value = data.webhook_url || "";
          orgSettingsForm.webhook_secret.value = data.webhook_secret || "";
          orgSettingsForm.slack_webhook_url.value = data.slack_webhook_url || "";
          orgSettingsForm.teams_webhook_url.value = data.teams_webhook_url || "";
          orgSettingsForm.notify_on_ticket_created.checked = Boolean(
            data.notify_on_ticket_created
          );
          const threshold =
            typeof data.escalation_threshold === "number"
              ? String(data.escalation_threshold)
              : "2";
          orgSettingsForm.escalation_threshold.value = threshold;
          orgSettingsForm.signature.value = data.signature || "";
          setOrgStatus("Parametres charges", false);
        } catch (err) {
          setOrgStatus("Chargement impossible", true);
        }
      }

      async function loadOrg() {
        if (!orgForm) return;
        try {
          const data = await fetchWithAuth("/org");
          orgForm.name.value = data.name || "";
          orgForm.plan.value = data.plan || "";
          setOrgInfoStatus("Organisation chargee", false);
        } catch (err) {
          setOrgInfoStatus("Chargement organisation impossible", true);
        }
      }

      async function loadInvites() {
        if (!invitesTable) return;
        try {
          const data = await fetchWithAuth("/users/invites");
          const items = data.items || [];
          renderInvites(items);
          setInviteStatus("Invitations chargees", false);
        } catch (err) {
          setInviteStatus("Chargement invitations impossible", true);
        }
      }

      function renderInvites(items) {
        invitesTable.innerHTML = items
          .map((invite) => {
            const expires = invite.expires_at ? formatDate(invite.expires_at) : "";
            const disabled = invite.status !== "pending" ? "disabled" : "";
            return `<tr>
              <td>${invite.email}</td>
              <td>${invite.role}</td>
              <td>${invite.status}</td>
              <td>${expires}</td>
              <td><code>${invite.token}</code></td>
              <td>
                <button class="btn ghost" data-invite-copy="${invite.token}">
                  Copier lien
                </button>
                <button class="btn ghost" data-invite-revoke="${invite.id}" ${disabled}>
                  Revoquer
                </button>
              </td>
            </tr>`;
          })
          .join("");

        document.querySelectorAll("[data-invite-copy]").forEach((button) => {
          button.addEventListener("click", async () => {
            const token = button.getAttribute("data-invite-copy");
            const link = `${window.location.origin}/app/?invite=${token}`;
            try {
              await copyText(link);
              notify("Lien copie", "info");
            } catch (err) {
              notify("Copie impossible", "error");
            }
          });
        });

        document.querySelectorAll("[data-invite-revoke]").forEach((button) => {
          button.addEventListener("click", async () => {
            const id = button.getAttribute("data-invite-revoke");
            try {
              await fetchWithAuth(`/users/invite/${id}`, { method: "DELETE" });
              loadInvites();
            } catch (err) {
              notify("Revocation impossible", "error");
            }
          });
        });
      }

      function appendMessage(role, text) {
        const bubble = document.createElement("div");
        bubble.className = `bubble ${role}`;
        bubble.textContent = text;
        chatWindow.appendChild(bubble);
        chatWindow.scrollTop = chatWindow.scrollHeight;
      }

      function renderSources(sources) {
        if (!sources || sources.length === 0) {
          chatSources.textContent = "";
          return;
        }
        const lines = sources.map((source) => {
          const title = source.document_title || "document";
          const snippet = source.snippet || source.chunk_text || "";
          const short = snippet ? ` - ${snippet.slice(0, 120)}...` : "";
          return `Source: ${title}${short}`;
        });
        chatSources.textContent = lines.join(" | ");
      }

      async function loadTickets() {
        try {
          const data = await fetchWithAuth("/tickets");
          const items = data.items || [];
          setCache("cache_tickets", items);
          renderTickets(items);
          setNetStatus(true);
        } catch (err) {
          const cached = getCache("cache_tickets", []);
          renderTickets(cached);
          setNetStatus(false);
        }
      }

      function renderTickets(items) {
        ticketsTable.innerHTML = items
          .map(
            (ticket) =>
              `<tr>
                <td>${formatDate(ticket.created_at)}</td>
                <td>${ticket.title || ""}</td>
                <td>${ticket.category || ""}</td>
                <td>${ticket.priority || ""}</td>
                <td>${ticket.status || ""}</td>
                <td>${
                  ticket.external_url
                    ? `<a class="link" href="${ticket.external_url}" target="_blank" rel="noopener">GLPI</a>`
                    : "-"
                }</td>
              </tr>`
          )
          .join("");
      }

      async function loadConversations() {
        const query = convoSearchInput.value || "";
        const suffix = query ? `?query=${encodeURIComponent(query)}` : "";
        try {
          const data = await fetchWithAuth(`/chat/conversations${suffix}`);
          const items = data.items || [];
          setCache("cache_conversations", items);
          renderConversations(items);
          updateOnboarding(items);
          setNetStatus(true);
        } catch (err) {
          const cached = getCache("cache_conversations", []);
          renderConversations(cached);
          updateOnboarding(cached);
          setNetStatus(false);
        }
      }

      function renderConversations(items) {
        convoList.innerHTML = items
          .map(
            (item) =>
              `<button class="convo-item" data-convo-id="${item.id}">
                <strong>${item.last_message || "Nouvelle conversation"}</strong>
                <span>${formatDate(item.updated_at)}</span>
              </button>`
          )
          .join("");

        document.querySelectorAll("[data-convo-id]").forEach((button) => {
          button.addEventListener("click", async () => {
            const id = button.getAttribute("data-convo-id");
            await loadConversationHistory(id);
          });
        });
      }

      function updateOnboarding(items) {
        const card = document.getElementById("onboardingCard");
        if (!card) return;
        if (items && items.length) {
          card.style.display = "none";
        } else {
          card.style.display = "block";
        }
      }

      async function searchHistory() {
        const query = convoSearchInput.value || "";
        if (!query) {
          historySearch.innerHTML = "";
          return;
        }
        try {
          const data = await fetchWithAuth(
            `/chat/search?query=${encodeURIComponent(query)}`
          );
          const items = data.items || [];
          setCache("cache_history_search", items);
          renderHistorySearch(items);
          setNetStatus(true);
        } catch (err) {
          const cached = getCache("cache_history_search", []);
          renderHistorySearch(cached);
          setNetStatus(false);
        }
      }

      function renderHistorySearch(items) {
        historySearch.innerHTML = items
          .map(
            (msg) =>
              `<div class="history-item" data-history-id="${msg.conversation_id}">
                <strong>${msg.role}</strong> - ${msg.content}
                <span>${formatDate(msg.created_at)}</span>
              </div>`
          )
          .join("");

        document.querySelectorAll("[data-history-id]").forEach((item) => {
          item.addEventListener("click", async () => {
            const id = item.getAttribute("data-history-id");
            await loadConversationHistory(id);
          });
        });
      }

      async function loadConversationHistory(id) {
        conversationId = id;
        chatWindow.innerHTML = "";
        try {
          const data = await fetchWithAuth(
            `/chat/history?conversation_id=${conversationId}`
          );
          const items = data.items || [];
          setCache(`cache_history_${id}`, items);
          items.forEach((msg) => {
            appendMessage(msg.role === "assistant" ? "assistant" : "user", msg.content);
          });
          setNetStatus(true);
        } catch (err) {
          const cached = getCache(`cache_history_${id}`, []);
          cached.forEach((msg) => {
            appendMessage(msg.role === "assistant" ? "assistant" : "user", msg.content);
          });
          setNetStatus(false);
        }
        await loadConversationTickets(conversationId);
        feedbackBox.style.display = "flex";
      }

      async function loadConversationTickets(id) {
        if (!id) {
          chatTickets.textContent = "";
          return;
        }
        try {
          const data = await fetchWithAuth(`/tickets/conversation/${id}`);
          const items = data.items || [];
          setCache(`cache_tickets_${id}`, items);
          if (!items.length) {
            chatTickets.textContent = "Aucun ticket lie a cette conversation.";
            return;
          }
          chatTickets.innerHTML = items
            .map(
              (ticket) =>
                `<div class="chat-ticket">
                  <strong>${ticket.title}</strong>
                  <span>${ticket.category} | ${ticket.priority} | ${ticket.status}</span>
                  ${
                    ticket.external_url
                      ? `<a class="link" href="${ticket.external_url}" target="_blank" rel="noopener">Ouvrir GLPI</a>`
                      : ""
                  }
                </div>`
            )
            .join("");
          setNetStatus(true);
        } catch (err) {
          const cached = getCache(`cache_tickets_${id}`, []);
          if (!cached.length) {
            chatTickets.textContent = "";
            return;
          }
          chatTickets.innerHTML = cached
            .map(
              (ticket) =>
                `<div class="chat-ticket">
                  <strong>${ticket.title}</strong>
                  <span>${ticket.category} | ${ticket.priority} | ${ticket.status}</span>
                  ${
                    ticket.external_url
                      ? `<a class="link" href="${ticket.external_url}" target="_blank" rel="noopener">Ouvrir GLPI</a>`
                      : ""
                  }
                </div>`
            )
            .join("");
          setNetStatus(false);
        }
      }

      async function loadKb() {
        try {
          const data = await fetchWithAuth("/kb/documents");
          const items = data.items || [];
          setCache("cache_kb", items);
          renderKbList(items);
          setNetStatus(true);
        } catch (err) {
          const cached = getCache("cache_kb", []);
          renderKbList(cached);
          setNetStatus(false);
        }
      }

      function renderKbList(items) {
        kbList.innerHTML = items
          .map(
            (doc) =>
              `<li>
                <div>
                  <strong>${doc.title}</strong>
                  <span class="muted">${doc.source_type} | chunks: ${doc.chunk_count}</span>
                </div>
                ${
                  currentRole === "admin" || currentRole === "agent"
                    ? `<button class="btn ghost" data-kb-delete="${doc.id}">Supprimer</button>`
                    : ""
                }
              </li>`
          )
          .join("");

        document.querySelectorAll("[data-kb-delete]").forEach((button) => {
          button.addEventListener("click", async () => {
            const id = button.getAttribute("data-kb-delete");
            try {
              await fetchWithAuth(`/kb/documents/${id}`, { method: "DELETE" });
              loadKb();
            } catch (err) {
              setStatus("Suppression impossible", true);
            }
          });
        });
      }

      async function searchKb() {
        const query = kbSearchInput.value || "";
        if (!query) {
          loadKb();
          return;
        }
        try {
          const data = await fetchWithAuth("/kb/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query })
          });
          const items = (data.items || []).map((chunk) => ({
            id: chunk.id,
            title: chunk.document_title,
            source_type: "chunk",
            chunk_count: "-",
            chunk_text: chunk.chunk_text
          }));
          kbList.innerHTML = items
            .map(
              (chunk) =>
                `<li>
                  <div>
                    <strong>${chunk.title}</strong>
                    <span class="muted">${chunk.source_type}</span>
                    <p class="snippet">${chunk.chunk_text}</p>
                  </div>
                </li>`
            )
            .join("");
          setNetStatus(true);
        } catch (err) {
          const cached = getCache("cache_kb", []);
          const filtered = cached.filter((doc) =>
            `${doc.title} ${doc.source_type}`
              .toLowerCase()
              .includes(query.toLowerCase())
          );
          renderKbList(filtered);
          setNetStatus(false);
        }
      }

      async function loadUsers() {
        try {
          const data = await fetchWithAuth("/users");
          const items = data.items || [];
          setCache("cache_users", items);
          usersTable.innerHTML = items
            .map(
              (user) =>
                `<tr>
                  <td>${formatDate(user.created_at)}</td>
                  <td>${user.email || ""}</td>
                  <td>${user.role || ""}</td>
                </tr>`
            )
            .join("");
          renderTicketUserOptions(items);
          setNetStatus(true);
        } catch (err) {
          const cached = getCache("cache_users", []);
          if (cached.length) {
            usersTable.innerHTML = cached
              .map(
                (user) =>
                  `<tr>
                    <td>${formatDate(user.created_at)}</td>
                    <td>${user.email || ""}</td>
                    <td>${user.role || ""}</td>
                  </tr>`
              )
              .join("");
          } else {
            usersCard.style.display = "none";
          }
          setNetStatus(false);
        }
      }

      function renderTicketUserOptions(items) {
        if (!ticketUserFilter) return;
        ticketUserFilter.innerHTML = [
          `<option value="">Tous</option>`,
          ...items.map((user) => `<option value="${user.id}">${user.email}</option>`)
        ].join("");
      }

      async function loadAudit() {
        try {
          const data = await fetchWithAuth("/admin/audit");
          const items = data.items || [];
          setCache("cache_audit", items);
          auditTable.innerHTML = items
            .map(
              (log) =>
                `<tr>
                  <td>${formatDate(log.created_at)}</td>
                  <td>${log.action || ""}</td>
                  <td>${log.user_id || ""}</td>
                  <td>${log.meta ? JSON.stringify(log.meta) : ""}</td>
                </tr>`
            )
            .join("");
          setNetStatus(true);
        } catch (err) {
          const cached = getCache("cache_audit", []);
          if (cached.length) {
            auditTable.innerHTML = cached
              .map(
                (log) =>
                  `<tr>
                    <td>${formatDate(log.created_at)}</td>
                    <td>${log.action || ""}</td>
                    <td>${log.user_id || ""}</td>
                    <td>${log.meta ? JSON.stringify(log.meta) : ""}</td>
                  </tr>`
              )
              .join("");
          } else {
            adminToolsCard.style.display = "none";
          }
          setNetStatus(false);
        }
      }

      async function loadActivity() {
        try {
          const data = await fetchWithAuth("/admin/activity/users");
          const items = data.items || [];
          setCache("cache_activity", items);
          renderActivity(items);
          setNetStatus(true);
        } catch (err) {
          const cached = getCache("cache_activity", []);
          renderActivity(cached);
          setNetStatus(false);
        }
      }

      function renderActivity(items) {
        activityTable.innerHTML = items
          .map(
            (item) =>
              `<tr>
                <td>${item.email || ""}</td>
                <td>${item.role || ""}</td>
                <td>${item.conversations || 0}</td>
                <td>${item.messages || 0}</td>
                <td>${item.tickets || 0}</td>
                <td>${formatDate(item.last_active)}</td>
              </tr>`
          )
          .join("");
      }

      async function loadNotifications() {
        try {
          const data = await fetchWithAuth("/notifications");
          const items = data.items || [];
          setCache("cache_notifications", items);
          renderNotifications(items);
          setNetStatus(true);
        } catch (err) {
          const cached = getCache("cache_notifications", []);
          renderNotifications(cached);
          setNetStatus(false);
        }
      }

      function renderNotifications(items) {
        notificationsTable.innerHTML = items
          .map(
            (n) =>
              `<tr>
                <td>${formatDate(n.created_at)}</td>
                <td>${n.type || ""}</td>
                <td>${n.channel || ""}</td>
                <td>${n.payload ? JSON.stringify(n.payload) : ""}</td>
              </tr>`
          )
          .join("");
      }

      loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(loginForm);
        try {
          await login(formData.get("email"), formData.get("password"));
          loginCard.style.display = "none";
          setStatus("", false);
          setBanner(null);
          await loadMe();
          refreshAll();
        } catch (err) {
          setStatus("Identifiants invalides", true);
        }
      });

      if (inviteAcceptForm) {
        inviteAcceptForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          const formData = new FormData(inviteAcceptForm);
          const token = formData.get("invite_token");
          const password = formData.get("invite_password");
          try {
            const res = await fetch(`${API_BASE}/users/invite/accept`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token, password })
            });
            if (!res.ok) {
              setInviteAcceptStatus("Activation impossible", true);
              return;
            }
            const data = await res.json();
            await login(data.email, password);
            setInviteAcceptStatus("Invitation activee", false);
            loginCard.style.display = "none";
            setBanner(null);
            await loadMe();
            refreshAll();
          } catch (err) {
            setInviteAcceptStatus("Activation impossible", true);
          }
        });
      }

      bootstrapTokenFromUrl();
      bootstrapInviteFromUrl();
      initPresentationMode();

      if (quickAdminBtn) {
        quickAdminBtn.addEventListener("click", async (event) => {
          event.preventDefault();
          try {
            setStatus("Connexion rapide en cours...", false);
            notify("Connexion rapide...", "info");
            await quickAdminLogin();
            loginCard.style.display = "none";
            setStatus("", false);
            setBanner(null);
            await loadMe();
            refreshAll();
          } catch (err) {
            const fallback = quickAdminBtn.getAttribute("href");
            if (fallback) {
              window.location.href = fallback;
              return;
            }
            setStatus("Connexion rapide impossible", true);
            notify("Connexion rapide impossible", "error");
          }
        });
      }

      if (presentationToggle) {
        presentationToggle.addEventListener("click", () => {
          const enabled = !document.body.classList.contains("presentation");
          setPresentationMode(enabled);
        });
      }

      refreshBtn.addEventListener("click", () => {
        refreshAll();
      });

      logoutBtn.addEventListener("click", () => {
        setToken("");
        loginCard.style.display = "block";
        setSessionBadge(null);
        setBanner(null);
      });

      newChatBtn.addEventListener("click", () => {
        conversationId = null;
        chatWindow.innerHTML = "";
        chatSources.textContent = "";
        chatTickets.textContent = "";
        feedbackBox.style.display = "none";
      });

      if (demoBtn) {
        demoBtn.addEventListener("click", () => runDemo());
      }
      if (demoBtnInline) {
        demoBtnInline.addEventListener("click", () => runDemo());
      }

      convoSearchBtn.addEventListener("click", (event) => {
        event.preventDefault();
        loadConversations();
        searchHistory();
      });

      convoSearchInput.addEventListener("input", () => {
        loadConversations();
        searchHistory();
      });

      chatForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(chatForm);
        const message = formData.get("message");
        if (!message) return;
        appendMessage("user", message);
        chatForm.reset();
        try {
          const payload = { message, language: currentLang };
          if (conversationId) payload.conversation_id = conversationId;
          const data = await fetchWithAuth("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          conversationId = data.conversation_id;
          appendMessage("assistant", data.answer || "");
          renderSources(data.sources || []);
          loadConversations();
          loadConversationTickets(conversationId);
          feedbackBox.style.display = "flex";
        } catch (err) {
          appendMessage("assistant", "Erreur. Verifiez le backend.");
          notify("Erreur: backend indisponible", "error");
        }
      });

      async function runDemo() {
        if (!getToken()) {
          setStatus("Connectez-vous avant la demo.", true);
          return;
        }
        conversationId = null;
        chatWindow.innerHTML = "";
        chatSources.textContent = "";
        chatTickets.textContent = "";
        feedbackBox.style.display = "none";

        if (currentRole === "admin" || currentRole === "agent") {
          try {
            await fetchWithAuth("/kb/documents", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: "Procedure Outlook - Acces",
                source_type: "procedure",
                content:
                  "1. Verifier la connexion internet. 2. Redemarrer Outlook. 3. Tester le webmail. 4. Verifier le VPN."
              })
            });
            loadKb();
          } catch (err) {
            // ignore demo KB errors
          }
        }

        const message = "Je n'ai plus acces a Outlook";
        appendMessage("user", message);
        try {
          const data = await fetchWithAuth("/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message, language: currentLang })
          });
          conversationId = data.conversation_id;
          appendMessage("assistant", data.answer || "");
          renderSources(data.sources || []);
          loadConversations();
          loadConversationTickets(conversationId);
          feedbackBox.style.display = "flex";
        } catch (err) {
          appendMessage("assistant", "Erreur. Verifiez le backend.");
          notify("Erreur: backend indisponible", "error");
        }
      }

      async function sendFeedback(resolved) {
        if (!conversationId) {
          notify("Aucune conversation active", "error");
          return;
        }
        const rating = ratingSelect.value ? Number(ratingSelect.value) : undefined;
        const comment = feedbackComment.value || undefined;
        try {
          await fetchWithAuth("/chat/feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              conversation_id: conversationId,
              resolved,
              rating,
              comment
            })
          });
          notify("Feedback envoye", "info");
        } catch (err) {
          notify("Feedback impossible", "error");
        }
      }

      resolveYesBtn.addEventListener("click", () => sendFeedback(true));
      resolveNoBtn.addEventListener("click", () => sendFeedback(false));

      kbForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(kbForm);
        const payload = {
          title: formData.get("title"),
          source_type: formData.get("source_type"),
          content: formData.get("content")
        };
        try {
          await fetchWithAuth("/kb/documents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          kbForm.reset();
          loadKb();
        } catch (err) {
          setStatus("Ajout KB impossible", true);
          notify("Ajout KB impossible", "error");
        }
      });

      if (kbBulkForm) {
        kbBulkForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          const formData = new FormData(kbBulkForm);
          const baseTitle = (formData.get("bulk_title") || "").trim();
          const sourceType = formData.get("bulk_type") || "faq";
          const raw = formData.get("bulk_content") || "";
          const lines = raw
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);
          if (!lines.length) {
            setStatus("Aucune entree a importer", true);
            return;
          }

          let success = 0;
          for (const line of lines) {
            const parts = line.split("|");
            const title = (parts[0] || "").trim();
            const content = (parts.slice(1).join("|") || "").trim();
            if (!title || !content) {
              continue;
            }
            const fullTitle = baseTitle ? `${baseTitle} - ${title}` : title;
            try {
              await fetchWithAuth("/kb/documents", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  title: fullTitle,
                  source_type: sourceType,
                  content
                })
              });
              success += 1;
            } catch (err) {
              // continue
            }
          }
          kbBulkForm.reset();
          loadKb();
          notify(`Import termine: ${success} entree(s)`, "info");
        });
      }

      kbSearchBtn.addEventListener("click", (event) => {
        event.preventDefault();
        searchKb();
      });

      kbUploadForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(kbUploadForm);
        const files = kbFilesInput.files;
        if (!files || files.length === 0) {
          setStatus("Choisissez un fichier", true);
          return;
        }
        const payload = new FormData();
        Array.from(files).forEach((file) => payload.append("files", file));
        const title = formData.get("file_title");
        const type = formData.get("file_type");
        if (title) payload.append("title", title);
        if (type) payload.append("source_type", type);
        try {
          await fetchWithAuth("/kb/upload", {
            method: "POST",
            body: payload
          });
          kbUploadForm.reset();
          loadKb();
        } catch (err) {
          setStatus("Upload KB impossible", true);
          notify("Upload KB impossible", "error");
        }
      });

      ["dragenter", "dragover"].forEach((eventName) => {
        dropZone.addEventListener(eventName, (event) => {
          event.preventDefault();
          dropZone.classList.add("active");
        });
      });

      ["dragleave", "drop"].forEach((eventName) => {
        dropZone.addEventListener(eventName, (event) => {
          event.preventDefault();
          dropZone.classList.remove("active");
        });
      });

      dropZone.addEventListener("drop", (event) => {
        const files = event.dataTransfer.files;
        if (files && files.length) {
          const dataTransfer = new DataTransfer();
          Array.from(files).forEach((file) => dataTransfer.items.add(file));
          kbFilesInput.files = dataTransfer.files;
        }
      });

      ticketForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(ticketForm);
        const payload = {
          title: formData.get("title"),
          summary: formData.get("summary"),
          category: formData.get("category"),
          priority: formData.get("priority")
        };
        try {
          await fetchWithAuth("/tickets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          ticketForm.reset();
          loadTickets();
        } catch (err) {
          setStatus("Creation ticket impossible", true);
          notify("Creation ticket impossible", "error");
        }
      });

      reloadTicketsBtn.addEventListener("click", loadTickets);
      ticketUserFilterBtn.addEventListener("click", async () => {
        const userId = ticketUserFilter.value;
        if (!userId) {
          loadTickets();
          return;
        }
        try {
          const data = await fetchWithAuth(`/tickets/user/${userId}`);
          renderTickets(data.items || []);
          setNetStatus(true);
        } catch (err) {
          setStatus("Filtre tickets impossible", true);
          setNetStatus(false);
        }
      });
      reloadUsersBtn.addEventListener("click", loadUsers);

      backupBtn.addEventListener("click", async () => {
        try {
          const text = await fetchTextWithAuth("/admin/backup");
          const blob = new Blob([text], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = "backup.json";
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(url);
        } catch (err) {
          setStatus("Backup impossible", true);
          notify("Backup impossible", "error");
        }
      });

      kbExportJsonBtn.addEventListener("click", async () => {
        try {
          const text = await fetchTextWithAuth("/admin/kb/export.json");
          const blob = new Blob([text], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = "kb_export.json";
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(url);
        } catch (err) {
          setStatus("Export KB JSON impossible", true);
          notify("Export KB JSON impossible", "error");
        }
      });

      kbExportCsvBtn.addEventListener("click", async () => {
        try {
          const text = await fetchTextWithAuth("/admin/kb/export.csv");
          const blob = new Blob([text], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = "kb_export.csv";
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(url);
        } catch (err) {
          setStatus("Export KB CSV impossible", true);
          notify("Export KB CSV impossible", "error");
        }
      });

      kbImportInput.addEventListener("change", async () => {
        const file = kbImportInput.files[0];
        if (!file) return;
        const payload = new FormData();
        payload.append("file", file);
        try {
          await fetchWithAuth("/admin/kb/import", {
            method: "POST",
            body: payload
          });
          kbImportInput.value = "";
          loadKb();
        } catch (err) {
          setStatus("Import KB impossible", true);
          notify("Import KB impossible", "error");
        }
      });

      convoExportJsonBtn.addEventListener("click", async () => {
        try {
          const text = await fetchTextWithAuth("/admin/conversations/export.json");
          const blob = new Blob([text], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = "conversations_export.json";
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(url);
        } catch (err) {
          setStatus("Export conversations JSON impossible", true);
          notify("Export conversations JSON impossible", "error");
        }
      });

      convoExportCsvBtn.addEventListener("click", async () => {
        try {
          const text = await fetchTextWithAuth("/admin/conversations/export.csv");
          const blob = new Blob([text], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = "conversations_export.csv";
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(url);
        } catch (err) {
          setStatus("Export conversations CSV impossible", true);
          notify("Export conversations CSV impossible", "error");
        }
      });

      if (glpiTestBtn) {
        glpiTestBtn.addEventListener("click", async () => {
          try {
            const data = await fetchWithAuth("/admin/glpi/test");
            if (data && data.ok) {
              notify("GLPI: connexion OK", "info");
              return;
            }
            notify("GLPI: verification impossible", "error");
          } catch (err) {
            notify("GLPI: non configure ou inaccessible", "error");
          }
        });
      }

      restoreInput.addEventListener("change", async () => {
        const file = restoreInput.files[0];
        if (!file) return;
        const payload = new FormData();
        payload.append("file", file);
        try {
          await fetchWithAuth("/admin/restore", {
            method: "POST",
            body: payload
          });
          restoreInput.value = "";
          refreshAll();
        } catch (err) {
          setStatus("Restore impossible", true);
          notify("Restore impossible", "error");
        }
      });

      reloadNotificationsBtn.addEventListener("click", loadNotifications);
      testNotificationBtn.addEventListener("click", async () => {
        try {
          await fetchWithAuth("/notifications/test", { method: "POST" });
          loadNotifications();
        } catch (err) {
          setStatus("Test notification impossible", true);
          notify("Test notification impossible", "error");
        }
      });

      webhookNotificationBtn.addEventListener("click", async () => {
        try {
          await fetchWithAuth("/notifications/webhook-local", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sample: "payload", at: new Date().toISOString() })
          });
          loadNotifications();
        } catch (err) {
          setStatus("Webhook notification impossible", true);
          notify("Webhook notification impossible", "error");
        }
      });

      if (orgSettingsForm) {
        orgSettingsForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          const formData = new FormData(orgSettingsForm);
          const payload = {
            support_email: formData.get("support_email") || "",
            support_phone: formData.get("support_phone") || "",
            support_hours: formData.get("support_hours") || "",
            signature: formData.get("signature") || "",
            webhook_url: formData.get("webhook_url") || "",
            webhook_secret: formData.get("webhook_secret") || "",
            slack_webhook_url: formData.get("slack_webhook_url") || "",
            teams_webhook_url: formData.get("teams_webhook_url") || "",
            notify_on_ticket_created: Boolean(formData.get("notify_on_ticket_created"))
          };
          const threshold = Number(formData.get("escalation_threshold") || 2);
          if (!Number.isNaN(threshold)) {
            payload.escalation_threshold = threshold;
          }
          try {
            await fetchWithAuth("/org/settings", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            });
            setOrgStatus("Parametres sauvegardes", false);
            notify("Parametres sauvegardes", "info");
          } catch (err) {
            setOrgStatus("Sauvegarde impossible", true);
            notify("Sauvegarde impossible", "error");
          }
        });
      }

      if (orgSettingsReloadBtn) {
        orgSettingsReloadBtn.addEventListener("click", () => loadOrgSettings());
      }

      if (orgForm) {
        orgForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          const formData = new FormData(orgForm);
          const payload = {
            name: formData.get("name"),
            plan: formData.get("plan") || undefined
          };
          try {
            await fetchWithAuth("/org", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            });
            setOrgInfoStatus("Organisation sauvegardee", false);
          } catch (err) {
            setOrgInfoStatus("Sauvegarde organisation impossible", true);
          }
        });
      }

      if (orgReloadBtn) {
        orgReloadBtn.addEventListener("click", () => loadOrg());
      }

      if (inviteForm) {
        inviteForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          const formData = new FormData(inviteForm);
          const payload = {
            email: formData.get("email"),
            role: formData.get("role"),
            expires_hours: Number(formData.get("expires_hours") || 72)
          };
          try {
            await fetchWithAuth("/users/invite", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            });
            inviteForm.reset();
            loadInvites();
            setInviteStatus("Invitation creee", false);
          } catch (err) {
            setInviteStatus("Creation invitation impossible", true);
          }
        });
      }

      if (invitesReloadBtn) {
        invitesReloadBtn.addEventListener("click", () => loadInvites());
      }

      userForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(userForm);
        const payload = {
          email: formData.get("email"),
          password: formData.get("password"),
          role: formData.get("role")
        };
        try {
          await fetchWithAuth("/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          userForm.reset();
          loadUsers();
        } catch (err) {
          setStatus("Creation utilisateur impossible", true);
          notify("Creation utilisateur impossible", "error");
        }
      });

      async function refreshAll() {
        const tasks = [loadKb(), loadConversations()];
        if (currentRole === "admin") {
          tasks.push(loadUsers());
          tasks.push(loadOrgSettings());
          tasks.push(loadOrg());
          tasks.push(loadInvites());
        }
        if (currentRole === "admin" || currentRole === "agent") {
          tasks.push(loadTickets());
          tasks.push(loadNotifications());
        }
        if (currentRole === "admin") {
          tasks.push(loadAudit());
          tasks.push(loadActivity());
        }
        await Promise.all(tasks);
      }

      if (getToken()) {
        loginCard.style.display = "none";
        loadMe().then(() => refreshAll());
      }

      window.addEventListener("online", () => {
        setNetStatus(true);
        setBanner(null);
      });
      window.addEventListener("offline", () => {
        setNetStatus(false);
        setBanner("Hors ligne: le backend est indisponible.", "info");
      });
      setNetStatus(navigator.onLine);

      function applyRoleVisibility() {
        if (currentRole === "admin" || currentRole === "agent") {
          usersCard.style.display = currentRole === "admin" ? "block" : "none";
          kbForm.style.display = "grid";
          kbUploadForm.style.display = "grid";
          ticketsCard.style.display = "block";
          notificationsCard.style.display = "block";
          ticketForm.style.display = "grid";
          ticketUserFilter.style.display = currentRole === "admin" ? "inline-flex" : "none";
          ticketUserFilterBtn.style.display = currentRole === "admin" ? "inline-flex" : "none";
          adminToolsCard.style.display = currentRole === "admin" ? "block" : "none";
          if (orgSettingsCard) {
            orgSettingsCard.style.display = currentRole === "admin" ? "block" : "none";
          }
          if (orgCard) {
            orgCard.style.display = currentRole === "admin" ? "block" : "none";
          }
          if (invitesCard) {
            invitesCard.style.display = currentRole === "admin" ? "block" : "none";
          }
          return;
        }
        usersCard.style.display = "none";
        kbForm.style.display = "none";
        kbUploadForm.style.display = "none";
        ticketsCard.style.display = "none";
        notificationsCard.style.display = "none";
        adminToolsCard.style.display = "none";
        if (orgSettingsCard) {
          orgSettingsCard.style.display = "none";
        }
        if (orgCard) {
          orgCard.style.display = "none";
        }
        if (invitesCard) {
          invitesCard.style.display = "none";
        }
      }
