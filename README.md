# The Repertoire

A social recipe-sharing web app. See `CLAUDE.md` for the product plan.

## Setup

1. **Supabase:** run `supabase/migrations/*.sql` in order in the SQL editor.
   Under Authentication → URL Configuration, set the Site URL to the Vercel URL and add
   `http://localhost:3000/**` and `https://<your-vercel-domain>/**` as redirect URLs.
2. **Env vars:** copy `.env.example` to `.env.local` and fill it in. In Vercel, set the
   same variables; mark `ANTHROPIC_API_KEY` as Sensitive.
3. `npm install && npm run dev`

`/dev/extract` is a throwaway page for testing photo → recipe extraction.
