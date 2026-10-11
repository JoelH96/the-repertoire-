import { ExternalLink, Globe } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PHOTO_BUCKET } from "@/lib/photos";
import { createClient } from "@/lib/supabase/server";
import { youTubeVideoId } from "@/lib/url-import/youtube";
import { getNotes, getRecipe } from "../data";
import { PageHeader } from "../page-header";

export default async function RecipePage({ params }: PageProps<"/recipes/[id]">) {
  const { id } = await params;
  const recipe = await getRecipe(id);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const isAuthor = auth.user?.id === recipe.author_id;
  const notes = isAuthor ? await getNotes(recipe.id) : null;

  // The bucket is private, so photos are shown through short-lived signed URLs.
  const { data: signed } = recipe.source_photos.length
    ? await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(recipe.source_photos, 60 * 60)
    : { data: [] };
  const photoUrls = (signed ?? []).flatMap((s) => (s.signedUrl ? [s.signedUrl] : []));

  const meta = [recipe.servings, recipe.total_time].filter(Boolean).join(" · ");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
      <PageHeader back={isAuthor ? "/" : "/everyone"} title={recipe.title}>
        {isAuthor && (
          <Link href={`/recipes/${recipe.id}/edit`} className={buttonVariants({ variant: "outline" })}>
            Edit
          </Link>
        )}
      </PageHeader>

      {(!isAuthor || recipe.source || meta || recipe.description) && (
        <div className="flex flex-col gap-2">
          {!isAuthor && (
            <p className="text-sm text-muted-foreground">Shared by {recipe.author.display_name}</p>
          )}
          {recipe.source && <p className="text-sm">From {recipe.source}</p>}
          {meta && <p className="text-sm text-muted-foreground">{meta}</p>}
          {recipe.description && <p className="whitespace-pre-line">{recipe.description}</p>}
        </div>
      )}

      {recipe.ingredients.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Ingredients</h2>
          <ul className="flex flex-col gap-1.5">
            {recipe.ingredients.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </section>
      )}

      {recipe.steps.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Method</h2>
          <ol className="flex flex-col gap-3">
            {recipe.steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-semibold text-muted-foreground tabular-nums">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {isAuthor && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Chef&apos;s notes</h2>
          {notes ? (
            <p className="whitespace-pre-line">{notes}</p>
          ) : (
            <Link href={`/recipes/${recipe.id}/edit#notes`} className="self-start text-sm text-muted-foreground underline">
              Add a note for next time
            </Link>
          )}
        </section>
      )}

      {(photoUrls.length > 0 || recipe.source_url) && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Original</h2>
          {recipe.source_url && <SourceLink url={recipe.source_url} />}
          {photoUrls.length > 0 && (
            <ul className="flex gap-3">
              {photoUrls.map((url, i) => (
                <li key={url}>
                  <a href={url} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element -- signed Supabase URL */}
                    <img src={url} alt={`Page ${i + 1}`} className="size-24 rounded-lg border object-cover" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}

// Links to the page or video the recipe was imported from, with the video's thumbnail.
function SourceLink({ url }: { url: string }) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const videoId = youTubeVideoId(parsed);
  const site = videoId ? "YouTube" : parsed.hostname.replace(/^www\./, "");

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-lg border p-2 pr-3 hover:bg-muted"
    >
      {videoId ? (
        /* eslint-disable-next-line @next/next/no-img-element -- YouTube's own thumbnail */
        <img
          src={`https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`}
          alt=""
          className="h-14 w-24 shrink-0 rounded object-cover"
        />
      ) : (
        <span className="flex size-10 shrink-0 items-center justify-center rounded bg-muted">
          <Globe className="size-5 text-muted-foreground" />
        </span>
      )}
      <span className="flex min-w-0 flex-col">
        <span className="font-medium">{videoId ? "Watch on YouTube" : `View on ${site}`}</span>
        <span className="truncate text-sm text-muted-foreground">{url.replace(/^https?:\/\//, "")}</span>
      </span>
      <ExternalLink className="ml-auto size-4 shrink-0 text-muted-foreground" />
    </a>
  );
}
