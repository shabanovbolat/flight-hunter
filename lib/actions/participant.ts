"use server";

import { createClient } from "@/lib/supabase/server";
import { joinSchema, submitSchema, uuid } from "@/lib/validation/schemas";
import { kk } from "@/lib/i18n/kk";
import { rpcErrorMessage } from "@/lib/rpc";
import type { ActionResult, LeaderboardEntry, ParticipantResult, ParticipantState } from "@/lib/types";

/** Participants get a real auth.uid() through Supabase anonymous sign-in. */
async function clientWithUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) return { supabase, error: kk.errors.anon_signin };
  }
  return { supabase, error: null };
}

export async function joinQuiz(input: { slug: string; name: string; pin?: string | null }): Promise<ActionResult<{ participantId: string; sessionId: string | null }>> {
  const parsed = joinSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? kk.errors.validation };
  const { supabase, error: authError } = await clientWithUser();
  if (authError) return { ok: false, error: authError };
  const { data, error } = await supabase.rpc("join_quiz", {
    p_slug: parsed.data.slug,
    p_name: parsed.data.name,
    p_pin: parsed.data.pin as string,
  });
  if (error || !data) return { ok: false, error: rpcErrorMessage(error) };
  // the session may have opened after the landing page loaded
  const { data: row } = await supabase.from("participants").select("session_id").eq("id", data).maybeSingle();
  return { ok: true, data: { participantId: data, sessionId: row?.session_id ?? null } };
}

export async function getParticipantState(participantId: string): Promise<ActionResult<ParticipantState>> {
  if (!uuid.safeParse(participantId).success) return { ok: false, error: kk.errors.validation };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_participant_state", { p_participant_id: participantId });
  if (error || !data) return { ok: false, error: rpcErrorMessage(error) };
  return { ok: true, data: data as unknown as ParticipantState };
}

export async function submitAnswer(input: {
  participantId: string;
  questionId: string;
  optionIds: string[];
  text: string | null;
}): Promise<ActionResult<ParticipantState>> {
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: kk.errors.validation };
  const supabase = await createClient();
  // Only ids/text go to the server. Correctness, points and timing are computed in Postgres.
  const { data, error } = await supabase.rpc("submit_answer", {
    p_participant_id: parsed.data.participantId,
    p_question_id: parsed.data.questionId,
    p_option_ids: parsed.data.optionIds,
    p_text: parsed.data.text as string,
  });
  if (error || !data) return { ok: false, error: rpcErrorMessage(error) };
  return { ok: true, data: data as unknown as ParticipantState };
}

export async function advanceParticipant(participantId: string): Promise<ActionResult<ParticipantState>> {
  if (!uuid.safeParse(participantId).success) return { ok: false, error: kk.errors.validation };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("advance_participant", { p_participant_id: participantId });
  if (error || !data) return { ok: false, error: rpcErrorMessage(error) };
  return { ok: true, data: data as unknown as ParticipantState };
}

export async function getParticipantResult(participantId: string): Promise<ActionResult<ParticipantResult>> {
  if (!uuid.safeParse(participantId).success) return { ok: false, error: kk.errors.validation };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_participant_result", { p_participant_id: participantId });
  if (error || !data) return { ok: false, error: rpcErrorMessage(error) };
  return { ok: true, data: data as unknown as ParticipantResult };
}

export async function getLeaderboard(slug: string, sessionId: string | null): Promise<ActionResult<LeaderboardEntry[]>> {
  if (sessionId !== null && !uuid.safeParse(sessionId).success) return { ok: false, error: kk.errors.validation };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_leaderboard", {
    p_slug: slug,
    p_session_id: sessionId as string,
    p_limit: 100,
  });
  if (error) return { ok: false, error: rpcErrorMessage(error) };
  return { ok: true, data: (data ?? []) as LeaderboardEntry[] };
}
