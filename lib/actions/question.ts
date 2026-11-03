"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors, questionSchema, uuid } from "@/lib/validation/schemas";
import { kk } from "@/lib/i18n/kk";
import { rpcErrorMessage } from "@/lib/rpc";
import type { ActionResult } from "@/lib/types";
import type { Json } from "@/lib/supabase/database.types";

export async function saveQuestion(
  questionId: string | null,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  await requireStaff();
  if (questionId !== null && !uuid.safeParse(questionId).success) return { ok: false, error: kk.errors.validation };
  const parsed = questionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: kk.errors.validation, fieldErrors: fieldErrors(parsed.error) };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_question", {
    p_question_id: questionId as string,
    p_payload: parsed.data as unknown as Json,
  });
  if (error || !data) return { ok: false, error: rpcErrorMessage(error) };
  revalidatePath(`/admin/quizzes/${parsed.data.quiz_id}`, "layout");
  revalidatePath("/admin/questions");
  return { ok: true, data: { id: data } };
}

export async function deleteQuestion(questionId: string, quizId: string): Promise<ActionResult> {
  await requireStaff();
  if (!uuid.safeParse(questionId).success) return { ok: false, error: kk.errors.validation };
  const supabase = await createClient();
  const { data, error } = await supabase.from("questions").delete().eq("id", questionId).select("id");
  if (error || !data?.length) return { ok: false, error: kk.errors.forbidden };
  revalidatePath(`/admin/quizzes/${quizId}`, "layout");
  revalidatePath("/admin/questions");
  return { ok: true, data: undefined };
}

const moveSchema = z.object({ questionId: uuid, direction: z.union([z.literal(-1), z.literal(1)]) });

export async function moveQuestion(questionId: string, direction: -1 | 1, quizId: string): Promise<ActionResult> {
  await requireStaff();
  const parsed = moveSchema.safeParse({ questionId, direction });
  if (!parsed.success) return { ok: false, error: kk.errors.validation };
  const supabase = await createClient();
  const { error } = await supabase.rpc("move_question", { p_question_id: questionId, p_direction: direction });
  if (error) return { ok: false, error: rpcErrorMessage(error) };
  revalidatePath(`/admin/quizzes/${quizId}`);
  return { ok: true, data: undefined };
}

export async function duplicateQuestion(questionId: string, quizId: string): Promise<ActionResult> {
  await requireStaff();
  if (!uuid.safeParse(questionId).success) return { ok: false, error: kk.errors.validation };
  const supabase = await createClient();
  const { error } = await supabase.rpc("duplicate_question", { p_question_id: questionId });
  if (error) return { ok: false, error: rpcErrorMessage(error) };
  revalidatePath(`/admin/quizzes/${quizId}`);
  return { ok: true, data: undefined };
}
