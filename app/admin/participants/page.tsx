import Link from "next/link";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { createClient } from "@/lib/supabase/server";
import { uuid } from "@/lib/validation/schemas";
import { kk } from "@/lib/i18n/kk";
import { formatDate, formatDuration } from "@/lib/utils";

export default async function ParticipantsPage({ searchParams }: { searchParams: Promise<{ quiz?: string }> }) {
  const sp = await searchParams;
  const quizFilter = sp.quiz && uuid.safeParse(sp.quiz).success ? sp.quiz : null;
  const supabase = await createClient();
  const { data: quizzes } = await supabase.from("quizzes").select("id, title").order("created_at", { ascending: false });
  let query = supabase
    .from("participants")
    .select("id, quiz_id, display_name, status, score, correct_count, total_time_ms, started_at, finished_at, session_id, quizzes(title)")
    .order("started_at", { ascending: false })
    .limit(300);
  if (quizFilter) query = query.eq("quiz_id", quizFilter);
  const { data, error } = await query;
  const l = kk.leaderboard;

  return (
    <>
      <PageHeader title={kk.participantsPage.title} description={kk.participantsPage.subtitle} />
      <form className="mb-4 flex gap-2">
        <Select name="quiz" defaultValue={quizFilter ?? ""} className="sm:max-w-sm" aria-label={kk.participantsPage.filterQuiz}>
          <option value="">{kk.common.all}</option>
          {(quizzes ?? []).map((q) => (
            <option key={q.id} value={q.id}>
              {q.title}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="outline">
          {kk.common.open}
        </Button>
      </form>
      {error ? (
        <Alert>{kk.common.unknownError}</Alert>
      ) : !data?.length ? (
        <EmptyState icon={<Users className="size-6" />} title={kk.participantsPage.empty} />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto pt-4 sm:pt-4">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-2">{l.name}</th>
                  <th className="py-2 pr-2">{kk.table.quiz}</th>
                  <th className="py-2 pr-2 text-right">{l.correct}</th>
                  <th className="py-2 pr-2 text-right">{l.score}</th>
                  <th className="py-2 pr-2 text-right">{l.time}</th>
                  <th className="py-2 pr-2">{kk.results.status}</th>
                  <th className="py-2">{kk.table.date}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50">
                    <td className="max-w-44 truncate py-2.5 pr-2 font-medium">{p.display_name}</td>
                    <td className="max-w-48 truncate py-2.5 pr-2">
                      <Link href={`/admin/quizzes/${p.quiz_id}/results`} className="text-slate-600 hover:text-navy-900">
                        {p.quizzes?.title}
                      </Link>
                    </td>
                    <td className="tabular py-2.5 pr-2 text-right">{p.correct_count}</td>
                    <td className="tabular py-2.5 pr-2 text-right font-semibold">{p.score}</td>
                    <td className="tabular py-2.5 pr-2 text-right">{formatDuration(Number(p.total_time_ms))}</td>
                    <td className="py-2.5 pr-2">
                      <Badge variant={p.status === "completed" ? "success" : "gold"}>{kk.results.statusLabels[p.status]}</Badge>
                    </td>
                    <td className="py-2.5 text-xs text-slate-500">{formatDate(p.finished_at ?? p.started_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
