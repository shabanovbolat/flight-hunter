import Link from "next/link";
import { Download, ExternalLink, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { ResultsTable } from "@/components/admin/results-table";
import { getOwnedQuiz } from "@/lib/quiz-data";
import { loadQuizResults, loadSessions } from "@/lib/results";
import { uuid } from "@/lib/validation/schemas";
import { kk } from "@/lib/i18n/kk";
import { formatDate } from "@/lib/utils";

export default async function QuizResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const quiz = await getOwnedQuiz(id);
  const session = sp.session === "self" || (sp.session && uuid.safeParse(sp.session).success) ? sp.session : "all";
  const [rows, sessions] = await Promise.all([loadQuizResults(quiz.id, session), loadSessions(quiz.id)]);
  const qs = `session=${session}`;
  const publicBoard =
    session === "all" || session === "self" ? `/q/${quiz.slug}/leaderboard` : `/q/${quiz.slug}/leaderboard?session=${session}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form className="flex gap-2">
          <Select name="session" defaultValue={session} className="sm:w-72">
            <option value="all">{kk.common.all}</option>
            <option value="self">{kk.results.modeSelf}</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {kk.results.modeLive} · {formatDate(s.created_at)}
              </option>
            ))}
          </Select>
          <Button type="submit" variant="outline">
            {kk.common.open}
          </Button>
        </form>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={`/admin/quizzes/${quiz.id}/export?format=csv&${qs}`}>
              <Download /> {kk.results.exportCsv}
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={`/admin/quizzes/${quiz.id}/export?format=xlsx&${qs}`}>
              <Download /> {kk.results.exportXlsx}
            </a>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={publicBoard} target="_blank">
              <ExternalLink /> {kk.leaderboard.finalTitle}
            </Link>
          </Button>
        </div>
      </div>
      {!rows ? (
        <Alert>{kk.common.unknownError}</Alert>
      ) : rows.length === 0 ? (
        <EmptyState icon={<Users className="size-6" />} title={kk.results.empty} />
      ) : (
        <Card>
          <CardContent className="pt-4 sm:pt-4">
            <ResultsTable rows={rows} quizId={quiz.id} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
