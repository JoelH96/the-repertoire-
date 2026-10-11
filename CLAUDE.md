# CLAUDE.md

**The Repertoire** is a social recipe-sharing web app. Users build a personal cookbook, share it with groups of friends, and save friends' recipes into their own repertoire.

## Principles

- **Ship small.** One milestone per session / PR. Each milestone is deployed and usable before the next starts.
- **Descriptive branch names.** Name branches after the milestone or feature (e.g. `milestone-2-url-import`, `fix-login-redirect`). If a session assigns a random branch name, work on a descriptive one instead.
- **The risk is content, not code.** If adding a recipe is tedious, nobody will. Every decision favours making recipe entry effortless.
- **Useful solo first.** The app must be worth using with zero friends on it.
- **Out of scope until real users ask:** comments, notifications, feed ranking, ratings, meal plans, shopping lists, structured ingredient parsing (quantities/units), advanced search (beyond milestone 3's name/ingredient search), native apps.

## Stack

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS** + **shadcn/ui**, mobile-first, installable as a PWA
- **Supabase**: Postgres, Auth (magic link / Google; invite-only, friends are invited from the Supabase dashboard), Storage (recipe photos), Row-Level Security for all access rules
- **Anthropic API** (`@anthropic-ai/sdk`), server-side only, for photo → recipe extraction
- **Vercel** for hosting; deploys on push to `main`
- Next.js 16: route protection lives in `src/proxy.ts` (the renamed `middleware`). Check `node_modules/next/dist/docs/` before relying on older Next.js patterns.

## Data model

```
profiles(id, display_name, avatar_url)          -- created on sign-up by a trigger on auth.users
recipes(id, author_id, title, description, servings text, total_time text,
        ingredients text[], steps text[], source text, source_url, source_photos text[], created_at)
                                                -- source: free-text credit, e.g. "Jamie Oliver, 5 Ingredients"
recipe_notes(recipe_id, notes)                  -- the author's private "Chef's notes"; only the author can read them
saves(user_id, recipe_id)                       -- milestone 5
extraction_usage(user_id, day, count)           -- photo import daily limit, via claim_extraction()
```

Schema changes go in `supabase/migrations/` as numbered SQL files.

Ingredients and steps are plain text lines. Do not parse them into structured quantities.

Access rule (enforced in RLS, not app code): every signed-in user can read every recipe and its photos (one open group). Only the author can edit a recipe or read its chef's notes.

## Photo import

Users photograph a recipe, **usually a printed cookbook page**, and the app fills in the recipe form.

1. Capture or pick 1–3 photos (`<input type="file" accept="image/*" capture>`); multi-page recipes are common.
2. Resize and convert to JPEG in the browser before upload (iPhone photos are HEIC and large).
3. Upload to Supabase Storage; paths are kept on the recipe as `source_photos`.
4. A server route sends the images to Claude with a structured-output schema (title, description, servings, total_time, ingredients[], steps[]).
5. The result pre-fills the normal recipe form. **The user always reviews and edits before saving**. Never auto-save extracted recipes.

- Model: **`claude-opus-5`**. `claude-sonnet-5` misread words and quantities on real cookbook photos.
- The API key lives in server env vars only, never in client code.
- Extraction requires a signed-in user and has a per-user daily limit (start at 20).

## Milestones

1. **Personal cookbook + photo import.** Sign in, add a recipe by photo or by hand, review/edit, view your cookbook. Start with a throwaway page that uploads a photo and shows the extracted JSON, to validate extraction on real cookbook pages before building screens.
2. **URL import.** Paste a recipe URL and parse its schema.org `Recipe` JSON-LD into the form. YouTube links: Claude reads the recipe from the video description (counts towards the daily extraction limit); if it isn't there, try JSON-LD on the description's links. Video details come from the YouTube Data API (`YOUTUBE_API_KEY`), because YouTube blocks scraping from Vercel.
3. **Search + chef's notes.** A search bar on the cookbook page that matches recipe titles and ingredients (filtered in the browser as you type). A "Chef's notes" field on each recipe for the author's own notes, shown only to the author.
4. **Profiles + sharing.** Everyone is in one open group: an "Everyone" tab shows other cooks' recipes with their name, and you set your name on your profile. Chef's notes moved to `recipe_notes` so they stay private.
5. **Save.** "Save to my cookbook"; the cookbook shows your own recipes plus saved ones.
6. **Real users.** 5–10 friends. Success metric: each adds 3+ recipes in their first week.
   - Before inviting anyone: sign-in emails go through Resend (Supabase custom SMTP) from the test sender `onboarding@resend.dev`, which only delivers to the Resend account owner. Verify our own domain in Resend and switch the sender to it.

## Later

Agreed but not scheduled into a milestone yet.

- **Groups** (`groups(id, name, invite_code)`, `group_members(group_id, user_id)`): private groups with invite links, replacing the one open group, when there are users who don't all know each other.
- **Google sign-in** (Supabase Auth Google provider). Sign-in is magic link only for now; Google removes the dependency on email delivery.
