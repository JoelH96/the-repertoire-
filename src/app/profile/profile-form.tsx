"use client";

import { startTransition, useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "./actions";

export function ProfileForm({ displayName }: { displayName: string }) {
  const [state, formAction, pending] = useActionState(updateProfile, null);

  // As in RecipeForm: onSubmit skips React's form reset, so a failed save keeps the edit.
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <Label htmlFor="display_name">
        Your name
        <span className="font-normal text-muted-foreground">· shown on recipes you share</span>
      </Label>
      <Input
        id="display_name"
        name="display_name"
        required
        maxLength={50}
        autoComplete="name"
        defaultValue={displayName}
        className="h-10 text-base"
      />
      {state?.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending} className="h-11 text-base">
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
