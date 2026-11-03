import "server-only";
import { createClient } from "@/lib/supabase/server";
import { rankRows } from "@/lib/ranking";

export interface ResultRow {
  id: string;
  display_name: string;
  status: "in_progress" | "completed";
  session_id: string | null;
  attempt_no: number;
  score: number;
  correct_count: number;
  total_questions: number;
  accuracy: number;
  total_time_ms: number;
  started_at: string;
  finished_at: string | null;
  rank: number | null;
}

/** session: "all" | "self" | <session uuid>. Ranks only finished attempts. */
export async function loadQuizResults(quizId: string, session: string = "all"): Promise<ResultRow[] | null> {
  const supabase = await createClient();
  let query = supabase
    .from("participants")
    .select("id, display_name, status, session_id, attempt_no, score, correct_count, total_time_ms, started_at, finished_at, question_order")
    .eq("quiz_id", quizId)
    .order("score", { ascending: false })
    .order("total_time_ms", { ascending: true })
    .limit(5000);
  if (session === "self") query = query.is("session_id", null);
  else if (session !== "all") query = query.eq("session_id", session);
  const { data, error } = await query;
  if (error) return null;

  const rows = data.map(({ question_order, ...p }) => {
    const total = question_order.length;
    return {
      ...p,
      total_time_ms: Number(p.total_time_ms),
      total_questions: total,
      accuracy: total ? Math.round((p.correct_count * 1000) / total) / 10 : 0,
    };
  });
  const ranked = new Map(rankRows(rows.filter((r) => r.status === "completed")).map((r) => [r.id, r.rank]));
  return rows
    .map((r) => ({ ...r, rank: ranked.get(r.id) ?? null }))
    .sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity) || b.score - a.score);
}

export async function loadSessions(quizId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("quiz_sessions")
    .select("id, phase, created_at, ended_at")
    .eq("quiz_id", quizId)
    .order("created_at", { ascending: false });
  return data ?? [];
}
