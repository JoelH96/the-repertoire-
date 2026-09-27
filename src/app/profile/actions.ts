"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { SaveState } from "../recipes/actions";

const DisplayName = z.string().trim().min(1, "Enter your name").max(50, "Keep it under 50 characters");

export async function updateProfile(_prev: SaveState, formData: FormData): Promise<SaveState> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "You're signed out. Sign in again to save." };

  const parsed = DisplayName.safeParse(String(formData.get("display_name") ?? ""));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data })
    .eq("id", auth.user.id);
  if (error) return { error: `Couldn't save: ${error.message}` };

  redirect("/");
}
