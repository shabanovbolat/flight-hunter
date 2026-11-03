"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hostActionSchema, uuid } from "@/lib/validation/schemas";
import { kk } from "@/lib/i18n/kk";
import { rpcErrorMessage } from "@/lib/rpc";
import type { ActionResult, HostState } from "@/lib/types";

export async function openSession(quizId: string): Promise<ActionResult<{ sessionId: string }>> {
  await requireStaff();
  if (!uuid.safeParse(quizId).success) return { ok: false, error: kk.errors.validation };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("host_open_session", { p_quiz_id: quizId });
  if (error || !data) return { ok: false, error: rpcErrorMessage(error) };
  revalidatePath(`/admin/quizzes/${quizId}/live`);
  return { ok: true, data: { sessionId: data } };
}

export async function hostControl(sessionId: string, action: "next" | "reveal" | "leaderboard" | "end"): Promise<ActionResult> {
  await requireStaff();
  const parsed = hostActionSchema.safeParse({ sessionId, action });
  if (!parsed.success) return { ok: false, error: kk.errors.validation };
  const supabase = await createClient();
  const { error } = await supabase.rpc("host_control", { p_session_id: sessionId, p_action: action });
  if (error) return { ok: false, error: rpcErrorMessage(error) };
  return { ok: true, data: undefined };
}

export async function getHostState(sessionId: string): Promise<ActionResult<HostState>> {
  await requireStaff();
  if (!uuid.safeParse(sessionId).success) return { ok: false, error: kk.errors.validation };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("host_session_state", { p_session_id: sessionId });
  if (error || !data) return { ok: false, error: rpcErrorMessage(error) };
  return { ok: true, data: data as unknown as HostState };
}
