const API_BASE = "http://localhost:3001";
      const loginCard = document.getElementById("loginCard");
      const loginForm = document.getElementById("loginForm");
      const loginStatus = document.getElementById("loginStatus");
      const statusBanner = document.getElementById("statusBanner");
      const sessionBadge = document.getElementById("sessionBadge");
      const presentationToggle = document.getElementById("presentationToggle");
      const quickAdminBtn = document.getElementById("quickAdminBtn");
      const refreshBtn = document.getElementById("refreshBtn");
      const exportLeadsBtn = document.getElementById("exportLeadsBtn");
      const exportTicketsBtn = document.getElementById("exportTicketsBtn");
      const exportTicketsPdfBtn = document.getElementById("exportTicketsPdfBtn");
      const exportRoiPdfBtn = document.getElementById("exportRoiPdfBtn");
      const exportQuotesBtn = document.getElementById("exportQuotesBtn");
      const exportInvoicesBtn = document.getElementById("exportInvoicesBtn");
      const logoutBtn = document.getElementById("logoutBtn");
      const metricsGrid = document.getElementById("metricsGrid");
      const monitoringGrid = document.getElementById("monitoringGrid");
      const monitoringRoutes = document.getElementById("monitoringRoutes");
      const monitoringRefreshBtn = document.getElementById("monitoringRefreshBtn");
      const analyticsGrid = document.getElementById("analyticsGrid");
      const analyticsBars = document.getElementById("analyticsBars");
      const analyticsRefreshBtn = document.getElementById("analyticsRefreshBtn");
      const leadsTable = document.getElementById("leadsTable").querySelector("tbody");
      const ticketsTable = document.getElementById("ticketsTable").querySelector("tbody");
      const quotesTable = document.getElementById("quotesTable").querySelector("tbody");
      const invoicesTable = document.getElementById("invoicesTable").querySelector("tbody");
      const quoteForm = document.getElementById("quoteForm");
      const invoiceForm = document.getElementById("invoiceForm");
      const leadStatuses = ["new", "contacted", "demo", "proposal", "won", "lost"];
      const ticketFrom = document.getElementById("ticketFrom");
      const ticketTo = document.getElementById("ticketTo");
      const ticketStatus = document.getElementById("ticketStatus");
      const ticketPriority = document.getElementById("ticketPriority");
      const ticketCategory = document.getElementById("ticketCategory");
      const ticketFilterBtn = document.getElementById("ticketFilterBtn");
      const ticketResetBtn = document.getElementById("ticketResetBtn");
      const exportTicketsFilteredBtn = document.getElementById("exportTicketsFilteredBtn");

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

      function formatDate(value) {
        if (!value) return "";
        const date = new Date(value);
        return date.toLocaleString();
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
          throw new Error("Login failed");
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
          throw new Error("Unauthorized");
        }
        return res.json();
      }

      async function fetchHtmlWithAuth(path) {
        const token = getToken();
        const res = await fetch(`${API_BASE}${path}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) {
          throw new Error("Unauthorized");
        }
        return res.text();
      }

      async function postWithAuth(path, payload) {
        const token = getToken();
        const res = await fetch(`${API_BASE}${path}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          throw new Error("request_failed");
        }
        return res.json();
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

      function parseItems(raw) {
        return raw
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const parts = line.split("|");
            return {
              label: (parts[0] || "").trim(),
              qty: Number(parts[1] || 0),
              unit_price: Number(parts[2] || 0)
            };
          })
          .filter((item) => item.label);
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

      async function downloadBlob(path, filename, type) {
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
        const blob = await res.blob();
        const url = URL.createObjectURL(new Blob([blob], { type }));
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      }

      function renderMetrics(metrics) {
        const items = [
          { label: "Tickets crees", value: metrics.tickets_crees || 0 },
          { label: "Tickets evites", value: metrics.tickets_evites || 0 },
          { label: "Minutes economisees", value: metrics.minutes_economisees || 0 },
          { label: "Utilisateurs actifs", value: metrics.utilisateurs_actifs || 0 },
          { label: "Conversations", value: metrics.conversations || 0 },
          { label: "Resolues", value: metrics.resolved || 0 },
          { label: "Escaladees", value: metrics.escalated || 0 },
          { label: "Taux resolution", value: `${metrics.resolution_rate || 0}%` }
        ];

        metricsGrid.innerHTML = items
          .map(
            (item) =>
              `<div class="metric"><span>${item.label}</span><strong>${item.value}</strong></div>`
          )
          .join("");
      }

      function renderMonitoring(system) {
        if (!system) {
          monitoringGrid.innerHTML = "";
          monitoringRoutes.innerHTML = "";
          return;
        }
        const items = [
          { label: "Uptime (s)", value: system.uptime_seconds || 0 },
          { label: "Requetes", value: system.total_requests || 0 },
          { label: "Erreurs", value: system.total_errors || 0 },
          { label: "Taux erreur", value: `${system.error_rate || 0}%` },
          { label: "Latence moyenne", value: `${system.avg_latency_ms || 0} ms` },
          { label: "RAM RSS", value: `${system.memory_mb?.rss || 0} MB` }
        ];

        monitoringGrid.innerHTML = items
          .map(
            (item) =>
              `<div class="metric"><span>${item.label}</span><strong>${item.value}</strong></div>`
          )
          .join("");

        const routes = (system.top_routes || [])
          .map((route) => `<div><strong>${route.route}</strong> — ${route.count}</div>`)
          .join("");
        monitoringRoutes.innerHTML = routes
          ? `<div class="status">Routes les plus sollicitees</div>${routes}`
          : `<div class="status">Aucune requete suivie.</div>`;
      }

      function renderAnalytics(analytics) {
        if (!analytics) {
          analyticsGrid.innerHTML = "";
          analyticsBars.innerHTML = "";
          return;
        }
        const items = [
          {
            label: "Temps reponse moyen",
            value: `${analytics.response_avg_minutes || 0} min`
          },
          {
            label: "Temps resolution moyen",
            value: `${analytics.resolution_avg_minutes || 0} min`
          },
          {
            label: "Feedback",
            value: `${analytics.feedback?.average_rating || 0}/5`
          },
          {
            label: "Taux feedback resolu",
            value: `${analytics.feedback?.resolved_rate || 0}%`
          }
        ];
        analyticsGrid.innerHTML = items
          .map(
            (item) =>
              `<div class="metric"><span>${item.label}</span><strong>${item.value}</strong></div>`
          )
          .join("");

        const categories = analytics.tickets_by_category || {};
        const rows = Object.entries(categories)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6);
        const max = rows.length ? rows[0][1] : 1;
        analyticsBars.innerHTML = rows.length
          ? rows
              .map(
                ([label, value]) =>
                  `<div class="bar-row"><span>${label}</span><div class="bar"><span style="width:${
                    (value / max) * 100
                  }%"></span></div><strong>${value}</strong></div>`
              )
              .join("")
          : `<div class="status">Aucune donnee categorie.</div>`;
      }

      function renderLeads(leads) {
        leadsTable.innerHTML = leads
          .map(
            (lead) =>
              `<tr>
                <td>${formatDate(lead.created_at)}</td>
                <td>${lead.name || ""}</td>
                <td>${lead.email || ""}</td>
                <td>${lead.company || ""}</td>
                <td>${lead.message || ""}</td>
                <td>
                  <select data-lead-status="${lead.id}">
                    ${leadStatuses
                      .map(
                        (status) =>
                          `<option value="${status}" ${
                            lead.status === status ? "selected" : ""
                          }>${status}</option>`
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
            const status = document.querySelector(`[data-lead-status="${id}"]`).value;
            const nextAction = document.querySelector(`[data-lead-next="${id}"]`).value;
            const notes = document.querySelector(`[data-lead-notes="${id}"]`).value;
            const owner = document.querySelector(`[data-lead-owner="${id}"]`).value;
            try {
              await updateLead(id, {
                status,
                next_action: nextAction || undefined,
                notes: notes || undefined,
                owner: owner || undefined
              });
              setStatus("Lead mis a jour", false);
            } catch (err) {
              setStatus("Mise a jour impossible", true);
            }
          });
        });
      }

      function renderTickets(tickets) {
        ticketsTable.innerHTML = tickets
          .map(
            (ticket) =>
              `<tr>
                <td>${formatDate(ticket.created_at)}</td>
                <td>${ticket.title || ""}</td>
                <td>${ticket.category || ""}</td>
                <td>
                  <select data-ticket-priority="${ticket.id}">
                    ${["low", "medium", "high"]
                      .map(
                        (value) =>
                          `<option value="${value}" ${
                            ticket.priority === value ? "selected" : ""
                          }>${value}</option>`
                      )
                      .join("")}
                  </select>
                </td>
                <td>
                  <select data-ticket-status="${ticket.id}">
                    ${["open", "pending", "resolved", "closed"]
                      .map(
                        (value) =>
                          `<option value="${value}" ${
                            ticket.status === value ? "selected" : ""
                          }>${value}</option>`
                      )
                      .join("")}
                  </select>
                </td>
                <td>
                  <button class="btn ghost" data-ticket-save="${ticket.id}">
                    Sauver
                  </button>
                </td>
              </tr>`
          )
          .join("");

        document.querySelectorAll("[data-ticket-save]").forEach((button) => {
          button.addEventListener("click", async () => {
            const id = button.getAttribute("data-ticket-save");
            const status = document.querySelector(`[data-ticket-status="${id}"]`).value;
            const priority = document.querySelector(`[data-ticket-priority="${id}"]`).value;
            try {
              await postWithAuth(`/tickets/${id}`, { status, priority });
              setStatus("Ticket mis a jour", false);
            } catch (err) {
              setStatus("Mise a jour ticket impossible", true);
            }
          });
        });
      }

      function getTicketFilters() {
        const params = new URLSearchParams();
        if (ticketFrom && ticketFrom.value) params.set("from", ticketFrom.value);
        if (ticketTo && ticketTo.value) params.set("to", ticketTo.value);
        if (ticketStatus && ticketStatus.value) params.set("status", ticketStatus.value);
        if (ticketPriority && ticketPriority.value)
          params.set("priority", ticketPriority.value);
        if (ticketCategory && ticketCategory.value)
          params.set("category", ticketCategory.value);
        return params;
      }

      async function loadTicketsWithFilters() {
        try {
          const params = getTicketFilters();
          const suffix = params.toString() ? `?${params.toString()}` : "";
          const tickets = await fetchWithAuth(`/tickets${suffix}`);
          renderTickets(tickets.items || []);
        } catch (err) {
          setStatus("Chargement tickets impossible", true);
        }
      }

      function renderQuotes(quotes) {
        quotesTable.innerHTML = quotes
          .map(
            (quote) =>
              `<tr>
                <td>${quote.number || ""}</td>
                <td>${quote.client_name || ""}</td>
                <td>${quote.status || ""}</td>
                <td>${quote.total || 0}</td>
                <td>${formatDate(quote.created_at)}</td>
                <td><button class="btn ghost" data-quote-print="${quote.id}">PDF</button></td>
                <td><button class="btn ghost" data-quote-email="${quote.id}">Email</button></td>
              </tr>`
          )
          .join("");

        document.querySelectorAll("[data-quote-print]").forEach((button) => {
          button.addEventListener("click", async () => {
            const id = button.getAttribute("data-quote-print");
            try {
              const html = await fetchHtmlWithAuth(`/billing/quotes/${id}/print`);
              const win = window.open("", "_blank");
              if (win) {
                win.document.open();
                win.document.write(html);
                win.document.close();
              }
            } catch (err) {
              setStatus("PDF devis impossible", true);
            }
          });
        });

        document.querySelectorAll("[data-quote-email]").forEach((button) => {
          button.addEventListener("click", async () => {
            const id = button.getAttribute("data-quote-email");
            try {
              const data = await fetchWithAuth(`/billing/quotes/${id}/email`);
              const content = `Sujet: ${data.subject}\n\n${data.body}`;
              await copyText(content);
              setStatus("Email devis copie dans le presse-papiers", false);
            } catch (err) {
              setStatus("Email devis impossible", true);
            }
          });
        });
      }

      function renderInvoices(invoices) {
        invoicesTable.innerHTML = invoices
          .map(
            (invoice) =>
              `<tr>
                <td>${invoice.number || ""}</td>
                <td>${invoice.client_name || ""}</td>
                <td>${invoice.status || ""}</td>
                <td>${invoice.total || 0}</td>
                <td>${formatDate(invoice.created_at)}</td>
                <td><button class="btn ghost" data-invoice-print="${invoice.id}">PDF</button></td>
                <td><button class="btn ghost" data-invoice-email="${invoice.id}">Email</button></td>
              </tr>`
          )
          .join("");

        document.querySelectorAll("[data-invoice-print]").forEach((button) => {
          button.addEventListener("click", async () => {
            const id = button.getAttribute("data-invoice-print");
            try {
              const html = await fetchHtmlWithAuth(`/billing/invoices/${id}/print`);
              const win = window.open("", "_blank");
              if (win) {
                win.document.open();
                win.document.write(html);
                win.document.close();
              }
            } catch (err) {
              setStatus("PDF facture impossible", true);
            }
          });
        });

        document.querySelectorAll("[data-invoice-email]").forEach((button) => {
          button.addEventListener("click", async () => {
            const id = button.getAttribute("data-invoice-email");
            try {
              const data = await fetchWithAuth(`/billing/invoices/${id}/email`);
              const content = `Sujet: ${data.subject}\n\n${data.body}`;
              await copyText(content);
              setStatus("Email facture copie dans le presse-papiers", false);
            } catch (err) {
              setStatus("Email facture impossible", true);
            }
          });
        });
      }

      async function refreshData() {
        try {
          const systemPromise = fetchWithAuth("/admin/metrics/system").catch(() => null);
          const analyticsPromise = fetchWithAuth("/admin/analytics").catch(() => null);
          const [metrics, system, analytics, leads, quotes, invoices] = await Promise.all([
            fetchWithAuth("/admin/metrics"),
            systemPromise,
            analyticsPromise,
            fetchWithAuth("/leads"),
            fetchWithAuth("/billing/quotes"),
            fetchWithAuth("/billing/invoices")
          ]);
          renderMetrics(metrics);
          renderMonitoring(system);
          renderAnalytics(analytics);
          renderLeads(leads.items || []);
          renderQuotes(quotes.items || []);
          renderInvoices(invoices.items || []);
          await loadTicketsWithFilters();
        } catch (err) {
          setStatus("Session expiree. Reconnectez-vous.", true);
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
        const email = formData.get("email");
        const password = formData.get("password");
        try {
          await login(email, password);
          setStatus("Connexion ok", false);
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
            setStatus("Connexion ok", false);
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

      refreshBtn.addEventListener("click", () => {
        refreshData();
      });

      exportLeadsBtn.addEventListener("click", async () => {
        try {
          await downloadCsv("/leads/export.csv", "leads.csv");
        } catch (err) {
          setStatus("Export leads impossible", true);
        }
      });

      exportTicketsBtn.addEventListener("click", async () => {
        try {
          await downloadCsv("/tickets/export.csv", "tickets.csv");
        } catch (err) {
          setStatus("Export tickets impossible", true);
        }
      });

      if (exportTicketsPdfBtn) {
        exportTicketsPdfBtn.addEventListener("click", async () => {
          try {
            await downloadBlob("/tickets/export.pdf", "tickets.pdf", "application/pdf");
          } catch (err) {
            setStatus("Export tickets PDF impossible", true);
          }
        });
      }

      if (exportRoiPdfBtn) {
        exportRoiPdfBtn.addEventListener("click", async () => {
          try {
            await downloadBlob(
              "/admin/metrics/roi.pdf",
              "roi_report.pdf",
              "application/pdf"
            );
          } catch (err) {
            setStatus("Export ROI PDF impossible", true);
          }
        });
      }

      if (ticketFilterBtn) {
        ticketFilterBtn.addEventListener("click", () => loadTicketsWithFilters());
      }
      if (ticketResetBtn) {
        ticketResetBtn.addEventListener("click", () => {
          if (ticketFrom) ticketFrom.value = "";
          if (ticketTo) ticketTo.value = "";
          if (ticketStatus) ticketStatus.value = "";
          if (ticketPriority) ticketPriority.value = "";
          if (ticketCategory) ticketCategory.value = "";
          loadTicketsWithFilters();
        });
      }
      if (exportTicketsFilteredBtn) {
        exportTicketsFilteredBtn.addEventListener("click", async () => {
          try {
            const params = getTicketFilters();
            const suffix = params.toString() ? `?${params.toString()}` : "";
            await downloadCsv(`/tickets/export.csv${suffix}`, "tickets_filtered.csv");
          } catch (err) {
            setStatus("Export tickets filtre impossible", true);
          }
        });
      }

      if (monitoringRefreshBtn) {
        monitoringRefreshBtn.addEventListener("click", async () => {
          try {
            const system = await fetchWithAuth("/admin/metrics/system");
            renderMonitoring(system);
          } catch (err) {
            setStatus("Monitoring indisponible", true);
          }
        });
      }

      if (analyticsRefreshBtn) {
        analyticsRefreshBtn.addEventListener("click", async () => {
          try {
            const analytics = await fetchWithAuth("/admin/analytics");
            renderAnalytics(analytics);
          } catch (err) {
            setStatus("Analytics indisponible", true);
          }
        });
      }

      exportQuotesBtn.addEventListener("click", async () => {
        try {
          await downloadCsv("/billing/quotes/export.csv", "quotes.csv");
        } catch (err) {
          setStatus("Export devis impossible", true);
        }
      });

      exportInvoicesBtn.addEventListener("click", async () => {
        try {
          await downloadCsv("/billing/invoices/export.csv", "invoices.csv");
        } catch (err) {
          setStatus("Export factures impossible", true);
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

      quoteForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(quoteForm);
        const payload = {
          client_name: formData.get("client_name"),
          client_email: formData.get("client_email") || undefined,
          title: formData.get("title") || undefined,
          tax_rate: Number(formData.get("tax_rate") || 0),
          items: parseItems(formData.get("items"))
        };
        if (!payload.items.length) {
          setStatus("Ajoutez au moins un item", true);
          return;
        }
        try {
          await postWithAuth("/billing/quotes", payload);
          quoteForm.reset();
          refreshData();
        } catch (err) {
          setStatus("Creation devis impossible", true);
        }
      });

      invoiceForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(invoiceForm);
        const payload = {
          client_name: formData.get("client_name"),
          client_email: formData.get("client_email") || undefined,
          title: formData.get("title") || undefined,
          tax_rate: Number(formData.get("tax_rate") || 0),
          items: parseItems(formData.get("items"))
        };
        if (!payload.items.length) {
          setStatus("Ajoutez au moins un item", true);
          return;
        }
        try {
          await postWithAuth("/billing/invoices", payload);
          invoiceForm.reset();
          refreshData();
        } catch (err) {
          setStatus("Creation facture impossible", true);
        }
      });

      if (getToken()) {
        loginCard.style.display = "none";
        loadSession();
        refreshData();
      }
