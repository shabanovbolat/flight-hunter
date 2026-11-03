"use client";
import { Button } from "@/components/ui/button";
import { kk } from "@/lib/i18n/kk";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-bold">{kk.common.errorTitle}</h1>
      <p className="max-w-sm text-slate-500">{kk.common.unknownError}</p>
      <Button onClick={reset}>{kk.common.retry}</Button>
    </main>
  );
}
