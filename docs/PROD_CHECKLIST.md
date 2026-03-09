# Checklist Production (Client)

## 1) Configuration securite
- `JWT_SECRET` fort (obligatoire).
- `DISABLE_QUICK_LOGIN=true`.
- `CORS_ORIGINS` limite aux domaines client.
- Comptes de demo supprimes ou mots de passe changes.

## 2) Donnees et sauvegardes
- Stockage persistant configure.
- Sauvegardes automatiques activees.
- Politique de retention definie (tickets + captures).

## 3) IA / GLPI
- IA: `LLM_MODE=openai` + `OPENAI_API_KEY` + `OPENAI_MODEL`.
- GLPI: `GLPI_ENABLED=true` + tokens + test OK.
- Test creation ticket end-to-end.

## 4) Exploitation
- Monitoring basique (uptime + logs).
- Plan de mise a jour (mensuel/ trimestriel).
- Contact support (email / tel).

## 5) Validation finale
- Tests fonctionnels passes.
- Demo client validee.
- Acces admin remis.
