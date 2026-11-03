"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { uuid } from "@/lib/validation/schemas";
import { kk } from "@/lib/i18n/kk";
import type { ActionResult } from "@/lib/types";

export async function deleteParticipant(participantId: string, quizId: string): Promise<ActionResult> {
  await requireStaff();
  if (!uuid.safeParse(participantId).success) return { ok: false, error: kk.errors.validation };
  const supabase = await createClient();
  const { data, error } = await supabase.from("participants").delete().eq("id", participantId).select("id");
  if (error || !data?.length) return { ok: false, error: kk.errors.forbidden };
  revalidatePath(`/admin/quizzes/${quizId}/results`);
  return { ok: true, data: undefined };
}
