"use client";

import { startTransition, useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ExtractedRecipe } from "@/lib/recipe-schema";
import type { SaveState } from "./actions";

export type RecipeDraft = ExtractedRecipe;

export const EMPTY_DRAFT: RecipeDraft = {
  title: "",
  description: "",
  servings: "",
  total_time: "",
  ingredients: [],
  steps: [],
};

const text = "text-base"; // 16px+ stops iOS zooming into fields

export function RecipeForm({
  initial,
  sourcePhotos = [],
  action,
  submitLabel,
}: {
  initial: RecipeDraft;
  sourcePhotos?: string[];
  action: (prev: SaveState, formData: FormData) => Promise<SaveState>;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  // Submitting via onSubmit (not the form's action prop) skips React's automatic
  // form reset, so a failed save keeps the user's edits.
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <input type="hidden" name="source_photos" value={sourcePhotos.join("\n")} />

      <Field label="Title" htmlFor="title">
        <Input id="title" name="title" required defaultValue={initial.title} className={`h-10 ${text}`} />
      </Field>

      <Field label="Description" htmlFor="description">
        <Textarea id="description" name="description" rows={2} defaultValue={initial.description} className={text} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Servings" htmlFor="servings">
          <Input
            id="servings"
            name="servings"
            placeholder="Serves 4"
            defaultValue={initial.servings}
            className={`h-10 ${text}`}
          />
        </Field>
        <Field label="Total time" htmlFor="total_time">
          <Input
            id="total_time"
            name="total_time"
            placeholder="1 hr"
            defaultValue={initial.total_time}
            className={`h-10 ${text}`}
          />
        </Field>
      </div>

      <Field label="Ingredients" hint="one per line" htmlFor="ingredients">
        <Textarea
          id="ingredients"
          name="ingredients"
          rows={6}
          defaultValue={initial.ingredients.join("\n")}
          className={text}
        />
      </Field>

      <Field label="Method" hint="one step per line" htmlFor="steps">
        <Textarea id="steps" name="steps" rows={6} defaultValue={initial.steps.join("\n")} className={text} />
      </Field>

      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending} className={`h-11 ${text}`}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}

function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {hint && <span className="font-normal text-muted-foreground">· {hint}</span>}
      </Label>
      {children}
    </div>
  );
}
