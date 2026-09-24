import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export function PageHeader({
  back,
  title,
  children,
}: {
  back: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-2">
      <Link href={back} className="flex items-center gap-1 self-start text-sm text-muted-foreground">
        <ChevronLeft className="size-4" /> Back
      </Link>
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {children}
      </div>
    </header>
  );
}
