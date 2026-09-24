"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ linkError }: { linkError: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">The Repertoire</h1>

      {status === "sent" ? (
        <p className="text-neutral-700">
          Check your email for a sign-in link. Open it in this browser.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-base"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="rounded-md bg-neutral-900 px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {status === "sending" ? "Sending…" : "Email me a sign-in link"}
          </button>
          {status === "error" && <p className="text-sm text-red-600">{message}</p>}
          {linkError && status === "idle" && (
            <p className="text-sm text-red-600">That link didn&apos;t work. Request a new one.</p>
          )}
        </form>
      )}
    </main>
  );
}
