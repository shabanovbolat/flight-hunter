"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, quizSchema, uuid, categorySchema, type QuizInput } from "@/lib/validation/schemas";
import { kk } from "@/lib/i18n/kk";
import { rpcErrorMessage } from "@/lib/rpc";
import type { ActionResult } from "@/lib/types";

export type QuizFormState =
  | { error?: string; fieldErrors?: Record<string, string>; saved?: boolean; redirectTo?: string }
  | undefined;

function parseQuizForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  return quizSchema.safeParse(raw);
}

function toRow(v: QuizInput) {
  return {
    title: v.title,
    description: v.description,
    category_id: v.category_id,
    cover_image_path: v.cover_image_path,
    slug: v.slug,
    duration_seconds: v.duration_minutes ? v.duration_minutes * 60 : null,
    question_count: v.question_count,
    starts_at: v.starts_at,
    ends_at: v.ends_at,
    max_participants: v.max_participants,
    shuffle_questions: v.shuffle_questions,
    shuffle_options: v.shuffle_options,
    show_correct_immediately: v.show_correct_immediately,
    allow_multiple_attempts: v.allow_multiple_attempts,
    is_public: v.is_public,
    speed_bonus: v.speed_bonus,
  };
}

export async function createQuiz(_prev: QuizFormState, formData: FormData): Promise<QuizFormState> {
  const profile = await requireStaff();
  const parsed = parseQuizForm(formData);
  if (!parsed.success) return { error: kk.errors.validation, fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quizzes")
    .insert({ ...toRow(parsed.data), owner_id: profile.id })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return { fieldErrors: { slug: kk.quiz.validation.slugTaken } };
    console.error("createQuiz failed", error.code, error.message);
    return { error: kk.common.unknownError };
  }
  if (parsed.data.pin) {
    const { error: pinError } = await supabase.rpc("set_quiz_pin", { p_quiz_id: data.id, p_pin: parsed.data.pin });
    if (pinError) return { error: rpcErrorMessage(pinError) };
  }
  revalidatePath("/admin/quizzes");
  return { redirectTo: `/admin/quizzes/${data.id}` };
}

export async function updateQuiz(quizId: string, _prev: QuizFormState, formData: FormData): Promise<QuizFormState> {
  await requireStaff();
  if (!uuid.safeParse(quizId).success) return { error: kk.errors.validation };
  const parsed = parseQuizForm(formData);
  if (!parsed.success) return { error: kk.errors.validation, fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase.from("quizzes").update(toRow(parsed.data)).eq("id", quizId).select("id");
  if (error) {
    if (error.code === "23505") return { fieldErrors: { slug: kk.quiz.validation.slugTaken } };
    return { error: kk.common.unknownError };
  }
  if (!data || data.length === 0) return { error: kk.errors.forbidden };

  if (parsed.data.pin || parsed.data.remove_pin) {
    const { error: pinError } = await supabase.rpc("set_quiz_pin", {
      p_quiz_id: quizId,
      p_pin: parsed.data.remove_pin ? (null as unknown as string) : parsed.data.pin!,
    });
    if (pinError) return { error: rpcErrorMessage(pinError) };
  }
  revalidatePath(`/admin/quizzes/${quizId}`, "layout");
  return { saved: true };
}

const statusSchema = z.object({ quizId: uuid, status: z.enum(["draft", "published", "archived"]) });

export async function setQuizStatus(quizId: string, status: "draft" | "published" | "archived"): Promise<ActionResult> {
  await requireStaff();
  const parsed = statusSchema.safeParse({ quizId, status });
  if (!parsed.success) return { ok: false, error: kk.errors.validation };
  const supabase = await createClient();

  if (status === "published") {
    const { count } = await supabase
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("quiz_id", quizId);
    if (!count) return { ok: false, error: kk.quiz.cannotPublishEmpty };
  }
  const { data, error } = await supabase
    .from("quizzes")
    .update({ status, ...(status === "published" ? { published_at: new Date().toISOString() } : {}) })
    .eq("id", quizId)
    .select("id");
  if (error || !data?.length) return { ok: false, error: kk.common.unknownError };
  revalidatePath(`/admin/quizzes/${quizId}`, "layout");
  revalidatePath("/admin/quizzes");
  return { ok: true, data: undefined };
}

export async function deleteQuiz(quizId: string): Promise<ActionResult> {
  await requireStaff();
  if (!uuid.safeParse(quizId).success) return { ok: false, error: kk.errors.validation };
  const supabase = await createClient();
  const { data, error } = await supabase.from("quizzes").delete().eq("id", quizId).select("id");
  if (error || !data?.length) return { ok: false, error: kk.common.unknownError };
  revalidatePath("/admin/quizzes");
  return { ok: true, data: undefined };
}

export async function createCategory(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string; name: string }>> {
  const profile = await requireStaff();
  const parsed = categorySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { ok: false, error: kk.errors.validation };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quiz_categories")
    .insert({ name: parsed.data.name, created_by: profile.id })
    .select("id, name")
    .single();
  if (error) return { ok: false, error: kk.common.unknownError };
  revalidatePath("/admin", "layout");
  return { ok: true, data };
}

export async function deleteCategory(categoryId: string): Promise<ActionResult> {
  await requireStaff();
  if (!uuid.safeParse(categoryId).success) return { ok: false, error: kk.errors.validation };
  const supabase = await createClient();
  const { data, error } = await supabase.from("quiz_categories").delete().eq("id", categoryId).select("id");
  if (error || !data?.length) return { ok: false, error: kk.errors.forbidden };
  revalidatePath("/admin", "layout");
  return { ok: true, data: undefined };
}
