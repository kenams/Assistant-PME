# Schema DB (PostgreSQL + pgvector)

Note: ceci est le schema cible pour la version avec DB. En mode minimal, on utilise un fichier JSON local.

## Tables principales

### tenants
- id (uuid, pk)
- name
- plan
- created_at

### users
- id (uuid, pk)
- tenant_id (fk)
- email (unique per tenant)
- password_hash
- role (admin, agent, user)
- created_at

### conversations
- id (uuid, pk)
- tenant_id (fk)
- user_id (fk)
- status (open, resolved, escalated)
- created_at

### messages
- id (uuid, pk)
- tenant_id (fk)
- conversation_id (fk)
- role (user, assistant, system)
- content
- created_at

### tickets
- id (uuid, pk)
- tenant_id (fk)
- conversation_id (fk)
- external_id (GLPI)
- title
- description
- category
- priority
- status
- created_at

### kb_documents
- id (uuid, pk)
- tenant_id (fk)
- title
- source_type (pdf, faq, procedure)
- source_url
- created_at

### kb_chunks
- id (uuid, pk)
- tenant_id (fk)
- document_id (fk)
- chunk_text
- embedding (vector)
- created_at

### metrics_daily
- id (uuid, pk)
- tenant_id (fk)
- date
- tickets_evites
- tickets_crees
- minutes_economisees

## Indexes
- kb_chunks.embedding: ivfflat
- messages.conversation_id
- tickets.conversation_id
- users.tenant_id