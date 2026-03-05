# Assistant Support IT - Assistant IA Support Informatique pour PME
Concu par Kah-Digital

Objectif:
- MVP en 30 jours
- 5 premiers clients en 60 jours
- 20 clients en 6 mois

Ce repo contient la base produit (docs + backend MVP + landing).

## Stack minimale (gratuite)
- Backend: Node.js (Express)
- Storage: fichier JSON local
- Auth: JWT
- IA: mode mock (OpenAI optionnel)
- Landing: HTML/CSS statique

## Dossiers
- docs/ : specs, roadmap, prompt, schema DB
- backend/ : backend Express
- landing/ : landing page simple
- dashboard/ : dashboard local (leads + tickets)
- crm/ : mini CRM local (prospects)
- app/ : interface chat + KB + tickets

## Demarrer (backend)
1. Aller dans `backend/`
2. Copier `.env.example` vers `.env`
3. `npm install`
4. `npm run dev`

## Configuration (env)
- `LLM_MODE=mock` (par defaut)
- `LLM_MODE=openai` + `OPENAI_API_KEY` + `OPENAI_MODEL`
- `GLPI_ENABLED=true` + `GLPI_BASE_URL` + `GLPI_USER_TOKEN` (+ `GLPI_APP_TOKEN` optionnel)
- Webhook sortant: configurer dans l'app > Parametres support (URL + secret)
- Slack/Teams: configurer dans l'app > Parametres support (webhooks entrants)
- Ingest support: definir `SUPPORT_INGEST_TOKEN` (optionnel)
- Gmail/Outlook: activer dans l'app > Parametres support (IMAP + app password)
- Poll IMAP: `MAIL_POLL_INTERVAL_MIN=5`
- Rate limit: `RATE_LIMIT_*` + `REQUIRE_INGEST_TOKEN`
- Super admin: `SUPER_ADMIN_EMAIL`
- Leads anti-spam: `LEAD_ALLOWLIST_DOMAINS`, `REQUIRE_LEAD_TOKEN`, `LEAD_TOKEN`, `REQUIRE_LEAD_CHALLENGE`
- Ingest allowlist: `INGEST_ALLOWLIST_DOMAINS`
- SLA alerts: `SLA_NOTIFY_INTERVAL_MIN` (0 = desactive)
- OAuth Gmail/Outlook: configurer client ID/secret + redirect URI dans l'app
- Slack inbound: verifier la signature avec `slack_signing_secret` (optionnel)
- Teams inbound: header `X-Teams-Signature` = HMAC SHA256 du body (optionnel)
- SLA/ROI: configurer `SLA (heures)`, `Alerte SLA (%)`, `Cout moyen ticket` dans Parametres support

## Demarrage 1-clic (Windows)
- `start-local.ps1` ou `start-local.bat` a la racine du projet.
- Ouvre automatiquement `http://localhost:3001/app/`.

## Demarrage 1-clic (macOS/Linux)
- `start-local.sh` a la racine du projet.

## Compte admin par defaut
- Email: `admin@assistant.local`
- Mot de passe: `admin123`

Ces valeurs peuvent etre changees dans `.env`.

