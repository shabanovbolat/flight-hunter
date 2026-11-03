"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { kk } from "@/lib/i18n/kk";

export function CopyButton({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
    >
      {done ? <Check /> : <Copy />} {done ? kk.common.copied : kk.common.copy}
    </Button>
  );
}

export function PrintButton() {
  return (
    <Button type="button" variant="gold" onClick={() => window.print()}>
      {kk.common.print}
    </Button>
  );
}
