-- ILIM QUIZ — core schema
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('super_admin', 'creator', 'pending');
create type public.question_type as enum ('single', 'multiple', 'true_false', 'text');
create type public.reference_type as enum ('quran', 'hadith', 'other');
create type public.quiz_status as enum ('draft', 'published', 'archived');
create type public.session_phase as enum ('lobby', 'question', 'reveal', 'leaderboard', 'ended');
create type public.participant_status as enum ('in_progress', 'completed');

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles (admins only — anonymous participants never get a profile)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text check (char_length(full_name) <= 120),
  role public.user_role not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_role_idx on public.profiles (role);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
create table public.quiz_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint quiz_categories_name_key unique (name)
);
create index quiz_categories_created_by_idx on public.quiz_categories (created_by);

-- ---------------------------------------------------------------------------
-- quizzes
-- ---------------------------------------------------------------------------
create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  category_id uuid references public.quiz_categories (id) on delete set null,
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{2,63}$'),
  title text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 2000),
  cover_image_path text,
  duration_seconds integer check (duration_seconds between 10 and 86400),
  question_count integer check (question_count > 0),
  starts_at timestamptz,
  ends_at timestamptz,
  max_participants integer check (max_participants > 0),
  shuffle_questions boolean not null default false,
  shuffle_options boolean not null default false,
  show_correct_immediately boolean not null default true,
  allow_multiple_attempts boolean not null default false,
  is_public boolean not null default true,
  pin_hash text,
  speed_bonus boolean not null default false,
  status public.quiz_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quizzes_slug_key unique (slug),
  constraint quizzes_dates_check check (ends_at is null or starts_at is null or ends_at > starts_at)
);
create index quizzes_owner_idx on public.quizzes (owner_id);
create index quizzes_category_idx on public.quizzes (category_id);
create index quizzes_status_idx on public.quizzes (status);
create trigger quizzes_updated_at before update on public.quizzes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- questions
-- ---------------------------------------------------------------------------
create table public.questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  position integer not null default 0,
  type public.question_type not null,
  text text not null check (char_length(text) between 1 and 2000),
  arabic_text text check (char_length(arabic_text) <= 4000),
  image_path text,
  points integer not null default 1 check (points between 0 and 1000),
  time_limit_seconds integer check (time_limit_seconds between 5 and 3600),
  explanation text check (char_length(explanation) <= 4000),
  accepted_answers text[] not null default '{}',
  -- Islamic reference fields (all optional; shown exactly as entered)
  arabic_original text,
  kazakh_translation text,
  reference_type public.reference_type,
  book_name text,
  chapter text,
  reference_number text,
  source_attribution text,
  extra_explanation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index questions_quiz_position_idx on public.questions (quiz_id, position);
create trigger questions_updated_at before update on public.questions
  for each row execute function public.set_updated_at();

create table public.answer_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  position integer not null default 0,
  text text not null check (char_length(text) between 1 and 1000),
  arabic_text text check (char_length(arabic_text) <= 2000),
  is_correct boolean not null default false
);
create index answer_options_question_idx on public.answer_options (question_id, position);

-- ---------------------------------------------------------------------------
-- live sessions
-- ---------------------------------------------------------------------------
create table public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  host_id uuid not null references public.profiles (id) on delete cascade,
  phase public.session_phase not null default 'lobby',
  question_order uuid[] not null default '{}',
  current_index integer not null default -1,
  current_question_id uuid references public.questions (id) on delete set null,
  question_started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ended_at timestamptz
);
create index quiz_sessions_quiz_idx on public.quiz_sessions (quiz_id);
create index quiz_sessions_host_idx on public.quiz_sessions (host_id);
create index quiz_sessions_current_question_idx on public.quiz_sessions (current_question_id);
-- at most one active (not ended) session per quiz
create unique index quiz_sessions_one_active_idx on public.quiz_sessions (quiz_id)
  where phase <> 'ended';
create trigger quiz_sessions_updated_at before update on public.quiz_sessions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- participants (one row per attempt)
-- ---------------------------------------------------------------------------
create table public.participants (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  session_id uuid references public.quiz_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 80),
  attempt_no integer not null default 1,
  status public.participant_status not null default 'in_progress',
  question_order uuid[] not null default '{}',
  current_index integer not null default 0,
  current_question_started_at timestamptz,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  score integer not null default 0,
  correct_count integer not null default 0,
  total_time_ms bigint not null default 0,
  constraint participants_attempt_key unique (quiz_id, user_id, attempt_no),
  constraint participants_session_user_key unique (session_id, user_id)
);
create index participants_quiz_idx on public.participants (quiz_id);
create index participants_session_idx on public.participants (session_id);
create index participants_user_idx on public.participants (user_id);
create index participants_ranking_idx on public.participants (quiz_id, score desc, total_time_ms asc);

-- ---------------------------------------------------------------------------
-- answers
-- ---------------------------------------------------------------------------
create table public.participant_answers (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  selected_option_ids uuid[] not null default '{}',
  text_answer text check (char_length(text_answer) <= 1000),
  is_correct boolean not null default false,
  points_awarded integer not null default 0,
  started_at timestamptz,
  answered_at timestamptz not null default now(),
  time_ms integer not null default 0,
  is_late boolean not null default false,
  timed_out boolean not null default false,
  -- duplicate protection: exactly one answer per participant per question
  constraint participant_answers_once_key unique (participant_id, question_id)
);
create index participant_answers_question_idx on public.participant_answers (question_id);
create index participant_answers_quiz_idx on public.participant_answers (quiz_id);

-- ---------------------------------------------------------------------------
-- results (written when an attempt finishes)
-- ---------------------------------------------------------------------------
create table public.quiz_results (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants (id) on delete cascade,
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  session_id uuid references public.quiz_sessions (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null,
  score integer not null,
  correct_count integer not null,
  total_questions integer not null,
  accuracy numeric(5, 2) not null,
  total_time_ms bigint not null,
  completed_at timestamptz not null default now(),
  constraint quiz_results_participant_key unique (participant_id)
);
create index quiz_results_quiz_idx on public.quiz_results (quiz_id, score desc, total_time_ms asc);
create index quiz_results_session_idx on public.quiz_results (session_id);
create index quiz_results_user_idx on public.quiz_results (user_id);

-- ---------------------------------------------------------------------------
-- rate limiting buckets (no client access)
-- ---------------------------------------------------------------------------
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);
create index rate_limits_window_idx on public.rate_limits (window_start);
