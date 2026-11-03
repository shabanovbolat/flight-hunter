import Link from "next/link";
import { ArrowRight, Languages, QrCode, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { kk } from "@/lib/i18n/kk";

export const dynamic = "force-dynamic";

const icons = [QrCode, Radio, Languages];

export default async function HomePage() {
  const supabase = await createClient();
  const { data: quizzes } = await supabase.rpc("list_public_quizzes");

  return (
    <div className="min-h-dvh bg-gradient-to-b from-gold-50/70 via-white to-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <Logo />
        <Button asChild variant="outline" size="sm">
          <Link href="/login">{kk.home.adminLogin}</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-20">
        <section className="py-12 text-center sm:py-20">
          <Badge variant="gold" className="mb-5">{kk.app.tagline}</Badge>
          <h1 className="mx-auto max-w-2xl text-4xl font-extrabold tracking-tight text-navy-950 sm:text-5xl">
            {kk.home.heroTitle}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-slate-600">{kk.home.heroText}</p>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {kk.home.features.map((f, i) => {
            const Icon = icons[i];
            return (
              <Card key={f.title} className="p-6">
                <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-navy-900 text-gold-400">
                  <Icon className="size-5" />
                </div>
                <h2 className="font-semibold">{f.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{f.text}</p>
              </Card>
            );
          })}
        </section>

        <section className="mt-14">
          <h2 className="mb-4 text-xl font-bold">{kk.home.openQuizzes}</h2>
          {!quizzes || quizzes.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              {kk.home.noQuizzes}
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {quizzes.map((q) => (
                <Link key={q.slug} href={`/q/${q.slug}`} className="group">
                  <Card className="flex items-center justify-between gap-4 p-5 transition-shadow group-hover:shadow-md">
                    <div className="min-w-0">
                      {q.category && <p className="text-xs font-medium text-gold-700">{q.category}</p>}
                      <p className="truncate font-semibold">{q.title}</p>
                      <p className="text-xs text-slate-500">
                        {q.question_total} {kk.home.questions}
                      </p>
                    </div>
                    <ArrowRight className="size-5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gold-600" />
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
