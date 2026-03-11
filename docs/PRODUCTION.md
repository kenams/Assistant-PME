# Mise en production (Render + Vercel)

## 1) Backend (Render)
### Variables d’environnement minimales
```
NODE_ENV=production
JWT_SECRET=une_cle_longue_et_secrete
SEED_TENANT_NAME=Default
SEED_TENANT_CODE=DEFAULT
SEED_ADMIN_EMAIL=admin@assistant.local
SEED_ADMIN_PASSWORD=admin123
SEED_USER_EMAIL=user@assistant.local
SEED_USER_PASSWORD=user123
DISABLE_QUICK_LOGIN=true
```

### Recommandé
```
LOG_LEVEL=info
CORS_ORIGINS=https://assistant-pme.vercel.app
```

### GLPI (quand prêt)
```
GLPI_ENABLED=true
GLPI_BASE_URL=https://glpi.votre-domaine.tld
GLPI_APP_TOKEN=xxxx
GLPI_USER_TOKEN=xxxx
```

### Démarrage propre
1. Déployer sur Render.
2. Vérifier `/health`.
3. Tester login user/admin.

## 2) Frontend (Vercel)
Déploiement automatique depuis GitHub.

### Lien prod
```
https://assistant-pme.vercel.app/app/login/
```

## 3) Vérifications finales
- Login user/admin OK.
- Création de ticket OK.
- Admin voit les tickets.

## 4) Après vente (client)
1. Renseigner CORS_ORIGINS avec le domaine client.
2. Remplacer SEED_* par les comptes d’admin client.
3. Brancher GLPI (variables ci-dessus).
