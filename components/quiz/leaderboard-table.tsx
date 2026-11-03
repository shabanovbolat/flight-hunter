import { Medal } from "lucide-react";
import type { LeaderboardEntry } from "@/lib/types";
import { kk } from "@/lib/i18n/kk";
import { cn, formatDuration, formatNumber } from "@/lib/utils";

const MEDAL = ["text-yellow-500", "text-slate-400", "text-amber-700"];

export function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) return <Medal className={cn("size-6", MEDAL[rank - 1])} aria-label={String(rank)} />;
  return <span className="tabular text-sm font-semibold text-slate-500">{rank}</span>;
}

export function LeaderboardTable({ rows, compact }: { rows: LeaderboardEntry[]; compact?: boolean }) {
  const l = kk.leaderboard;
  if (!rows.length) return <p className="py-8 text-center text-sm text-slate-500">{l.empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="w-12 py-2 pr-2">{l.rank}</th>
            <th className="py-2 pr-2">{l.name}</th>
            {!compact && <th className="py-2 pr-2 text-right">{l.correct}</th>}
            <th className="py-2 pr-2 text-right">{l.score}</th>
            {!compact && <th className="py-2 pr-2 text-right">{l.accuracy}</th>}
            <th className="py-2 text-right">{l.time}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.display_name}-${i}`} className={cn("border-b border-slate-50", r.is_me && "bg-gold-50", r.rank <= 3 && "font-medium")}>
              <td className="py-2.5 pr-2">
                <RankBadge rank={r.rank} />
              </td>
              <td className="max-w-40 truncate py-2.5 pr-2">
                {r.display_name}
                {r.is_me ? <span className="ms-1.5 text-xs text-gold-700">({l.you})</span> : null}
              </td>
              {!compact && (
                <td className="tabular py-2.5 pr-2 text-right">
                  {r.correct_count}/{r.total_questions}
                </td>
              )}
              <td className="tabular py-2.5 pr-2 text-right font-semibold">{r.score}</td>
              {!compact && <td className="tabular py-2.5 pr-2 text-right">{formatNumber(r.accuracy)}%</td>}
              <td className="tabular py-2.5 text-right text-slate-500">{formatDuration(r.total_time_ms)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
