import { PageHeader } from "../page-header";
import { NewRecipe } from "./new-recipe";

export default function NewRecipePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
      <PageHeader back="/" title="Add a recipe" />
      <NewRecipe />
    </main>
  );
}
