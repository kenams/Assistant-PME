(function () {
  "use strict";

  if (window.__ASSISTANT_PREMIUM_FALLBACK__) return;
  window.__ASSISTANT_PREMIUM_FALLBACK__ = true;

  const realFetch = window.fetch.bind(window);
  const STATE_KEY = "assistant_premium_demo_state_v1";
  const FALLBACK_HEADER = "X-Premium-Fallback";

  const nowIso = () => new Date().toISOString();
  const uid = (prefix) =>
    `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  function b64(value) {
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(value))));
    return encoded;
  }

  function makeToken(user) {
    const payload = {
      sub: user.id,
      tenant_id: user.tenant_id,
      role: user.role,
      email: user.email,
      demo: true,
      fallback: true,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 8 * 60 * 60
    };
    return `${b64({ alg: "none", typ: "JWT" })}.${b64(payload)}.premium-demo`;
  }

  function parseToken(token) {
    try {
      const part = String(token || "").split(".")[1];
      if (!part) return null;
      const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
      const json = decodeURIComponent(escape(atob(padded)));
      return JSON.parse(json);
    } catch (_) {
      return null;
    }
  }

  function getAuthToken(init) {
    const headers = new Headers((init && init.headers) || {});
    const auth = headers.get("Authorization") || headers.get("authorization") || "";
    if (auth.startsWith("Bearer ")) return auth.slice(7);
    return localStorage.getItem("assistant_token") || sessionStorage.getItem("assistant_token") || "";
  }

  function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        [FALLBACK_HEADER]: "1"
      }
    });
  }

  function emptyResponse(status = 204) {
    return new Response(null, {
      status,
      headers: { [FALLBACK_HEADER]: "1" }
    });
  }

  async function readBody(init) {
    if (!init || init.body == null) return {};
    if (typeof init.body === "string") {
      try { return JSON.parse(init.body); } catch (_) { return {}; }
    }
    if (init.body instanceof FormData) {
      return Object.fromEntries(init.body.entries());
    }
    return {};
  }

  function defaultState() {
    const t0 = Date.now();
    const iso = (minsAgo) => new Date(t0 - minsAgo * 60000).toISOString();
    const tenantId = "tenant_demo";
    const userId = "user_demo";
    return {
      tenant: {
        id: tenantId,
        name: "KAH Digital Studio Demo",
        code: "DEFAULT",
        plan: "pro",
        created_at: iso(1440),
        updated_at: iso(15)
      },
      org_settings: {
        company_name: "KAH Digital Studio Demo",
        support_email: "support@kah-digital.ch",
        support_hours: "Lundi - vendredi, 8h30 - 18h00",
        sla_hours: 8,
        confidential_mode: true,
        glpi_enabled: true,
        glpi_base_url: "https://glpi.client-demo.local",
        webhook_url: "",
        slack_webhook_url: "",
        teams_webhook_url: ""
      },
      users: [
        {
          id: "admin_demo",
          tenant_id: tenantId,
          email: "admin@assistant.local",
          role: "superadmin",
          active: true,
          created_at: iso(1440)
        },
        {
          id: "agent_demo",
          tenant_id: tenantId,
          email: "agent@assistant.local",
          role: "agent",
          active: true,
          created_at: iso(980)
        },
        {
          id: userId,
          tenant_id: tenantId,
          email: "user@assistant.local",
          role: "user",
          active: true,
          created_at: iso(930)
        }
      ],
      conversations: [
        {
          id: "conv_demo_1",
          tenant_id: tenantId,
          user_id: userId,
          status: "escalated",
          title: "Outlook ne synchronise plus",
          last_message: "Ticket cree automatiquement apres diagnostic Outlook.",
          created_at: iso(54),
          updated_at: iso(48)
        }
      ],
      messages: [
        {
          id: "msg_demo_1",
          conversation_id: "conv_demo_1",
          role: "user",
          content: "Outlook ne synchronise plus depuis ce matin.",
          created_at: iso(55)
        },
        {
          id: "msg_demo_2",
          conversation_id: "conv_demo_1",
          role: "assistant",
          content: "Diagnostic lance. Le profil Outlook semble bloque apres mise a jour. Je recommande de redemarrer Outlook en mode sans echec, puis de recréer le profil si le probleme persiste.",
          created_at: iso(54)
        }
      ],
      tickets: [
        {
          id: "ticket_demo_1",
          tenant_id: tenantId,
          conversation_id: "conv_demo_1",
          user_id: userId,
          title: "Outlook ne synchronise plus depuis la mise a jour Office",
          description: "Diagnostic IA: profil Outlook potentiellement corrompu. Action proposee: mode sans echec, regeneration du profil, controle connectivite Microsoft 365.",
          category: "email",
          priority: "high",
          status: "open",
          external_id: "GLPI-1048",
          external_url: "https://glpi.client-demo.local/front/ticket.form.php?id=1048",
          created_at: iso(50),
          updated_at: iso(42)
        },
        {
          id: "ticket_demo_2",
          tenant_id: tenantId,
          conversation_id: null,
          user_id: userId,
          title: "VPN Fortinet inaccessible en teletravail",
          description: "L'utilisateur ne peut plus joindre le VPN. Controle MFA et profil FortiClient a faire.",
          category: "vpn",
          priority: "high",
          status: "pending",
          external_id: "GLPI-1047",
          external_url: "https://glpi.client-demo.local/front/ticket.form.php?id=1047",
          created_at: iso(188),
          updated_at: iso(172)
        },
        {
          id: "ticket_demo_3",
          tenant_id: tenantId,
          conversation_id: null,
          user_id: userId,
          title: "Imprimante reseau HP hors ligne",
          description: "Spooler redemarre par l'assistant. File d'impression purgee.",
          category: "printer",
          priority: "medium",
          status: "resolved",
          external_id: "GLPI-1045",
          external_url: "https://glpi.client-demo.local/front/ticket.form.php?id=1045",
          created_at: iso(680),
          updated_at: iso(620)
        }
      ],
      kb_documents: [
        {
          id: "kb_outlook",
          title: "Outlook bloque apres mise a jour Office",
          source_type: "procedure",
          chunk_count: 4,
          content: "Fermer Outlook. Lancer outlook.exe /safe. Desactiver les complements recents. Recreer le profil si la synchronisation reste bloquee."
        },
        {
          id: "kb_vpn",
          title: "VPN Fortinet: controles de base",
          source_type: "procedure",
          chunk_count: 3,
          content: "Verifier Internet, synchroniser l'heure Windows, relancer FortiClient, puis verifier MFA et groupe AD."
        },
        {
          id: "kb_printer",
          title: "Imprimante reseau hors ligne",
          source_type: "procedure",
          chunk_count: 5,
          content: "Verifier alimentation, ping IP imprimante, vider le spooler, supprimer puis rajouter la file si necessaire."
        }
      ],
      invites: [],
      leads: [
        {
          id: "lead_demo_1",
          name: "Marie Laurent",
          email: "marie.laurent@example.com",
          company: "TechPME",
          status: "new",
          created_at: iso(310)
        }
      ]
    };
  }

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STATE_KEY) || "null");
      if (parsed && parsed.tenant && Array.isArray(parsed.tickets)) return parsed;
    } catch (_) {}
    const state = defaultState();
    saveState(state);
    return state;
  }

  function saveState(state) {
    try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  function findUserForLogin(body, roleHint) {
    const state = loadState();
    const email = String(body.email || "").trim().toLowerCase();
    const role =
      roleHint ||
      (email.includes("admin") || email.includes("super") ? "superadmin" :
      email.includes("agent") || email.includes("support") ? "agent" : "user");
    let user = state.users.find((item) => item.email.toLowerCase() === email);
    if (!user && email.includes("@")) {
      user = {
        id: uid(role === "user" ? "user" : "admin"),
        tenant_id: state.tenant.id,
        email,
        role,
        active: true,
        created_at: nowIso()
      };
      state.users.push(user);
      saveState(state);
    }
    if (!user) {
      user = state.users.find((item) => item.role === role) || state.users[0];
    }
    return user;
  }

  function currentUser(init) {
    const state = loadState();
    const payload = parseToken(getAuthToken(init));
    if (payload && payload.sub) {
      return (
        state.users.find((item) => item.id === payload.sub) || {
          id: payload.sub,
          tenant_id: payload.tenant_id || state.tenant.id,
          email: payload.email || (payload.role === "user" ? "user@assistant.local" : "admin@assistant.local"),
          role: payload.role || "user",
          active: true,
          created_at: nowIso()
        }
      );
    }
    return state.users.find((item) => item.role === "user") || state.users[0];
  }

  function inferCategory(text) {
    const value = String(text || "").toLowerCase();
    if (value.includes("outlook") || value.includes("mail") || value.includes("email") || value.includes("office")) return "email";
    if (value.includes("vpn") || value.includes("forti")) return "vpn";
    if (value.includes("wifi") || value.includes("internet") || value.includes("reseau") || value.includes("réseau")) return "network";
    if (value.includes("imprimante") || value.includes("printer")) return "printer";
    if (value.includes("mot de passe") || value.includes("password") || value.includes("mdp")) return "password";
    if (value.includes("lent") || value.includes("pc") || value.includes("ecran") || value.includes("écran")) return "hardware";
    return "general";
  }

  function inferPriority(text) {
    const value = String(text || "").toLowerCase();
    if (value.includes("urgent") || value.includes("bloque") || value.includes("bloqué") || value.includes("serveur") || value.includes("critique") || value.includes("impossible")) return "high";
    if (value.includes("question") || value.includes("demande")) return "low";
    return inferCategory(value) === "general" ? "medium" : "medium";
  }

  function answerFor(message) {
    const category = inferCategory(message);
    const intro = "J'ai analyse votre demande. Voici l'action la plus rapide :";
    const lines = {
      email: [
        intro,
        "1. Fermez Outlook completement depuis le gestionnaire des taches.",
        "2. Lancez Outlook en mode sans echec avec outlook.exe /safe.",
        "3. Si la synchronisation reste bloquee, recreez le profil Outlook puis relancez la synchronisation Microsoft 365.",
        "Si cela ne suffit pas, je peux creer un ticket avec le diagnostic deja prepare."
      ],
      vpn: [
        intro,
        "1. Verifiez que l'heure Windows est synchronisee.",
        "2. Relancez FortiClient puis reconnectez le MFA.",
        "3. Si le code MFA boucle, le compte ou le groupe VPN doit etre controle par un technicien.",
        "Je peux escalader vers l'equipe support avec le contexte complet."
      ],
      network: [
        intro,
        "1. Testez un autre site et notez si le Wi-Fi ou le cable est utilise.",
        "2. Desactivez puis reactivez la carte reseau.",
        "3. Si plusieurs postes sont touches, declarez un incident reseau prioritaire.",
        "Je garde ces informations pour le ticket si besoin."
      ],
      printer: [
        intro,
        "1. Verifiez l'etat de l'imprimante et la file d'impression.",
        "2. Relancez le spooler Windows.",
        "3. Supprimez puis ajoutez de nouveau l'imprimante reseau si elle reste hors ligne.",
        "Je peux creer un ticket GLPI si le probleme persiste."
      ],
      password: [
        intro,
        "1. Essayez la procedure de reinitialisation officielle de votre entreprise.",
        "2. Si le compte est verrouille, un technicien doit debloquer l'utilisateur dans l'annuaire.",
        "3. Aucun mot de passe ne doit etre partage dans le chat.",
        "Je peux ouvrir une demande securisee."
      ],
      hardware: [
        intro,
        "1. Redemarrez le poste puis verifiez les mises a jour en attente.",
        "2. Controlez l'espace disque et fermez les applications lourdes.",
        "3. Si le probleme revient, joignez une capture ou le nom du PC.",
        "Je peux creer un ticket materiel avec priorite adaptee."
      ],
      general: [
        intro,
        "1. Precisez l'application touchee, le message d'erreur et l'heure d'apparition.",
        "2. Ajoutez le nom du poste ou une capture si possible.",
        "3. Je proposerai une procedure ou j'ouvrirai un ticket si le diagnostic le demande."
      ]
    };
    return lines[category].join("\n");
  }

  function buildTicketFromMessage(state, message, conversationId, userId) {
    const ticket = {
      id: uid("ticket"),
      tenant_id: state.tenant.id,
      conversation_id: conversationId || null,
      user_id: userId || null,
      title: `Support: ${String(message || "Demande utilisateur").slice(0, 82)}`,
      description: String(message || "Demande utilisateur"),
      category: inferCategory(message),
      priority: inferPriority(message),
      status: "open",
      external_id: `GLPI-${Math.floor(1100 + Math.random() * 800)}`,
      external_url: "https://glpi.client-demo.local/front/ticket.form.php",
      created_at: nowIso(),
      updated_at: nowIso()
    };
    state.tickets.unshift(ticket);
    return ticket;
  }

  function analyticsFromState(state) {
    const tickets = state.tickets || [];
    const byStatus = tickets.reduce((acc, item) => {
      acc[item.status || "open"] = (acc[item.status || "open"] || 0) + 1;
      return acc;
    }, {});
    const byPriority = tickets.reduce((acc, item) => {
      acc[item.priority || "medium"] = (acc[item.priority || "medium"] || 0) + 1;
      return acc;
    }, {});
    const byCategory = tickets.reduce((acc, item) => {
      acc[item.category || "general"] = (acc[item.category || "general"] || 0) + 1;
      return acc;
    }, {});
    return {
      response_avg_minutes: 2,
      resolution_avg_minutes: 18,
      feedback: { average_rating: 4.8, count: 24 },
      sla: { breached_open_count: 0, at_risk_count: 1 },
      status_counts: byStatus,
      priority_counts: byPriority,
      category_counts: byCategory,
      volume_daily: { "J-6": 2, "J-5": 4, "J-4": 3, "J-3": 6, "J-2": 4, "J-1": 5, "J": tickets.length }
    };
  }

  function searchKb(state, query) {
    const q = String(query || "").trim().toLowerCase();
    const docs = state.kb_documents || [];
    const filtered = q
      ? docs.filter((doc) => `${doc.title} ${doc.content}`.toLowerCase().includes(q))
      : docs;
    return filtered.map((doc) => ({
      id: `${doc.id}_chunk`,
      document_id: doc.id,
      document_title: doc.title,
      snippet: doc.content.slice(0, 180),
      chunk_text: doc.content
    }));
  }

  function routeMatches(path, target) {
    return path === target || path === `${target}/`;
  }

  async function handleFallback(url, init) {
    const state = loadState();
    const path = url.pathname;
    const method = String((init && init.method) || "GET").toUpperCase();
    const body = await readBody(init);
    const user = currentUser(init);

    if (routeMatches(path, "/health")) {
      return jsonResponse({ ok: true, uptime: 0, hasDb: false, mode: "premium_demo" });
    }

    if (routeMatches(path, "/auth/login") && method === "POST") {
      const loginUser = findUserForLogin(body);
      return jsonResponse({ token: makeToken(loginUser), user: loginUser });
    }

    if (routeMatches(path, "/auth/quick-admin")) {
      const admin = findUserForLogin({ email: "admin@assistant.local" }, "superadmin");
      return jsonResponse({ token: makeToken(admin), user: admin });
    }

    if (routeMatches(path, "/auth/quick-user")) {
      const demoUser = findUserForLogin({ email: "user@assistant.local" }, "user");
      return jsonResponse({ token: makeToken(demoUser), user: demoUser });
    }

    if (routeMatches(path, "/auth/refresh") && method === "POST") {
      return jsonResponse({ token: makeToken(user) });
    }

    if (routeMatches(path, "/auth/me")) {
      return jsonResponse(user);
    }

    if (routeMatches(path, "/auth/forgot-password") || routeMatches(path, "/auth/reset-password") || routeMatches(path, "/auth/change-password")) {
      return jsonResponse({ ok: true });
    }

    if (routeMatches(path, "/org")) {
      if (method === "PUT" || method === "PATCH") {
        state.tenant.name = body.name || body.company_name || state.tenant.name;
        state.tenant.plan = body.plan || state.tenant.plan;
        state.tenant.updated_at = nowIso();
        saveState(state);
      }
      return jsonResponse(state.tenant);
    }

    if (routeMatches(path, "/org/settings")) {
      if (method === "PUT" || method === "PATCH" || method === "POST") {
        state.org_settings = { ...state.org_settings, ...body, updated_at: nowIso() };
        saveState(state);
      }
      return jsonResponse(state.org_settings);
    }

    if (routeMatches(path, "/chat") && method === "POST") {
      const message = String(body.message || "").trim() || "Demande support";
      let conversation = state.conversations.find((item) => item.id === body.conversation_id);
      if (!conversation) {
        conversation = {
          id: uid("conv"),
          tenant_id: state.tenant.id,
          user_id: user.id,
          status: "open",
          title: message.slice(0, 80),
          last_message: message,
          created_at: nowIso(),
          updated_at: nowIso()
        };
        state.conversations.unshift(conversation);
      }
      const answer = answerFor(message);
      state.messages.push({ id: uid("msg"), conversation_id: conversation.id, role: "user", content: message, created_at: nowIso() });
      state.messages.push({ id: uid("msg"), conversation_id: conversation.id, role: "assistant", content: answer, created_at: nowIso() });
      conversation.last_message = answer;
      conversation.updated_at = nowIso();
      saveState(state);
      return jsonResponse({
        conversation_id: conversation.id,
        answer,
        reply: answer,
        message: answer,
        sources: searchKb(state, message).slice(0, 2),
        failure_count: /toujours|marche pas|same|not working/i.test(message) ? 1 : 0,
        threshold: 2,
        needs_ticket: /urgent|bloque|bloqué|toujours|impossible|critique/i.test(message)
      });
    }

    if (routeMatches(path, "/chat/escalate") && method === "POST") {
      const conversation = state.conversations.find((item) => item.id === body.conversation_id);
      const existing = state.tickets.find((item) => item.conversation_id === body.conversation_id);
      if (existing) return jsonResponse({ created: false, ticket: existing });
      const sourceText =
        conversation && conversation.title ? conversation.title :
        body.reason || "Demande utilisateur";
      const ticket = buildTicketFromMessage(state, sourceText, body.conversation_id, user.id);
      if (conversation) {
        conversation.status = "escalated";
        conversation.updated_at = nowIso();
      }
      saveState(state);
      return jsonResponse({ created: true, ticket });
    }

    if (routeMatches(path, "/chat/feedback") && method === "POST") {
      return jsonResponse({ ok: true });
    }

    if (routeMatches(path, "/chat/attachments") && method === "POST") {
      return jsonResponse({
        url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360'%3E%3Crect width='640' height='360' fill='%23111720'/%3E%3Ctext x='50%25' y='50%25' fill='%23d7b46a' font-family='Arial' font-size='24' text-anchor='middle'%3ECapture demo%3C/text%3E%3C/svg%3E",
        filename: "capture-demo.svg"
      });
    }

    if (path.startsWith("/chat/history")) {
      const cid = url.searchParams.get("conversation_id");
      return jsonResponse({
        items: state.messages.filter((item) => !cid || item.conversation_id === cid)
      });
    }

    if (path.startsWith("/chat/conversations")) {
      const q = String(url.searchParams.get("query") || "").toLowerCase();
      const items = state.conversations
        .filter((item) => !q || `${item.title} ${item.last_message}`.toLowerCase().includes(q))
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      return jsonResponse({ items });
    }

    if (path.startsWith("/chat/quick-issues/search")) {
      const q = String(url.searchParams.get("query") || "").toLowerCase();
      const issues = quickIssues().filter((item) => `${item.label} ${item.message}`.toLowerCase().includes(q));
      return jsonResponse({ items: issues });
    }

    if (routeMatches(path, "/chat/quick-issues")) {
      return jsonResponse({ items: quickIssues() });
    }

    if (routeMatches(path, "/tickets/draft") && method === "POST") {
      const message = body.message || body.summary || "Demande utilisateur";
      return jsonResponse({
        title: `Support: ${String(message).slice(0, 80)}`,
        summary: message,
        category: inferCategory(message),
        priority: inferPriority(message)
      });
    }

    if (routeMatches(path, "/tickets") || routeMatches(path, "/tickets/")) {
      if (method === "POST") {
        const ticket = buildTicketFromMessage(
          state,
          body.description || body.summary || body.title,
          body.conversation_id,
          user.id
        );
        ticket.title = body.title || ticket.title;
        ticket.category = body.category || ticket.category;
        ticket.priority = body.priority || ticket.priority;
        saveState(state);
        return jsonResponse(ticket, 201);
      }
      return jsonResponse({ items: state.tickets });
    }

    if (path.startsWith("/tickets/mine")) {
      return jsonResponse({
        items: state.tickets.filter((ticket) => !ticket.user_id || ticket.user_id === user.id || user.role !== "user")
      });
    }

    if (path.startsWith("/tickets/conversation/")) {
      const cid = decodeURIComponent(path.split("/").pop() || "");
      return jsonResponse({ items: state.tickets.filter((ticket) => ticket.conversation_id === cid) });
    }

    if (path.startsWith("/tickets/user/")) {
      const uidValue = decodeURIComponent(path.split("/").pop() || "");
      return jsonResponse({ items: state.tickets.filter((ticket) => ticket.user_id === uidValue) });
    }

    if (path.startsWith("/tickets/") && (method === "PATCH" || method === "PUT")) {
      const id = decodeURIComponent(path.split("/").filter(Boolean).pop() || "");
      const ticket = state.tickets.find((item) => item.id === id);
      if (!ticket) return jsonResponse({ error: "not_found" }, 404);
      Object.assign(ticket, body, { updated_at: nowIso() });
      saveState(state);
      return jsonResponse(ticket);
    }

    if (routeMatches(path, "/kb/documents")) {
      if (method === "POST") {
        const doc = {
          id: uid("kb"),
          title: body.title || "Nouvelle procedure",
          source_type: body.source_type || "procedure",
          content: body.content || body.text || "",
          chunk_count: 1,
          created_at: nowIso()
        };
        state.kb_documents.unshift(doc);
        saveState(state);
        return jsonResponse(doc, 201);
      }
      return jsonResponse({ items: state.kb_documents });
    }

    if (path.startsWith("/kb/documents/")) {
      const id = decodeURIComponent(path.split("/").pop() || "");
      const index = state.kb_documents.findIndex((item) => item.id === id);
      if (method === "DELETE") {
        if (index >= 0) state.kb_documents.splice(index, 1);
        saveState(state);
        return emptyResponse();
      }
      return jsonResponse(state.kb_documents[index] || { error: "not_found" }, index >= 0 ? 200 : 404);
    }

    if (routeMatches(path, "/kb/search") && method === "POST") {
      return jsonResponse({ items: searchKb(state, body.query) });
    }

    if (routeMatches(path, "/admin/metrics")) {
      const tickets = state.tickets || [];
      const resolved = tickets.filter((item) => item.status === "resolved").length;
      const open = tickets.filter((item) => item.status !== "resolved" && item.status !== "closed").length;
      const activeUsers = state.users.filter((item) => item.active !== false).length;
      const ticketsAvoided = 28;
      return jsonResponse({
        tickets_avoided: ticketsAvoided,
        tickets_evites: ticketsAvoided,
        tickets_created: tickets.length,
        tickets_crees: tickets.length,
        open_tickets: open,
        active_users: activeUsers,
        utilisateurs_actifs: activeUsers,
        conversations: state.conversations.length,
        resolved,
        escalated: tickets.filter((item) => item.status !== "resolved").length,
        resolution_rate: 82,
        minutes_economisees: 146,
        sla_risk: 1,
        sla_breached: 0
      });
    }

    if (routeMatches(path, "/admin/analytics")) {
      return jsonResponse(analyticsFromState(state));
    }

    if (routeMatches(path, "/admin/diagnostics")) {
      return jsonResponse({
        openai: { configured: true, model: "mode demo" },
        stripe: { configured: false },
        glpi: { enabled: true, ok: true },
        mailbox: { enabled: false, ok: false },
        ad: { enabled: false, ok: false },
        inbound: { slack_signing_secret: false, teams_signing_secret: false },
        security: {
          node_env: "demo",
          jwt_secret: true,
          quick_login: false,
          cors_restricted: true
        }
      });
    }

    if (path.startsWith("/admin/glpi/test")) {
      return jsonResponse({ ok: true, status: "connected", message: "GLPI accessible en mode demo" });
    }

    if (path.startsWith("/admin/glpi/tickets")) {
      return jsonResponse({ items: state.tickets });
    }

    if (path.startsWith("/admin/activity/users")) {
      return jsonResponse({ items: state.users.map((item) => ({ ...item, last_seen: nowIso(), conversations: 2 })) });
    }

    if (path.startsWith("/admin/audit")) {
      return jsonResponse({ items: [{ id: "audit_demo", action: "demo_fallback_active", created_at: nowIso(), meta: {} }] });
    }

    if (path.startsWith("/admin/uploads")) {
      return jsonResponse({ items: [] });
    }

    if (routeMatches(path, "/users")) {
      if (method === "POST") {
        const newUser = {
          id: uid("user"),
          tenant_id: state.tenant.id,
          email: String(body.email || `user${state.users.length + 1}@client.local`).toLowerCase(),
          role: body.role || "user",
          active: true,
          created_at: nowIso()
        };
        state.users.push(newUser);
        saveState(state);
        return jsonResponse({ user: newUser }, 201);
      }
      return jsonResponse({ items: state.users });
    }

    if (routeMatches(path, "/users/license-status")) {
      const limit = state.tenant.plan === "enterprise" ? null : state.tenant.plan === "pro" ? 200 : 50;
      const used = state.users.filter((item) => item.active !== false).length;
      return jsonResponse({
        used,
        limit,
        plan: state.tenant.plan,
        pct: limit ? Math.round((used / limit) * 100) : 0,
        tenant_name: state.tenant.name
      });
    }

    if (path.startsWith("/users/invites") || path.startsWith("/users/invite")) {
      if (method === "DELETE") {
        const id = decodeURIComponent(path.split("/").pop() || "");
        state.invites = state.invites.filter((item) => item.id !== id);
        saveState(state);
        return emptyResponse();
      }
      if (method === "POST" && path.endsWith("/revoke")) {
        const id = decodeURIComponent(path.split("/").slice(-2)[0] || "");
        const invite = state.invites.find((item) => item.id === id);
        if (invite) invite.status = "revoked";
        saveState(state);
        return jsonResponse({ ok: true });
      }
      if (method === "POST" && path.endsWith("/accept")) {
        const accepted = findUserForLogin({ email: body.email || "invite@client.local" }, body.role || "user");
        return jsonResponse({ token: makeToken(accepted), user: accepted });
      }
      if (method === "POST") {
        const invite = {
          id: uid("invite"),
          email: body.email || "invite@client.local",
          role: body.role || "user",
          token: uid("token"),
          status: "active",
          expires_at: new Date(Date.now() + 72 * 3600000).toISOString(),
          created_at: nowIso()
        };
        state.invites.unshift(invite);
        saveState(state);
        return jsonResponse({ invite }, 201);
      }
      return jsonResponse({ items: state.invites });
    }

    if (path.startsWith("/users/") && (path.endsWith("/activate") || path.endsWith("/deactivate"))) {
      const parts = path.split("/").filter(Boolean);
      const target = state.users.find((item) => item.id === parts[1]);
      if (target) target.active = path.endsWith("/activate");
      saveState(state);
      return jsonResponse({ ok: true });
    }

    if (routeMatches(path, "/tenants/overview")) {
      return jsonResponse({
        tenants: 1,
        users: state.users.length,
        tickets: state.tickets.length,
        conversations: state.conversations.length,
        leads: state.leads.length,
        kb_docs: state.kb_documents.length
      });
    }

    if (routeMatches(path, "/tenants")) {
      if (method === "POST") {
        state.tenant = {
          id: uid("tenant"),
          name: body.name || "Nouveau client",
          code: body.code || "CLIENT",
          plan: body.plan || "starter",
          created_at: nowIso(),
          updated_at: nowIso()
        };
        saveState(state);
        return jsonResponse({ tenant: state.tenant, temp_password: body.admin_password || "Temp12345" }, 201);
      }
      return jsonResponse({ items: [state.tenant] });
    }

    if (path.startsWith("/tenants/") && path.endsWith("/token") && method === "POST") {
      const admin = findUserForLogin({ email: body.email || "admin@assistant.local" }, "superadmin");
      return jsonResponse({ token: makeToken(admin) });
    }

    if (routeMatches(path, "/leads")) {
      if (method === "POST") {
        const lead = {
          id: uid("lead"),
          name: body.name || "",
          email: body.email || "",
          company: body.company || body.tenant_name || "",
          message: body.message || "",
          status: "new",
          created_at: nowIso()
        };
        state.leads.unshift(lead);
        saveState(state);
        return jsonResponse({ ok: true, lead }, 201);
      }
      return jsonResponse({ items: state.leads });
    }

    if (path.startsWith("/leads/") && method === "PUT") {
      const id = decodeURIComponent(path.split("/").pop() || "");
      const lead = state.leads.find((item) => item.id === id);
      if (lead) Object.assign(lead, body, { updated_at: nowIso() });
      saveState(state);
      return jsonResponse(lead || { error: "not_found" }, lead ? 200 : 404);
    }

    if (routeMatches(path, "/billing/plans")) {
      return jsonResponse({
        configured: true,
        plans: [
          { id: "starter", name: "Starter", amount_eur: 199 },
          { id: "pro", name: "Pro", amount_eur: 399 },
          { id: "enterprise", name: "Entreprise", amount_eur: 899 }
        ]
      });
    }

    if (routeMatches(path, "/billing/status")) {
      return jsonResponse({
        status: "active",
        plan: state.tenant.plan || "pro",
        current_period_end: new Date(Date.now() + 21 * 86400000).toISOString(),
        stripe_customer_id: "cus_demo"
      });
    }

    if (routeMatches(path, "/billing/create-checkout") || routeMatches(path, "/billing/subscribe")) {
      return jsonResponse({ url: `${location.origin}/app/success.html?demo=1`, demo: true });
    }

    if (routeMatches(path, "/billing/portal")) {
      return jsonResponse({ url: `${location.origin}/app/admin/#billing`, demo: true });
    }

    if (path.startsWith("/api/kpi")) {
      return jsonResponse({
        tickets: { total: state.tickets.length, pending: 1, auto_resolve_rate: 72, auto_resolved: 18, dispatch_rate: 94, dispatched: 31 },
        confidence: { avg: 88 },
        alerts: [{ id: "alert_demo", title: "Pic Outlook detecte", severity: "medium" }]
      });
    }

    if (path.startsWith("/api/backlogs")) {
      return jsonResponse({ items: state.tickets });
    }

    if (path.startsWith("/api/rules")) {
      return jsonResponse({ items: [{ id: "rule_demo", name: "Outlook vers support N2", enabled: true }] });
    }

    if (path.startsWith("/api/alerts")) {
      return jsonResponse({ items: [{ id: "alert_demo", title: "Pic Outlook detecte", status: "open", created_at: nowIso() }] });
    }

    if (routeMatches(path, "/notifications")) {
      return jsonResponse({ items: [] });
    }

    return null;
  }

  function quickIssues() {
    return [
      { key: "outlook", label: "Outlook ne s'ouvre pas", message: "Outlook ne s'ouvre pas sur mon poste.", category: "Email", count: 18 },
      { key: "internet", label: "Plus d'internet", message: "Je n'ai plus internet sur mon poste.", category: "Reseau", count: 12 },
      { key: "printer", label: "Imprimante hors ligne", message: "L'imprimante reseau ne repond plus.", category: "Peripheriques", count: 9 },
      { key: "password", label: "Mot de passe oublie", message: "J'ai oublie mon mot de passe.", category: "Acces", count: 15 },
      { key: "vpn", label: "VPN ne fonctionne pas", message: "Le VPN ne se connecte pas.", category: "Teletravail", count: 11 },
      { key: "slowpc", label: "PC lent", message: "Mon poste est tres lent.", category: "Poste", count: 7 }
    ];
  }

  function isKnownAppApi(url) {
    return [
      "/auth/",
      "/chat",
      "/tickets",
      "/kb/",
      "/users",
      "/admin/",
      "/org",
      "/tenants",
      "/leads",
      "/billing",
      "/api/",
      "/notifications",
      "/health"
    ].some((prefix) => url.pathname.startsWith(prefix));
  }

  function hasFallbackToken(init) {
    const payload = parseToken(getAuthToken(init));
    return Boolean(payload && payload.fallback);
  }

  function markFallbackUsed() {
    try { sessionStorage.setItem("assistant_premium_fallback_used", "1"); } catch (_) {}
    document.documentElement.classList.add("premium-fallback-active");
    if (!document.getElementById("premiumFallbackBadge") && document.body) {
      const badge = document.createElement("div");
      badge.id = "premiumFallbackBadge";
      badge.textContent = "Mode demo actif";
      badge.style.cssText = [
        "position:fixed",
        "right:14px",
        "bottom:14px",
        "z-index:9998",
        "padding:7px 10px",
        "border:1px solid rgba(215,180,106,.32)",
        "background:rgba(7,9,13,.82)",
        "backdrop-filter:blur(14px)",
        "color:#f0cf87",
        "border-radius:8px",
        "font:700 12px Inter,system-ui,sans-serif",
        "box-shadow:0 12px 32px rgba(0,0,0,.32)"
      ].join(";");
      document.body.appendChild(badge);
    }
  }

  window.fetch = async function premiumFetch(input, init) {
    const url = new URL(typeof input === "string" ? input : input.url, window.location.origin);
    const known = isKnownAppApi(url);
    const tokenIsFallback = hasFallbackToken(init);

    if (known && tokenIsFallback) {
      const fallback = await handleFallback(url, init || {});
      if (fallback) {
        markFallbackUsed();
        return fallback;
      }
    }

    try {
      const response = await realFetch(input, init);
      if (!known || response.ok || (response.status < 500 && response.status !== 404)) {
        return response;
      }
      const fallback = await handleFallback(url, init || {});
      if (fallback) {
        markFallbackUsed();
        return fallback;
      }
      return response;
    } catch (error) {
      if (known) {
        const fallback = await handleFallback(url, init || {});
        if (fallback) {
          markFallbackUsed();
          return fallback;
        }
      }
      throw error;
    }
  };
})();
