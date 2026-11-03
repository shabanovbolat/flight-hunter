"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, Spinner } from "@/components/ui/feedback";
import { Progress } from "@/components/ui/progress";
import { Countdown, computeOffset } from "@/components/quiz/clock";
import { QuestionCard } from "@/components/quiz/question-card";
import { FeedbackPanel } from "@/components/quiz/feedback-panel";
import { OfflineBanner } from "@/components/quiz/offline-banner";
import { advanceParticipant, getParticipantState, submitAnswer } from "@/lib/actions/participant";
import type { ParticipantState } from "@/lib/types";
import { kk } from "@/lib/i18n/kk";

type Playing = Extract<ParticipantState, { question: unknown }>;

export function SelfPlayer({ participantId, onFinished }: { participantId: string; onFinished: () => void }) {
  const p = kk.participant;
  const [state, setState] = useState<ParticipantState | null>(null);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [expired, setExpired] = useState(false);
  const busyRef = useRef(false);

  const questionRef = useRef<string | null>(null);

  const apply = useCallback(
    (s: ParticipantState) => {
      setOffset(computeOffset(s.server_now));
      const nextQ = "question" in s ? s.question.id : null;
      if (nextQ !== questionRef.current) {
        questionRef.current = nextQ;
        setSelected([]);
        setText("");
        setExpired(false);
      }
      setState(s);
      if (s.status === "completed") onFinished();
    },
    [onFinished],
  );

  const load = useCallback(async () => {
    setError(null);
    const res = await getParticipantState(participantId);
    if (res.ok) apply(res.data);
    else setError(res.error);
  }, [participantId, apply]);

  useEffect(() => {
    void load();
  }, [load]);

  // Server grants a 2 s grace; re-fetch slightly after it so the timeout is recorded.
  const onQuestionExpire = useCallback(() => {
    setExpired(true);
    setTimeout(() => void load(), 2600);
  }, [load]);

  async function submit() {
    if (!state || !("question" in state) || busyRef.current) return;
    busyRef.current = true; // blocks double taps before React re-renders
    setBusy(true);
    setError(null);
    const res = await submitAnswer({
      participantId,
      questionId: state.question.id,
      optionIds: state.question.type === "text" ? [] : selected,
      text: state.question.type === "text" ? text : null,
    });
    if (res.ok) apply(res.data);
    else setError(res.error);
    busyRef.current = false;
    setBusy(false);
  }

  async function next() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    const res = await advanceParticipant(participantId);
    if (res.ok) {
      apply(res.data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else setError(res.error);
    busyRef.current = false;
    setBusy(false);
  }

  if (!state) {
    return error ? (
      <ErrorRetry error={error} onRetry={load} />
    ) : (
      <div className="flex justify-center py-24">
        <Spinner className="size-8" />
      </div>
    );
  }
  if (state.status === "completed" || !("question" in state)) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="size-8" />
      </div>
    );
  }

  const s = state as Playing;
  const q = s.question;
  const answered = s.answered && s.feedback;
  const startedMs = s.question_started_at ? Date.parse(s.question_started_at) : null;
  const canSubmit =
    !answered && !busy && !expired && (q.type === "text" ? text.trim().length > 0 : selected.length > 0);
  const isLast = s.index + 1 >= s.total;

  return (
    <div className="space-y-4">
      <OfflineBanner />
      <div className="sticky top-0 z-10 -mx-4 space-y-2 border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <span className="tabular rounded-full bg-navy-900 px-3 py-1 text-sm font-bold text-white">
            {p.questionOf(s.index + 1, s.total)}
          </span>
          <div className="flex items-center gap-3">
            {s.quiz_deadline ? (
              <Countdown
                endsAt={Date.parse(s.quiz_deadline)}
                totalMs={(s.quiz_duration_seconds ?? 1) * 1000}
                offset={offset}
                label={p.quizTimeLeft}
                onExpire={() => setTimeout(() => void load(), 2600)}
              />
            ) : null}
            <span className="tabular text-sm font-semibold text-gold-700">
              {s.score} {kk.common.points}
            </span>
          </div>
        </div>
        <Progress value={((s.index + (answered ? 1 : 0)) / s.total) * 100} />
      </div>

      <Card className="space-y-5 p-5 sm:p-7 animate-in-up" key={q.id}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gold-700">{p.pointsShort(q.points)}</span>
          {q.time_limit_seconds && startedMs && !answered ? (
            <Countdown
              endsAt={startedMs + q.time_limit_seconds * 1000}
              totalMs={q.time_limit_seconds * 1000}
              offset={offset}
              label={p.timeLeft}
              onExpire={onQuestionExpire}
            />
          ) : null}
        </div>
        <QuestionCard
          question={q}
          selected={selected}
          onToggle={(id) =>
            setSelected((cur) =>
              q.type === "multiple" ? (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]) : [id],
            )
          }
          text={text}
          onText={setText}
          locked={Boolean(answered) || busy || expired}
          feedback={answered ? s.feedback : null}
        />
        {expired && !answered ? <Alert variant="info">{p.timeUp}</Alert> : null}
      </Card>

      {answered && s.feedback ? <FeedbackPanel feedback={s.feedback} question={q} /> : null}
      {error ? <Alert>{error}</Alert> : null}

      <div className="sticky bottom-0 -mx-4 bg-gradient-to-t from-white via-white to-white/0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
        {answered ? (
          <Button size="xl" className="w-full" onClick={next} disabled={busy}>
            {busy ? <Spinner className="text-white" /> : null}
            {isLast ? p.finish : p.next} <ArrowRight />
          </Button>
        ) : (
          <Button size="xl" variant="gold" className="w-full" onClick={submit} disabled={!canSubmit}>
            {busy ? p.submitting : p.submit}
          </Button>
        )}
      </div>
    </div>
  );
}

export function ErrorRetry({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="space-y-4 py-16">
      <Alert>{error}</Alert>
      <Button variant="outline" onClick={onRetry} className="w-full">
        <RefreshCw /> {kk.common.retry}
      </Button>
    </div>
  );
}
