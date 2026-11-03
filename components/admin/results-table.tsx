"use client";

import { reloadPage } from "@/lib/reload";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RankBadge } from "@/components/quiz/leaderboard-table";
import { ConfirmDelete } from "@/components/admin/quiz-actions";
import { deleteParticipant } from "@/lib/actions/results";
import type { ResultRow } from "@/lib/results";
import { kk } from "@/lib/i18n/kk";
import { cn, formatDate, formatDuration, formatNumber } from "@/lib/utils";

export function ResultsTable({ rows, quizId }: { rows: ResultRow[]; quizId: string }) {
  const l = kk.leaderboard;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="py-2 pr-2">{l.rank}</th>
            <th className="py-2 pr-2">{l.name}</th>
            <th className="py-2 pr-2 text-right">{l.correct}</th>
            <th className="py-2 pr-2 text-right">{l.total}</th>
            <th className="py-2 pr-2 text-right">{l.score}</th>
            <th className="py-2 pr-2 text-right">{l.accuracy}</th>
            <th className="py-2 pr-2 text-right">{l.time}</th>
            <th className="py-2 pr-2">{kk.results.status}</th>
            <th className="py-2 pr-2">{kk.results.finishedAt}</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={cn("border-b border-slate-50", r.rank && r.rank <= 3 && "bg-gold-50/40")}>
              <td className="py-2.5 pr-2">{r.rank ? <RankBadge rank={r.rank} /> : <span className="text-slate-300">—</span>}</td>
              <td className="max-w-48 truncate py-2.5 pr-2 font-medium">
                {r.display_name}
                {r.attempt_no > 1 ? <span className="ms-1 text-xs text-slate-400">#{r.attempt_no}</span> : null}
              </td>
              <td className="tabular py-2.5 pr-2 text-right">{r.correct_count}</td>
              <td className="tabular py-2.5 pr-2 text-right">{r.total_questions}</td>
              <td className="tabular py-2.5 pr-2 text-right font-semibold">{r.score}</td>
              <td className="tabular py-2.5 pr-2 text-right">{formatNumber(r.accuracy)}%</td>
              <td className="tabular py-2.5 pr-2 text-right">{formatDuration(r.total_time_ms)}</td>
              <td className="py-2.5 pr-2">
                <Badge variant={r.status === "completed" ? "success" : "gold"}>{kk.results.statusLabels[r.status]}</Badge>
                {r.session_id ? <Badge className="ms-1">{kk.results.modeLive}</Badge> : null}
              </td>
              <td className="py-2.5 pr-2 text-xs text-slate-500">{formatDate(r.finished_at ?? r.started_at)}</td>
              <td className="py-2.5 text-right">
                <ConfirmDelete
                  title={kk.results.deleteParticipant}
                  onConfirm={async () => {
                    await deleteParticipant(r.id, quizId);
                    reloadPage();
                  }}
                  trigger={
                    <Button variant="ghost" size="icon" aria-label={kk.results.deleteParticipant}>
                      <Trash2 className="text-slate-400" />
                    </Button>
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
