"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArabicTextarea, Input, Select, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Alert } from "@/components/ui/feedback";
import { ImageUpload } from "@/components/admin/image-upload";
import { saveQuestion } from "@/lib/actions/question";
import { useHydrated } from "@/lib/use-hydrated";
import type { AnswerOption, Question, QuestionType, ReferenceType } from "@/lib/types";
import { kk } from "@/lib/i18n/kk";
import { cn } from "@/lib/utils";

const f = kk.question.fields;

interface OptionDraft {
  key: string;
  id: string | null;
  text: string;
  arabic_text: string;
  is_correct: boolean;
}

const newOption = (text = "", is_correct = false): OptionDraft => ({
  key: crypto.randomUUID(),
  id: null,
  text,
  arabic_text: "",
  is_correct,
});

function defaultOptions(type: QuestionType): OptionDraft[] {
  if (type === "true_false") return [newOption(f.trueLabel, true), newOption(f.falseLabel)];
  if (type === "text") return [];
  return [newOption(), newOption(), newOption(), newOption()];
}

export function QuestionForm({
  quizId,
  question,
  options,
}: {
  quizId: string;
  question?: Question;
  options?: AnswerOption[];
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [type, setType] = useState<QuestionType>(question?.type ?? "single");
  const [text, setText] = useState(question?.text ?? "");
  const [arabicText, setArabicText] = useState(question?.arabic_text ?? "");
  const [image, setImage] = useState<string | null>(question?.image_path ?? null);
  const [points, setPoints] = useState(String(question?.points ?? 1));
  const [timeLimit, setTimeLimit] = useState(question?.time_limit_seconds ? String(question.time_limit_seconds) : "30");
  const [explanation, setExplanation] = useState(question?.explanation ?? "");
  const [accepted, setAccepted] = useState((question?.accepted_answers ?? []).join("\n"));
  const [opts, setOpts] = useState<OptionDraft[]>(
    options && options.length
      ? options.map((o) => ({ key: o.id, id: o.id, text: o.text, arabic_text: o.arabic_text ?? "", is_correct: o.is_correct }))
      : defaultOptions(question?.type ?? "single"),
  );
  const [ref, setRef] = useState({
    arabic_original: question?.arabic_original ?? "",
    kazakh_translation: question?.kazakh_translation ?? "",
    reference_type: (question?.reference_type ?? "") as ReferenceType | "",
    book_name: question?.book_name ?? "",
    chapter: question?.chapter ?? "",
    reference_number: question?.reference_number ?? "",
    source_attribution: question?.source_attribution ?? "",
    extra_explanation: question?.extra_explanation ?? "",
  });
  const hasRef = Object.values(ref).some(Boolean);
  const [showRef, setShowRef] = useState(hasRef);

  function changeType(next: QuestionType) {
    setType(next);
    if (next === "true_false") setOpts(defaultOptions("true_false"));
    else if (next !== "text" && (type === "true_false" || type === "text" || opts.length < 2)) setOpts(defaultOptions(next));
    else if (next === "single") {
      // keep only the first correct mark
      setOpts((o) => {
        const first = o.findIndex((x) => x.is_correct);
        return o.map((x, i) => ({ ...x, is_correct: i === first }));
      });
    }
  }

  function toggleCorrect(key: string) {
    setOpts((o) =>
      o.map((x) =>
        type === "multiple"
          ? x.key === key
            ? { ...x, is_correct: !x.is_correct }
            : x
          : { ...x, is_correct: x.key === key },
      ),
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setErrors({});
    const payload = {
      quiz_id: quizId,
      type,
      text,
      arabic_text: arabicText,
      image_path: image,
      points,
      time_limit_seconds: timeLimit,
      explanation,
      accepted_answers: type === "text" ? accepted.split("\n").map((s) => s.trim()).filter(Boolean) : [],
      options:
        type === "text"
          ? []
          : opts.map((o) => ({ id: o.id, text: o.text, arabic_text: o.arabic_text, is_correct: o.is_correct })),
      ...ref,
    };
    setPending(true);
    void (async () => {
      const res = await saveQuestion(question?.id ?? null, payload).catch(() => null);
      if (!res) {
        setPending(false);
        setError(kk.errors.network);
        return;
      }
      if (!res.ok) {
        setPending(false);
        setError(res.error);
        setErrors(res.fieldErrors ?? {});
        return;
      }
      // Full navigation: the soft router occasionally drops navigations that
      // follow a server action (Next 15), a hard load is always reliable here.
      window.location.assign(`/admin/quizzes/${quizId}`);
    })();
  }

  const optionsError = errors.options ?? Object.entries(errors).find(([k]) => k.startsWith("options."))?.[1];

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card>
        <CardContent className="space-y-5 pt-5 sm:pt-6">
          <Field label={f.type}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["single", "multiple", "true_false", "text"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => changeType(t)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
                    type === t ? "border-navy-900 bg-navy-900 text-white" : "border-slate-200 bg-white hover:bg-slate-50",
                  )}
                >
                  {kk.question.types[t]}
                </button>
              ))}
            </div>
          </Field>
          <Field label={f.text} htmlFor="q-text" error={errors.text}>
            <Textarea id="q-text" value={text} onChange={(e) => setText(e.target.value)} required maxLength={2000} />
          </Field>
          <Field label={`${f.arabicText} · ${kk.common.optional}`} htmlFor="q-ar" error={errors.arabic_text}>
            <ArabicTextarea id="q-ar" value={arabicText} onChange={(e) => setArabicText(e.target.value)} maxLength={4000} />
          </Field>
          <Field label={`${f.image} · ${kk.common.optional}`}>
            <ImageUpload value={image} onChange={setImage} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label={f.points} htmlFor="q-points" error={errors.points}>
              <Input id="q-points" type="number" min={0} max={1000} inputMode="numeric" value={points} onChange={(e) => setPoints(e.target.value)} />
            </Field>
            <Field label={f.timeLimit} htmlFor="q-time" hint={f.timeLimitHint} error={errors.time_limit_seconds}>
              <Input id="q-time" type="number" min={5} max={3600} inputMode="numeric" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} />
            </Field>
          </div>
        </CardContent>
      </Card>

      {type === "text" ? (
        <Card>
          <CardContent className="pt-5 sm:pt-6">
            <Field label={f.acceptedAnswers} htmlFor="q-acc" hint={f.acceptedAnswersHint} error={errors.accepted_answers}>
              <Textarea id="q-acc" value={accepted} onChange={(e) => setAccepted(e.target.value)} rows={4} />
            </Field>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{f.options}</CardTitle>
            <CardDescription>
              {type === "multiple" ? kk.participant.selectMany : kk.participant.selectOne}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {opts.map((o, i) => (
              <div
                key={o.key}
                className={cn(
                  "space-y-2 rounded-xl border p-3 transition-colors",
                  o.is_correct ? "border-emerald-200 bg-emerald-50/50" : "border-slate-100 bg-slate-50/50",
                )}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleCorrect(o.key)}
                    aria-pressed={o.is_correct}
                    className={cn(
                      "flex h-11 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold",
                      o.is_correct ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-200 bg-white text-slate-500",
                    )}
                  >
                    {type === "multiple" ? (o.is_correct ? "☑" : "☐") : o.is_correct ? "●" : "○"} {f.correct}
                  </button>
                  <Input
                    aria-label={`${f.option} ${i + 1}`}
                    placeholder={`${f.option} ${i + 1}`}
                    value={o.text}
                    readOnly={type === "true_false"}
                    onChange={(e) => setOpts((all) => all.map((x) => (x.key === o.key ? { ...x, text: e.target.value } : x)))}
                  />
                  {type !== "true_false" && opts.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={f.removeOption}
                      onClick={() => setOpts((all) => all.filter((x) => x.key !== o.key))}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </div>
                {type !== "true_false" && (
                  <input
                    dir="rtl"
                    lang="ar"
                    placeholder={f.optionArabic}
                    value={o.arabic_text}
                    onChange={(e) => setOpts((all) => all.map((x) => (x.key === o.key ? { ...x, arabic_text: e.target.value } : x)))}
                    className="font-arabic h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-lg leading-loose focus:border-gold-400 focus:outline-none"
                  />
                )}
              </div>
            ))}
            {optionsError ? <p className="text-xs text-red-600">{optionsError}</p> : null}
            {type !== "true_false" && opts.length < 10 && (
              <Button type="button" variant="outline" size="sm" onClick={() => setOpts((o) => [...o, newOption()])}>
                <Plus /> {f.addOption}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-5 pt-5 sm:pt-6">
          <Field label={`${f.explanation} · ${kk.common.optional}`} htmlFor="q-exp">
            <Textarea id="q-exp" value={explanation} onChange={(e) => setExplanation(e.target.value)} maxLength={4000} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <button type="button" className="flex items-center gap-2 text-left" onClick={() => setShowRef((s) => !s)}>
            <BookOpen className="size-4 text-gold-600" />
            <CardTitle>{f.islamicSection}</CardTitle>
          </button>
          <CardDescription>{f.islamicHint}</CardDescription>
        </CardHeader>
        {showRef && (
          <CardContent className="grid gap-5 sm:grid-cols-2">
            <Field label={f.arabicOriginal} htmlFor="ref-arabicOriginal" className="sm:col-span-2">
              <ArabicTextarea id="ref-arabicOriginal" value={ref.arabic_original} onChange={(e) => setRef({ ...ref, arabic_original: e.target.value })} />
            </Field>
            <Field label={f.kazakhTranslation} htmlFor="ref-kazakhTranslation" className="sm:col-span-2">
              <Textarea id="ref-kazakhTranslation" value={ref.kazakh_translation} onChange={(e) => setRef({ ...ref, kazakh_translation: e.target.value })} />
            </Field>
            <Field label={f.referenceType} htmlFor="ref-referenceType">
              <Select id="ref-referenceType" value={ref.reference_type} onChange={(e) => setRef({ ...ref, reference_type: e.target.value as ReferenceType | "" })}>
                <option value="">{kk.common.none}</option>
                <option value="quran">{f.referenceTypes.quran}</option>
                <option value="hadith">{f.referenceTypes.hadith}</option>
                <option value="other">{f.referenceTypes.other}</option>
              </Select>
            </Field>
            <Field label={f.bookName} htmlFor="ref-bookName">
              <Input id="ref-bookName" value={ref.book_name} onChange={(e) => setRef({ ...ref, book_name: e.target.value })} maxLength={300} />
            </Field>
            <Field label={f.chapter} htmlFor="ref-chapter">
              <Input id="ref-chapter" value={ref.chapter} onChange={(e) => setRef({ ...ref, chapter: e.target.value })} maxLength={300} />
            </Field>
            <Field label={f.referenceNumber} htmlFor="ref-referenceNumber">
              <Input id="ref-referenceNumber" value={ref.reference_number} onChange={(e) => setRef({ ...ref, reference_number: e.target.value })} maxLength={100} />
            </Field>
            <Field label={f.sourceAttribution} htmlFor="ref-sourceAttribution" className="sm:col-span-2">
              <Input id="ref-sourceAttribution" value={ref.source_attribution} onChange={(e) => setRef({ ...ref, source_attribution: e.target.value })} maxLength={300} />
            </Field>
            <Field label={f.extraExplanation} htmlFor="ref-extraExplanation" className="sm:col-span-2">
              <Textarea id="ref-extraExplanation" value={ref.extra_explanation} onChange={(e) => setRef({ ...ref, extra_explanation: e.target.value })} />
            </Field>
          </CardContent>
        )}
      </Card>

      {error ? <Alert>{error}</Alert> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          {kk.common.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={pending || !hydrated}>
          {pending ? kk.common.saving : kk.common.save}
        </Button>
      </div>
    </form>
  );
}
