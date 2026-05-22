process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const BASE = "https://assistant-pme.onrender.com";
const ADMIN_EMAIL = "admin@assistant.local";
const ADMIN_PASS = "admin123";
const USER_EMAIL = "user@assistant.local";
const USER_PASS = "user123";

let adminToken = null, userToken = null;
const results = [];

function pass(label) { results.push({ status: "PASS", label }); }
function fail(label, detail) { results.push({ status: "FAIL", label, detail }); }
function warn(label, detail) { results.push({ status: "WARN", label, detail }); }

async function req(method, path, body, token, headers) {
  headers = headers || {};
  const opts = { method, headers: { "Content-Type": "application/json", ...headers } };
  if (token) opts.headers["Authorization"] = "Bearer " + token;
  if (body) opts.body = JSON.stringify(body);
  try {
    const r = await fetch(BASE + path, opts);
    let data = null;
    try { data = await r.json(); } catch (_) {}
    return { status: r.status, data, headers: r.headers };
  } catch (e) {
    return { status: 0, data: null, err: e.message };
  }
}

async function run() {

  // AUTH
  let r = await req("POST", "/auth/login", { email: ADMIN_EMAIL, password: ADMIN_PASS });
  if (r.status === 200 && r.data && r.data.token) { adminToken = r.data.token; pass("Auth login valide admin"); }
  else fail("Auth login valide admin", "HTTP " + r.status + " " + JSON.stringify(r.data));

  r = await req("POST", "/auth/login", { email: USER_EMAIL, password: USER_PASS });
  if (r.status === 200 && r.data && r.data.token) { userToken = r.data.token; pass("Auth login valide user"); }
  else fail("Auth login valide user", "HTTP " + r.status + " " + JSON.stringify(r.data));

  r = await req("POST", "/auth/login", { email: ADMIN_EMAIL, password: "wrongpassword" });
  if (r.status === 401) pass("Auth login mauvais MDP -> 401");
  else fail("Auth login mauvais MDP -> 401", "Got HTTP " + r.status);

  r = await req("POST", "/auth/login", { email: "nobody@nowhere.com", password: "test123" });
  if (r.status === 401) pass("Auth email inexistant -> 401");
  else fail("Auth email inexistant -> 401", "Got HTTP " + r.status);

  r = await req("GET", "/auth/me", null, "fake.token.here");
  if (r.status === 401 || r.status === 403) pass("Token falsifie -> 401/403");
  else fail("Token falsifie -> 401/403", "Got HTTP " + r.status);

  r = await req("POST", "/auth/refresh", null, adminToken);
  if (r.status === 200 && r.data && r.data.token) pass("Refresh token -> nouveau token");
  else fail("Refresh token", "HTTP " + r.status);

  r = await req("POST", "/auth/quick-admin");
  if (r.status === 403) pass("Quick-login desactive en prod -> 403");
  else fail("Quick-login desactive en prod -> 403", "Got HTTP " + r.status + " SECURITE CRITIQUE");

  r = await req("POST", "/auth/quick-user");
  if (r.status === 403) pass("Quick-user desactive en prod -> 403");
  else fail("Quick-user desactive en prod -> 403", "Got HTTP " + r.status + " SECURITE CRITIQUE");

  // Rate limit login
  const loginBurst = [];
  for (let i = 0; i < 35; i++) loginBurst.push(req("POST", "/auth/login", { email: "fake" + i + "@test.com", password: "aaaaaa" }));
  const loginResponses = await Promise.all(loginBurst);
  if (loginResponses.some(function(r2) { return r2.status === 429; })) pass("Rate limit login 35 req -> 429 recu");
  else warn("Rate limit login 35 req", "Aucun 429 recu");

  // ADMIN METRICS
  r = await req("GET", "/admin/metrics");
  if (r.status === 401 || r.status === 403) pass("GET /admin/metrics sans auth -> 401/403");
  else fail("GET /admin/metrics sans auth", "Got HTTP " + r.status + " SECURITE CRITIQUE");

  r = await req("GET", "/admin/metrics", null, userToken);
  if (r.status === 403) pass("GET /admin/metrics user -> 403");
  else fail("GET /admin/metrics user -> 403", "Got HTTP " + r.status);

  // CHAT
  r = await req("POST", "/chat", { message: "" }, userToken);
  if (r.status === 400) pass("Chat message vide -> 400");
  else fail("Chat message vide -> 400", "Got HTTP " + r.status);

  r = await req("POST", "/chat", {}, userToken);
  if (r.status === 400) pass("Chat body vide -> 400");
  else fail("Chat body vide -> 400", "Got HTTP " + r.status);

  r = await req("POST", "/chat", { message: "test" });
  if (r.status === 401) pass("Chat sans auth -> 401");
  else fail("Chat sans auth -> 401", "Got HTTP " + r.status);

  let conversationId = null;
  r = await req("POST", "/chat", { message: "Mon imprimante ne fonctionne plus" }, userToken);
  if (r.status === 200 && r.data && r.data.answer) {
    pass("Chat message normal -> reponse OpenAI");
    conversationId = r.data.conversation_id;
    if (r.data.answer.includes("Source") && r.data.answer.includes("Proc")) fail("Reponse IA propre", "Bloc Source/Procedure detecte");
    else pass("Reponse IA sans bloc source");
    if (!r.data.ticket) pass("Question simple -> pas d'auto-escalade");
    else warn("Question simple", "ticket cree sur question basique");
  } else {
    fail("Chat message normal -> reponse OpenAI", "HTTP " + r.status + " " + JSON.stringify(r.data).slice(0,200));
  }

  r = await req("POST", "/chat", { message: "a".repeat(2001) }, userToken);
  if (r.status === 400) pass("Chat message >2000 chars -> 400");
  else fail("Chat message >2000 chars -> 400", "Got HTTP " + r.status);

  // TICKETS
  let ticketId = null;
  if (conversationId) {
    r = await req("POST", "/chat/escalate", { conversation_id: conversationId, reason: "Test fulltest" }, userToken);
    if (r.status === 200 && r.data) {
      ticketId = r.data.ticket && r.data.ticket.id;
      pass("Creer ticket via /chat/escalate");
    } else {
      fail("Creer ticket via /chat/escalate", "HTTP " + r.status + " " + JSON.stringify(r.data));
    }
  }

  // /tickets requires staff — user uses /tickets/mine
  r = await req("GET", "/tickets/mine", null, userToken);
  if (r.status === 200) pass("GET /tickets/mine user -> 200");
  else fail("GET /tickets/mine user -> 200", "HTTP " + r.status);

  r = await req("GET", "/tickets", null, adminToken);
  if (r.status === 200) pass("GET /tickets admin -> 200");
  else fail("GET /tickets admin -> 200", "HTTP " + r.status);

  if (ticketId) {
    r = await req("GET", "/tickets/" + ticketId, null, userToken);
    if (r.status === 200) pass("GET /tickets/:id proprietaire -> 200");
    else fail("GET /tickets/:id proprietaire -> 200", "HTTP " + r.status);

    r = await req("GET", "/tickets/" + ticketId, null, adminToken);
    if (r.status === 200) pass("GET /tickets/:id admin -> 200");
    else fail("GET /tickets/:id admin -> 200", "HTTP " + r.status);
  }

  r = await req("GET", "/tickets/not-a-valid-uuid", null, adminToken);
  if (r.status === 400 || r.status === 404) pass("UUID invalide -> 400/404");
  else fail("UUID invalide -> 400/404", "Got HTTP " + r.status);

  // Export CSV
  try {
    const csvRes = await fetch(BASE + "/tickets/export.csv", { headers: { "Authorization": "Bearer " + adminToken } });
    if (csvRes.status === 200) {
      // Check raw bytes: fetch.text() strips BOM during TextDecoder, must use arrayBuffer
      const ab = await csvRes.arrayBuffer();
      const bytes = new Uint8Array(ab);
      const hasBom = bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF;
      if (hasBom) pass("Export CSV avec BOM UTF-8 (bytes EF BB BF)");
      else warn("Export CSV", "Pas de BOM UTF-8 dans les bytes bruts -> probleme accents Excel");
    } else {
      fail("Export CSV -> 200", "HTTP " + csvRes.status);
    }
  } catch (e) { fail("Export CSV", e.message); }

  // SECURITE
  try {
    const malRes = await fetch(BASE + "/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + userToken },
      body: "{ invalid json !!!"
    });
    if (malRes.status === 400) pass("Payload JSON malformé -> 400");
    else fail("Payload JSON malformé -> 400", "Got HTTP " + malRes.status);
  } catch (e) {}

  try {
    const headRes = await fetch(BASE + "/health");
    const xframe = headRes.headers.get("x-frame-options");
    const xcttype = headRes.headers.get("x-content-type-options");
    if (xframe) pass("Helmet X-Frame-Options: " + xframe);
    else warn("Helmet headers", "X-Frame-Options absent");
    if (xcttype) pass("Helmet X-Content-Type-Options: " + xcttype);
    else warn("Helmet headers", "X-Content-Type-Options absent");
  } catch (e) {}

  r = await req("GET", "/etc/passwd");
  if (r.status === 404) pass("Static /etc/passwd -> 404");
  else fail("Static /etc/passwd -> 404", "Got HTTP " + r.status);

  try {
    const sRes = await fetch(BASE + "/success.html");
    if (sRes.status === 200) pass("/success.html accessible -> 200");
    else fail("/success.html -> 200", "Got HTTP " + sRes.status);
  } catch (e) { fail("/success.html", e.message); }

  // BILLING
  r = await req("GET", "/billing/plans");
  if (r.status === 200) {
    const plans = (r.data && r.data.plans) || (Array.isArray(r.data) ? r.data : []);
    if (plans.length >= 2) pass("GET /billing/plans -> " + plans.length + " plans");
    else warn("GET /billing/plans", "Moins de 2 plans: " + JSON.stringify(r.data).slice(0,100));
  } else fail("GET /billing/plans -> 200", "HTTP " + r.status);

  try {
    const whRes = await fetch(BASE + "/billing/webhook/stripe", {
      method: "POST",
      headers: { "Content-Type": "application/json", "stripe-signature": "t=bad,v1=invalid" },
      body: JSON.stringify({ type: "test" })
    });
    if (whRes.status === 400) pass("Stripe webhook sig invalide -> 400");
    else warn("Stripe webhook sig invalide", "Got HTTP " + whRes.status);
  } catch (e) {}

  // ══ LANGUE FR / EN ══════════════════════════════════════════════════════

  // Chat en français → réponse en français
  r = await req("POST", "/chat", { message: "Mon imprimante ne repond pas depuis ce matin, que faire ?", language: "fr" }, userToken);
  if (r.status === 200 && r.data && r.data.answer) {
    const frWords = /imprimante|vérif|redémarr|Vérif|Redémarr|bonjour|essayez|assurez/i.test(r.data.answer);
    const enWords = /printer|check|restart|please|make sure/i.test(r.data.answer);
    if (frWords) pass("Chat FR -> réponse en français");
    else fail("Chat FR -> réponse en français", "Réponse: " + (r.data.answer||"").slice(0,120));
  } else fail("Chat FR -> réponse en français", "HTTP " + r.status);

  // Chat en anglais → réponse en anglais
  r = await req("POST", "/chat", { message: "My printer is not working, what should I do?", language: "en" }, userToken);
  if (r.status === 200 && r.data && r.data.answer) {
    const enWords = /printer|check|restart|please|make sure|try|click|open/i.test(r.data.answer);
    const frWordsDom = /imprimante|vérif|redémarr|assurez|essayez|cliquez/i.test(r.data.answer);
    if (enWords && !frWordsDom) pass("Chat EN -> réponse en anglais");
    else if (enWords) warn("Chat EN -> réponse partiellement FR/EN", (r.data.answer||"").slice(0,120));
    else fail("Chat EN -> réponse en anglais", "Réponse: " + (r.data.answer||"").slice(0,120));
  } else fail("Chat EN -> réponse en anglais", "HTTP " + r.status);

  // Auto-détection: message EN avec language:fr → backend doit détecter EN
  r = await req("POST", "/chat", { message: "I cannot open my Outlook email, it crashes every time.", language: "fr" }, userToken);
  if (r.status === 200 && r.data && r.data.answer) {
    const enWords = /outlook|open|try|check|restart|click|email|crash|works/i.test(r.data.answer);
    const frDom = /vérif|redémarr|assurez|cliquez|essayez|message d'erreur/i.test(r.data.answer);
    if (enWords && !frDom) pass("Auto-détection: message EN (lang:fr) -> réponse EN");
    else warn("Auto-détection langue", "Réponse: " + (r.data.answer||"").slice(0,120));
  } else fail("Auto-détection langue", "HTTP " + r.status);

  // Auto-détection: message FR avec language:en → backend doit détecter FR
  r = await req("POST", "/chat", { message: "Je n'arrive plus à me connecter à Outlook depuis ce matin.", language: "en" }, userToken);
  if (r.status === 200 && r.data && r.data.answer) {
    const frWords = /outlook|vérif|essayez|redémarr|votre|poste|connexion/i.test(r.data.answer);
    const enDom = /\bcheck\b|\btry\b|\brestart\b|\byour\b|\bopen\b/i.test(r.data.answer);
    if (frWords && !enDom) pass("Auto-détection: message FR (lang:en) -> réponse FR");
    else warn("Auto-détection langue inverse", "Réponse: " + (r.data.answer||"").slice(0,120));
  } else fail("Auto-détection langue inverse", "HTTP " + r.status);

  // JSON answer ne doit pas contenir de champs undefined ou null
  r = await req("POST", "/chat", { message: "Outlook ne s ouvre pas", language: "fr" }, userToken);
  if (r.status === 200 && r.data) {
    const hasAnswer = typeof r.data.answer === "string" && r.data.answer.length > 0;
    const hasNeeds = typeof r.data.needs_ticket === "boolean";
    if (hasAnswer && hasNeeds) pass("Chat JSON: champs answer + needs_ticket présents");
    else fail("Chat JSON: champs manquants", JSON.stringify(r.data).slice(0,200));
  } else fail("Chat JSON réponse", "HTTP " + r.status);

  // Réponse EN ne doit PAS contenir de procédure interne en français
  r = await req("POST", "/chat", { message: "My Teams application keeps crashing since this morning.", language: "en" }, userToken);
  if (r.status === 200 && r.data && r.data.answer) {
    const frPhrases = /Vérifiez que|Redémarrez le|Fermez l|cliquez sur|Tapez la|Appuyez sur Win\+R/i.test(r.data.answer);
    if (!frPhrases) pass("Chat EN: procédures internes bien en anglais");
    else warn("Chat EN: procédure interne contient du français", (r.data.answer||"").slice(0,200));
  } else fail("Chat EN: procédure anglaise", "HTTP " + r.status);

  // suggested_steps présents et cohérents avec la langue
  r = await req("POST", "/chat", { message: "I cannot connect to the VPN, it keeps disconnecting.", language: "en" }, userToken);
  if (r.status === 200 && r.data) {
    const steps = r.data.suggested_steps;
    if (Array.isArray(steps) && steps.length > 0) {
      const allEn = steps.every(s => !/[àâéèêëîïôùûüçœæ]/i.test(s));
      if (allEn) pass("suggested_steps EN: aucun caractère français");
      else warn("suggested_steps EN: mélange FR/EN", JSON.stringify(steps).slice(0,200));
    } else pass("Chat EN: réponse sans suggested_steps (ok si inline)");
  } else fail("suggested_steps EN", "HTTP " + r.status);

  // /admin/analytics route fonctionne et retourne les bons champs
  r = await req("GET", "/admin/analytics", null, adminToken);
  if (r.status === 200 && r.data) {
    const hasSla = r.data.sla && typeof r.data.sla.hours === "number";
    const hasRoi = r.data.roi && typeof r.data.roi.tickets_evites === "number";
    const hasVol = Array.isArray(r.data.volume_last_14_days);
    if (hasSla && hasRoi && hasVol) pass("Analytics: sla + roi + volume présents");
    else fail("Analytics: champs manquants", JSON.stringify(r.data).slice(0,200));
  } else fail("GET /admin/analytics", "HTTP " + r.status);

  // User limit: on ne peut pas créer > plan limit (on vérifie juste que la route retourne les bons champs)
  r = await req("POST", "/users", { email: "testlimit_" + Date.now() + "@test.com", password: "test1234" }, adminToken);
  if (r.status === 201 || r.status === 403 || r.status === 409) {
    if (r.status === 403 && r.data && r.data.error === "user_limit_reached") pass("User limit: 403 user_limit_reached retourné");
    else if (r.status === 201) pass("User limit: création ok (sous la limite)");
    else if (r.status === 409) pass("User limit: email déjà existant 409");
    else fail("User limit: réponse inattendue", "HTTP " + r.status + " " + JSON.stringify(r.data));
  } else fail("POST /users", "HTTP " + r.status);

  // org/settings accessible
  r = await req("GET", "/org/settings", null, adminToken);
  if (r.status === 200 && r.data) {
    const hasWebhook = "webhook_url" in r.data;
    const hasSlack = "slack_webhook_url" in r.data;
    const hasNotify = "notify_on_ticket_created" in r.data && "notify_on_ticket_updated" in r.data;
    if (hasWebhook && hasSlack && hasNotify) pass("org/settings: webhook + slack + notifications présents");
    else fail("org/settings: champs manquants", JSON.stringify(Object.keys(r.data)).slice(0,200));
  } else fail("GET /org/settings", "HTTP " + r.status);

  // PERFORMANCE
  const start = Date.now();
  const concurrentReqs = [];
  for (let i = 0; i < 20; i++) concurrentReqs.push(req("GET", "/tickets/mine", null, userToken));
  const perfResults = await Promise.all(concurrentReqs);
  const elapsed = Date.now() - start;
  const perfOk = perfResults.filter(function(r2) { return r2.status === 200; }).length;
  if (perfOk === 20) pass("20 GET /tickets simultanes -> tous 200 (" + elapsed + "ms)");
  else fail("20 GET /tickets simultanes", perfOk + "/20 ok");
  if (elapsed < 5000) pass("Performance < 5s pour 20 req");
  else warn("Performance", elapsed + "ms - lent");

  // RAPPORT
  console.log("\n══════════════════════════════════════════════════════");
  console.log("  FULLTEST RAPPORT FINAL");
  console.log("══════════════════════════════════════════════════════\n");
  const byStatus = { PASS: [], FAIL: [], WARN: [] };
  for (const result of results) byStatus[result.status].push(result);

  for (const status of ["FAIL", "WARN", "PASS"]) {
    const items = byStatus[status];
    if (items.length === 0) continue;
    const icon = status === "PASS" ? "✓" : status === "FAIL" ? "✗" : "⚠";
    console.log("── " + status + " (" + items.length + ") ──");
    for (const item of items) {
      const detail = item.detail ? "  [" + item.detail + "]" : "";
      console.log(icon + " " + item.label + detail);
    }
    console.log("");
  }

  console.log("══════════════════════════════════════════════════════");
  console.log("  " + byStatus.PASS.length + " PASS  |  " + byStatus.FAIL.length + " FAIL  |  " + byStatus.WARN.length + " WARN");
  console.log("══════════════════════════════════════════════════════\n");

  process.exit(byStatus.FAIL.length > 0 ? 1 : 0);
}

run().catch(function(e) { console.error("FATAL:", e); process.exit(1); });
