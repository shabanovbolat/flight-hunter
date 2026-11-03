import { PageHeader } from "@/components/admin/page-header";
import { QuizForm } from "@/components/admin/quiz-form";
import { createQuiz } from "@/lib/actions/quiz";
import { getCategories } from "@/lib/quiz-data";
import { kk } from "@/lib/i18n/kk";

export default async function NewQuizPage() {
  const categories = await getCategories();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={kk.quiz.newQuiz} />
      <QuizForm action={createQuiz} categories={categories} />
    </div>
  );
}
