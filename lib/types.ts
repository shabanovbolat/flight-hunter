import type { Database } from "@/lib/supabase/database.types";

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type QuestionType = Database["public"]["Enums"]["question_type"];
export type ReferenceType = Database["public"]["Enums"]["reference_type"];
export type QuizStatus = Database["public"]["Enums"]["quiz_status"];
export type SessionPhase = Database["public"]["Enums"]["session_phase"];
export type UserRole = Database["public"]["Enums"]["user_role"];

export type Quiz = Tables<"quizzes">;
export type Question = Tables<"questions">;
export type AnswerOption = Tables<"answer_options">;
export type Profile = Tables<"profiles">;

/** Shape returned by public.get_public_quiz */
export interface PublicQuiz {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string | null;
  cover_image_path: string | null;
  question_total: number;
  duration_seconds: number | null;
  starts_at: string | null;
  ends_at: string | null;
  requires_pin: boolean;
  max_participants: number | null;
  allow_multiple_attempts: boolean;
  participants_count: number;
  live_session: { id: string; phase: SessionPhase } | null;
  my_participant: {
    id: string;
    status: "in_progress" | "completed";
    display_name: string;
    session_id: string | null;
  } | null;
  server_now: string;
}

export interface PublicOption {
  id: string;
  text: string;
  arabic_text: string | null;
}

export interface PublicQuestion {
  id: string;
  type: QuestionType;
  text: string;
  arabic_text: string | null;
  image_path: string | null;
  points: number;
  time_limit_seconds: number | null;
  options: PublicOption[];
}

export interface Reference {
  arabic_original: string | null;
  kazakh_translation: string | null;
  reference_type: ReferenceType | null;
  book_name: string | null;
  chapter: string | null;
  reference_number: string | null;
  source_attribution: string | null;
}

export type Feedback =
  | {
      answered: boolean;
      revealed: false;
      selected_option_ids: string[];
      text_answer: string | null;
    }
  | {
      answered: boolean;
      revealed: true;
      is_correct: boolean;
      points_awarded: number;
      timed_out: boolean;
      is_late: boolean;
      selected_option_ids: string[];
      text_answer: string | null;
      correct_option_ids: string[];
      accepted_answers: string[];
      explanation: string | null;
      extra_explanation: string | null;
      reference: Reference;
    };

export interface LeaderRow {
  rank: number;
  display_name: string;
  score: number;
  correct_count: number;
  is_me?: boolean;
  total_time_ms?: number;
}

export type ParticipantState =
  | {
      status: "completed";
      mode: "self" | "live";
      participant_id: string;
      quiz_slug: string;
      server_now: string;
    }
  | {
      status: "in_progress";
      mode: "live";
      phase: "lobby";
      participant_id: string;
      display_name: string;
      session_id: string;
      quiz_title: string;
      index: number;
      total: number;
      score: number;
      participants_count: number;
      server_now: string;
    }
  | {
      status: "in_progress";
      mode: "self" | "live";
      phase?: Exclude<SessionPhase, "lobby" | "ended">;
      participant_id: string;
      display_name: string;
      session_id?: string;
      quiz_title: string;
      quiz_slug?: string;
      index: number;
      total: number;
      score: number;
      question: PublicQuestion;
      question_started_at: string | null;
      quiz_deadline?: string | null;
      answered: boolean;
      feedback: Feedback | null;
      leaderboard?: LeaderRow[] | null;
      my_rank?: { rank: number; total: number } | null;
      server_now: string;
    };

export interface ParticipantResult {
  participant_id: string;
  display_name: string;
  quiz_title: string;
  quiz_slug: string;
  allow_multiple_attempts: boolean;
  score: number;
  correct_count: number;
  total_questions: number;
  accuracy: number;
  total_time_ms: number;
  duration_ms: number;
  rank: { rank: number; total: number };
  review: { index: number; question: PublicQuestion; feedback: Feedback }[];
}

export interface LeaderboardEntry {
  rank: number;
  display_name: string;
  correct_count: number;
  total_questions: number;
  score: number;
  accuracy: number;
  total_time_ms: number;
  is_me: boolean;
}

export interface HostState {
  session: Tables<"quiz_sessions">;
  quiz: { id: string; title: string; slug: string };
  total: number;
  participants_count: number;
  answered_count: number;
  question: {
    id: string;
    type: QuestionType;
    text: string;
    arabic_text: string | null;
    image_path: string | null;
    points: number;
    time_limit_seconds: number | null;
    accepted_answers: string[];
    explanation: string | null;
    options: (PublicOption & { is_correct: boolean; count: number })[];
    correct_count: number;
  } | null;
  leaderboard: (LeaderRow & { total_time_ms: number })[];
  server_now: string;
}

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };
