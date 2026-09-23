import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">The Repertoire</h1>
        <form action="/auth/signout" method="post">
          <button className="text-sm text-neutral-600 underline">Sign out</button>
        </form>
      </header>
      <p className="text-neutral-700">Signed in as {data.user?.email}. Your cookbook is coming soon.</p>
      <Link href="/dev/extract" className="self-start rounded-md bg-neutral-900 px-4 py-2 font-medium text-white">
        Try photo extraction
      </Link>
    </main>
  );
}
