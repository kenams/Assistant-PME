# Audit Code Mort (MVP)

Objectif: livrable rapide + base propre.

## Candidats a supprimer si non utilises pour le MVP
- Frontend marketing / demo: `landing/`, `crm/`, `dashboard/`, `superadmin/` (supprimes pour garder une seule interface).
- Backend integrations non MVP: `mailbox.service.js`, `oauth.service.js`, `slack.service.js`, `stripe.service.js`, `billing.service.js`, `leads.service.js` (si pas de capture leads).
- Endpoints admin avancés: export global, multi-tenant si pas vendable encore.

## Risques
Supprimer ces modules peut casser des pages admin ou des options futures.
Proposition: garder mais masquer les options dans l'UI si pas utilisees.

## Action proposee
Valider ensemble ce qui doit etre garde pour le MVP, puis supprimer en une passe.
