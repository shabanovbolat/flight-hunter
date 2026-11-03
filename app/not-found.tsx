import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { kk } from "@/lib/i18n/kk";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo />
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{kk.common.notFound}</h1>
        <p className="text-slate-500">{kk.common.notFoundText}</p>
      </div>
      <Button asChild variant="outline">
        <Link href="/">{kk.common.toHome}</Link>
      </Button>
    </main>
  );
}
