import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { QuizTabs } from "@/components/admin/quiz-tabs";
import { StatusBadge } from "@/components/admin/status-badge";
import { QuizStatusActions } from "@/components/admin/quiz-actions";
import { getOwnedQuiz } from "@/lib/quiz-data";
import { kk } from "@/lib/i18n/kk";

export default async function QuizLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quiz = await getOwnedQuiz(id);
  return (
    <>
      <div className="no-print mb-4">
        <Link href="/admin/quizzes" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-navy-900">
          <ArrowLeft className="size-4" /> {kk.quiz.listTitle}
        </Link>
      </div>
      <div className="no-print mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{quiz.title}</h1>
            <StatusBadge status={quiz.status} />
          </div>
          <p className="font-mono text-xs text-slate-400">/q/{quiz.slug}</p>
        </div>
        <QuizStatusActions quizId={quiz.id} status={quiz.status} />
      </div>
      <QuizTabs quizId={quiz.id} />
      {children}
    </>
  );
}
