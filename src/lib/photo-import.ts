import { PHOTO_BUCKET } from "@/lib/photos";
import { resizeToJpeg } from "@/lib/resize-image";
import type { ExtractedRecipe } from "@/lib/recipe-schema";
import { createClient } from "@/lib/supabase/client";

export { MAX_PHOTOS } from "@/lib/photos";

// Resizes each photo to JPEG and uploads it to the user's folder. Returns the storage paths.
export async function uploadRecipePhotos(
  files: File[],
  onStatus: (status: string) => void,
): Promise<string[]> {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("You're signed out. Sign in again and retry.");

  const paths: string[] = [];
  for (const [i, file] of files.entries()) {
    onStatus(`Preparing photo ${i + 1} of ${files.length}…`);
    const jpeg = await resizeToJpeg(file);
    onStatus(`Uploading photo ${i + 1} of ${files.length}…`);
    const path = `${data.user.id}/${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, jpeg, { contentType: "image/jpeg" });
    if (error) throw new Error(`Upload failed: ${error.message}`);
    paths.push(path);
  }
  return paths;
}

// Asks the server to read the recipe from already-uploaded photos.
export async function extractRecipe(paths: string[]): Promise<ExtractedRecipe> {
  const res = await fetch("/api/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paths }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.recipe) {
    throw new Error(body?.error ?? `Couldn't read the recipe (error ${res.status})`);
  }
  return body.recipe;
}

// Asks the server to read the recipe from a web page or YouTube video.
export async function importRecipeFromUrl(
  url: string,
): Promise<{ recipe: ExtractedRecipe; source_url: string }> {
  const res = await fetch("/api/import-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.recipe) {
    throw new Error(body?.error ?? `Couldn't import that link (error ${res.status})`);
  }
  return body;
}
