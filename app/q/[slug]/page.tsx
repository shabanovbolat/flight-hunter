import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { QuizPlayer } from "@/components/quiz/quiz-player";
import { createClient } from "@/lib/supabase/server";
import { slugSchema } from "@/lib/validation/schemas";
import type { PublicQuiz } from "@/lib/types";

export const dynamic = "force-dynamic";

async function load(slug: string): Promise<PublicQuiz | null> {
  if (!slugSchema.safeParse(slug).success) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_public_quiz", { p_slug: slug });
  return (data as unknown as PublicQuiz) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const quiz = await load(slug);
  return quiz ? { title: quiz.title, description: quiz.description ?? undefined } : {};
}

export default async function ParticipantPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const quiz = await load(slug);
  if (!quiz) notFound();
  return (
    <div className="min-h-dvh bg-gradient-to-b from-gold-50/50 to-white">
      <header className="mx-auto flex max-w-2xl items-center justify-center px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-2">
        <Link href="/" aria-label="ILIM QUIZ">
          <Logo className="scale-90" />
        </Link>
      </header>
      <main className="mx-auto max-w-2xl px-4 pb-8">
        {/* key forces a fresh player when the live session changes */}
        <QuizPlayer key={quiz.live_session?.id ?? "self"} quiz={quiz} />
      </main>
    </div>
  );
}
