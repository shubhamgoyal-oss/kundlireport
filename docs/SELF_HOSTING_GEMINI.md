# Self-Hosted Setup (No Lovable Dependency)

This project can run fully outside Lovable:
- Frontend: Vite app deployed on your own host (Vercel/Netlify/Cloudflare Pages/S3).
- Backend: Supabase Edge Functions + DB.
- AI: Direct Gemini API (no Lovable gateway).

## 1) Required secrets (Supabase Edge Functions)

Set these in your Supabase project:

```bash
supabase secrets set GEMINI_API_KEY="<YOUR_GEMINI_KEY>" --project-ref <PROJECT_REF>
supabase secrets set AI_MODEL="gemini-3-flash-preview" --project-ref <PROJECT_REF>
supabase secrets set AI_OPENAI_URL="https://generativelanguage.googleapis.com/v1beta/openai/chat/completions" --project-ref <PROJECT_REF>
```

Notes:
- `GEMINI_API_KEY` is the primary key used now.
- Backward fallback exists for `GOOGLE_API_KEY` and `LOVABLE_API_KEY` for temporary compatibility.

## 2) Deploy edge functions

```bash
npx supabase functions deploy start-kundli-job process-kundli-job generate-kundli-report get-kundli-job astrology-chat generate-impact translate-dosha --project-ref <PROJECT_REF>
```

## 3) Frontend env

Create `.env.production` (or your host env vars):

```bash
VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<SUPABASE_ANON_KEY>
```

## 4) Build and deploy frontend

```bash
npm install
npm run build
```

Deploy `dist/` to your hosting provider.

## 5) Verification checklist

- Start a Kundli job from UI and confirm `start-kundli-job` returns `jobId`.
- Poll `get-kundli-job` and confirm progress moves beyond 20%.
- Generate one English report and one Hindi report.
- Download PDF and verify content.
