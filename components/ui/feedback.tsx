import * as React from "react";
import { AlertCircle, CheckCircle2, Inbox, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-5 animate-spin text-slate-400", className)} aria-hidden />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-slate-100", className)} />;
}

export function Alert({
  variant = "error",
  children,
  className,
}: {
  variant?: "error" | "success" | "info";
  children: React.ReactNode;
  className?: string;
}) {
  const Icon = variant === "success" ? CheckCircle2 : AlertCircle;
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm",
        variant === "error" && "border-red-100 bg-red-50 text-red-800",
        variant === "success" && "border-emerald-100 bg-emerald-50 text-emerald-800",
        variant === "info" && "border-gold-200 bg-gold-50 text-navy-900",
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function EmptyState({
  title,
  text,
  action,
  icon,
  className,
}: {
  title: string;
  text?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center", className)}>
      <div className="flex size-12 items-center justify-center rounded-2xl bg-gold-50 text-gold-600">
        {icon ?? <Inbox className="size-6" aria-hidden />}
      </div>
      <div className="space-y-1">
        <p className="font-semibold text-navy-950">{title}</p>
        {text ? <p className="max-w-sm text-sm text-slate-500">{text}</p> : null}
      </div>
      {action}
    </div>
  );
}
