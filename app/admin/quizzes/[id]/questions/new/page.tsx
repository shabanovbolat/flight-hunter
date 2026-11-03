import { QuestionForm } from "@/components/admin/question-form";
import { getOwnedQuiz } from "@/lib/quiz-data";
import { kk } from "@/lib/i18n/kk";

export default async function NewQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quiz = await getOwnedQuiz(id);
  return (
    <div className="max-w-3xl">
      <h2 className="mb-4 text-lg font-semibold">{kk.question.newQuestion}</h2>
      <QuestionForm quizId={quiz.id} />
    </div>
  );
}
