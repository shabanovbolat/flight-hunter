"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Clock, Percent, RotateCcw, Target, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/feedback";
import { LeaderboardTable, RankBadge } from "@/components/quiz/leaderboard-table";
import { QuestionCard } from "@/components/quiz/question-card";
import { FeedbackPanel } from "@/components/quiz/feedback-panel";
import { ErrorRetry } from "@/components/quiz/self-player";
import { getLeaderboard, getParticipantResult } from "@/lib/actions/participant";
import type { LeaderboardEntry, ParticipantResult } from "@/lib/types";
import { kk } from "@/lib/i18n/kk";
import { formatDuration, formatNumber } from "@/lib/utils";

export function ResultView({
  participantId,
  sessionId,
  onRetry,
}: {
  participantId: string;
  sessionId?: string | null;
  onRetry?: () => void;
}) {
  const p = kk.participant;
  const [result, setResult] = useState<ParticipantResult | null>(null);
  const [board, setBoard] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const res = await getParticipantResult(participantId);
    if (!res.ok) return setError(res.error);
    setResult(res.data);
    const lb = await getLeaderboard(res.data.quiz_slug, sessionId ?? null);
    if (lb.ok) setBoard(lb.data);
  }, [participantId, sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <ErrorRetry error={error} onRetry={load} />;
  if (!result)
    return (
      <div className="flex justify-center py-24">
        <Spinner className="size-8" />
      </div>
    );

  return (
    <div className="space-y-5 animate-in-up">
      <Card className="overflow-hidden">
        <div className="bg-navy-900 px-6 pb-8 pt-7 text-center text-white">
          <p className="text-sm text-navy-200">{p.resultTitle}</p>
          <p className="mt-1 text-lg font-semibold">{result.display_name}</p>
          <div className="mt-5 flex items-center justify-center gap-3">
            {result.rank.rank <= 3 ? <RankBadge rank={result.rank.rank} /> : <Trophy className="size-6 text-gold-400" />}
            <span className="tabular text-6xl font-extrabold text-gold-400">{result.score}</span>
          </div>
          <p className="mt-1 text-sm text-navy-200">{kk.common.points}</p>
        </div>
        <CardContent className="grid grid-cols-2 gap-3 pt-5 sm:grid-cols-4 sm:pt-6">
          <Stat icon={Trophy} label={p.rank} value={p.rankOf(result.rank.rank, result.rank.total)} />
          <Stat icon={Target} label={kk.leaderboard.correct} value={`${result.correct_count} / ${result.total_questions}`} />
          <Stat icon={Percent} label={p.accuracy} value={`${formatNumber(result.accuracy)}%`} />
          <Stat icon={Clock} label={p.time} value={formatDuration(result.total_time_ms)} />
        </CardContent>
      </Card>

      {result.allow_multiple_attempts && onRetry ? (
        <Button variant="outline" size="lg" className="w-full" onClick={onRetry}>
          <RotateCcw /> {p.tryAgain}
        </Button>
      ) : null}

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{p.leaderboard}</CardTitle>
          {!sessionId && (
            <Link href={`/q/${result.quiz_slug}/leaderboard`} className="text-xs font-medium text-gold-700 hover:underline">
              {kk.common.open}
            </Link>
          )}
        </CardHeader>
        <CardContent>{board ? <LeaderboardTable rows={board.slice(0, 10)} compact /> : <Spinner />}</CardContent>
      </Card>

      {result.review.length > 0 && (
        <Card>
          <button className="flex w-full items-center justify-between p-5 sm:p-6" onClick={() => setShowReview((v) => !v)}>
            <span className="font-semibold">{p.review}</span>
            <ChevronDown className={`size-5 transition-transform ${showReview ? "rotate-180" : ""}`} />
          </button>
          {showReview && (
            <CardContent className="space-y-8">
              {result.review.map((r) => (
                <div key={r.question.id} className="space-y-3 border-t border-slate-100 pt-5">
                  <p className="text-xs font-semibold text-slate-500">{p.questionOf(r.index, result.total_questions)}</p>
                  <QuestionCard question={r.question} selected={[]} locked feedback={r.feedback} />
                  <FeedbackPanel feedback={r.feedback} question={r.question} />
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-center">
      <Icon className="mx-auto size-4 text-gold-600" />
      <p className="tabular mt-1 text-lg font-bold">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
