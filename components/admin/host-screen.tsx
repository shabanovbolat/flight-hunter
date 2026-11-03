"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { CheckCircle2, Eye, Flag, Maximize, Play, Radio, SkipForward, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArabicText } from "@/components/ui/arabic";
import { Alert, Spinner } from "@/components/ui/feedback";
import { Countdown, computeOffset } from "@/components/quiz/clock";
import { RankBadge } from "@/components/quiz/leaderboard-table";
import { getHostState, hostControl, openSession } from "@/lib/actions/live";
import { createClient } from "@/lib/supabase/client";
import type { HostState } from "@/lib/types";
import { mediaUrl } from "@/lib/env";
import { kk } from "@/lib/i18n/kk";
import { cn, formatDuration } from "@/lib/utils";

const L = kk.live;
const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

export function HostScreen({
  quizId,
  initialSessionId,
  url,
  qrSvg,
}: {
  quizId: string;
  initialSessionId: string | null;
  url: string;
  qrSvg: string;
}) {
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [state, setState] = useState<HostState | null>(null);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [timeUp, setTimeUp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    if (!sessionId) return;
    const res = await getHostState(sessionId);
    if (res.ok) {
      setState(res.data);
      setOffset(computeOffset(res.data.server_now));
      setError(null);
    } else setError(res.error);
  }, [sessionId]);

  // Poll for joins / answer counts; Realtime for phase changes from other host tabs.
  useEffect(() => {
    if (!sessionId) return;
    void refresh();
    const id = setInterval(() => void refresh(), 1500);
    const supabase = createClient();
    const channel = supabase
      .channel(`host-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "quiz_sessions", filter: `id=eq.${sessionId}` }, () => void refresh())
      .subscribe();
    return () => {
      clearInterval(id);
      void supabase.removeChannel(channel);
    };
  }, [sessionId, refresh]);

  const phase = state?.session.phase;
  const questionId = state?.session.current_question_id;
  useEffect(() => setTimeUp(false), [questionId, phase]);

  function act(action: "next" | "reveal" | "leaderboard" | "end") {
    if (action === "end" && !window.confirm(L.confirmEnd)) return;
    start(async () => {
      if (!sessionId) return;
      const res = await hostControl(sessionId, action);
      if (!res.ok) setError(res.error);
      await refresh();
    });
  }

  function open() {
    start(async () => {
      const res = await openSession(quizId);
      if (res.ok) {
        setState(null);
        setSessionId(res.data.sessionId);
      } else setError(res.error);
    });
  }

  if (!sessionId || phase === "ended") {
    return (
      <div className="space-y-5">
        {phase === "ended" && state ? (
          <Card className="space-y-4 p-6">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <Trophy className="size-5 text-gold-600" /> {L.finalResults}
            </h2>
            <Podium state={state} />
          </Card>
        ) : null}
        <Card className="flex flex-col items-center gap-4 p-10 text-center">
          <Radio className="size-10 text-gold-600" />
          <p className="max-w-md text-slate-600">{L.lobbyHint}</p>
          <Button size="lg" variant="gold" onClick={open} disabled={pending}>
            <Play /> {pending ? L.opening : phase === "ended" ? L.newSession : L.openSession}
          </Button>
        </Card>
        {error ? <Alert>{error}</Alert> : null}
      </div>
    );
  }

  if (!state) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="size-8" />
      </div>
    );
  }

  const q = state.question;
  const started = state.session.question_started_at ? Date.parse(state.session.question_started_at) : null;
  const isLast = state.session.current_index + 1 >= state.total;
  const revealed = phase === "reveal" || phase === "leaderboard";
  const maxCount = Math.max(1, ...(q?.options.map((o) => o.count) ?? [1]));

  return (
    <div ref={rootRef} className="space-y-5 bg-white [&:fullscreen]:overflow-auto [&:fullscreen]:p-10">
      {/* control bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="live">
            <Radio className="size-3" /> {L.phases[phase ?? "lobby"]}
          </Badge>
          {phase !== "lobby" && (
            <span className="tabular rounded-full bg-navy-900 px-3 py-1 text-sm font-bold text-white">
              {state.session.current_index + 1} / {state.total}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
            <Users className="size-4" /> {state.participants_count}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {phase === "lobby" && (
            <Button variant="gold" size="lg" onClick={() => act("next")} disabled={pending || state.participants_count === 0}>
              <Play /> {L.startQuiz}
            </Button>
          )}
          {phase === "question" && (
            <Button variant={timeUp ? "gold" : "default"} size="lg" onClick={() => act("reveal")} disabled={pending}>
              <Eye /> {L.reveal}
            </Button>
          )}
          {phase === "reveal" && (
            <Button variant="outline" size="lg" onClick={() => act("leaderboard")} disabled={pending}>
              <Trophy /> {L.showLeaderboard}
            </Button>
          )}
          {(phase === "reveal" || phase === "leaderboard") && (
            <Button variant="gold" size="lg" onClick={() => act(isLast ? "end" : "next")} disabled={pending}>
              {isLast ? <Flag /> : <SkipForward />} {isLast ? L.endQuiz : L.nextQuestion}
            </Button>
          )}
          {phase !== "lobby" && !isLast && (
            <Button variant="ghost" size="lg" onClick={() => act("end")} disabled={pending}>
              <Flag /> {L.endQuiz}
            </Button>
          )}
          <Button variant="outline" size="icon" aria-label={L.fullscreen} onClick={() => void rootRef.current?.requestFullscreen?.()}>
            <Maximize />
          </Button>
        </div>
      </div>
      {error ? <Alert>{error}</Alert> : null}

      {phase === "lobby" && (
        <Card className="grid items-center gap-8 p-8 md:grid-cols-[auto_1fr]">
          <div className="mx-auto aspect-square w-72 sm:w-96 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
          <div className="space-y-5 text-center md:text-left">
            <h2 className="text-4xl font-extrabold leading-tight">{state.quiz.title}</h2>
            <p className="text-2xl font-semibold text-navy-800">{kk.share.posterText}</p>
            <p className="break-all font-mono text-lg text-slate-500">{url}</p>
            <div className="inline-flex items-center gap-3 rounded-2xl bg-gold-50 px-6 py-4">
              <Users className="size-8 text-gold-600" />
              <span className="tabular text-5xl font-extrabold">{state.participants_count}</span>
              <span className="text-lg text-slate-600">{L.joined}</span>
            </div>
          </div>
        </Card>
      )}

      {q && (phase === "question" || phase === "reveal") && (
        <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
          <Card className="space-y-6 p-6 sm:p-8">
            <h2 className="text-3xl font-bold leading-snug sm:text-4xl">{q.text}</h2>
            <ArabicText className="text-4xl">{q.arabic_text}</ArabicText>
            {q.image_path ? (
              <Image src={mediaUrl(q.image_path)!} alt="" width={900} height={500} unoptimized className="max-h-72 w-auto rounded-xl" />
            ) : null}
            {q.type === "text" ? (
              revealed ? (
                <p className="rounded-2xl bg-emerald-50 p-5 text-2xl font-semibold text-emerald-700">
                  ✓ {q.accepted_answers.join(" · ")}
                </p>
              ) : null
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {q.options.map((o, i) => (
                  <div
                    key={o.id}
                    className={cn(
                      "relative overflow-hidden rounded-2xl border-2 p-4",
                      revealed && o.is_correct ? "border-emerald-500 bg-emerald-50" : "border-slate-200",
                      revealed && !o.is_correct && "opacity-60",
                    )}
                  >
                    {revealed && (
                      <div
                        className={cn("absolute inset-y-0 left-0 transition-[width] duration-700", o.is_correct ? "bg-emerald-100" : "bg-slate-100")}
                        style={{ width: `${(o.count / maxCount) * 100}%` }}
                      />
                    )}
                    <div className="relative flex items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-navy-900 font-bold text-gold-400">
                        {revealed && o.is_correct ? <CheckCircle2 className="size-5" /> : LETTERS[i]}
                      </span>
                      <span className="flex-1 text-xl font-medium">
                        {o.text}
                        {o.arabic_text ? (
                          <span dir="rtl" lang="ar" className="font-arabic block text-2xl leading-loose">
                            {o.arabic_text}
                          </span>
                        ) : null}
                      </span>
                      {revealed && <span className="tabular text-2xl font-bold">{o.count}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {revealed && q.explanation ? <p className="rounded-xl bg-slate-50 p-4 text-lg leading-relaxed">{q.explanation}</p> : null}
          </Card>
          <Card className="flex flex-row items-center justify-around gap-6 p-6 lg:flex-col lg:justify-center">
            {phase === "question" && q.time_limit_seconds && started ? (
              <Countdown
                size="xl"
                endsAt={started + q.time_limit_seconds * 1000}
                totalMs={q.time_limit_seconds * 1000}
                offset={offset}
                onExpire={() => setTimeUp(true)}
              />
            ) : phase === "question" ? (
              <p className="text-sm text-slate-500">{L.noTimer}</p>
            ) : (
              <div className="text-center">
                <p className="tabular text-5xl font-extrabold text-emerald-600">{q.correct_count}</p>
                <p className="text-sm text-slate-500">{kk.stats.correctAnswers}</p>
              </div>
            )}
            <div className="text-center">
              <p className="tabular text-5xl font-extrabold">
                {state.answered_count}
                <span className="text-2xl text-slate-400">/{state.participants_count}</span>
              </p>
              <p className="text-sm text-slate-500">{L.answered}</p>
            </div>
          </Card>
        </div>
      )}

      {phase === "leaderboard" && (
        <Card className="space-y-4 p-6 sm:p-8">
          <h2 className="flex items-center gap-2 text-3xl font-bold">
            <Trophy className="size-7 text-gold-600" /> {kk.leaderboard.title}
          </h2>
          <Podium state={state} />
        </Card>
      )}
    </div>
  );
}

function Podium({ state }: { state: HostState }) {
  if (!state.leaderboard.length) return <p className="text-slate-500">{kk.leaderboard.empty}</p>;
  return (
    <ol className="space-y-2">
      {state.leaderboard.map((r, i) => (
        <li
          key={i}
          className={cn(
            "flex items-center gap-4 rounded-2xl px-5 py-3 animate-in-up",
            r.rank === 1 ? "bg-gold-100" : r.rank <= 3 ? "bg-gold-50" : "bg-slate-50",
          )}
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <span className="flex w-8 justify-center">
            <RankBadge rank={r.rank} />
          </span>
          <span className="flex-1 truncate text-xl font-semibold">{r.display_name}</span>
          <span className="tabular text-sm text-slate-500">{formatDuration(r.total_time_ms)}</span>
          <span className="tabular w-16 text-right text-2xl font-bold">{r.score}</span>
        </li>
      ))}
    </ol>
  );
}
