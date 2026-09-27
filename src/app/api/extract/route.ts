import type Anthropic from "@anthropic-ai/sdk";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { extract, ExtractionError } from "@/lib/claude";
import { PHOTO_BUCKET } from "@/lib/photos";
import { ExtractedRecipe } from "@/lib/recipe-schema";
import { createClient } from "@/lib/supabase/server";

// Opus thinks before answering, so a multi-page recipe can take over a minute.
export const maxDuration = 120;

const Body = z.object({ paths: z.array(z.string()).min(1).max(3) });

const PROMPT = `These photos show one recipe, usually a printed cookbook page. If there are several photos, they are consecutive pages of the same recipe, in order.

Transcribe the recipe faithfully:
- Keep ingredient lines exactly as printed, one per line, with quantities and notes. If ingredients are grouped under subheadings (e.g. "For the sauce"), include the subheading as its own line.
- Split the method into its printed steps, in order, without adding step numbers.
- For the source, use a book title or author only if it is printed on the page, such as in a running header.
- Do not invent, convert or "improve" anything. Leave a field as an empty string if it isn't on the page.
- Ignore other recipes, page numbers and captions that aren't part of this recipe.`;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Send 1–3 photo paths" }, { status: 400 });
  }
  const { paths } = parsed.data;
  if (!paths.every((p) => p.startsWith(`${auth.user.id}/`))) {
    return NextResponse.json({ error: "Invalid photo path" }, { status: 403 });
  }

  const { data: allowed, error: limitError } = await supabase.rpc("claim_extraction");
  if (limitError) {
    return NextResponse.json({ error: limitError.message }, { status: 500 });
  }
  if (!allowed) {
    return NextResponse.json(
      { error: "Daily photo import limit reached. Try again tomorrow." },
      { status: 429 },
    );
  }

  const images: Anthropic.Beta.BetaImageBlockParam[] = [];
  for (const path of paths) {
    const { data: file, error } = await supabase.storage.from(PHOTO_BUCKET).download(path);
    if (error || !file) {
      return NextResponse.json({ error: `Couldn't read photo ${path}` }, { status: 400 });
    }
    images.push({
      type: "image",
      source: {
        type: "base64",
        media_type: "image/jpeg",
        data: Buffer.from(await file.arrayBuffer()).toString("base64"),
      },
    });
  }

  try {
    const recipe = await extract([...images, { type: "text", text: PROMPT }], ExtractedRecipe);
    return NextResponse.json({ recipe });
  } catch (err) {
    if (err instanceof ExtractionError) {
      const error = err.status === 422 ? "Couldn't read a recipe from these photos" : err.message;
      return NextResponse.json({ error }, { status: err.status });
    }
    throw err;
  }
}
