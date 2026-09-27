import { Plus } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { CookbookList } from "./cookbook-list";
import { HomeHeader } from "./home-header";
import { getMyProfile } from "./profile/data";

export default async function HomePage() {
  const profile = await getMyProfile();
  const supabase = await createClient();
  const { data: recipes, error } = await supabase
    .from("recipes")
    .select("id, title, source, servings, total_time, ingredients")
    .eq("author_id", profile.id)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
      <HomeHeader active="/" name={profile.display_name} />

      <Link href="/recipes/new" className={buttonVariants({ size: "lg", className: "h-11 text-base" })}>
        <Plus /> Add a recipe
      </Link>

      {recipes.length === 0 ? (
        <p className="text-center text-muted-foreground">
          No recipes yet. Photograph a cookbook page or paste a link to add your first.
        </p>
      ) : (
        <CookbookList recipes={recipes} />
      )}
    </main>
  );
}
