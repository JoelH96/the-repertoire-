"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { PHOTO_BUCKET } from "@/lib/photos";
import { createClient } from "@/lib/supabase/server";

export type SaveState = { error: string } | null;

// Notes are private to the author, so they're kept apart from the (shared) recipe row.
async function saveNotes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  recipeId: string,
  notes: string,
) {
  const { error } = notes
    ? await supabase.from("recipe_notes").upsert({ recipe_id: recipeId, notes })
    : await supabase.from("recipe_notes").delete().eq("recipe_id", recipeId);
  return error;
}

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
  source: z.string().trim().max(200),
  notes: z.string().trim().max(5000),
  ingredients: lines,
  steps: lines,
  // One form field per photo: browsers send newlines as \r\n, so joined paths break.
  source_photos: z.array(z.string()).max(3),
  source_url: z
    .union([z.literal(""), z.url({ protocol: /^https?$/, error: "Check the link" }).max(2000)])
    .transform((url) => url || null),
});

function parse(formData: FormData) {
  const field = (name: string) => String(formData.get(name) ?? "");
  return RecipeFields.safeParse({
    title: field("title"),
    description: field("description"),
    servings: field("servings"),
    total_time: field("total_time"),
    source: field("source"),
    notes: field("notes"),
    ingredients: field("ingredients"),
    steps: field("steps"),
    source_photos: formData.getAll("source_photos").map(String),
    source_url: field("source_url"),
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

  const { notes, ...recipe } = parsed.data;
  const { data, error } = await supabase.from("recipes").insert(recipe).select("id").single();
  if (error) return { error: `Couldn't save: ${error.message}` };
  const notesError = await saveNotes(supabase, data.id, notes);
  if (notesError) return { error: `Saved the recipe, but not your notes: ${notesError.message}` };

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
  const { title, description, servings, total_time, source, source_url, notes, ingredients, steps } =
    parsed.data;

  // RLS only lets authors update their own recipes; a miss comes back as no row.
  const { data, error } = await supabase
    .from("recipes")
    .update({
      title,
      description,
      servings,
      total_time,
      source,
      source_url,
      ingredients,
      steps,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return { error: `Couldn't save: ${error.message}` };
  if (!data) return { error: "Recipe not found" };
  const notesError = await saveNotes(supabase, id, notes);
  if (notesError) return { error: `Couldn't save your notes: ${notesError.message}` };

  redirect(`/recipes/${id}`);
}

export async function deleteRecipe(id: string): Promise<SaveState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "You're signed out. Sign in again to delete." };

  // RLS only lets authors delete their own recipes; a miss comes back as no row.
  // Notes go with the recipe (on delete cascade).
  const { data, error } = await supabase
    .from("recipes")
    .delete()
    .eq("id", id)
    .select("source_photos")
    .maybeSingle();
  if (error) return { error: `Couldn't delete: ${error.message}` };
  if (!data) return { error: "Recipe not found" };

  // Best effort: the recipe is already gone, so a leftover photo is harmless.
  if (data.source_photos.length) {
    await supabase.storage.from(PHOTO_BUCKET).remove(data.source_photos);
  }

  redirect("/");
}
