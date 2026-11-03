import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { Alert } from "@/components/ui/feedback";
import { LoginForm } from "./login-form";
import { getCurrentProfile } from "@/lib/auth";
import { kk } from "@/lib/i18n/kk";

export const metadata: Metadata = { title: kk.auth.title };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; pending?: string }>;
}) {
  const { next, pending } = await searchParams;
  const profile = await getCurrentProfile();
  if (profile && profile.role !== "pending") redirect("/admin");

  return (
    <main className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-gold-50/60 to-white px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <Link href="/" className="flex justify-center">
          <Logo />
        </Link>
        <Card>
          <CardContent className="space-y-5 pt-6 sm:pt-6">
            <div className="space-y-1 text-center">
              <h1 className="text-xl font-bold">{kk.auth.title}</h1>
              <p className="text-sm text-slate-500">{kk.auth.subtitle}</p>
            </div>
            {(pending || profile?.role === "pending") && (
              <Alert variant="info">
                <p className="font-medium">{kk.auth.pendingTitle}</p>
                <p className="text-xs">{kk.auth.pendingText}</p>
              </Alert>
            )}
            <LoginForm next={next} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
