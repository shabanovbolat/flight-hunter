import * as React from "react";
import { cn } from "@/lib/utils";

const field =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 text-[15px] text-navy-950 placeholder:text-slate-400 transition-colors focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-200 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-red-400";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(field, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(field, "min-h-24 py-2.5 leading-relaxed", className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(field, "h-11 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 fill=%22none%22 stroke=%22%2364748b%22 stroke-width=%222%22><path d=%22m4 6 4 4 4-4%22/></svg>')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9", className)} {...props} />;
}

/** Arabic text input: RTL, Arabic font, larger line height. */
export function ArabicTextarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      dir="rtl"
      lang="ar"
      className={cn(field, "font-arabic min-h-20 py-2.5 text-xl leading-[2.1]", className)}
      {...props}
    />
  );
}
