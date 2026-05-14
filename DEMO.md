# Assistant IA Support Informatique pour PME — Guide de démo

## Lancer le projet

```bash
cd "C:\Users\kenam\Application-Projet-K\Assistant IA Support Informatique pour PME\backend"
set NODE_TLS_REJECT_UNAUTHORIZED=0 && node src/server.js
```

Ou via le script fourni :
```bat
start-local.bat
```

Le serveur démarre sur **http://localhost:3001**

## Pages disponibles

| URL | Description |
|-----|-------------|
| http://localhost:3001/app/login.html | Page de connexion publique |
| http://localhost:3001/app/user.html | Interface utilisateur / chat IA |
| http://localhost:3001/app/admin.html | Tableau de bord administrateur |

## Comptes de test

| Email | Mot de passe | Rôle |
|-------|-------------|------|
| admin@assistant.local | admin123 | Superadmin |
| user@assistant.local | user123 | Utilisateur |

**Boutons de démo 1-clic disponibles sur chaque page** — pas besoin de saisir les identifiants.

## Scénario de démo client (10 minutes)

### 1. Ouverture (2 min)
- Ouvrir http://localhost:3001/app/login.html
- Cliquer **Démo Utilisateur** → connexion instantanée
- Montrer l'interface chat avec les 49 problèmes fréquents catégorisés

### 2. Démonstration chatbot (4 min)
- Cliquer sur **Outlook** dans la colonne gauche
- Observer la réponse IA structurée avec étapes numérotées
- Taper "ça marche toujours pas" → observer l'escalade automatique + création ticket
- Montrer le badge ticket créé

### 3. Tableau de bord admin (4 min)
- Ouvrir http://localhost:3001/app/admin.html
- Cliquer **Démo Admin** → connexion instantanée
- Montrer les KPIs (tickets ouverts, critiques, résolus, taux IA)
- Cliquer sur un ticket → voir les détails et la suggestion IA
- Ouvrir **Analytiques** → graphiques volumétrie
- Ouvrir **Abonnement** → plans Starter / Pro / Enterprise avec Stripe

## Routes API importantes

### Authentification
```
POST /auth/login         { email, password } → { token, user }
GET  /auth/me            → profil utilisateur connecté
POST /auth/refresh       → renouveler le token (JWT 8h)
```

### Chat IA
```
POST /chat               { message, conversation_id?, language? } → { answer, needs_ticket, ticket }
POST /chat/escalate      { conversation_id } → créer ticket manuellement
GET  /chat/history       ?conversation_id=... → historique messages
```

### Tickets
```
GET  /tickets            → liste tickets (filtrable)
POST /tickets            → créer ticket manuellement
PATCH /tickets/:id       { status: 'resolved' } → fermer ticket
```

### Facturation (Stripe)
```
GET  /billing/plans      → liste des plans disponibles
POST /billing/subscribe  { plan, success_url, cancel_url } → session Stripe Checkout
POST /billing/portal     { customer_id, return_url } → portail Stripe
```

### Admin
```
GET  /admin/metrics      → KPIs (tickets évités, résolus, taux IA...)
GET  /admin/diagnostics  → état OpenAI, GLPI, Mailbox, AD, sécurité
POST /admin/glpi/test    { baseUrl, appToken, userToken } → tester connexion GLPI
GET  /admin/invites      → invitations utilisateurs
```

### Organisation
```
GET  /org                → infos entreprise
PUT  /org                { name, plan } → mise à jour
GET  /org/settings       → paramètres (GLPI, AD, support...)
PUT  /org/settings       → mise à jour paramètres
```

### Base de connaissances
```
GET  /kb/documents       → liste documents
POST /kb/documents       { title, source_type, content } → ajouter document
GET  /kb/search?q=...    → recherche sémantique
POST /kb/upload          multipart/form-data → upload PDF/CSV
```

## Variables d'environnement requises

```env
JWT_SECRET=...          # Secret JWT (obligatoire)
OPENAI_API_KEY=...      # Clé API OpenAI (requis pour IA)
STRIPE_SECRET_KEY=...   # Clé Stripe (requis pour paiement)
LLM_MODE=openai         # Mode IA : "openai" ou "local"
OPENAI_MODEL=gpt-4o-mini
```

## Ce qui reste à faire (roadmap)

1. **Email réel** — configurer SMTP pour notifications tickets
2. **GLPI live** — connecter une instance GLPI réelle et tester l'intégration
3. **Domaine custom** — déployer sur Vercel ou VPS avec HTTPS
4. **Webhooks entrants** — Slack/Teams pour recevoir les demandes
5. **Export PDF tickets** — rapport mensuel
6. **Multi-tenant complet** — onboarding client en self-service
7. **SSO** — OAuth Google / Microsoft pour login sans mot de passe
