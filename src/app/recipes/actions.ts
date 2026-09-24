"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type SaveState = { error: string } | null;

// Ingredients and steps are edited as one line each; blank lines are dropped.
const lines = z.string().transform((s) =>
  s
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean),
);

const RecipeFields = z.object({
  title: z.string().trim().min(1, "Give the recipe a title").max(200),
  description: z.string().trim().max(5000),
  servings: z.string().trim().max(100),
  total_time: z.string().trim().max(100),
  ingredients: lines,
  steps: lines,
  // One form field per photo: browsers send newlines as \r\n, so joined paths break.
  source_photos: z.array(z.string()).max(3),
});

function parse(formData: FormData) {
  const field = (name: string) => String(formData.get(name) ?? "");
  return RecipeFields.safeParse({
    title: field("title"),
    description: field("description"),
    servings: field("servings"),
    total_time: field("total_time"),
    ingredients: field("ingredients"),
    steps: field("steps"),
    source_photos: formData.getAll("source_photos").map(String),
  });
}

export async function createRecipe(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "You're signed out. Sign in again to save." };

  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  // Storage RLS already limits uploads to the user's folder; don't let a recipe point elsewhere.
  if (!parsed.data.source_photos.every((p) => p.startsWith(`${auth.user.id}/`))) {
    return { error: "Invalid photo" };
  }

  const { data, error } = await supabase.from("recipes").insert(parsed.data).select("id").single();
  if (error) return { error: `Couldn't save: ${error.message}` };

  redirect(`/recipes/${data.id}`);
}

export async function updateRecipe(
  id: string,
  _prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "You're signed out. Sign in again to save." };

  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  // Photos are fixed once a recipe is saved, so source_photos isn't updated.
  const { title, description, servings, total_time, ingredients, steps } = parsed.data;

  // RLS only lets authors update their own recipes; a miss comes back as no row.
  const { data, error } = await supabase
    .from("recipes")
    .update({ title, description, servings, total_time, ingredients, steps })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return { error: `Couldn't save: ${error.message}` };
  if (!data) return { error: "Recipe not found" };

  redirect(`/recipes/${id}`);
}
