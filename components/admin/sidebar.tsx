"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  ClipboardList,
  House,
  LibraryBig,
  LogOut,
  Menu,
  Settings,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { signOut } from "@/lib/actions/auth";
import { kk } from "@/lib/i18n/kk";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: kk.nav.dashboard, icon: House, exact: true },
  { href: "/admin/quizzes", label: kk.nav.quizzes, icon: ClipboardList },
  { href: "/admin/questions", label: kk.nav.questionBank, icon: LibraryBig },
  { href: "/admin/participants", label: kk.nav.participants, icon: Users },
  { href: "/admin/results", label: kk.nav.results, icon: Trophy },
  { href: "/admin/statistics", label: kk.nav.statistics, icon: BarChart3 },
  { href: "/admin/settings", label: kk.nav.settings, icon: Settings },
];

export function AdminSidebar({ name, role }: { name: string; role: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex flex-1 flex-col gap-1">
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-navy-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-navy-900",
            )}
          >
            <Icon className={cn("size-[18px]", active ? "text-gold-400" : "text-slate-400")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="mt-6 border-t border-slate-100 pt-4">
      <div className="mb-3 px-3">
        <p className="truncate text-sm font-semibold text-navy-950">{name}</p>
        <p className="text-xs text-gold-700">{role}</p>
      </div>
      <form action={signOut}>
        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100">
          <LogOut className="size-[18px] text-slate-400" />
          {kk.auth.signOut}
        </button>
      </form>
    </div>
  );

  return (
    <>
      {/* mobile top bar */}
      <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-slate-100 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/admin">
          <Logo />
        </Link>
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 text-navy-900 hover:bg-slate-100"
          aria-label={kk.nav.menu}
        >
          <Menu className="size-5" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/30 animate-in-fade" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white p-4 shadow-xl animate-in-up">
            <div className="mb-6 flex items-center justify-between">
              <Logo />
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-slate-100" aria-label={kk.common.close}>
                <X className="size-5" />
              </button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      )}

      <aside className="no-print sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-slate-100 bg-white p-4 lg:flex">
        <Link href="/admin" className="mb-8 px-2 pt-2">
          <Logo />
        </Link>
        {nav}
        {footer}
      </aside>
    </>
  );
}
