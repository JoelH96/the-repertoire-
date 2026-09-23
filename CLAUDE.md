# CLAUDE.md

**The Repertoire** is a social recipe-sharing web app. Users build a personal cookbook, share it with groups of friends, and save friends' recipes into their own repertoire.

## Principles

- **Ship small.** One milestone per session / PR. Each milestone is deployed and usable before the next starts.
- **The risk is content, not code.** If adding a recipe is tedious, nobody will. Every decision favours making recipe entry effortless.
- **Useful solo first.** The app must be worth using with zero friends on it.
- **Out of scope until real users ask:** comments, notifications, feed ranking, ratings, meal plans, shopping lists, structured ingredient parsing (quantities/units), advanced search, native apps.

## Stack

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS** + **shadcn/ui**, mobile-first, installable as a PWA
- **Supabase**: Postgres, Auth (magic link / Google), Storage (recipe photos), Row-Level Security for all access rules
- **Anthropic API** (`@anthropic-ai/sdk`), server-side only, for photo → recipe extraction
- **Vercel** for hosting; deploys on push to `main`

## Data model

```
profiles(id, display_name, avatar_url)
recipes(id, author_id, title, description, servings text, total_time text,
        ingredients text[], steps text[], source_url, source_photos text[], created_at)
groups(id, name, invite_code)
group_members(group_id, user_id)
saves(user_id, recipe_id)
```

Ingredients and steps are plain text lines. Do not parse them into structured quantities.

Access rule (enforced in RLS, not app code): a user can read a recipe if they wrote it, or if its author shares a group with them.

## Photo import

Users photograph a recipe, **usually a printed cookbook page**, and the app fills in the recipe form.

1. Capture or pick 1–3 photos (`<input type="file" accept="image/*" capture>`); multi-page recipes are common.
2. Resize and convert to JPEG in the browser before upload (iPhone photos are HEIC and large).
3. Upload to Supabase Storage; paths are kept on the recipe as `source_photos`.
4. A server route sends the images to Claude with a structured-output schema (title, description, servings, total_time, ingredients[], steps[]).
5. The result pre-fills the normal recipe form. **The user always reviews and edits before saving**. Never auto-save extracted recipes.

- Model: **`claude-sonnet-5`**. Upgrade to `claude-opus-5` only if accuracy on real cookbook photos proves insufficient.
- The API key lives in server env vars only, never in client code.
- Extraction requires a signed-in user and has a per-user daily limit (start at 20).

## Milestones

1. **Personal cookbook + photo import.** Sign in, add a recipe by photo or by hand, review/edit, view your cookbook. Start with a throwaway page that uploads a photo and shows the extracted JSON, to validate extraction on real cookbook pages before building screens.
2. **URL import.** Paste a recipe URL and parse its schema.org `Recipe` JSON-LD into the form.
3. **Groups.** Create a group, share an invite link, see a feed of group members' recipes.
4. **Save.** "Save to my cookbook"; the cookbook shows your own recipes plus saved ones.
5. **Real users.** 5–10 friends. Success metric: each adds 3+ recipes in their first week.
