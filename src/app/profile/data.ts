import "server-only";

import { createClient } from "@/lib/supabase/server";

// Profiles are created on sign-up (see 0007_profiles_and_sharing.sql).
export async function getMyProfile() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("id", auth.user!.id)
    .single();
  if (error) throw error;
  return data as { id: string; display_name: string };
}
