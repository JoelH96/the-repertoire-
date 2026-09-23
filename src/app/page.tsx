import { Plus } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: recipes, error } = await supabase
    .from("recipes")
    .select("id, title, servings, total_time")
    .eq("author_id", auth.user!.id)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">My cookbook</h1>
        <form action="/auth/signout" method="post">
          <button className="text-sm text-muted-foreground underline">Sign out</button>
        </form>
      </header>

      <Link href="/recipes/new" className={buttonVariants({ size: "lg", className: "h-11 text-base" })}>
        <Plus /> Add a recipe
      </Link>

      {recipes.length === 0 ? (
        <p className="text-center text-muted-foreground">
          No recipes yet. Photograph a page from a cookbook to add your first.
        </p>
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border">
          {recipes.map((recipe) => (
            <li key={recipe.id}>
              <Link href={`/recipes/${recipe.id}`} className="flex flex-col gap-0.5 px-4 py-3">
                <span className="font-medium">{recipe.title}</span>
                {(recipe.servings || recipe.total_time) && (
                  <span className="text-sm text-muted-foreground">
                    {[recipe.servings, recipe.total_time].filter(Boolean).join(" · ")}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
