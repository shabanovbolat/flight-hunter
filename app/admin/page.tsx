import Link from "next/link";
import { Activity, CheckCircle2, ClipboardList, Plus, Radio, Star, Users } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { kk } from "@/lib/i18n/kk";
import { formatDate, formatNumber } from "@/lib/utils";

interface DashboardStats {
  total_quizzes: number;
  total_participants: number;
  active_quizzes: number;
  completed_quizzes: number;
  average_score: number | null;
  average_accuracy: number | null;
  recent: {
    id: string;
    display_name: string;
    status: "in_progress" | "completed";
    score: number;
    started_at: string;
    finished_at: string | null;
    quiz_title: string;
    quiz_id: string;
  }[];
}

export default async function DashboardPage() {
  const profile = await requireStaff();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_dashboard_stats");
  const stats = data as unknown as DashboardStats | null;

  return (
    <>
      <PageHeader
        title={`${kk.dashboard.welcome}, ${profile.full_name || profile.email}`}
        actions={
          <Button asChild variant="gold">
            <Link href="/admin/quizzes/new">
              <Plus /> {kk.dashboard.createQuiz}
            </Link>
          </Button>
        }
      />
      {error || !stats ? (
        <Alert>{kk.common.unknownError}</Alert>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label={kk.dashboard.totalQuizzes} value={stats.total_quizzes} icon={ClipboardList} />
            <StatCard label={kk.dashboard.totalParticipants} value={stats.total_participants} icon={Users} />
            <StatCard label={kk.dashboard.activeQuizzes} value={stats.active_quizzes} icon={Radio} accent />
            <StatCard label={kk.dashboard.completedQuizzes} value={stats.completed_quizzes} icon={CheckCircle2} />
            <StatCard
              label={kk.dashboard.averageScore}
              value={formatNumber(stats.average_score)}
              hint={stats.average_accuracy != null ? `${kk.stats.correctRate}: ${formatNumber(stats.average_accuracy)}%` : undefined}
              icon={Star}
              accent
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="size-4 text-gold-600" /> {kk.dashboard.recentActivity}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.recent.length === 0 ? (
                <EmptyState title={kk.dashboard.noActivity} className="py-10" />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {stats.recent.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {r.display_name}{" "}
                          <span className="font-normal text-slate-500">
                            {r.status === "completed" ? kk.dashboard.finished : kk.dashboard.started}
                          </span>
                        </p>
                        <Link href={`/admin/quizzes/${r.quiz_id}/results`} className="truncate text-xs text-slate-500 hover:text-navy-900">
                          {r.quiz_title}
                        </Link>
                      </div>
                      <div className="flex items-center gap-3">
                        {r.status === "completed" && <Badge variant="gold">{r.score} {kk.common.points}</Badge>}
                        <span className="text-xs text-slate-400">{formatDate(r.finished_at ?? r.started_at)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
