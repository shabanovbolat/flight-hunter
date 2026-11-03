"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Hourglass, Radio, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, Spinner } from "@/components/ui/feedback";
import { Progress } from "@/components/ui/progress";
import { Countdown, computeOffset } from "@/components/quiz/clock";
import { QuestionCard } from "@/components/quiz/question-card";
import { FeedbackPanel } from "@/components/quiz/feedback-panel";
import { RankBadge } from "@/components/quiz/leaderboard-table";
import { OfflineBanner } from "@/components/quiz/offline-banner";
import { ErrorRetry } from "@/components/quiz/self-player";
import { getParticipantState, submitAnswer } from "@/lib/actions/participant";
import { createClient } from "@/lib/supabase/client";
import type { ParticipantState } from "@/lib/types";
import { kk } from "@/lib/i18n/kk";
import { cn } from "@/lib/utils";

type Playing = Extract<ParticipantState, { question: unknown }>;

/**
 * Follows quiz_sessions via Realtime. Every change triggers a re-fetch of this
 * participant's state through the RPC (so no answers travel over Realtime);
 * a slow poll covers dropped sockets, and timers use server time.
 */
export function LivePlayer({
  participantId,
  sessionId,
  onFinished,
}: {
  participantId: string;
  sessionId: string;
  onFinished: () => void;
}) {
  const p = kk.participant;
  const [state, setState] = useState<ParticipantState | null>(null);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [expired, setExpired] = useState(false);
  const busyRef = useRef(false);
  const questionRef = useRef<string | null>(null);
  const inflight = useRef(false);
  const pendingRefresh = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (inflight.current) return;
    inflight.current = true;
    try {
      const res = await getParticipantState(participantId);
      if (res.ok) {
        setError(null);
        apply(res.data);
      } else setError(res.error);
    } catch {
      setError(kk.errors.network);
    } finally {
      inflight.current = false;
    }
  }, [participantId, apply]);

  // Spread ~300 phones' refetches over half a second.
  const scheduleRefresh = useCallback(() => {
    if (pendingRefresh.current) clearTimeout(pendingRefresh.current);
    pendingRefresh.current = setTimeout(() => void load(), Math.random() * 500);
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) supabase.realtime.setAuth(session.access_token);
      if (cancelled) return;
      channel = supabase
        .channel(`quiz-session-${sessionId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "quiz_sessions", filter: `id=eq.${sessionId}` },
          () => scheduleRefresh(),
        )
        .subscribe((status) => {
          const ok = status === "SUBSCRIBED";
          setConnected(ok);
          if (ok) scheduleRefresh(); // catch up after (re)connect
        });
    })();
    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [sessionId, scheduleRefresh]);

  // Fallback polling + refresh when the tab comes back
  useEffect(() => {
    const id = setInterval(() => void load(), connected ? 15000 : 3000);
    const onVisible = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [connected, load]);

  async function submit() {
    if (!state || !("question" in state) || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
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

  if (!state) {
    return error ? (
      <ErrorRetry error={error} onRetry={load} />
    ) : (
      <div className="flex justify-center py-24">
        <Spinner className="size-8" />
      </div>
    );
  }

  const header = (
    <div className="flex items-center justify-between gap-2">
      <Badge variant="live">
        <Radio className="size-3" /> {p.liveBadge}
      </Badge>
      {!connected ? <span className="text-xs text-slate-500">{p.reconnecting}</span> : null}
    </div>
  );

  if (state.status === "completed") {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!("question" in state)) {
    return (
      <div className="space-y-4">
        <OfflineBanner />
        {header}
        <Card className="space-y-5 p-8 text-center animate-in-up">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-gold-50">
            <Hourglass className="size-8 animate-pulse text-gold-600" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold">{p.lobbyTitle}</h2>
            <p className="text-slate-500">{p.lobbyText}</p>
          </div>
          <p className="text-sm">
            {p.joinedAs}: <span className="font-semibold">{state.display_name}</span>
          </p>
          <p className="flex items-center justify-center gap-1.5 text-sm text-slate-500">
            <Users className="size-4" /> {p.participantsJoined(state.participants_count)}
          </p>
        </Card>
      </div>
    );
  }

  const s = state as Playing;
  const q = s.question;
  const phase = s.phase ?? "question";
  const startedMs = s.question_started_at ? Date.parse(s.question_started_at) : null;
  const open = phase === "question" && !s.answered && !expired;
  const canSubmit = open && !busy && (q.type === "text" ? text.trim().length > 0 : selected.length > 0);

  return (
    <div className="space-y-4">
      <OfflineBanner />
      {header}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="tabular rounded-full bg-navy-900 px-3 py-1 text-sm font-bold text-white">
            {p.questionOf(s.index + 1, s.total)}
          </span>
          {phase === "question" && q.time_limit_seconds && startedMs ? (
            <Countdown
              endsAt={startedMs + q.time_limit_seconds * 1000}
              totalMs={q.time_limit_seconds * 1000}
              offset={offset}
              label={p.timeLeft}
              onExpire={() => setExpired(true)}
            />
          ) : (
            <span className="tabular text-sm font-semibold text-gold-700">
              {s.score} {kk.common.points}
            </span>
          )}
        </div>
        <Progress value={((s.index + 1) / s.total) * 100} />
      </div>

      {phase === "leaderboard" ? (
        <Card className="space-y-4 p-5 animate-in-up">
          <h2 className="text-lg font-bold">{kk.leaderboard.title}</h2>
          {s.my_rank ? (
            <div className="flex items-center justify-between rounded-xl bg-gold-50 p-4">
              <span className="font-semibold">
                {p.rank}: {p.rankOf(s.my_rank.rank, s.my_rank.total)}
              </span>
              <span className="tabular font-bold text-gold-800">
                {s.score} {kk.common.points}
              </span>
            </div>
          ) : null}
          <ol className="space-y-1.5">
            {(s.leaderboard ?? []).map((r, i) => (
              <li key={i} className={cn("flex items-center gap-3 rounded-xl px-3 py-2", r.is_me ? "bg-gold-50" : "bg-slate-50")}>
                <span className="flex w-7 justify-center">
                  <RankBadge rank={r.rank} />
                </span>
                <span className="flex-1 truncate font-medium">{r.display_name}</span>
                <span className="tabular font-semibold">{r.score}</span>
              </li>
            ))}
          </ol>
          <p className="text-center text-sm text-slate-500">{p.waitingNext}</p>
        </Card>
      ) : (
        <>
          <Card className="p-5 sm:p-7 animate-in-up" key={q.id}>
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
              locked={!open || busy}
              feedback={s.feedback}
            />
          </Card>
          {s.feedback ? <FeedbackPanel feedback={s.feedback} question={q} /> : null}
          {phase === "question" && (s.answered || expired) ? (
            <Alert variant="info">{s.answered ? p.waitingReveal : p.timeUp}</Alert>
          ) : null}
          {phase === "reveal" ? <p className="text-center text-sm text-slate-500">{p.waitingNext}</p> : null}
        </>
      )}

      {error ? <Alert>{error}</Alert> : null}

      {phase === "question" && !s.answered && !expired && (
        <div className="sticky bottom-0 -mx-4 bg-gradient-to-t from-white via-white to-white/0 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
          <Button size="xl" variant="gold" className="w-full" onClick={submit} disabled={!canSubmit}>
            {busy ? p.submitting : p.submit}
          </Button>
        </div>
      )}
    </div>
  );
}
