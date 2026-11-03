import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { LeaderboardTable } from "@/components/quiz/leaderboard-table";
import { createClient } from "@/lib/supabase/server";
import { slugSchema, uuid } from "@/lib/validation/schemas";
import type { LeaderboardEntry, PublicQuiz } from "@/lib/types";
import { kk } from "@/lib/i18n/kk";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: kk.leaderboard.finalTitle };

export default async function LeaderboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session?: string }>;
}) {
  const { slug } = await params;
  const { session } = await searchParams;
  if (!slugSchema.safeParse(slug).success) notFound();
  const sessionId = session && uuid.safeParse(session).success ? session : null;
  const supabase = await createClient();
  const [{ data: quiz }, { data: rows }] = await Promise.all([
    supabase.rpc("get_public_quiz", { p_slug: slug }),
    supabase.rpc("get_leaderboard", { p_slug: slug, p_session_id: sessionId as string, p_limit: 200 }),
  ]);
  const q = quiz as unknown as PublicQuiz | null;
  if (!q) notFound();

  return (
    <div className="min-h-dvh bg-gradient-to-b from-gold-50/50 to-white">
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
        <div className="flex items-center justify-between">
          <Link href={`/q/${slug}`} className="inline-flex items-center gap-1 text-sm text-slate-500">
            <ArrowLeft className="size-4" /> {kk.common.back}
          </Link>
          <Logo compact />
        </div>
        <Card>
          <CardHeader>
            <p className="text-sm text-gold-700">{q.title}</p>
            <CardTitle className="text-xl">{kk.leaderboard.finalTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <LeaderboardTable rows={(rows ?? []) as LeaderboardEntry[]} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
