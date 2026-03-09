# Configuration IA (OpenAI)

## Mode local (sans IA)
- `LLM_MODE=mock`

## Mode OpenAI (production)
1. Copier `.env.example` vers `.env`
2. Renseigner:
   - `LLM_MODE=openai`
   - `OPENAI_API_KEY=...`
   - `OPENAI_MODEL=gpt-4o-mini` (ou autre modele dispo)
   - `OPENAI_BASE_URL=https://api.openai.com/v1` (par defaut)

## Test rapide
```bash
node scripts/test-openai.js
```

Si le test est OK, l'IA repondra dans le chat.
