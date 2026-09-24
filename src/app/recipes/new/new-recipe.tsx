"use client";

import { Camera, ImagePlus, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { extractRecipe, MAX_PHOTOS, uploadRecipePhotos } from "@/lib/photo-import";
import { createRecipe } from "../actions";
import { EMPTY_DRAFT, RecipeForm, type RecipeDraft } from "../recipe-form";

type Photo = { file: File; url: string };

type Step =
  | { kind: "pick" }
  | { kind: "reading"; status: string }
  | { kind: "failed"; error: string; paths: string[] }
  | { kind: "review"; draft: RecipeDraft; paths: string[]; fromPhotos: boolean };

export function NewRecipe() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [step, setStep] = useState<Step>({ kind: "pick" });
  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const room = MAX_PHOTOS - photos.length;
    const added = Array.from(files)
      .slice(0, room)
      .map((file) => ({ file, url: URL.createObjectURL(file) }));
    setPhotos([...photos, ...added]);
  }

  function removePhoto(index: number) {
    URL.revokeObjectURL(photos[index].url);
    setPhotos(photos.filter((_, i) => i !== index));
  }

  async function readRecipe() {
    let paths: string[] = [];
    try {
      paths = await uploadRecipePhotos(
        photos.map((p) => p.file),
        (status) => setStep({ kind: "reading", status }),
      );
      setStep({ kind: "reading", status: "Reading the recipe… this can take up to a minute." });
      const draft = await extractRecipe(paths);
      setStep({ kind: "review", draft, paths, fromPhotos: true });
    } catch (err) {
      setStep({ kind: "failed", error: err instanceof Error ? err.message : String(err), paths });
    }
  }

  if (step.kind === "review") {
    return (
      <div className="flex flex-col gap-5">
        {step.fromPhotos && (
          <>
            <Thumbnails photos={photos} />
            <p className="rounded-lg bg-muted px-3 py-2 text-sm">
              Check it against the page and fix anything that was misread before saving.
            </p>
          </>
        )}
        <RecipeForm
          initial={step.draft}
          sourcePhotos={step.paths}
          action={createRecipe}
          submitLabel="Save to my cookbook"
        />
      </div>
    );
  }

  const reading = step.kind === "reading";
  const full = photos.length >= MAX_PHOTOS;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-muted-foreground">
        Photograph the recipe, one photo per page (up to {MAX_PHOTOS}), and we&apos;ll fill in the
        details for you to check.
      </p>

      {photos.length > 0 && <Thumbnails photos={photos} onRemove={reading ? undefined : removePhoto} />}

      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          addPhotos(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={libraryInput}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          addPhotos(e.target.files);
          e.target.value = "";
        }}
      />

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          size="lg"
          className="h-11 text-base"
          disabled={reading || full}
          onClick={() => cameraInput.current?.click()}
        >
          <Camera /> {photos.length ? "Add page" : "Take photo"}
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-11 text-base"
          disabled={reading || full}
          onClick={() => libraryInput.current?.click()}
        >
          <ImagePlus /> Choose photos
        </Button>
      </div>

      {photos.length > 0 && (
        <Button size="lg" className="h-11 text-base" disabled={reading} onClick={readRecipe}>
          {reading ? "Reading…" : `Read recipe from ${photos.length} photo${photos.length > 1 ? "s" : ""}`}
        </Button>
      )}

      {reading && <p className="text-sm text-muted-foreground" aria-live="polite">{step.status}</p>}

      {step.kind === "failed" && (
        <div role="alert" className="flex flex-col gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm">
          <p className="text-destructive">{step.error}</p>
          {step.paths.length > 0 && (
            <button
              className="self-start underline"
              onClick={() =>
                setStep({ kind: "review", draft: EMPTY_DRAFT, paths: step.paths, fromPhotos: true })
              }
            >
              Type it in instead, keeping these photos
            </button>
          )}
        </div>
      )}

      {!reading && (
        <button
          className="self-center text-sm text-muted-foreground underline"
          onClick={() => setStep({ kind: "review", draft: EMPTY_DRAFT, paths: [], fromPhotos: false })}
        >
          No photo? Type a recipe in
        </button>
      )}
    </div>
  );
}

function Thumbnails({ photos, onRemove }: { photos: Photo[]; onRemove?: (index: number) => void }) {
  return (
    <ul className="flex gap-3">
      {photos.map((photo, i) => (
        <li key={photo.url} className="relative">
          <a href={photo.url} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
            <img
              src={photo.url}
              alt={`Page ${i + 1}`}
              className="size-24 rounded-lg border object-cover"
            />
          </a>
          {onRemove && (
            <button
              aria-label={`Remove page ${i + 1}`}
              onClick={() => onRemove(i)}
              className="absolute -top-2 -right-2 rounded-full border bg-background p-1 shadow-sm"
            >
              <X className="size-3.5" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
