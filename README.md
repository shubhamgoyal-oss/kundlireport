# Kundli Report System

Self-hosted Kundli generation app (frontend + Supabase edge functions).

## Stack
- Vite + React frontend
- Supabase (DB + Edge Functions)
- Gemini API for AI generation

## Local setup

```bash
npm install
npm run dev
```

Frontend env:

```bash
VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<SUPABASE_ANON_KEY>
```

## Backend (Supabase)

Set function secrets:

```bash
supabase secrets set GEMINI_API_KEY="<YOUR_GEMINI_KEY>" --project-ref <PROJECT_REF>
supabase secrets set AI_MODEL="gemini-3-flash-preview" --project-ref <PROJECT_REF>
supabase secrets set AI_OPENAI_URL="https://generativelanguage.googleapis.com/v1beta/openai/chat/completions" --project-ref <PROJECT_REF>
```

Deploy:

```bash
npx supabase functions deploy start-kundli-job process-kundli-job generate-kundli-report get-kundli-job astrology-chat generate-impact translate-dosha --project-ref <PROJECT_REF>
```

More details: [`docs/SELF_HOSTING_GEMINI.md`](docs/SELF_HOSTING_GEMINI.md)
