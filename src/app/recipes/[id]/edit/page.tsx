import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateRecipe } from "../../actions";
import { getRecipe } from "../../data";
import { PageHeader } from "../../page-header";
import { RecipeForm } from "../../recipe-form";

export default async function EditRecipePage({ params }: PageProps<"/recipes/[id]/edit">) {
  const { id } = await params;
  const recipe = await getRecipe(id);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (auth.user?.id !== recipe.author_id) notFound();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
      <PageHeader back={`/recipes/${id}`} title="Edit recipe" />
      <RecipeForm
        initial={{
          title: recipe.title,
          description: recipe.description ?? "",
          servings: recipe.servings ?? "",
          total_time: recipe.total_time ?? "",
          ingredients: recipe.ingredients,
          steps: recipe.steps,
        }}
        action={updateRecipe.bind(null, id)}
        submitLabel="Save changes"
      />
    </main>
  );
}
