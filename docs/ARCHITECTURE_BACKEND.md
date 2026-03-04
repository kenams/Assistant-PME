# Architecture backend (MVP)

## Objectifs
- Chat support IT + creation automatique de ticket.
- Base de connaissances par client (RAG).
- Auth JWT multi-tenant.

## Mode minimal (sans cout)
- Storage: fichier JSON local
- Recherche: keywords (pas d'embeddings)
- IA: mock local (ou OpenAI si disponible)

## Stack cible (upgrade)
- Node.js + Express
- PostgreSQL + pgvector
- Auth JWT

## Modules
- Auth: login, refresh, roles.
- Chat: historique par utilisateur + resolution.
- KB: ingestion (textes/FAQ/procedures) + recherche.
- Tickets: creation locale + GLPI plus tard.
- Admin: stats de performance et ROI.

## Services internes
- LLM service: prompt systeme, outils, routing.
- Retrieval service: recherche simple, puis embeddings.
- Ticket service: generate title/summary/category/priority.
- Audit log: actions clees.

## API (MVP)
- POST /auth/login
- POST /auth/refresh
- GET  /auth/me

- POST /chat
- GET  /chat/history

- POST /kb/documents
- POST /kb/search

- POST /tickets
- GET  /tickets

- GET /admin/metrics

## Tenancy
- Every record has tenant_id
- JWT contains tenant_id + role

## Observabilite
- Request id
- Basic structured logs