// Mirrors public.normalize_answer() in Postgres. Scoring happens on the
// server only; this copy exists for previews and tests.
const HARAKAT = /[ً-ٰٟـۖ-ۭ]/g;
const ALEF = /[أإآٱ]/g;

export function normalizeAnswer(text: string | null | undefined): string {
  return (text ?? "")
    .toLocaleLowerCase("kk")
    .replace(HARAKAT, "")
    .replace(ALEF, "ا")
    .replace(/\s+/g, " ")
    .trim();
}
