import { notFound } from "next/navigation";
import { QuestionForm } from "@/components/admin/question-form";
import { getOwnedQuiz } from "@/lib/quiz-data";
import { createClient } from "@/lib/supabase/server";
import { uuid } from "@/lib/validation/schemas";
import { kk } from "@/lib/i18n/kk";

export default async function EditQuestionPage({ params }: { params: Promise<{ id: string; qid: string }> }) {
  const { id, qid } = await params;
  const quiz = await getOwnedQuiz(id);
  if (!uuid.safeParse(qid).success) notFound();
  const supabase = await createClient();
  const { data: question } = await supabase
    .from("questions")
    .select("*, answer_options(*)")
    .eq("id", qid)
    .eq("quiz_id", quiz.id)
    .maybeSingle();
  if (!question) notFound();
  const { answer_options, ...q } = question;
  const options = [...answer_options].sort((a, b) => a.position - b.position);
  return (
    <div className="max-w-3xl">
      <h2 className="mb-4 text-lg font-semibold">{kk.question.editQuestion}</h2>
      <QuestionForm key={q.updated_at} quizId={quiz.id} question={q} options={options} />
    </div>
  );
}
