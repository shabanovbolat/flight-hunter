import { CheckCircle2, Clock, Info, XCircle } from "lucide-react";
import { ReferenceBlock } from "@/components/quiz/reference-block";
import type { Feedback, PublicQuestion } from "@/lib/types";
import { kk } from "@/lib/i18n/kk";
import { cn } from "@/lib/utils";

export function FeedbackPanel({ feedback, question }: { feedback: Feedback; question: PublicQuestion }) {
  if (!feedback.revealed) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-navy-100 bg-navy-50 p-4 animate-in-up">
        <Info className="mt-0.5 size-5 text-navy-700" />
        <div>
          <p className="font-semibold">{kk.participant.accepted}</p>
          <p className="text-sm text-slate-600">{kk.participant.acceptedHint}</p>
        </div>
      </div>
    );
  }
  const correctTexts =
    question.type === "text"
      ? feedback.accepted_answers.slice(0, 3)
      : question.options.filter((o) => feedback.correct_option_ids.includes(o.id)).map((o) => o.text);
  const title = feedback.timed_out
    ? kk.participant.timeUp
    : feedback.is_correct
      ? kk.participant.correct
      : feedback.is_late
        ? kk.participant.late
        : feedback.answered
          ? kk.participant.incorrect
          : kk.participant.noAnswer;
  const Icon = feedback.timed_out ? Clock : feedback.is_correct ? CheckCircle2 : XCircle;

  return (
    <div className="space-y-3 animate-in-up">
      <div
        className={cn(
          "flex items-center justify-between gap-3 rounded-2xl p-4",
          feedback.is_correct ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800",
        )}
      >
        <p className="flex items-center gap-2 text-lg font-bold">
          <Icon className="size-6" /> {title}
        </p>
        <span className="tabular rounded-full bg-white/70 px-3 py-1 text-sm font-semibold">
          +{feedback.points_awarded} {kk.common.points}
        </span>
      </div>
      {!feedback.is_correct && correctTexts.length > 0 && (
        <div className="rounded-xl border border-slate-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{kk.participant.correctAnswer}</p>
          <p className="mt-1 font-medium text-emerald-700">{correctTexts.join(" · ")}</p>
        </div>
      )}
      {feedback.explanation || feedback.extra_explanation ? (
        <div className="space-y-1.5 rounded-xl border border-slate-100 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{kk.participant.explanation}</p>
          {feedback.explanation ? <p className="whitespace-pre-wrap text-sm leading-relaxed">{feedback.explanation}</p> : null}
          {feedback.extra_explanation ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">{feedback.extra_explanation}</p>
          ) : null}
        </div>
      ) : null}
      <ReferenceBlock reference={feedback.reference} />
    </div>
  );
}