## Endpoints MVP
- POST /auth/login
- GET  /auth/me
- GET  /org
- GET  /org/settings
- PUT  /org/settings (auth admin)
- POST /chat
- GET  /chat/history?conversation_id=...
- GET  /chat/conversations
- GET  /chat/search?query=...
- POST /chat/feedback
- POST /kb/documents
- POST /kb/upload
- POST /kb/search
- GET  /kb/documents
- DELETE /kb/documents/:id
- POST /tickets
- GET  /tickets
- GET  /tickets/conversation/:id
- GET  /tickets/user/:id (auth staff)
- GET  /tickets/mine
- PATCH /tickets/:id (auth staff)
- GET  /notifications (auth staff)
- POST /notifications/test (auth staff)
- POST /notifications/webhook-local (auth staff)
- GET  /admin/metrics
- GET  /admin/metrics/system
- GET  /admin/metrics/roi.pdf
- GET  /admin/analytics
- GET  /admin/analytics/pdf
- GET  /admin/analytics/summary.csv
- GET  /admin/diagnostics
- POST /admin/sla/notify
- GET  /tenants (superadmin)
- POST /tenants (superadmin)
- POST /tenants/:id/token (superadmin)
- GET  /tenants/overview (superadmin)
- GET  /tenants/export.json (superadmin)
- POST /tenants/import (superadmin)
- GET  /tenants/:id/export.json (superadmin)
- POST /tenants/:id/import (superadmin)
- GET  /leads/challenge
- GET  /admin/audit (auth admin)
- GET  /admin/backup (auth admin)
- POST /admin/restore (auth admin)
- GET  /admin/kb/export.json (auth admin)
- GET  /admin/kb/export.csv (auth admin)
- POST /admin/kb/import (auth admin)
- GET  /admin/conversations/export.json (auth admin)
- GET  /admin/conversations/export.csv (auth admin)
- GET  /admin/activity/users (auth admin)
- GET  /admin/glpi/test (auth admin)
- GET  /health
- POST /leads
- GET  /leads (auth)
- GET  /leads/export.csv (auth)
- GET  /tickets/export.csv (auth)
- GET  /tickets/export.pdf (auth)
- POST /ingest/support
- POST /ingest/slack
- POST /ingest/teams
- POST /ingest/email/pull (auth admin)
- GET  /oauth/google/url (auth admin)
- GET  /oauth/outlook/url (auth admin)
- GET  /oauth/:provider/callback
- GET  /users (auth admin)
- POST /users (auth admin)
- GET  /users/invites (auth admin)
- POST /users/invite (auth admin)
- DELETE /users/invite/:id (auth admin)
- POST /users/invite/accept
- PUT  /leads/:id (auth)
- GET  /billing/quotes (auth)
- POST /billing/quotes (auth)
- PUT  /billing/quotes/:id (auth)
- GET  /billing/quotes/export.csv (auth)
- GET  /billing/quotes/:id/print (auth)
- GET  /billing/quotes/:id/email (auth)
- GET  /billing/invoices (auth)
- POST /billing/invoices (auth)
- PUT  /billing/invoices/:id (auth)
- GET  /billing/invoices/export.csv (auth)
- GET  /billing/invoices/:id/print (auth)
- GET  /billing/invoices/:id/email (auth)

## Landing page
- Ouvrir `landing/index.html` dans un navigateur.
- Le formulaire envoie vers `http://localhost:3001/leads` (backend local).

## Dashboard local
- Ouvrir `dashboard/index.html` dans un navigateur.
- Se connecter avec le compte admin.
- Boutons PDF: une fenetre print s'ouvre, puis enregistrer en PDF.

## CRM local
- Ouvrir `crm/index.html` dans un navigateur.
- Se connecter avec le compte admin.

## App (Chat + KB + Tickets)
- Lancer le backend puis ouvrir `http://localhost:3001/app/`.
- Se connecter avec le compte admin.

## Superadmin (multi-tenant)
- Ouvrir `http://localhost:3001/superadmin/`.
- Le compte doit etre `SUPER_ADMIN_EMAIL`.

## Demo (seed)
- Dans l'app > Admin tools: `Demo data` ou `Reset + demo`.
- Endpoint: `POST /admin/demo/seed` (body `{ mode: "append" | "reset" }`).

## Frontend (minifier)
- Generer les fichiers `.min.js` :
  - `cd backend`
  - `npm run frontend:minify`
 - Watch automatique (rebuild a chaque modif) :
   - `cd backend`
   - `npm run frontend:watch`

## Importer une FAQ (texte)
- `npm run kb:import -- <fichier.txt> "Titre" note`

## Documents cles
- docs/ROADMAP.md
- docs/PLAN_ACTION_7J.md
- docs/PRICING.md
- docs/ARCHITECTURE_BACKEND.md
- docs/SCHEMA_DB.md
- docs/PROMPT_SUPPORT_IT.md
- docs/PROSPECTION_KIT.md
- docs/SCRIPTS_PROSPECTION.md
- docs/LISTE_100_PME_TEMPLATE.csv
