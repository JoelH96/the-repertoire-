import { createClient } from "@/lib/supabase/server";
import { CookbookList } from "../cookbook-list";
import { HomeHeader } from "../home-header";
import { getMyProfile } from "../profile/data";

// Everyone is in one open group for now, so this is every other cook's recipes, newest first.
export default async function EveryonePage() {
  const profile = await getMyProfile();
  const supabase = await createClient();
  const { data: recipes, error } = await supabase
    .from("recipes")
    .select("id, title, source, servings, total_time, ingredients, author:profiles(display_name)")
    .neq("author_id", profile.id)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
      <HomeHeader active="/everyone" name={profile.display_name} />

      {recipes.length === 0 ? (
        <p className="text-center text-muted-foreground">
          Nobody else has added a recipe yet. Recipes your friends add will show up here.
        </p>
      ) : (
        <CookbookList
          recipes={recipes.map(({ author, ...r }) => ({
            ...r,
            author: (author as unknown as { display_name: string }).display_name,
          }))}
        />
      )}
    </main>
  );
}
