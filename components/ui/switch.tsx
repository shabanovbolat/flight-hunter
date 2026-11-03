"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

/** Accessible toggle built on a native checkbox so it works in plain <form>s. */
export function Switch({
  label,
  hint,
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & { label: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-3.5", className)}>
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-navy-900">{label}</span>
        {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" className="peer sr-only" {...props} />
        <span className="h-6 w-11 rounded-full bg-slate-300 transition-colors peer-checked:bg-navy-900 peer-focus-visible:ring-2 peer-focus-visible:ring-gold-400" />
        <span className="absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}
