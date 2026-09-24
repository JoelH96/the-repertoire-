"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteRecipe } from "../../actions";

export function DeleteRecipeButton({ id, title }: { id: string; title: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function onClick() {
    if (!confirm(`Delete "${title}"? This can't be undone.`)) return;
    setError("");
    startTransition(async () => {
      const result = await deleteRecipe(id);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-2 border-t pt-5">
      <Button variant="destructive" size="lg" className="h-11 text-base" disabled={pending} onClick={onClick}>
        <Trash2 /> {pending ? "Deleting…" : "Delete recipe"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
