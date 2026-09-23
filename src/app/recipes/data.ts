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
  ingredients: string[];
  steps: string[];
  source_url: string | null;
  source_photos: string[];
  created_at: string;
};

// RLS decides visibility, so "not found" also covers recipes the user can't read.
export async function getRecipe(id: string): Promise<Recipe> {
  if (!z.uuid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const { data, error } = await supabase.from("recipes").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) notFound();
  return data;
}
