# Mise en production (Render + Vercel)

## Backend (Render)
Variables minimales :
```
NODE_ENV=production
JWT_SECRET=une_cle_longue_et_secrete
SEED_TENANT_CODE=DEFAULT
SEED_ADMIN_EMAIL=admin@assistant.local
SEED_ADMIN_PASSWORD=admin123
SEED_USER_EMAIL=user@assistant.local
SEED_USER_PASSWORD=user123
DISABLE_QUICK_LOGIN=true
```

## Frontend (Vercel)
- Déploiement auto depuis GitHub.
- Lien prod : `https://assistant-pme.vercel.app/app/login/`

## Test final
1. Login user OK
2. Ticket créé OK
3. Admin voit les tickets
