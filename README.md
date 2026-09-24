# The Repertoire

A social recipe-sharing web app. See `CLAUDE.md` for the product plan.

## Setup

1. **Supabase:** run `supabase/migrations/*.sql` in order in the SQL editor.
   Under Authentication → URL Configuration, set the Site URL to the Vercel URL and add
   `http://localhost:3000/**` and `https://<your-vercel-domain>/**` as redirect URLs.
   Supabase's built-in email is limited to a few emails an hour, so sign-in links go through
   Resend: under Authentication → Emails → SMTP Settings, use host `smtp.resend.com`, port 465,
   user `resend`, a Resend API key as the password, and a sender on a domain verified in Resend
   (`onboarding@resend.dev` works for testing but only delivers to the Resend account's own email).
   Then raise the email limit under Authentication → Rate Limits.
2. **Env vars:** copy `.env.example` to `.env.local` and fill it in. In Vercel, set the
   same variables; mark `ANTHROPIC_API_KEY` as Sensitive.
3. `npm install && npm run dev`
