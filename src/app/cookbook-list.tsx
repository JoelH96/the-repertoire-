"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export type CookbookRecipe = {
  id: string;
  title: string;
  source: string | null;
  servings: string | null;
  total_time: string | null;
  ingredients: string[];
};

// Lowercase and strip accents, so "creme" finds "crème".
function normalize(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

// Every word in the query must appear in the title or an ingredient.
function matches(recipe: CookbookRecipe, words: string[]) {
  const haystack = normalize([recipe.title, ...recipe.ingredients].join("\n"));
  return words.every((word) => haystack.includes(word));
}

export function CookbookList({ recipes }: { recipes: CookbookRecipe[] }) {
  const [query, setQuery] = useState("");
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const shown = words.length ? recipes.filter((r) => matches(r, words)) : recipes;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search by name or ingredient"
          aria-label="Search recipes"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-11 pl-9 text-base"
        />
      </div>

      {shown.length === 0 ? (
        <p className="py-6 text-center text-muted-foreground">No recipes match “{query.trim()}”.</p>
      ) : (
        <ul className="flex flex-col divide-y rounded-lg border">
          {shown.map((recipe) => (
            <li key={recipe.id}>
              <Link href={`/recipes/${recipe.id}`} className="flex flex-col gap-0.5 px-4 py-3">
                <span className="font-medium">{recipe.title}</span>
                {(recipe.source || recipe.servings || recipe.total_time) && (
                  <span className="text-sm text-muted-foreground">
                    {[recipe.source, recipe.servings, recipe.total_time].filter(Boolean).join(" · ")}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
