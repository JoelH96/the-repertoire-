import "server-only";

import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type Recipe = {
  id: string;
  author_id: string;
  title: string;
  description: string | null;
  servings: string | null;
  total_time: string | null;
  source: string | null;
  ingredients: string[];
  steps: string[];
  source_url: string | null;
  source_photos: string[];
  created_at: string;
  author: { display_name: string };
};

// Every signed-in user can read every recipe; RLS still decides, so "not found" covers the rest.
export async function getRecipe(id: string): Promise<Recipe> {
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select("*, author:profiles(display_name)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) notFound();
  return data;
}

// Chef's notes live in their own table that only the author can read.
export async function getNotes(recipeId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipe_notes")
    .select("notes")
    .eq("recipe_id", recipeId)
    .maybeSingle();
  if (error) throw error;
  return data?.notes ?? null;
}
