"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { CalendarClock, Clock, HelpCircle, Lock, Radio, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Alert } from "@/components/ui/feedback";
import { Badge } from "@/components/ui/badge";
import { joinQuiz } from "@/lib/actions/participant";
import type { PublicQuiz } from "@/lib/types";
import { mediaUrl } from "@/lib/env";
import { kk } from "@/lib/i18n/kk";
import { formatDate } from "@/lib/utils";

const NAME_KEY = "ilim:name";

export function Landing({ quiz, onJoined }: { quiz: PublicQuiz; onJoined: (participantId: string) => void }) {
  const p = kk.participant;
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(NAME_KEY);
      if (saved) setName(saved);
    } catch {
      /* storage unavailable (private mode) */
    }
  }, []);

  const now = Date.parse(quiz.server_now);
  const notStarted = !quiz.live_session && quiz.starts_at && Date.parse(quiz.starts_at) > now;
  const ended = !quiz.live_session && quiz.ends_at && Date.parse(quiz.ends_at) < now;
  const full = quiz.max_participants != null && quiz.participants_count >= quiz.max_participants;
  const blocked = Boolean(notStarted || ended || full || quiz.question_total === 0);
  const cover = mediaUrl(quiz.cover_image_path);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    start(async () => {
      const res = await joinQuiz({ slug: quiz.slug, name, pin: quiz.requires_pin ? pin : null });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      try {
        localStorage.setItem(NAME_KEY, name.trim());
      } catch {
        /* ignore */
      }
      onJoined(res.data.participantId);
    });
  }

  return (
    <div className="space-y-5 animate-in-up">
      <Card className="overflow-hidden">
        {cover ? <Image src={cover} alt="" width={960} height={400} unoptimized priority className="h-44 w-full object-cover sm:h-56" /> : null}
        <div className="space-y-4 p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            {quiz.live_session ? (
              <Badge variant="live">
                <Radio className="size-3" /> {p.liveBadge}
              </Badge>
            ) : null}
            {quiz.category ? <Badge variant="gold">{quiz.category}</Badge> : null}
          </div>
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{quiz.title}</h1>
          {quiz.description ? <p className="whitespace-pre-wrap leading-relaxed text-slate-600">{quiz.description}</p> : null}
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            <Meta icon={HelpCircle} label={`${quiz.question_total} ${p.questionsCount}`} />
            <Meta
              icon={Clock}
              label={quiz.duration_seconds ? `${Math.round(quiz.duration_seconds / 60)} ${kk.common.minutes}` : p.unlimited}
            />
            <Meta icon={Users} label={String(quiz.participants_count)} />
            {quiz.starts_at ? <Meta icon={CalendarClock} label={`${p.startsAt}: ${formatDate(quiz.starts_at)}`} wide /> : null}
            {quiz.ends_at ? <Meta icon={CalendarClock} label={`${p.endsAt}: ${formatDate(quiz.ends_at)}`} wide /> : null}
          </div>
        </div>
      </Card>

      {notStarted ? (
        <Alert variant="info">{p.notStarted}</Alert>
      ) : ended ? (
        <Alert variant="info">{p.ended}</Alert>
      ) : full ? (
        <Alert variant="info">{p.full}</Alert>
      ) : quiz.question_total === 0 ? (
        <Alert variant="info">{kk.errors.quiz_empty}</Alert>
      ) : null}

      {!blocked && (
        <Card className="p-5 sm:p-7">
          <form onSubmit={submit} className="space-y-4">
            <Field label={p.enterName} htmlFor="name">
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={p.namePlaceholder}
                required
                minLength={2}
                maxLength={80}
                autoComplete="name"
                className="h-13 text-lg"
              />
            </Field>
            {quiz.requires_pin && (
              <Field
                label={
                  <span className="flex items-center gap-1.5">
                    <Lock className="size-3.5" /> {p.pin}
                  </span>
                }
                htmlFor="pin"
              >
                <Input
                  id="pin"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  placeholder={p.pinPlaceholder}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                  required
                  className="h-13 text-center text-2xl tracking-[0.5em]"
                />
              </Field>
            )}
            {error ? <Alert>{error}</Alert> : null}
            <Button type="submit" size="xl" variant="gold" className="w-full" disabled={pending || name.trim().length < 2}>
              {pending ? p.starting : p.start}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}

function Meta({ icon: Icon, label, wide }: { icon: typeof Clock; label: string; wide?: boolean }) {
  return (
    <div className={`flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-slate-700 ${wide ? "col-span-2 sm:col-span-3" : ""}`}>
      <Icon className="size-4 shrink-0 text-gold-600" />
      <span className="truncate">{label}</span>
    </div>
  );
}
