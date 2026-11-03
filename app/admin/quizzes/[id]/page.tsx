import Link from "next/link";
import Image from "next/image";
import { BookOpen, Clock, ListChecks, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArabicText } from "@/components/ui/arabic";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { QuestionRowActions } from "@/components/admin/quiz-actions";
import { getOwnedQuiz } from "@/lib/quiz-data";
import { createClient } from "@/lib/supabase/server";
import { mediaUrl } from "@/lib/env";
import { kk } from "@/lib/i18n/kk";

export default async function QuizQuestionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quiz = await getOwnedQuiz(id);
  const supabase = await createClient();
  const { data: questions, error } = await supabase
    .from("questions")
    .select("*, answer_options(id, text, arabic_text, is_correct, position)")
    .eq("quiz_id", quiz.id)
    .order("position")
    .order("created_at");

  const addBtn = (
    <Button asChild variant="gold">
      <Link href={`/admin/quizzes/${quiz.id}/questions/new`}>
        <Plus /> {kk.question.add}
      </Link>
    </Button>
  );

  if (error) return <Alert>{kk.common.unknownError}</Alert>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {questions?.length ?? 0} {kk.quiz.questionCountLabel}
        </p>
        {addBtn}
      </div>
      {!questions?.length ? (
        <EmptyState icon={<ListChecks className="size-6" />} title={kk.question.empty} text={kk.question.emptyText} action={addBtn} />
      ) : (
        <ol className="space-y-3">
          {questions.map((q, i) => {
            const opts = [...q.answer_options].sort((a, b) => a.position - b.position);
            const img = mediaUrl(q.image_path);
            return (
              <li key={q.id}>
                <Card className="p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <Link href={`/admin/quizzes/${quiz.id}/questions/${q.id}`} className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-lg bg-navy-900 text-xs font-bold text-gold-400">
                          {i + 1}
                        </span>
                        <Badge>{kk.question.types[q.type]}</Badge>
                        <Badge variant="gold">
                          {q.points} {kk.common.points}
                        </Badge>
                        {q.time_limit_seconds ? (
                          <Badge>
                            <Clock className="size-3" /> {q.time_limit_seconds} {kk.common.seconds}
                          </Badge>
                        ) : null}
                        {q.reference_type || q.book_name || q.source_attribution ? (
                          <Badge>
                            <BookOpen className="size-3" /> {kk.participant.reference}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="font-medium leading-snug">{q.text}</p>
                      <ArabicText className="text-xl">{q.arabic_text}</ArabicText>
                      {img ? <Image src={img} alt="" width={240} height={140} unoptimized className="max-h-28 w-auto rounded-lg" /> : null}
                      {q.type === "text" ? (
                        <p className="text-sm text-emerald-700">✓ {q.accepted_answers.join(" · ")}</p>
                      ) : (
                        <ul className="grid gap-1 text-sm sm:grid-cols-2">
                          {opts.map((o) => (
                            <li key={o.id} className={o.is_correct ? "font-medium text-emerald-700" : "text-slate-500"}>
                              {o.is_correct ? "✓" : "•"} {o.text}
                              {o.arabic_text ? (
                                <span dir="rtl" lang="ar" className="font-arabic ms-2 text-base">
                                  {o.arabic_text}
                                </span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      )}
                    </Link>
                    <QuestionRowActions questionId={q.id} quizId={quiz.id} isFirst={i === 0} isLast={i === questions.length - 1} />
                  </div>
                </Card>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
