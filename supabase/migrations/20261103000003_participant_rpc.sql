-- ILIM QUIZ — participant-facing RPCs.
-- Participants have no direct access to questions/answer_options. These
-- functions are the only path, and they never expose correctness data for a
-- question the caller has not answered yet. Scoring and timing are computed
-- here from server time only.

-- ---------------------------------------------------------------------------
-- Rate limiting
-- ---------------------------------------------------------------------------
create or replace function public.check_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );
  v_count integer;
begin
  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, v_window, 1)
  on conflict (key, window_start) do update set count = r.count + 1
  returning r.count into v_count;

  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 hour';
  end if;

  if v_count > p_max then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
end;
$$;
revoke execute on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Text answer normalisation (mirrored in lib/scoring/normalize.ts)
-- trim, lowercase, collapse spaces; Arabic: strip harakat + tatweel and
-- unify alef forms.
-- ---------------------------------------------------------------------------
create or replace function public.normalize_answer(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select btrim(
    regexp_replace(
      translate(
        regexp_replace(lower(coalesce(p_text, '')), '[ً-ٰٟـۖ-ۭ]', '', 'g'),
        'أإآٱ',
        'اااا'
      ),
      '\s+', ' ', 'g'
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- Internal helpers
-- ---------------------------------------------------------------------------

-- Question payload WITHOUT any correctness data.
create or replace function public._question_public(p_question_id uuid, p_shuffle_seed text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', q.id,
    'type', q.type,
    'text', q.text,
    'arabic_text', q.arabic_text,
    'image_path', q.image_path,
    'points', q.points,
    'time_limit_seconds', q.time_limit_seconds,
    'options', coalesce((
      select jsonb_agg(
        jsonb_build_object('id', o.id, 'text', o.text, 'arabic_text', o.arabic_text)
        order by
          case when p_shuffle_seed is null then o.position end,
          case when p_shuffle_seed is not null then md5(p_shuffle_seed || o.id::text) end
      )
      from public.answer_options o
      where o.question_id = q.id and q.type <> 'text'
    ), '[]'::jsonb)
  )
  from public.questions q
  where q.id = p_question_id;
$$;
revoke execute on function public._question_public(uuid, text) from public, anon, authenticated;

-- Feedback for an answered question (correct answer, explanation, references).
create or replace function public._answer_feedback(p_participant_id uuid, p_question_id uuid, p_reveal boolean)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not p_reveal then jsonb_build_object(
      'answered', a.id is not null,
      'revealed', false,
      'selected_option_ids', coalesce(to_jsonb(a.selected_option_ids), '[]'::jsonb),
      'text_answer', a.text_answer
    )
    else jsonb_build_object(
      'answered', a.id is not null,
      'revealed', true,
      'is_correct', coalesce(a.is_correct, false),
      'points_awarded', coalesce(a.points_awarded, 0),
      'timed_out', coalesce(a.timed_out, false),
      'is_late', coalesce(a.is_late, false),
      'selected_option_ids', coalesce(to_jsonb(a.selected_option_ids), '[]'::jsonb),
      'text_answer', a.text_answer,
      'correct_option_ids', coalesce((
        select jsonb_agg(o.id order by o.position)
        from public.answer_options o
        where o.question_id = q.id and o.is_correct
      ), '[]'::jsonb),
      'accepted_answers', to_jsonb(q.accepted_answers),
      'explanation', q.explanation,
      'extra_explanation', q.extra_explanation,
      'reference', jsonb_build_object(
        'arabic_original', q.arabic_original,
        'kazakh_translation', q.kazakh_translation,
        'reference_type', q.reference_type,
        'book_name', q.book_name,
        'chapter', q.chapter,
        'reference_number', q.reference_number,
        'source_attribution', q.source_attribution
      )
    )
  end
  from public.questions q
  left join public.participant_answers a
    on a.question_id = q.id and a.participant_id = p_participant_id
  where q.id = p_question_id;
$$;
revoke execute on function public._answer_feedback(uuid, uuid, boolean) from public, anon, authenticated;

-- Mark an attempt finished and write its quiz_results row.
create or replace function public._finalize_participant(p_participant_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_p public.participants;
  v_total integer;
begin
  update public.participants
     set status = 'completed',
         finished_at = coalesce(finished_at, now()),
         current_question_started_at = null
   where id = p_participant_id
  returning * into v_p;

  if v_p.session_id is not null then
    select coalesce(array_length(question_order, 1), 0) into v_total
    from public.quiz_sessions where id = v_p.session_id;
  else
    v_total := coalesce(array_length(v_p.question_order, 1), 0);
  end if;

  insert into public.quiz_results (
    participant_id, quiz_id, session_id, user_id, display_name, score,
    correct_count, total_questions, accuracy, total_time_ms, completed_at
  ) values (
    v_p.id, v_p.quiz_id, v_p.session_id, v_p.user_id, v_p.display_name, v_p.score,
    v_p.correct_count, v_total,
    case when v_total > 0 then round(v_p.correct_count * 100.0 / v_total, 2) else 0 end,
    v_p.total_time_ms, v_p.finished_at
  )
  on conflict (participant_id) do update set
    score = excluded.score,
    correct_count = excluded.correct_count,
    total_questions = excluded.total_questions,
    accuracy = excluded.accuracy,
    total_time_ms = excluded.total_time_ms,
    completed_at = excluded.completed_at;
end;
$$;
revoke execute on function public._finalize_participant(uuid) from public, anon, authenticated;

-- Score one answer and store it. Returns false if it already existed.
create or replace function public._record_answer(
  p_participant public.participants,
  p_quiz public.quizzes,
  p_question_id uuid,
  p_started_at timestamptz,
  p_deadline timestamptz,
  p_option_ids uuid[],
  p_text text,
  p_timed_out boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_q public.questions;
  v_now timestamptz := now();
  v_started timestamptz := coalesce(p_started_at, now());
  v_elapsed_ms integer;
  v_late boolean := false;
  v_correct boolean := false;
  v_selected uuid[];
  v_correct_ids uuid[];
  v_points integer := 0;
  v_rows integer;
  v_limit_ms integer;
begin
  select * into v_q from public.questions where id = p_question_id;
  if not found then
    raise exception 'question_not_found' using errcode = 'P0001';
  end if;

  v_limit_ms := case when v_q.time_limit_seconds is not null then v_q.time_limit_seconds * 1000 end;
  v_elapsed_ms := greatest(0, floor(extract(epoch from (v_now - v_started)) * 1000))::integer;

  -- Server-side timing: 2 s grace for network latency.
  if v_q.time_limit_seconds is not null
     and v_now > v_started + make_interval(secs => v_q.time_limit_seconds + 2) then
    v_late := true;
  end if;
  if p_deadline is not null and v_now > p_deadline + interval '2 seconds' then
    v_late := true;
  end if;

  if p_timed_out then
    v_late := true;
    v_selected := '{}';
  else
    -- keep only option ids that really belong to this question
    select coalesce(array_agg(distinct o.id), '{}') into v_selected
    from public.answer_options o
    where o.question_id = v_q.id and o.id = any (coalesce(p_option_ids, '{}'));
  end if;

  if not p_timed_out then
    if v_q.type in ('single', 'true_false') then
      v_correct := cardinality(v_selected) = 1 and exists (
        select 1 from public.answer_options
        where id = v_selected[1] and is_correct
      );
    elsif v_q.type = 'multiple' then
      select coalesce(array_agg(id), '{}') into v_correct_ids
      from public.answer_options where question_id = v_q.id and is_correct;
      v_correct := cardinality(v_selected) > 0
        and cardinality(v_correct_ids) > 0
        and v_selected @> v_correct_ids
        and v_correct_ids @> v_selected;
    elsif v_q.type = 'text' then
      v_correct := public.normalize_answer(p_text) <> ''
        and exists (
          select 1 from unnest(v_q.accepted_answers) acc
          where public.normalize_answer(acc) = public.normalize_answer(p_text)
        );
    end if;
  end if;

  if v_correct and not v_late then
    v_points := v_q.points;
    if p_quiz.speed_bonus and v_limit_ms is not null and v_limit_ms > 0 then
      v_points := v_points + floor(
        v_q.points * 0.5 * greatest(0, 1 - v_elapsed_ms::numeric / v_limit_ms)
      )::integer;
    end if;
  end if;

  if v_limit_ms is not null then
    v_elapsed_ms := least(v_elapsed_ms, v_limit_ms);
  end if;

  insert into public.participant_answers (
    participant_id, question_id, quiz_id, selected_option_ids, text_answer,
    is_correct, points_awarded, started_at, answered_at, time_ms, is_late, timed_out
  ) values (
    p_participant.id, v_q.id, p_participant.quiz_id, v_selected,
    case when v_q.type = 'text' and not p_timed_out then left(btrim(p_text), 1000) end,
    v_correct and not v_late, v_points, v_started, v_now, v_elapsed_ms, v_late, p_timed_out
  )
  on conflict (participant_id, question_id) do nothing;

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return false;
  end if;

  update public.participants
     set score = score + v_points,
         correct_count = correct_count + case when v_correct and not v_late then 1 else 0 end,
         total_time_ms = total_time_ms + v_elapsed_ms
   where id = p_participant.id;

  return true;
end;
$$;
revoke execute on function public._record_answer(public.participants, public.quizzes, uuid, timestamptz, timestamptz, uuid[], text, boolean)
  from public, anon, authenticated;

-- Rank of a participant (standard competition ranking: 1, 1, 3).
create or replace function public._participant_rank(p_participant_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select * from public.participants where id = p_participant_id
  ),
  pool as (
    select p.id, p.score, p.total_time_ms
    from public.participants p, me
    where p.quiz_id = me.quiz_id
      and (
        (me.session_id is not null and p.session_id = me.session_id)
        or (me.session_id is null and p.session_id is null and p.status = 'completed')
        or p.id = me.id
      )
  ),
  ranked as (
    select id, rank() over (order by score desc, total_time_ms asc) as rnk from pool
  )
  select jsonb_build_object(
    'rank', (select rnk from ranked where id = p_participant_id),
    'total', (select count(*) from pool)
  );
$$;
revoke execute on function public._participant_rank(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Public quiz info for the landing page (no secrets)
-- ---------------------------------------------------------------------------
create or replace function public.get_public_quiz(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_quiz public.quizzes;
  v_session public.quiz_sessions;
  v_total integer;
  v_me public.participants;
begin
  select * into v_quiz from public.quizzes where slug = p_slug and status = 'published';
  if not found then
    return null;
  end if;

  select * into v_session from public.quiz_sessions
  where quiz_id = v_quiz.id and phase <> 'ended'
  order by created_at desc limit 1;

  select count(*) into v_total from public.questions where quiz_id = v_quiz.id;
  if v_quiz.question_count is not null then
    v_total := least(v_total, v_quiz.question_count);
  end if;

  if auth.uid() is not null then
    select * into v_me from public.participants
    where quiz_id = v_quiz.id and user_id = auth.uid()
      and (v_session.id is null or session_id = v_session.id or session_id is null)
    order by (status = 'in_progress') desc, started_at desc
    limit 1;
  end if;

  return jsonb_build_object(
    'id', v_quiz.id,
    'slug', v_quiz.slug,
    'title', v_quiz.title,
    'description', v_quiz.description,
    'category', (select name from public.quiz_categories where id = v_quiz.category_id),
    'cover_image_path', v_quiz.cover_image_path,
    'question_total', v_total,
    'duration_seconds', v_quiz.duration_seconds,
    'starts_at', v_quiz.starts_at,
    'ends_at', v_quiz.ends_at,
    'requires_pin', v_quiz.pin_hash is not null,
    'max_participants', v_quiz.max_participants,
    'allow_multiple_attempts', v_quiz.allow_multiple_attempts,
    'participants_count', (
      select count(*) from public.participants
      where quiz_id = v_quiz.id
        and (v_session.id is null or session_id = v_session.id)
    ),
    'live_session', case when v_session.id is null then null else jsonb_build_object(
      'id', v_session.id, 'phase', v_session.phase
    ) end,
    'my_participant', case when v_me.id is null then null else jsonb_build_object(
      'id', v_me.id,
      'status', v_me.status,
      'display_name', v_me.display_name,
      'session_id', v_me.session_id
    ) end,
    'server_now', now()
  );
end;
$$;
grant execute on function public.get_public_quiz(text) to anon, authenticated;

create or replace function public.list_public_quizzes()
returns table (slug text, title text, description text, category text, question_total bigint, starts_at timestamptz, ends_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select q.slug, q.title, q.description, c.name,
         (select count(*) from public.questions qq where qq.quiz_id = q.id),
         q.starts_at, q.ends_at
  from public.quizzes q
  left join public.quiz_categories c on c.id = q.category_id
  where q.status = 'published' and q.is_public
    and (q.ends_at is null or q.ends_at > now())
  order by q.published_at desc nulls last
  limit 30;
$$;
grant execute on function public.list_public_quizzes() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- join_quiz
-- ---------------------------------------------------------------------------
create or replace function public.join_quiz(p_slug text, p_name text, p_pin text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_quiz public.quizzes;
  v_session public.quiz_sessions;
  v_existing public.participants;
  v_name text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  v_attempt integer;
  v_count integer;
  v_order uuid[];
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  perform public.check_rate_limit('join:' || v_uid::text, 10, 60);

  select * into v_quiz from public.quizzes where slug = p_slug and status = 'published';
  if not found then
    raise exception 'quiz_not_found' using errcode = 'P0001';
  end if;

  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception 'invalid_name' using errcode = 'P0001';
  end if;

  select * into v_session from public.quiz_sessions
  where quiz_id = v_quiz.id and phase <> 'ended'
  order by created_at desc limit 1;

  -- Resume an attempt that is still running.
  select * into v_existing from public.participants
  where quiz_id = v_quiz.id and user_id = v_uid and status = 'in_progress'
    and (
      (v_session.id is not null and session_id = v_session.id)
      or (v_session.id is null and session_id is null)
    )
  order by started_at desc limit 1;
  if found then
    return v_existing.id;
  end if;

  if v_quiz.pin_hash is not null then
    perform public.check_rate_limit('pin:' || v_uid::text || ':' || v_quiz.id::text, 8, 300);
    if p_pin is null or extensions.crypt(p_pin, v_quiz.pin_hash) <> v_quiz.pin_hash then
      raise exception 'invalid_pin' using errcode = 'P0001';
    end if;
  end if;

  if v_session.id is null then
    if v_quiz.starts_at is not null and now() < v_quiz.starts_at then
      raise exception 'quiz_not_started' using errcode = 'P0001';
    end if;
    if v_quiz.ends_at is not null and now() > v_quiz.ends_at then
      raise exception 'quiz_ended' using errcode = 'P0001';
    end if;
  elsif exists (
    select 1 from public.participants where session_id = v_session.id and user_id = v_uid
  ) then
    select id into v_id from public.participants where session_id = v_session.id and user_id = v_uid;
    return v_id;
  end if;

  -- serialise joins of this quiz so max_participants can't be overshot
  perform pg_advisory_xact_lock(hashtext('join:' || v_quiz.id::text));

  select coalesce(max(attempt_no), 0) into v_attempt
  from public.participants where quiz_id = v_quiz.id and user_id = v_uid;
  if v_attempt > 0 and v_session.id is null and not v_quiz.allow_multiple_attempts then
    raise exception 'already_completed' using errcode = 'P0001';
  end if;

  if v_quiz.max_participants is not null then
    select count(*) into v_count from public.participants
    where quiz_id = v_quiz.id
      and (
        (v_session.id is not null and session_id = v_session.id)
        or (v_session.id is null and session_id is null)
      );
    if v_count >= v_quiz.max_participants then
      raise exception 'quiz_full' using errcode = 'P0001';
    end if;
  end if;

  if v_session.id is not null then
    v_order := v_session.question_order;
  else
    select coalesce(array_agg(id order by ord), '{}') into v_order
    from (
      select id,
             case when v_quiz.shuffle_questions then random() else position::double precision end as ord
      from public.questions
      where quiz_id = v_quiz.id
      order by ord, created_at
      limit coalesce(v_quiz.question_count, 100000)
    ) s;
  end if;

  if cardinality(v_order) = 0 then
    raise exception 'quiz_empty' using errcode = 'P0001';
  end if;

  insert into public.participants (quiz_id, session_id, user_id, display_name, attempt_no, question_order)
  values (v_quiz.id, v_session.id, v_uid, v_name, v_attempt + 1, v_order)
  returning id into v_id;

  return v_id;
end;
$$;
revoke execute on function public.join_quiz(text, text, text) from public, anon;
grant execute on function public.join_quiz(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- get_participant_state — the single source of truth for the player UI.
-- Also starts the server timer for the current question and records a
-- timed-out answer once the limit (+ grace) has passed.
-- ---------------------------------------------------------------------------
create or replace function public.get_participant_state(p_participant_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_p public.participants;
  v_quiz public.quizzes;
  v_s public.quiz_sessions;
  v_total integer;
  v_qid uuid;
  v_q public.questions;
  v_answered boolean;
  v_deadline timestamptz;
  v_started timestamptz;
  v_seed text;
  v_lb jsonb;
begin
  select * into v_p from public.participants
  where id = p_participant_id and user_id = auth.uid()
  for update;
  if not found then
    raise exception 'participant_not_found' using errcode = 'P0001';
  end if;
  select * into v_quiz from public.quizzes where id = v_p.quiz_id;
  v_seed := case when v_quiz.shuffle_options then v_p.id::text end;

  -- ------------------------------------------------------------- live mode
  if v_p.session_id is not null then
    select * into v_s from public.quiz_sessions where id = v_p.session_id;
    v_total := coalesce(array_length(v_s.question_order, 1), 0);

    if v_s.phase = 'ended' or v_p.status = 'completed' then
      if v_p.status <> 'completed' then
        perform public._finalize_participant(v_p.id);
      end if;
      return jsonb_build_object(
        'status', 'completed', 'mode', 'live', 'participant_id', v_p.id,
        'quiz_slug', v_quiz.slug, 'server_now', now()
      );
    end if;

    if v_s.phase = 'lobby' or v_s.current_question_id is null then
      return jsonb_build_object(
        'status', 'in_progress', 'mode', 'live', 'phase', 'lobby',
        'participant_id', v_p.id, 'display_name', v_p.display_name,
        'session_id', v_s.id, 'quiz_title', v_quiz.title,
        'index', 0, 'total', v_total, 'score', v_p.score,
        'participants_count', (select count(*) from public.participants where session_id = v_s.id),
        'server_now', now()
      );
    end if;

    v_answered := exists (
      select 1 from public.participant_answers
      where participant_id = v_p.id and question_id = v_s.current_question_id
    );

    if v_s.phase = 'leaderboard' then
      select coalesce(jsonb_agg(row_to_json(t) order by t.rank, t.display_name), '[]'::jsonb) into v_lb
      from (
        select rank() over (order by score desc, total_time_ms asc) as rank,
               display_name, score, correct_count, id = v_p.id as is_me
        from public.participants where session_id = v_s.id
        order by score desc, total_time_ms asc
        limit 10
      ) t;
    end if;

    return jsonb_build_object(
      'status', 'in_progress', 'mode', 'live', 'phase', v_s.phase,
      'participant_id', v_p.id, 'display_name', v_p.display_name,
      'session_id', v_s.id, 'quiz_title', v_quiz.title,
      'index', v_s.current_index, 'total', v_total, 'score', v_p.score,
      'question', public._question_public(v_s.current_question_id, v_seed),
      'question_started_at', v_s.question_started_at,
      'answered', v_answered,
      'feedback', case
        when v_answered or v_s.phase <> 'question'
        then public._answer_feedback(v_p.id, v_s.current_question_id, v_s.phase <> 'question')
      end,
      'leaderboard', v_lb,
      'my_rank', case when v_s.phase in ('leaderboard', 'reveal') then public._participant_rank(v_p.id) end,
      'server_now', now()
    );
  end if;

  -- ------------------------------------------------------- self-paced mode
  v_total := coalesce(array_length(v_p.question_order, 1), 0);
  v_deadline := case when v_quiz.duration_seconds is not null
    then v_p.started_at + make_interval(secs => v_quiz.duration_seconds) end;

  if v_p.status = 'in_progress' and (
       v_p.current_index >= v_total
       or (v_deadline is not null and now() > v_deadline + interval '2 seconds')
       or (v_quiz.ends_at is not null and now() > v_quiz.ends_at + interval '2 seconds')
     ) then
    perform public._finalize_participant(v_p.id);
    v_p.status := 'completed';
  end if;

  if v_p.status = 'completed' then
    return jsonb_build_object(
      'status', 'completed', 'mode', 'self', 'participant_id', v_p.id,
      'quiz_slug', v_quiz.slug, 'server_now', now()
    );
  end if;

  v_qid := v_p.question_order[v_p.current_index + 1];
  select * into v_q from public.questions where id = v_qid;
  if not found then
    -- question was deleted by the admin mid-attempt: skip it
    update public.participants
       set current_index = current_index + 1, current_question_started_at = null
     where id = v_p.id;
    return public.get_participant_state(p_participant_id);
  end if;

  v_answered := exists (
    select 1 from public.participant_answers where participant_id = v_p.id and question_id = v_qid
  );

  v_started := v_p.current_question_started_at;
  if not v_answered and v_started is null then
    v_started := now();
    update public.participants set current_question_started_at = v_started where id = v_p.id;
  end if;

  -- time is up → record a timed-out (zero) answer
  if not v_answered and v_q.time_limit_seconds is not null
     and now() > v_started + make_interval(secs => v_q.time_limit_seconds + 2) then
    perform public._record_answer(v_p, v_quiz, v_qid, v_started, v_deadline, null, null, true);
    v_answered := true;
    select * into v_p from public.participants where id = v_p.id;
  end if;

  return jsonb_build_object(
    'status', 'in_progress', 'mode', 'self',
    'participant_id', v_p.id, 'display_name', v_p.display_name,
    'quiz_title', v_quiz.title, 'quiz_slug', v_quiz.slug,
    'index', v_p.current_index, 'total', v_total, 'score', v_p.score,
    'question', public._question_public(v_qid, v_seed),
    'question_started_at', v_started,
    'quiz_deadline', v_deadline,
    'answered', v_answered,
    'feedback', case when v_answered
      then public._answer_feedback(v_p.id, v_qid, v_quiz.show_correct_immediately) end,
    'server_now', now()
  );
end;
$$;
revoke execute on function public.get_participant_state(uuid) from public, anon;
grant execute on function public.get_participant_state(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- submit_answer — idempotent; the unique constraint guarantees one row.
-- Client-provided correctness / scores / timings do not exist as inputs.
-- ---------------------------------------------------------------------------
create or replace function public.submit_answer(
  p_participant_id uuid,
  p_question_id uuid,
  p_option_ids uuid[] default '{}',
  p_text text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_p public.participants;
  v_quiz public.quizzes;
  v_s public.quiz_sessions;
  v_deadline timestamptz;
begin
  -- row lock serialises concurrent submits from the same participant
  select * into v_p from public.participants
  where id = p_participant_id and user_id = auth.uid()
  for update;
  if not found then
    raise exception 'participant_not_found' using errcode = 'P0001';
  end if;
  perform public.check_rate_limit('submit:' || auth.uid()::text, 30, 10);

  if v_p.status = 'completed' then
    raise exception 'attempt_finished' using errcode = 'P0001';
  end if;
  select * into v_quiz from public.quizzes where id = v_p.quiz_id;

  if v_p.session_id is not null then
    select * into v_s from public.quiz_sessions where id = v_p.session_id;
    if v_s.phase <> 'question' or v_s.current_question_id is distinct from p_question_id then
      -- too late (host revealed) or wrong question: ignore and return state
      return public.get_participant_state(p_participant_id);
    end if;
    perform public._record_answer(
      v_p, v_quiz, p_question_id, v_s.question_started_at, null, p_option_ids, p_text, false
    );
    return public.get_participant_state(p_participant_id);
  end if;

  if v_p.question_order[v_p.current_index + 1] is distinct from p_question_id then
    raise exception 'not_current_question' using errcode = 'P0001';
  end if;

  v_deadline := case when v_quiz.duration_seconds is not null
    then v_p.started_at + make_interval(secs => v_quiz.duration_seconds) end;
  if v_quiz.ends_at is not null and (v_deadline is null or v_quiz.ends_at < v_deadline) then
    v_deadline := v_quiz.ends_at;
  end if;

  perform public._record_answer(
    v_p, v_quiz, p_question_id, v_p.current_question_started_at, v_deadline,
    p_option_ids, p_text, false
  );
  return public.get_participant_state(p_participant_id);
end;
$$;
revoke execute on function public.submit_answer(uuid, uuid, uuid[], text) from public, anon;
grant execute on function public.submit_answer(uuid, uuid, uuid[], text) to authenticated;

-- ---------------------------------------------------------------------------
-- advance_participant — move to the next question (self-paced only).
-- ---------------------------------------------------------------------------
create or replace function public.advance_participant(p_participant_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_p public.participants;
  v_qid uuid;
begin
  -- make sure a timed-out answer gets recorded first
  perform public.get_participant_state(p_participant_id);

  select * into v_p from public.participants
  where id = p_participant_id and user_id = auth.uid()
  for update;
  if not found then
    raise exception 'participant_not_found' using errcode = 'P0001';
  end if;

  if v_p.session_id is not null or v_p.status = 'completed' then
    return public.get_participant_state(p_participant_id);
  end if;

  v_qid := v_p.question_order[v_p.current_index + 1];
  if v_qid is not null and not exists (
    select 1 from public.participant_answers where participant_id = v_p.id and question_id = v_qid
  ) then
    raise exception 'answer_required' using errcode = 'P0001';
  end if;

  update public.participants
     set current_index = current_index + 1,
         current_question_started_at = null
   where id = v_p.id;

  return public.get_participant_state(p_participant_id);
end;
$$;
revoke execute on function public.advance_participant(uuid) from public, anon;
grant execute on function public.advance_participant(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- get_participant_result — final result + full review (only once finished)
-- ---------------------------------------------------------------------------
create or replace function public.get_participant_result(p_participant_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_p public.participants;
  v_quiz public.quizzes;
  v_total integer;
  v_order uuid[];
begin
  select * into v_p from public.participants
  where id = p_participant_id and user_id = auth.uid();
  if not found then
    raise exception 'participant_not_found' using errcode = 'P0001';
  end if;
  if v_p.status <> 'completed' then
    raise exception 'attempt_not_finished' using errcode = 'P0001';
  end if;
  select * into v_quiz from public.quizzes where id = v_p.quiz_id;

  if v_p.session_id is not null then
    select question_order into v_order from public.quiz_sessions where id = v_p.session_id;
  else
    v_order := v_p.question_order;
  end if;
  v_total := coalesce(array_length(v_order, 1), 0);

  return jsonb_build_object(
    'participant_id', v_p.id,
    'display_name', v_p.display_name,
    'quiz_title', v_quiz.title,
    'quiz_slug', v_quiz.slug,
    'allow_multiple_attempts', v_quiz.allow_multiple_attempts and v_p.session_id is null,
    'score', v_p.score,
    'correct_count', v_p.correct_count,
    'total_questions', v_total,
    'accuracy', case when v_total > 0 then round(v_p.correct_count * 100.0 / v_total, 1) else 0 end,
    'total_time_ms', v_p.total_time_ms,
    'duration_ms', floor(extract(epoch from (coalesce(v_p.finished_at, now()) - v_p.started_at)) * 1000),
    'rank', public._participant_rank(v_p.id),
    'review', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'index', o.ord,
          'question', public._question_public(o.qid, null),
          'feedback', public._answer_feedback(v_p.id, o.qid, true)
        ) order by o.ord
      )
      from unnest(v_order) with ordinality as o(qid, ord)
      where exists (select 1 from public.questions where id = o.qid)
    ), '[]'::jsonb)
  );
end;
$$;
revoke execute on function public.get_participant_result(uuid) from public, anon;
grant execute on function public.get_participant_result(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Public leaderboard (final, self-paced: best attempt per user;
-- live: everybody in the session). Standard competition ranking.
-- ---------------------------------------------------------------------------
create or replace function public.get_leaderboard(p_slug text, p_session_id uuid default null, p_limit integer default 100)
returns table (
  rank bigint,
  display_name text,
  correct_count integer,
  total_questions integer,
  score integer,
  accuracy numeric,
  total_time_ms bigint,
  is_me boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with quiz as (
    select id from public.quizzes where slug = p_slug and status in ('published', 'archived')
  ),
  pool as (
    select distinct on (p.user_id)
           p.id, p.user_id, p.display_name, p.correct_count, p.score, p.total_time_ms,
           coalesce(array_length(coalesce(s.question_order, p.question_order), 1), 0) as total_questions
    from public.participants p
    join quiz on quiz.id = p.quiz_id
    left join public.quiz_sessions s on s.id = p.session_id
    where (
      (p_session_id is not null and p.session_id = p_session_id)
      or (p_session_id is null and p.session_id is null and p.status = 'completed')
    )
    order by p.user_id, p.score desc, p.total_time_ms asc
  )
  select rank() over (order by score desc, total_time_ms asc),
         display_name, correct_count, total_questions, score,
         case when total_questions > 0 then round(correct_count * 100.0 / total_questions, 1) else 0 end,
         total_time_ms,
         user_id = auth.uid()
  from pool
  order by score desc, total_time_ms asc, display_name
  limit least(greatest(p_limit, 1), 500);
$$;
grant execute on function public.get_leaderboard(text, uuid, integer) to anon, authenticated;
