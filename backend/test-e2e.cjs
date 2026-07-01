/**
 * TEST E2E COMPLET — Assistant PME KAH
 * Landing page → Lead → Login → Chat → Ticket → GLPI → Résolution
 */
const https = require('https');
const http = require('http');

// TLS: only disabled when caller explicitly sets ALLOW_INSECURE_TLS=1
if (process.env.ALLOW_INSECURE_TLS === '1') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const BASE = process.env.BACKEND || 'http://localhost:3004';
const GLPI_URL = process.env.GLPI_URL || 'http://localhost:8082';

const APP_TOKEN = process.env.GLPI_APP_TOKEN;
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Missing env vars: TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD');
  process.exit(1);
}
if (!APP_TOKEN) {
  console.error('Missing env var: GLPI_APP_TOKEN');
  process.exit(1);
}

const results = [];
let jwt = null, orgId = null, tenantId = null;

function log(emoji, label, ok, detail = '') {
  const status = ok ? '✅' : '❌';
  const line = `${status} ${emoji} ${label}${detail ? ' — ' + detail : ''}`;
  console.log(line);
  results.push({ label, ok, detail });
}

async function req(method, url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === 'https:';
    const lib = isHttps ? https : http;
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...headers
      },
      rejectUnauthorized: process.env.ALLOW_INSECURE_TLS !== '1'
    };
    const r = lib.request(opts, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, data: body }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function run() {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('  TEST E2E — Assistant PME KAH Digital');
  console.log('  Backend:', BASE);
  console.log('═══════════════════════════════════════════════════\n');

  // ── 1. HEALTH ─────────────────────────────────────────
  console.log('── Phase 1 : Infrastructure ──');
  try {
    const r = await req('GET', BASE + '/health');
    log('🔧', 'Backend health', r.status === 200, r.data.uptime ? 'uptime ' + Math.round(r.data.uptime) + 's' : '');
  } catch(e) { log('🔧', 'Backend health', false, e.message); }

  // ── 2. LANDING PAGE LEAD ──────────────────────────────
  console.log('\n── Phase 2 : Landing page → Lead ──');
  const leadData = { name: 'Jean Test', email: 'jean.test.e2e@example.com', company: 'PME Test SAS', message: 'Je veux tester l\'assistant IA pour notre helpdesk.' };
  try {
    const r = await req('POST', BASE + '/leads', leadData);
    log('📋', 'Formulaire démo (POST /leads)', r.status === 201 || r.status === 200, 'lead_id=' + (r.data.id || r.data.lead_id || '?'));
  } catch(e) { log('📋', 'Formulaire démo', false, e.message); }

  // ── 3. LOGIN ADMIN ────────────────────────────────────
  console.log('\n── Phase 3 : Login admin ──');
  try {
    const r = await req('POST', BASE + '/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    if (r.status === 200 && r.data.token) {
      jwt = r.data.token;
      orgId = r.data.user?.organizationId;
      log('🔑', 'Login admin', true, 'role=' + r.data.user?.role);
    } else {
      log('🔑', 'Login admin', false, 'status=' + r.status + ' ' + JSON.stringify(r.data).substring(0, 80));
    }
  } catch(e) { log('🔑', 'Login admin', false, e.message); }

  if (!jwt) {
    console.log('\n⚠️  Login échoué — skip phases 4-8');
    return finish();
  }

  const authH = { Authorization: 'Bearer ' + jwt };

  // ── 4. CONFIGURE GLPI ─────────────────────────────────
  console.log('\n── Phase 4 : Configuration GLPI ──');
  try {
    const glpiSettings = {
      glpi_enabled: true,
      glpi_base_url: GLPI_URL,
      glpi_app_token: APP_TOKEN,
      glpi_login: 'glpi',
      glpi_password: 'glpi'
    };
    const r = await req('PUT', BASE + '/org/settings', glpiSettings, authH);
    log('⚙️', 'Config GLPI dans admin', r.status === 200, 'glpi_url=' + GLPI_URL.substring(0, 30));
  } catch(e) { log('⚙️', 'Config GLPI', false, e.message); }

  // ── 5. TEST GLPI CONNEXION ────────────────────────────
  console.log('\n── Phase 5 : Test connexion GLPI ──');
  try {
    const r = await req('GET', BASE + '/admin/glpi/test', null, authH);
    log('🔗', 'GLPI connection test', r.status === 200 && r.data.ok !== false, JSON.stringify(r.data).substring(0,80));
  } catch(e) { log('🔗', 'GLPI connection test', false, e.message); }

  // ── 6. CRÉER UN USER CLIENT ───────────────────────────
  console.log('\n── Phase 6 : Utilisateur client ──');
  let clientJwt = null;
  try {
    // Trouver le tenantId
    const orgR = await req('GET', BASE + '/org/settings', null, authH);
    tenantId = orgR.data?.tenantId || orgR.data?.organization_id;

    // Créer user via endpoint users
    const ur = await req('POST', BASE + '/users', {
      email: 'client.test@pme-test.fr',
      password: 'TestClient123!',
      name: 'Client Test',
      role: 'user'
    }, authH);
    log('👤', 'Créer utilisateur client', ur.status === 201 || ur.status === 200 || ur.status === 409, 'id=' + (ur.data.id || ur.data.userId || 'exists'));
  } catch(e) { log('👤', 'Créer utilisateur client', false, e.message); }

  // Login client
  try {
    const lr = await req('POST', BASE + '/auth/login', { email: 'client.test@pme-test.fr', password: 'TestClient123!' });
    if (lr.status === 200) { clientJwt = lr.data.token; log('🔑', 'Login client', true); }
    else log('🔑', 'Login client', false, 'status=' + lr.status);
  } catch(e) { log('🔑', 'Login client', false, e.message); }

  const userH = clientJwt ? { Authorization: 'Bearer ' + clientJwt } : authH;

  // ── 7. CHAT → TICKET ──────────────────────────────────
  console.log('\n── Phase 7 : Chat → Création ticket ──');
  let convId = null, ticketId = null;

  try {
    // POST /chat → l'IA répond, conversation créée automatiquement
    const mr = await req('POST', BASE + '/chat', {
      message: 'Mon imprimante ne répond plus depuis ce matin, aucune réponse quand j\'imprime'
    }, userH);
    convId = mr.data?.conversation_id || mr.data?.conversationId;
    const aiReply = mr.data?.reply || mr.data?.message || mr.data?.response || '';
    log('💬', 'Message chat + réponse IA', mr.status === 200 || mr.status === 201, String(aiReply).substring(0, 60));
  } catch(e) { log('💬', 'Message chat', false, e.message); }

  if (convId) {
    try {
      // Escalader → créer ticket
      const tr = await req('POST', BASE + '/chat/escalate', {
        conversation_id: convId,
        reason: 'Problème imprimante persistant'
      }, userH);
      ticketId = tr.data?.ticketId || tr.data?.ticket?.id || tr.data?.id;
      log('🎫', 'Escalader → ticket', tr.status === 200 || tr.status === 201, 'ticket_id=' + ticketId);
    } catch(e) { log('🎫', 'Escalader → ticket', false, e.message); }
  }

  // ── 8. TICKETS API ────────────────────────────────────
  console.log('\n── Phase 8 : Gestion tickets ──');
  try {
    const r = await req('GET', BASE + '/tickets', null, authH);
    const count = r.data?.total || r.data?.tickets?.length || r.data?.length || 0;
    log('📋', 'GET /tickets (liste admin)', r.status === 200, count + ' tickets');
  } catch(e) { log('📋', 'GET /tickets', false, e.message); }

  if (ticketId) {
    try {
      const r = await req('PATCH', BASE + '/tickets/' + ticketId, {
        status: 'pending'
      }, authH);
      log('📝', 'Ticket → pending', r.status === 200, 'id=' + ticketId);
    } catch(e) { log('📝', 'Ticket → in_progress', false, e.message); }

    try {
      const r = await req('PATCH', BASE + '/tickets/' + ticketId, {
        status: 'resolved',
        resolution: 'Imprimante redémarrée, pilote réinstallé. Problème résolu.'
      }, authH);
      log('✅', 'Ticket → résolu', r.status === 200, 'status=resolved');
    } catch(e) { log('✅', 'Ticket → résolu', false, e.message); }
  } else {
    // Créer ticket directement si pas de conversation
    try {
      const r = await req('POST', BASE + '/tickets', {
        title: 'Test E2E — Imprimante HS',
        summary: "L'imprimante du bureau 12 ne répond plus.",
        category: 'hardware',
        priority: 'medium'
      }, authH);
      ticketId = r.data?.id;
      log('🎫', 'Créer ticket direct', r.status === 201 || r.status === 200, 'id=' + ticketId);

      if (ticketId) {
        const r2 = await req('PATCH', BASE + '/tickets/' + ticketId, { status: 'resolved', resolution: 'Résolu par test E2E' }, authH);
        log('✅', 'Ticket → résolu', r2.status === 200);
      }
    } catch(e) { log('🎫', 'Créer ticket direct', false, e.message); }
  }

  // ── 9. VÉRIF GLPI SYNC ───────────────────────────────
  console.log('\n── Phase 9 : Vérification GLPI sync ──');
  if (ticketId) {
    try {
      const r = await req('GET', BASE + '/tickets/' + ticketId, null, authH);
      const glpiId = r.data?.glpi_ticket_id || r.data?.external_id;
      log('🔗', 'Ticket synchronisé GLPI', !!glpiId, glpiId ? 'glpi_id=' + glpiId : 'non synchronisé');
    } catch(e) { log('🔗', 'GLPI sync check', false, e.message); }
  }

  // ── 10. LEADS ADMIN ──────────────────────────────────
  console.log('\n── Phase 10 : Leads admin ──');
  try {
    const r = await req('GET', BASE + '/leads', null, authH);
    const count = r.data?.items?.length || r.data?.leads?.length || r.data?.length || 0;
    log('📩', 'GET /leads (admin)', r.status === 200, count + ' leads');
  } catch(e) { log('📩', 'GET /leads', false, e.message); }

  return finish();
}

function finish() {
  const ok = results.filter(r => r.ok).length;
  const total = results.length;
  const failed = results.filter(r => !r.ok);

  console.log('\n═══════════════════════════════════════════════════');
  console.log(`  RÉSULTAT : ${ok}/${total} tests passés`);
  if (failed.length) {
    console.log('\n  ÉCHECS :');
    failed.forEach(f => console.log('  ❌ ' + f.label + (f.detail ? ' — ' + f.detail : '')));
  }
  console.log('═══════════════════════════════════════════════════\n');
  process.exit(failed.length > 0 ? 1 : 0);
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
