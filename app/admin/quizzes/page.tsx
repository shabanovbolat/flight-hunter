import Link from "next/link";
import { ChevronRight, ClipboardList, Plus } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { createClient } from "@/lib/supabase/server";
import { kk } from "@/lib/i18n/kk";
import { formatDate } from "@/lib/utils";

export default async function QuizzesPage() {
  const supabase = await createClient();
  const { data: quizzes, error } = await supabase
    .from("quizzes")
    .select("id, title, slug, status, created_at, starts_at, ends_at, quiz_categories(name), questions(count), participants(count)")
    .order("created_at", { ascending: false });

  const newBtn = (
    <Button asChild variant="gold">
      <Link href="/admin/quizzes/new">
        <Plus /> {kk.quiz.newQuiz}
      </Link>
    </Button>
  );

  return (
    <>
      <PageHeader title={kk.quiz.listTitle} actions={newBtn} />
      {error ? (
        <Alert>{kk.common.unknownError}</Alert>
      ) : !quizzes?.length ? (
        <EmptyState icon={<ClipboardList className="size-6" />} title={kk.quiz.empty} text={kk.quiz.emptyText} action={newBtn} />
      ) : (
        <div className="grid gap-3">
          {quizzes.map((q) => (
            <Link key={q.id} href={`/admin/quizzes/${q.id}`} className="group">
              <Card className="flex items-center justify-between gap-4 p-4 transition-shadow group-hover:shadow-md sm:p-5">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold">{q.title}</p>
                    <StatusBadge status={q.status} />
                  </div>
                  <p className="text-xs text-slate-500">
                    {q.quiz_categories?.name ? `${q.quiz_categories.name} · ` : ""}
                    {q.questions[0]?.count ?? 0} {kk.quiz.questionCountLabel} · {q.participants[0]?.count ?? 0}{" "}
                    {kk.quiz.participantsLabel} · {formatDate(q.created_at)}
                  </p>
                  <p className="font-mono text-xs text-slate-400">/q/{q.slug}</p>
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
