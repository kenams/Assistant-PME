# Checklist Mise en Production (Detaillee)

## A) Infra / réseau
- Serveur stable (VPS ou on‑prem).
- Port HTTPS 443 ouvert.
- Certificat TLS valide.
- Domaine pointe vers l’IP serveur.

## B) Configuration securite
- `JWT_SECRET` fort.
- `DISABLE_QUICK_LOGIN=true`.
- `CORS_ORIGINS` limite aux domaines client.
- Comptes de demo supprimes ou mots de passe changes.

## C) Donnees / sauvegardes
- Stockage persistant configure.
- Sauvegardes automatiques (quotidiennes).
- Politique de retention definie (tickets + captures).

## D) IA / GLPI
- IA (optionnel): `LLM_MODE=openai` + `OPENAI_API_KEY` + `OPENAI_MODEL`.
- GLPI (optionnel): tokens + test OK.
- Test creation ticket end-to-end.

## E) Monitoring
- Uptime check (ex: health endpoint).
- Logs accessibles.
- Plan de redemarrage (service/pm2/systemd).

## F) Validation finale
- Tests fonctionnels OK.
- Demo client OK.
- Admin remis au client.
