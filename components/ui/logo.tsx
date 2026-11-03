import { cn } from "@/lib/utils";
import { kk } from "@/lib/i18n/kk";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9", className)} aria-hidden>
      <rect width="40" height="40" rx="11" fill="#0f1b33" />
      <path d="M20 7l3.2 6.6 7.3 1-5.3 5.1 1.3 7.2L20 23.5l-6.5 3.4 1.3-7.2-5.3-5.1 7.3-1z" fill="#d4a63f" />
      <rect x="11" y="29" width="18" height="3" rx="1.5" fill="#d4a63f" opacity=".6" />
    </svg>
  );
}

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {!compact && <span className="text-lg font-extrabold tracking-tight text-navy-950">{kk.app.name}</span>}
    </span>
  );
}
