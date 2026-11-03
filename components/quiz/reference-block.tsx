import { BookOpen } from "lucide-react";
import { ArabicText } from "@/components/ui/arabic";
import type { Reference } from "@/lib/types";
import { kk } from "@/lib/i18n/kk";

/** Shows only what the admin entered — nothing is generated or completed. */
export function ReferenceBlock({ reference }: { reference: Reference | null | undefined }) {
  if (!reference) return null;
  const { arabic_original, kazakh_translation, reference_type, book_name, chapter, reference_number, source_attribution } = reference;
  const meta = [
    reference_type ? kk.question.fields.referenceTypes[reference_type] : null,
    book_name,
    chapter,
    reference_number,
  ].filter(Boolean);
  if (!arabic_original && !kazakh_translation && meta.length === 0 && !source_attribution) return null;
  return (
    <div className="space-y-2 rounded-xl border border-gold-200 bg-gold-50/60 p-4">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gold-800">
        <BookOpen className="size-3.5" /> {kk.participant.reference}
      </p>
      <ArabicText className="text-2xl">{arabic_original}</ArabicText>
      {kazakh_translation ? <p className="whitespace-pre-wrap text-sm leading-relaxed text-navy-900">{kazakh_translation}</p> : null}
      {meta.length ? <p className="text-xs text-slate-600">{meta.join(" · ")}</p> : null}
      {source_attribution ? <p className="text-xs italic text-slate-600">{source_attribution}</p> : null}
    </div>
  );
}
