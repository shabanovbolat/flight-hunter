"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { kk } from "@/lib/i18n/kk";

export function QuizTabs({ quizId }: { quizId: string }) {
  const pathname = usePathname();
  const base = `/admin/quizzes/${quizId}`;
  const tabs = [
    { href: base, label: kk.quiz.questionsTab, match: (p: string) => p === base || p.startsWith(`${base}/questions`) },
    { href: `${base}/settings`, label: kk.quiz.settingsTab },
    { href: `${base}/share`, label: kk.quiz.share },
    { href: `${base}/live`, label: kk.quiz.live },
    { href: `${base}/results`, label: kk.quiz.results },
  ];
  return (
    <nav className="no-print -mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-slate-200 px-4 sm:mx-0 sm:px-0">
      {tabs.map((t) => {
        const active = t.match ? t.match(pathname) : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "border-gold-500 text-navy-950" : "border-transparent text-slate-500 hover:text-navy-900",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
