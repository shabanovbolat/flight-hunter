import { BarChart3, CheckCircle2, Percent, Star, Users } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { createClient } from "@/lib/supabase/server";
import { uuid } from "@/lib/validation/schemas";
import { kk } from "@/lib/i18n/kk";
import { formatNumber } from "@/lib/utils";

interface QStat {
  id: string;
  position: number;
  text: string;
  answers: number;
  correct: number;
  correct_rate: number | null;
}
interface Stats {
  total_participants: number;
  completed: number;
  completion_rate: number | null;
  average_score: number | null;
  average_accuracy: number | null;
  correct_answers: number;
  incorrect_answers: number;
  questions: QStat[];
  hardest: QStat[];
  common_wrong: { question_id: string; question: string; answer: string; cnt: number }[];
}

export default async function StatisticsPage({ searchParams }: { searchParams: Promise<{ quiz?: string }> }) {
  const sp = await searchParams;
  const s = kk.stats;
  const supabase = await createClient();
  const { data: quizzes } = await supabase.from("quizzes").select("id, title").order("created_at", { ascending: false });
  if (!quizzes?.length) {
    return (
      <>
        <PageHeader title={s.title} />
        <EmptyState icon={<BarChart3 className="size-6" />} title={s.noQuizzes} />
      </>
    );
  }
  const quizId = sp.quiz && uuid.safeParse(sp.quiz).success ? sp.quiz : quizzes[0].id;
  const { data, error } = await supabase.rpc("admin_quiz_statistics", { p_quiz_id: quizId });
  const st = data as unknown as Stats | null;
  const totalAnswers = st ? st.correct_answers + st.incorrect_answers : 0;

  return (
    <>
      <PageHeader title={s.title} />
      <form className="mb-6 flex gap-2">
        <Select name="quiz" defaultValue={quizId} className="sm:max-w-sm" aria-label={s.selectQuiz}>
          {quizzes.map((q) => (
            <option key={q.id} value={q.id}>
              {q.title}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="outline">
          {kk.common.open}
        </Button>
      </form>

      {error || !st ? (
        <Alert>{kk.common.unknownError}</Alert>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label={s.totalParticipants} value={st.total_participants} icon={Users} />
            <StatCard label={s.completionRate} value={`${formatNumber(st.completion_rate ?? 0)}%`} icon={CheckCircle2} />
            <StatCard label={s.averageScore} value={formatNumber(st.average_score)} icon={Star} accent />
            <StatCard label={s.correctRate} value={`${formatNumber(st.average_accuracy ?? 0)}%`} icon={Percent} accent />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{s.correctRatio}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {totalAnswers === 0 ? (
                <p className="text-sm text-slate-500">{s.noData}</p>
              ) : (
                <>
                  <div className="flex h-4 overflow-hidden rounded-full bg-slate-100">
                    <div className="bg-emerald-500" style={{ width: `${(st.correct_answers / totalAnswers) * 100}%` }} />
                    <div className="bg-red-400" style={{ width: `${(st.incorrect_answers / totalAnswers) * 100}%` }} />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-700">
                      {s.correctAnswers}: <b>{st.correct_answers}</b>
                    </span>
                    <span className="text-red-600">
                      {s.incorrectAnswers}: <b>{st.incorrect_answers}</b>
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{s.hardestQuestions}</CardTitle>
              </CardHeader>
              <CardContent>
                {st.hardest.length === 0 ? (
                  <p className="text-sm text-slate-500">{s.noData}</p>
                ) : (
                  <ol className="space-y-4">
                    {st.hardest.map((q) => (
                      <li key={q.id} className="space-y-1.5">
                        <div className="flex justify-between gap-3 text-sm">
                          <span className="line-clamp-2">{q.text}</span>
                          <span className="tabular shrink-0 font-semibold">{formatNumber(q.correct_rate ?? 0)}%</span>
                        </div>
                        <Progress value={q.correct_rate ?? 0} barClassName="bg-red-400" />
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{s.commonWrong}</CardTitle>
              </CardHeader>
              <CardContent>
                {st.common_wrong.length === 0 ? (
                  <p className="text-sm text-slate-500">{s.noData}</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {st.common_wrong.map((w, i) => (
                      <li key={i} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium text-red-700">{w.answer}</p>
                          <p className="truncate text-xs text-slate-500">{w.question}</p>
                        </div>
                        <span className="tabular shrink-0 text-slate-600">
                          {w.cnt} {s.times}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{s.correctRate}</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                {st.questions.map((q, i) => (
                  <li key={q.id} className="space-y-1.5">
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="line-clamp-1">
                        <b className="text-slate-400">{i + 1}.</b> {q.text}
                      </span>
                      <span className="tabular shrink-0 text-slate-600">
                        {q.correct}/{q.answers} · <b>{q.correct_rate == null ? "—" : `${formatNumber(q.correct_rate)}%`}</b>
                      </span>
                    </div>
                    <Progress value={q.correct_rate ?? 0} barClassName="bg-emerald-500" />
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
