import Link from "next/link";
import { ChevronRight, Trophy } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { Card } from "@/components/ui/card";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { createClient } from "@/lib/supabase/server";
import { kk } from "@/lib/i18n/kk";
import { formatDate, formatNumber } from "@/lib/utils";

export default async function ResultsOverviewPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_results_overview");
  const r = kk.results;
  return (
    <>
      <PageHeader title={r.title} description={r.subtitle} />
      {error ? (
        <Alert>{kk.common.unknownError}</Alert>
      ) : !data?.length ? (
        <EmptyState icon={<Trophy className="size-6" />} title={r.empty} />
      ) : (
        <div className="grid gap-3">
          {data.map((q) => (
            <Link key={q.quiz_id} href={`/admin/quizzes/${q.quiz_id}/results`} className="group">
              <Card className="flex items-center justify-between gap-4 p-4 transition-shadow group-hover:shadow-md sm:p-5">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold">{q.title}</p>
                    <StatusBadge status={q.status} />
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-500 sm:grid-cols-4">
                    <span>
                      {r.participants}: <b className="text-navy-900">{q.participants}</b>
                    </span>
                    <span>
                      {r.completed}: <b className="text-navy-900">{q.completed}</b>
                    </span>
                    <span>
                      {r.averageScore}: <b className="text-navy-900">{formatNumber(q.average_score)}</b>
                    </span>
                    <span>
                      {r.lastActivity}: {formatDate(q.last_activity)}
                    </span>
                  </div>
                </div>
                <ChevronRight className="size-5 shrink-0 text-slate-300 group-hover:text-gold-600" />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
