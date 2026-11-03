import { cn } from "@/lib/utils";

/** Renders Arabic exactly as entered: RTL, lang=ar, Arabic font, tall line-height. */
export function ArabicText({ children, className }: { children: string | null | undefined; className?: string }) {
  if (!children) return null;
  return (
    <p dir="rtl" lang="ar" className={cn("font-arabic whitespace-pre-wrap text-2xl leading-[2.2] text-navy-950", className)}>
      {children}
    </p>
  );
}
