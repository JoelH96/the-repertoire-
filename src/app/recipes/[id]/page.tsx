import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PHOTO_BUCKET } from "@/lib/photo-import";
import { createClient } from "@/lib/supabase/server";
import { getRecipe } from "../data";
import { PageHeader } from "../page-header";

export default async function RecipePage({ params }: PageProps<"/recipes/[id]">) {
  const { id } = await params;
  const recipe = await getRecipe(id);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const isAuthor = auth.user?.id === recipe.author_id;

  // The bucket is private, so photos are shown through short-lived signed URLs.
  const { data: signed } = recipe.source_photos.length
    ? await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(recipe.source_photos, 60 * 60)
    : { data: [] };
  const photoUrls = (signed ?? []).flatMap((s) => (s.signedUrl ? [s.signedUrl] : []));

  const meta = [recipe.servings, recipe.total_time].filter(Boolean).join(" · ");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
      <PageHeader back="/" title={recipe.title}>
        {isAuthor && (
          <Link href={`/recipes/${recipe.id}/edit`} className={buttonVariants({ variant: "outline" })}>
            Edit
          </Link>
        )}
      </PageHeader>

      {(meta || recipe.description) && (
        <div className="flex flex-col gap-2">
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

      {photoUrls.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Original</h2>
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
        </section>
      )}
    </main>
  );
}
