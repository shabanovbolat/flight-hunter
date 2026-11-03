"use client";

import { useEffect, useRef, useState } from "react";
import { Timer } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";

/** Server clock offset: serverNow - clientNow, measured when a state arrives. */
export function computeOffset(serverNow: string): number {
  const t = Date.parse(serverNow);
  return Number.isNaN(t) ? 0 : t - Date.now();
}

export function useTick(intervalMs = 250) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Countdown driven by a server deadline; never trusts the client clock alone. */
export function Countdown({
  endsAt,
  totalMs,
  offset,
  onExpire,
  label,
  size = "md",
}: {
  endsAt: number;
  totalMs: number;
  offset: number;
  onExpire?: () => void;
  label?: string;
  size?: "md" | "xl";
}) {
  const now = useTick(200);
  const remaining = Math.max(0, endsAt - (now + offset));
  const fired = useRef(false);
  useEffect(() => {
    fired.current = false;
  }, [endsAt]);
  useEffect(() => {
    if (remaining <= 0 && !fired.current) {
      fired.current = true;
      onExpire?.();
    }
  }, [remaining, onExpire]);

  const pct = totalMs > 0 ? (remaining / totalMs) * 100 : 0;
  const urgent = remaining <= 5000;
  const secs = Math.ceil(remaining / 1000);

  if (size === "xl") {
    return (
      <div className={cn("tabular flex size-36 items-center justify-center rounded-full border-8 text-6xl font-extrabold transition-colors", urgent ? "border-red-500 text-red-600" : "border-gold-400 text-navy-950")}>
        {secs}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2" aria-label={label}>
      <Timer className={cn("size-4", urgent ? "text-red-500" : "text-gold-600")} />
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
        <div className={cn("h-full rounded-full transition-[width] duration-200", urgent ? "bg-red-500" : "bg-gold-500")} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn("tabular min-w-10 text-right text-sm font-semibold", urgent ? "text-red-600" : "text-navy-900")}>
        {formatDuration(remaining)}
      </span>
    </div>
  );
}
