import { QuizForm } from "@/components/admin/quiz-form";
import { updateQuiz } from "@/lib/actions/quiz";
import { getCategories, getOwnedQuiz } from "@/lib/quiz-data";

export default async function QuizSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [quiz, categories] = await Promise.all([getOwnedQuiz(id), getCategories()]);
  return (
    <div className="max-w-3xl">
      <QuizForm action={updateQuiz.bind(null, quiz.id)} quiz={quiz} categories={categories} />
    </div>
  );
}
