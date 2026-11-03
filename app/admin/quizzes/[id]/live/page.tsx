import { HostScreen } from "@/components/admin/host-screen";
import { Alert } from "@/components/ui/feedback";
import { getOwnedQuiz } from "@/lib/quiz-data";
import { createClient } from "@/lib/supabase/server";
import { qrSvg, quizUrl } from "@/lib/qr";
import { kk } from "@/lib/i18n/kk";

export default async function LivePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quiz = await getOwnedQuiz(id);
  if (quiz.status !== "published") return <Alert variant="info">{kk.share.notPublished}</Alert>;
  const supabase = await createClient();
  const { data: session } = await supabase
    .from("quiz_sessions")
    .select("id")
    .eq("quiz_id", quiz.id)
    .neq("phase", "ended")
    .maybeSingle();
  const url = quizUrl(quiz.slug);
  return <HostScreen quizId={quiz.id} initialSessionId={session?.id ?? null} url={url} qrSvg={await qrSvg(url)} />;
}
