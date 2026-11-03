"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert } from "@/components/ui/feedback";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/admin/image-upload";
import type { QuizFormState } from "@/lib/actions/quiz";
import type { Quiz } from "@/lib/types";
import { kk } from "@/lib/i18n/kk";
import { randomSuffix, slugify } from "@/lib/utils";

const f = kk.quiz.fields;

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}
function toIso(local: string): string {
  return local ? new Date(local).toISOString() : "";
}

export function QuizForm({
  action,
  quiz,
  categories,
}: {
  action: (state: QuizFormState, formData: FormData) => Promise<QuizFormState>;
  quiz?: Quiz;
  categories: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [title, setTitle] = useState(quiz?.title ?? "");
  const [slug, setSlug] = useState(quiz?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(quiz));
  const [cover, setCover] = useState<string | null>(quiz?.cover_image_path ?? null);
  // datetime-local works in the browser's timezone → convert after mount
  const [mounted, setMounted] = useState(false);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  useEffect(() => {
    setStartsAt(toLocalInput(quiz?.starts_at ?? null));
    setEndsAt(toLocalInput(quiz?.ends_at ?? null));
    setMounted(true);
  }, [quiz?.starts_at, quiz?.ends_at]);

  const err = state?.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{kk.quiz.settingsTab}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <Field label={f.title} htmlFor="title" error={err.title} className="sm:col-span-2">
            <Input
              id="title"
              name="title"
              required
              maxLength={200}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slugTouched) setSlug(e.target.value ? `${slugify(e.target.value)}-${randomSuffix()}` : "");
              }}
            />
          </Field>
          <Field label={f.description} htmlFor="description" error={err.description} className="sm:col-span-2">
            <Textarea id="description" name="description" maxLength={2000} defaultValue={quiz?.description ?? ""} />
          </Field>
          <Field label={f.slug} htmlFor="slug" hint={f.slugHint} error={err.slug}>
            <Input
              id="slug"
              name="slug"
              required
              pattern="[a-z0-9][a-z0-9\-]{2,63}"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value.toLowerCase());
              }}
              autoCapitalize="off"
              spellCheck={false}
            />
          </Field>
          <Field label={f.category} htmlFor="category_id" error={err.category_id}>
            <Select id="category_id" name="category_id" defaultValue={quiz?.category_id ?? ""}>
              <option value="">{f.noCategory}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={f.cover} className="sm:col-span-2">
            <ImageUpload name="cover_image_path" value={cover} onChange={setCover} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-5 pt-5 sm:grid-cols-2 sm:pt-6">
          <Field label={f.duration} htmlFor="duration_minutes" hint={f.durationHint} error={err.duration_minutes}>
            <Input
              id="duration_minutes"
              name="duration_minutes"
              type="number"
              min={1}
              max={1440}
              inputMode="numeric"
              defaultValue={quiz?.duration_seconds ? Math.round(quiz.duration_seconds / 60) : ""}
            />
          </Field>
          <Field label={f.questionCount} htmlFor="question_count" hint={f.questionCountHint} error={err.question_count}>
            <Input id="question_count" name="question_count" type="number" min={1} inputMode="numeric" defaultValue={quiz?.question_count ?? ""} />
          </Field>
          <Field label={f.startsAt} htmlFor="starts_at_local" error={err.starts_at}>
            <Input id="starts_at_local" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} disabled={!mounted} />
            <input type="hidden" name="starts_at" value={toIso(startsAt)} />
          </Field>
          <Field label={f.endsAt} htmlFor="ends_at_local" error={err.ends_at}>
            <Input id="ends_at_local" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} disabled={!mounted} />
            <input type="hidden" name="ends_at" value={toIso(endsAt)} />
          </Field>
          <Field label={f.maxParticipants} htmlFor="max_participants" hint={f.durationHint} error={err.max_participants}>
            <Input id="max_participants" name="max_participants" type="number" min={1} inputMode="numeric" defaultValue={quiz?.max_participants ?? ""} />
          </Field>
          <Field
            label={
              <span className="flex items-center gap-2">
                {f.pin} {quiz?.pin_hash ? <Badge variant="gold">{f.pinSet}</Badge> : null}
              </span>
            }
            htmlFor="pin"
            hint={f.pinHint}
            error={err.pin}
          >
            <Input id="pin" name="pin" inputMode="numeric" pattern="\d{4,8}" maxLength={8} autoComplete="off" />
            {quiz?.pin_hash ? (
              <label className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                <input type="checkbox" name="remove_pin" className="size-4 accent-navy-900" /> {f.pinRemove}
              </label>
            ) : null}
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-3 pt-5 sm:grid-cols-2 sm:pt-6">
          <Switch name="shuffle_questions" label={f.shuffleQuestions} defaultChecked={quiz?.shuffle_questions ?? false} />
          <Switch name="shuffle_options" label={f.shuffleOptions} defaultChecked={quiz?.shuffle_options ?? false} />
          <Switch name="show_correct_immediately" label={f.showCorrect} hint={f.showCorrectHint} defaultChecked={quiz?.show_correct_immediately ?? true} />
          <Switch name="allow_multiple_attempts" label={f.multipleAttempts} defaultChecked={quiz?.allow_multiple_attempts ?? false} />
          <Switch name="is_public" label={f.isPublic} hint={f.isPublicHint} defaultChecked={quiz?.is_public ?? true} />
          <Switch name="speed_bonus" label={f.speedBonus} hint={f.speedBonusHint} defaultChecked={quiz?.speed_bonus ?? false} />
        </CardContent>
      </Card>

      {state?.error ? <Alert>{state.error}</Alert> : null}
      {state?.saved ? <Alert variant="success">{kk.common.saved}</Alert> : null}

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? kk.common.saving : quiz ? kk.common.save : kk.common.create}
        </Button>
      </div>
    </form>
  );
}
