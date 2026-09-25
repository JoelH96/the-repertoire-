import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { extract, ExtractionError } from "@/lib/claude";
import { ExtractedRecipe } from "@/lib/recipe-schema";
import { createClient } from "@/lib/supabase/server";
import { fetchPage, FetchPageError, parseUrl } from "@/lib/url-import/fetch-page";
import { recipeFromJsonLd } from "@/lib/url-import/json-ld";
import {
  descriptionLinks,
  fetchYouTubeVideo,
  youTubeVideoId,
  type YouTubeVideo,
} from "@/lib/url-import/youtube";

export const maxDuration = 120;

const Body = z.object({ url: z.string().trim().min(1).max(2000) });

const DescriptionRecipe = ExtractedRecipe.omit({ source: true }).extend({
  has_recipe: z
    .boolean()
    .describe("True only if the description itself lists the ingredients and/or method"),
});

const DESCRIPTION_PROMPT = `This is the title and description of a YouTube cooking video. Creators often write the recipe in the description.

If the description contains the recipe, transcribe it faithfully:
- Keep ingredient lines exactly as written, one per line, with quantities and notes. If ingredients are grouped under subheadings (e.g. "For the sauce"), include the subheading as its own line.
- Split the method into its written steps, in order, without adding step numbers.
- Use the recipe's name for the title, without clickbait or emoji from the video title.
- Do not invent, convert or "improve" anything. Leave a field as an empty string if it isn't in the description.
- Ignore links, sponsor messages, timestamps, equipment lists and social media plugs.

If the description has no ingredients or method (for example it only links to a website), set has_recipe to false and leave the other fields empty.`;

const NOT_FOUND =
  "Couldn't find a recipe on that page. Try a screenshot of it with photo import instead.";

type Result = { recipe: ExtractedRecipe; source_url: string };

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Paste a link to a recipe" }, { status: 400 });
  }

  try {
    const url = parseUrl(parsed.data.url);
    const videoId = youTubeVideoId(url);
    const result = videoId
      ? await fromYouTube(await fetchYouTubeVideo(videoId), () => claimExtraction(supabase))
      : await fromWebPage(url.href);
    if (!result) return NextResponse.json({ error: NOT_FOUND }, { status: 422 });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof FetchPageError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    if (err instanceof ExtractionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

async function fromWebPage(url: string): Promise<Result | null> {
  const page = await fetchPage(url);
  const recipe = recipeFromJsonLd(page.html, page.url);
  if (!recipe || (!recipe.ingredients.length && !recipe.steps.length)) return null;
  return { recipe, source_url: page.url };
}

// The recipe is usually written out in the description. If it isn't, creators tend to link
// to it on their website, which usually has JSON-LD.
async function fromYouTube(video: YouTubeVideo, claim: () => Promise<void>): Promise<Result> {
  if (video.description.trim().length > 50) {
    await claim();
    const found = await extract(
      [
        {
          type: "text",
          text: `Video title: ${video.title}\nChannel: ${video.channel}\n\nDescription:\n${video.description}`,
        },
        { type: "text", text: DESCRIPTION_PROMPT },
      ],
      DescriptionRecipe,
    ).catch((err) => {
      // A declined description is no worse than an empty one: fall back to the links.
      if (err instanceof ExtractionError && err.status === 422) return null;
      throw err;
    });
    if (found?.has_recipe && (found.ingredients.length || found.steps.length)) {
      const { title, description, servings, total_time, ingredients, steps } = found;
      const recipe = { title, description, servings, total_time, ingredients, steps, source: video.channel };
      return { recipe, source_url: video.url };
    }
  }

  for (const link of descriptionLinks(video.description).slice(0, 3)) {
    const result = await fromWebPage(link).catch(() => null);
    if (result) return result;
  }

  throw new FetchPageError(
    "This video's description doesn't include the recipe. If the recipe is on a website, paste that link instead.",
  );
}

async function claimExtraction(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: allowed, error } = await supabase.rpc("claim_extraction");
  if (error) throw new ExtractionError(error.message, 500);
  if (!allowed) {
    throw new ExtractionError("Daily import limit reached. Try again tomorrow.", 429);
  }
}
