# Guide Installation (Local / VPS)

## Prerequis
- Node.js 20+
- Acces serveur (local ou VPS)
- Domaine + HTTPS recommande en production

## 1) Installation
1. Copier le projet sur le serveur.
2. Aller dans `backend/`.
3. Copier `.env.example` vers `.env`.
4. Installer:
```bash
npm install
```
5. Demarrer:
```bash
npm run dev
```

## 2) Acces
- Utilisateur: `http://localhost:3001/app/user/`
- Admin: `http://localhost:3001/app/admin/`

## 3) Variables de prod (minimum)
- `JWT_SECRET`
- `DISABLE_QUICK_LOGIN=true`
- `CORS_ORIGINS=https://votre-domaine.tld`

## 4) IA (optionnel)
- `LLM_MODE=openai`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

## 5) GLPI (optionnel)
- `GLPI_ENABLED=true`
- `GLPI_BASE_URL`
- `GLPI_USER_TOKEN`
- `GLPI_APP_TOKEN` (si requis)

## 6) Check rapide
- `http://localhost:3001/health` retourne `{ok:true}`
- Connexion admin OK
- Ticket test OK

## Logo client
- Remplacer `app/assets/logo.svg` par le logo client.
- Option rapide: `?logo=https://votre-logo.png`
