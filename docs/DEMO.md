# Demo client (Assistant Support IT)

## Liens
- Front (prod): `https://assistant-pme.vercel.app/app/login/`
- Front (reset cache): `https://assistant-pme.vercel.app/app/login/?reset=1`
- API (Render): `https://assistant-pme.onrender.com/health`

## Comptes demo
- User: `DEFAULT` / `user@assistant.local` / `user123`
- Admin: `DEFAULT` / `admin@assistant.local` / `admin123`

## Script demo (10 min)
1. **Login utilisateur**
   - Ouvrir la page login.
   - Cliquer "Se connecter" (champs préremplis).
2. **Besoin utilisateur**
   - Cliquer un “Problème rapide” (ex: Outlook).
   - Montrer les étapes proposées.
3. **Escalade**
   - Cliquer “Toujours un problème”.
   - Un ticket est créé automatiquement.
4. **Vérifier les tickets**
   - Cliquer “Mes tickets” pour montrer le ticket créé.
5. **Admin**
   - Ouvrir `/app/admin/`.
   - Se connecter en admin.
   - Montrer le tableau de bord + liste des tickets.

## Points à dire pendant la demo
- “On réduit les tickets simples et on structure les escalades.”
- “L’IA répond, puis escalade avec un ticket complet si besoin.”
- “L’admin voit les stats, l’activité et la qualité des demandes.”

## Si GLPI n’est pas branché
Le ticket est créé **dans l’app** (mock). Le branchement GLPI est fait lors de l’onboarding client.
