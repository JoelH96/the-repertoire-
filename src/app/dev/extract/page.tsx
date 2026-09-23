"use client";

import { useState } from "react";
import { uploadRecipePhotos } from "@/lib/photo-import";

// Throwaway page for validating extraction on real cookbook photos.
// Replaced by the real add-recipe flow once extraction is proven.
export default function ExtractTestPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setResult(null);
    try {
      const paths = await uploadRecipePhotos(files, setStatus);

      setStatus("Reading recipe…");
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths }),
      });
      setResult(await res.json());
      setStatus(res.ok ? "Done" : `Failed (${res.status})`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">Extraction test</h1>
      <p className="text-sm text-neutral-600">
        Pick 1–3 photos of one recipe, in page order. Nothing is saved as a recipe.
      </p>

      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 3))}
        className="text-sm"
      />

      <button
        onClick={run}
        disabled={busy || files.length === 0}
        className="self-start rounded-md bg-neutral-900 px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        Extract {files.length > 0 && `(${files.length} photo${files.length > 1 ? "s" : ""})`}
      </button>

      {status && <p className="text-sm">{status}</p>}

      {result !== null && (
        <pre className="overflow-x-auto rounded-md bg-neutral-100 p-4 text-xs whitespace-pre-wrap">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  );
}
