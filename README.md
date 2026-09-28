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
   Under Authentication → Emails → Templates, set both **Magic Link** and **Confirm signup** to
   send a code plus a link that works in any browser:
   ```html
   <h2>Sign in to The Repertoire</h2>
   <p>Your code: <strong>{{ .Token }}</strong></p>
   <p>Or <a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">tap here to sign in</a>.</p>
   ```
   Sign-up is invite-only: under Authentication → Sign In / Providers, turn off **Allow new users
   to sign up**. To invite a friend, use Authentication → Users → Add user → Send invitation.
   Set the **Invite user** template to link to the app:
   ```html
   <h2>You're invited to The Repertoire</h2>
   <p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite">Accept the invite</a>,
   or sign in at {{ .SiteURL }} with this email address.</p>
   ```
2. **Env vars:** copy `.env.example` to `.env.local` and fill it in. In Vercel, set the
   same variables; mark `ANTHROPIC_API_KEY` and `YOUTUBE_API_KEY` as Sensitive.
   For `YOUTUBE_API_KEY`: in Google Cloud Console, create a project, enable **YouTube Data API v3**,
   then under APIs & Services → Credentials create an API key and restrict it to that API.
   The free quota (10,000 units a day, 1 per import) is plenty.
3. `npm install && npm run dev`
