import { z } from "zod";
import { kk } from "@/lib/i18n/kk";

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const optText = (max: number) =>
  z.preprocess(emptyToNull, z.string().trim().max(max).nullable()).optional().transform((v) => v ?? null);
const optInt = (min: number, max: number) =>
  z.preprocess(emptyToNull, z.coerce.number().int().min(min).max(max).nullable()).optional().transform((v) => v ?? null);
const optDate = z
  .preprocess(emptyToNull, z.string().nullable())
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: kk.errors.validation });
      return z.NEVER;
    }
    return d.toISOString();
  });
const bool = z.preprocess((v) => v === true || v === "on" || v === "true", z.boolean());

export const uuid = z.string().uuid();

export const loginSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(6).max(200),
  next: z.string().optional(),
});

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9-]{2,63}$/, kk.quiz.validation.slugInvalid);

export const quizSchema = z
  .object({
    title: z.string().trim().min(1, kk.quiz.validation.titleRequired).max(200),
    description: optText(2000),
    category_id: z.preprocess(emptyToNull, uuid.nullable()).optional().transform((v) => v ?? null),
    cover_image_path: optText(500),
    slug: slugSchema,
    duration_minutes: optInt(1, 1440),
    question_count: optInt(1, 1000),
    starts_at: optDate,
    ends_at: optDate,
    max_participants: optInt(1, 100000),
    shuffle_questions: bool,
    shuffle_options: bool,
    show_correct_immediately: bool,
    allow_multiple_attempts: bool,
    is_public: bool,
    speed_bonus: bool,
    pin: z
      .preprocess(emptyToNull, z.string().trim().regex(/^\d{4,8}$/, kk.quiz.validation.pinInvalid).nullable())
      .optional()
      .transform((v) => v ?? null),
    remove_pin: bool,
  })
  .refine((v) => !v.starts_at || !v.ends_at || new Date(v.ends_at) > new Date(v.starts_at), {
    message: kk.quiz.validation.datesInvalid,
    path: ["ends_at"],
  });
export type QuizInput = z.infer<typeof quizSchema>;

export const questionTypeSchema = z.enum(["single", "multiple", "true_false", "text"]);

export const optionSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  text: z.string().trim().min(1, kk.question.validation.optionEmpty).max(1000),
  arabic_text: optText(2000),
  is_correct: z.boolean(),
});

export const questionSchema = z
  .object({
    quiz_id: uuid,
    type: questionTypeSchema,
    text: z.string().trim().min(1, kk.question.validation.textRequired).max(2000),
    arabic_text: optText(4000),
    image_path: optText(500),
    points: z.coerce.number().int().min(0).max(1000),
    time_limit_seconds: optInt(5, 3600),
    explanation: optText(4000),
    accepted_answers: z.array(z.string().trim().min(1).max(500)).max(50),
    options: z.array(optionSchema).max(10),
    arabic_original: optText(8000),
    kazakh_translation: optText(8000),
    reference_type: z.preprocess(emptyToNull, z.enum(["quran", "hadith", "other"]).nullable()).optional().transform((v) => v ?? null),
    book_name: optText(300),
    chapter: optText(300),
    reference_number: optText(100),
    source_attribution: optText(300),
    extra_explanation: optText(4000),
  })
  .superRefine((q, ctx) => {
    if (q.type === "text") {
      if (q.accepted_answers.length === 0)
        ctx.addIssue({ code: "custom", path: ["accepted_answers"], message: kk.question.validation.acceptedRequired });
      return;
    }
    if (q.options.length < 2) {
      ctx.addIssue({ code: "custom", path: ["options"], message: kk.question.validation.optionsMin });
      return;
    }
    const correct = q.options.filter((o) => o.is_correct).length;
    if ((q.type === "single" || q.type === "true_false") && correct !== 1)
      ctx.addIssue({ code: "custom", path: ["options"], message: kk.question.validation.singleCorrect });
    if (q.type === "multiple" && correct < 1)
      ctx.addIssue({ code: "custom", path: ["options"], message: kk.question.validation.multipleCorrect });
  });
export type QuestionInput = z.infer<typeof questionSchema>;

export const joinSchema = z.object({
  slug: slugSchema,
  name: z
    .string()
    .trim()
    .min(2, kk.errors.invalid_name)
    .max(80, kk.errors.invalid_name),
  pin: z.preprocess(emptyToNull, z.string().trim().max(8).nullable()).optional().transform((v) => v ?? null),
});

export const submitSchema = z.object({
  participantId: uuid,
  questionId: uuid,
  optionIds: z.array(uuid).max(10),
  text: z.string().max(1000).nullable(),
});

export const hostActionSchema = z.object({
  sessionId: uuid,
  action: z.enum(["next", "reveal", "leaderboard", "end"]),
});

export const categorySchema = z.object({ name: z.string().trim().min(1).max(80) });

export const creatorSchema = z.object({
  email: z.string().trim().email().max(200),
  full_name: z.string().trim().min(2).max(120),
  password: z.string().min(8).max(200),
});

export const roleSchema = z.object({
  userId: uuid,
  role: z.enum(["super_admin", "creator", "pending"]),
});

export const profileSchema = z.object({ full_name: z.string().trim().min(2).max(120) });
export const passwordSchema = z.object({ password: z.string().min(8).max(200) });

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
