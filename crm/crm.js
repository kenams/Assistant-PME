const API_BASE = "http://localhost:3001";
      const loginCard = document.getElementById("loginCard");
      const loginForm = document.getElementById("loginForm");
      const loginStatus = document.getElementById("loginStatus");
      const statusBanner = document.getElementById("statusBanner");
      const sessionBadge = document.getElementById("sessionBadge");
      const presentationToggle = document.getElementById("presentationToggle");
      const quickAdminBtn = document.getElementById("quickAdminBtn");
      const refreshBtn = document.getElementById("refreshBtn");
      const exportBtn = document.getElementById("exportBtn");
      const logoutBtn = document.getElementById("logoutBtn");
      const leadsTable = document.getElementById("leadsTable").querySelector("tbody");
      const searchInput = document.getElementById("searchInput");
      const statusFilter = document.getElementById("statusFilter");
      const leadStatuses = ["new", "contacted", "demo", "proposal", "won", "lost"];

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

      function setSessionBadge(role, email) {
        if (!sessionBadge) return;
        if (!role) {
          sessionBadge.className = "session-badge hidden";
          sessionBadge.textContent = "";
          sessionBadge.removeAttribute("title");
          return;
        }
        const label = role === "admin" ? "Admin connecte" : "Connecte";
        sessionBadge.textContent = label;
        sessionBadge.className = `session-badge ${role}`;
        if (email) {
          sessionBadge.title = email;
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

      async function fetchWithAuth(path) {
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
          throw new Error("unauthorized");
        }
        return res.json();
      }

      async function updateLead(id, payload) {
        const token = getToken();
        const res = await fetch(`${API_BASE}/leads/${id}`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          throw new Error("update_failed");
        }
        return res.json();
      }

      async function downloadCsv(path, filename) {
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
          }
          throw new Error("download_failed");
        }
        const text = await res.text();
        const blob = new Blob([text], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      }

      function renderLeads(leads) {
        const query = (searchInput.value || "").toLowerCase();
        const status = statusFilter.value;
        const filtered = leads.filter((lead) => {
          const matchesQuery =
            !query ||
            `${lead.name} ${lead.email} ${lead.company}`
              .toLowerCase()
              .includes(query);
          const matchesStatus = !status || lead.status === status;
          return matchesQuery && matchesStatus;
        });

        leadsTable.innerHTML = filtered
          .map(
            (lead) =>
              `<tr>
                <td>${lead.created_at ? new Date(lead.created_at).toLocaleString() : ""}</td>
                <td>${lead.name || ""}</td>
                <td>${lead.email || ""}</td>
                <td>${lead.company || ""}</td>
                <td>
                  <select data-lead-status="${lead.id}">
                    ${leadStatuses
                      .map(
                        (statusValue) =>
                          `<option value="${statusValue}" ${
                            lead.status === statusValue ? "selected" : ""
                          }>${statusValue}</option>`
                      )
                      .join("")}
                  </select>
                </td>
                <td><input data-lead-next="${lead.id}" value="${lead.next_action || ""}" /></td>
                <td><input data-lead-notes="${lead.id}" value="${lead.notes || ""}" /></td>
                <td><input data-lead-owner="${lead.id}" value="${lead.owner || ""}" /></td>
                <td><button class="btn ghost" data-lead-save="${lead.id}">Sauver</button></td>
              </tr>`
          )
          .join("");

        document.querySelectorAll("[data-lead-save]").forEach((button) => {
          button.addEventListener("click", async () => {
            const id = button.getAttribute("data-lead-save");
            const statusValue = document.querySelector(`[data-lead-status="${id}"]`).value;
            const nextAction = document.querySelector(`[data-lead-next="${id}"]`).value;
            const notes = document.querySelector(`[data-lead-notes="${id}"]`).value;
            const owner = document.querySelector(`[data-lead-owner="${id}"]`).value;
            try {
              await updateLead(id, {
                status: statusValue,
                next_action: nextAction || undefined,
                notes: notes || undefined,
                owner: owner || undefined
              });
            } catch (err) {
              setStatus("Mise a jour impossible", true);
            }
          });
        });
      }

      async function refreshData() {
        try {
          const leads = await fetchWithAuth("/leads");
          renderLeads(leads.items || []);
        } catch (err) {
          setStatus("Session expiree", true);
          loginCard.style.display = "block";
          setSessionBadge(null);
          setBanner("Session expiree. Merci de vous reconnecter.", "info");
        }
      }

      async function loadSession() {
        try {
          const me = await fetchWithAuth("/auth/me");
          setSessionBadge(me.role, me.email);
        } catch (err) {
          setSessionBadge(null);
        }
      }

      loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(loginForm);
        try {
          await login(formData.get("email"), formData.get("password"));
          loginCard.style.display = "none";
          setBanner(null);
          await loadSession();
          refreshData();
        } catch (err) {
          setStatus("Identifiants invalides", true);
        }
      });

      bootstrapTokenFromUrl();
      initPresentationMode();

      if (quickAdminBtn) {
        quickAdminBtn.addEventListener("click", async (event) => {
          event.preventDefault();
          try {
            setStatus("Connexion rapide en cours...", false);
            await quickAdminLogin();
            loginCard.style.display = "none";
            setBanner(null);
            await loadSession();
            refreshData();
          } catch (err) {
            const fallback = quickAdminBtn.getAttribute("href");
            if (fallback) {
              window.location.href = fallback;
              return;
            }
            setStatus("Connexion rapide impossible", true);
          }
        });
      }

      refreshBtn.addEventListener("click", refreshData);
      exportBtn.addEventListener("click", async () => {
        try {
          await downloadCsv("/leads/export.csv", "leads.csv");
        } catch (err) {
          setStatus("Export impossible", true);
        }
      });

      logoutBtn.addEventListener("click", () => {
        setToken("");
        loginCard.style.display = "block";
        setSessionBadge(null);
        setBanner(null);
      });

      if (presentationToggle) {
        presentationToggle.addEventListener("click", () => {
          const enabled = !document.body.classList.contains("presentation");
          setPresentationMode(enabled);
        });
      }

      searchInput.addEventListener("input", refreshData);
      statusFilter.addEventListener("change", refreshData);

      if (getToken()) {
        loginCard.style.display = "none";
        loadSession();
        refreshData();
      }
