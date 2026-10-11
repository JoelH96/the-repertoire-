import { CircleUser } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "My cookbook" },
  { href: "/everyone", label: "Everyone" },
] as const;

export function HomeHeader({ active, name }: { active: "/" | "/everyone"; name: string }) {
  return (
    <header className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">The Repertoire</h1>
        <Link href="/profile" className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
          <CircleUser className="size-4 shrink-0" />
          <span className="truncate">{name}</span>
        </Link>
      </div>
      <nav className="grid grid-cols-2 rounded-lg bg-muted p-1 text-sm font-medium">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={tab.href === active ? "page" : undefined}
            className={cn(
              "rounded-md py-2 text-center text-muted-foreground",
              tab.href === active && "bg-background text-foreground shadow-sm",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
