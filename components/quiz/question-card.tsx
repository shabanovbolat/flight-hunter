"use client";

import Image from "next/image";
import { Check, X } from "lucide-react";
import { ArabicText } from "@/components/ui/arabic";
import { Input } from "@/components/ui/input";
import type { Feedback, PublicQuestion } from "@/lib/types";
import { mediaUrl } from "@/lib/env";
import { kk } from "@/lib/i18n/kk";
import { cn } from "@/lib/utils";

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

export function QuestionCard({
  question,
  selected,
  onToggle,
  text,
  onText,
  locked,
  feedback,
  big,
}: {
  question: PublicQuestion;
  selected: string[];
  onToggle?: (id: string) => void;
  text?: string;
  onText?: (v: string) => void;
  locked: boolean;
  feedback?: Feedback | null;
  big?: boolean;
}) {
  const img = mediaUrl(question.image_path);
  const revealed = feedback?.revealed ? feedback : null;
  const chosen = feedback ? feedback.selected_option_ids : selected;

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <h2 className={cn("font-semibold leading-snug text-navy-950", big ? "text-3xl sm:text-4xl" : "text-xl sm:text-2xl")}>
          {question.text}
        </h2>
        <ArabicText className={cn("rounded-xl bg-slate-50 px-4 py-2", big ? "text-4xl" : "text-[1.7rem]")}>{question.arabic_text}</ArabicText>
        {img ? (
          <Image src={img} alt="" width={800} height={450} unoptimized className="max-h-64 w-full rounded-xl object-contain" />
        ) : null}
        {!locked && question.type !== "text" ? (
          <p className="text-xs font-medium text-slate-500">
            {question.type === "multiple" ? kk.participant.selectMany : kk.participant.selectOne}
          </p>
        ) : null}
      </div>

      {question.type === "text" ? (
        <Input
          value={feedback ? (feedback.text_answer ?? "") : text}
          onChange={(e) => onText?.(e.target.value)}
          disabled={locked}
          placeholder={kk.participant.textPlaceholder}
          className="h-14 text-lg"
          maxLength={1000}
          autoComplete="off"
          enterKeyHint="send"
          dir="auto"
        />
      ) : (
        <div className={cn("grid gap-3", big && question.options.length > 2 && "sm:grid-cols-2")}>
          {question.options.map((o, i) => {
            const isSel = chosen.includes(o.id);
            const isCorrect = revealed?.correct_option_ids.includes(o.id);
            const state = revealed
              ? isCorrect
                ? "correct"
                : isSel
                  ? "wrong"
                  : "idle"
              : isSel
                ? "selected"
                : "idle";
            return (
              <button
                key={o.id}
                type="button"
                disabled={locked}
                onClick={() => onToggle?.(o.id)}
                aria-pressed={isSel}
                className={cn(
                  "flex min-h-16 w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-all duration-150",
                  !locked && "active:scale-[0.99]",
                  state === "idle" && "border-slate-200 bg-white hover:border-slate-300",
                  state === "selected" && "border-navy-900 bg-navy-50",
                  state === "correct" && "border-emerald-500 bg-emerald-50",
                  state === "wrong" && "border-red-400 bg-red-50",
                  locked && state === "idle" && "opacity-60",
                )}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center text-sm font-bold",
                    question.type === "multiple" ? "rounded-lg" : "rounded-full",
                    state === "idle" && "bg-slate-100 text-slate-600",
                    state === "selected" && "bg-navy-900 text-gold-400",
                    state === "correct" && "bg-emerald-500 text-white",
                    state === "wrong" && "bg-red-500 text-white",
                  )}
                >
                  {state === "correct" ? <Check className="size-5" /> : state === "wrong" ? <X className="size-5" /> : LETTERS[i]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block font-medium leading-snug", big ? "text-xl" : "text-base")}>{o.text}</span>
                  {o.arabic_text ? (
                    <span dir="rtl" lang="ar" className="font-arabic block text-right text-2xl leading-[2]">
                      {o.arabic_text}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
