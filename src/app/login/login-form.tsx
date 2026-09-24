"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

// The email carries both a link and a code. The code is the reliable path on phones:
// a link can open in a different browser than the one you're in (e.g. from a
// home-screen app into Safari), but a code signs you in wherever you type it.
export function LoginForm({ linkError }: { linkError: boolean }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(linkError ? "That link didn't work. Request a new code." : "");

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
    });
    setPending(false);
    if (error) setError(error.message);
    else setStep("code");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");
    const { error } = await createClient().auth.verifyOtp({ email, token: code.trim(), type: "email" });
    if (error) {
      setPending(false);
      setError(error.message);
      return;
    }
    // The session cookie is set now, so the cookbook renders signed in.
    router.replace("/");
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">The Repertoire</h1>

      {step === "email" ? (
        <form onSubmit={sendCode} className="flex flex-col gap-3">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 text-base"
          />
          <Button type="submit" size="lg" disabled={pending} className="h-11 text-base">
            {pending ? "Sending…" : "Email me a sign-in code"}
          </Button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="flex flex-col gap-3">
          <p className="text-muted-foreground">
            We sent a code to <span className="text-foreground">{email}</span>. Enter it here, or tap
            the link in the email.
          </p>
          <Label htmlFor="code">Code</Label>
          <Input
            id="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="h-11 text-center text-lg tracking-widest"
          />
          <Button type="submit" size="lg" disabled={pending} className="h-11 text-base">
            {pending ? "Signing in…" : "Sign in"}
          </Button>
          <button
            type="button"
            className="self-center text-sm text-muted-foreground underline"
            onClick={() => {
              setStep("email");
              setCode("");
              setError("");
            }}
          >
            Use a different email
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </main>
  );
}
