-- ILIM QUIZ — admin helpers, live mode, realtime and storage

-- ---------------------------------------------------------------------------
-- PIN (bcrypt via pgcrypto). Owners only.
-- ---------------------------------------------------------------------------
create or replace function public.set_quiz_pin(p_quiz_id uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.owns_quiz(p_quiz_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_pin is not null and p_pin !~ '^[0-9]{4,8}$' then
    raise exception 'invalid_pin_format' using errcode = 'P0001';
  end if;
  update public.quizzes
     set pin_hash = case when p_pin is null then null
                         else extensions.crypt(p_pin, extensions.gen_salt('bf', 10)) end
   where id = p_quiz_id;
end;
$$;
revoke execute on function public.set_quiz_pin(uuid, text) from public, anon;
grant execute on function public.set_quiz_pin(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Live host controls
-- ---------------------------------------------------------------------------
create or replace function public.host_open_session(p_quiz_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quiz public.quizzes;
  v_id uuid;
  v_order uuid[];
begin
  if not public.owns_quiz(p_quiz_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_quiz from public.quizzes where id = p_quiz_id;
  if v_quiz.status <> 'published' then
    raise exception 'quiz_not_published' using errcode = 'P0001';
  end if;

  select id into v_id from public.quiz_sessions
  where quiz_id = p_quiz_id and phase <> 'ended' limit 1;
  if v_id is not null then
    return v_id;
  end if;

  select coalesce(array_agg(id order by ord), '{}') into v_order
  from (
    select id,
           case when v_quiz.shuffle_questions then random() else position::double precision end as ord
    from public.questions where quiz_id = p_quiz_id
    order by ord, created_at
    limit coalesce(v_quiz.question_count, 100000)
  ) s;
  if cardinality(v_order) = 0 then
    raise exception 'quiz_empty' using errcode = 'P0001';
  end if;

  insert into public.quiz_sessions (quiz_id, host_id, question_order)
  values (p_quiz_id, auth.uid(), v_order)
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.host_open_session(uuid) from public, anon;
grant execute on function public.host_open_session(uuid) to authenticated;

-- p_action: next | reveal | leaderboard | end
create or replace function public.host_control(p_session_id uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_s public.quiz_sessions;
  v_next integer;
  v_pid uuid;
begin
  select * into v_s from public.quiz_sessions where id = p_session_id for update;
  if not found or not public.owns_quiz(v_s.quiz_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if v_s.phase = 'ended' then
    raise exception 'session_ended' using errcode = 'P0001';
  end if;

  if p_action = 'next' then
    v_next := v_s.current_index + 1;
    if v_next >= coalesce(array_length(v_s.question_order, 1), 0) then
      p_action := 'end';
    else
      update public.quiz_sessions
         set phase = 'question',
             current_index = v_next,
             current_question_id = v_s.question_order[v_next + 1],
             question_started_at = now()
       where id = p_session_id;
      return;
    end if;
  end if;

  if p_action = 'reveal' then
    if v_s.phase <> 'question' then
      raise exception 'invalid_phase' using errcode = 'P0001';
    end if;
    update public.quiz_sessions set phase = 'reveal' where id = p_session_id;
  elsif p_action = 'leaderboard' then
    if v_s.phase not in ('reveal', 'question') then
      raise exception 'invalid_phase' using errcode = 'P0001';
    end if;
    update public.quiz_sessions set phase = 'leaderboard' where id = p_session_id;
  elsif p_action = 'end' then
    update public.quiz_sessions
       set phase = 'ended', ended_at = now()
     where id = p_session_id;
    for v_pid in
      select id from public.participants where session_id = p_session_id and status = 'in_progress'
    loop
      perform public._finalize_participant(v_pid);
    end loop;
  else
    raise exception 'invalid_action' using errcode = 'P0001';
  end if;
end;
$$;
revoke execute on function public.host_control(uuid, text) from public, anon;
grant execute on function public.host_control(uuid, text) to authenticated;

-- Host screen data: counts, current question with answers (host owns it),
-- live answer distribution and leaderboard.
create or replace function public.host_session_state(p_session_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_s public.quiz_sessions;
  v_quiz public.quizzes;
begin
  select * into v_s from public.quiz_sessions where id = p_session_id;
  if not found or not public.owns_quiz(v_s.quiz_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_quiz from public.quizzes where id = v_s.quiz_id;

  return jsonb_build_object(
    'session', to_jsonb(v_s),
    'quiz', jsonb_build_object('id', v_quiz.id, 'title', v_quiz.title, 'slug', v_quiz.slug),
    'total', coalesce(array_length(v_s.question_order, 1), 0),
    'participants_count', (select count(*) from public.participants where session_id = v_s.id),
    'answered_count', (
      select count(*) from public.participant_answers a
      join public.participants p on p.id = a.participant_id
      where p.session_id = v_s.id and a.question_id = v_s.current_question_id
    ),
    'question', case when v_s.current_question_id is null then null else (
      select jsonb_build_object(
        'id', q.id, 'type', q.type, 'text', q.text, 'arabic_text', q.arabic_text,
        'image_path', q.image_path, 'points', q.points,
        'time_limit_seconds', q.time_limit_seconds,
        'accepted_answers', q.accepted_answers,
        'explanation', q.explanation,
        'options', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', o.id, 'text', o.text, 'arabic_text', o.arabic_text,
            'is_correct', o.is_correct,
            'count', (
              select count(*) from public.participant_answers a
              join public.participants p on p.id = a.participant_id
              where p.session_id = v_s.id and a.question_id = q.id
                and o.id = any (a.selected_option_ids)
            )
          ) order by o.position)
          from public.answer_options o where o.question_id = q.id
        ), '[]'::jsonb),
        'correct_count', (
          select count(*) from public.participant_answers a
          join public.participants p on p.id = a.participant_id
          where p.session_id = v_s.id and a.question_id = q.id and a.is_correct
        )
      )
      from public.questions q where q.id = v_s.current_question_id
    ) end,
    'leaderboard', coalesce((
      select jsonb_agg(row_to_json(t) order by t.rank, t.display_name)
      from (
        select rank() over (order by score desc, total_time_ms asc) as rank,
               display_name, score, correct_count, total_time_ms
        from public.participants where session_id = v_s.id
        order by score desc, total_time_ms asc
        limit 10
      ) t
    ), '[]'::jsonb),
    'server_now', now()
  );
end;
$$;
revoke execute on function public.host_session_state(uuid) from public, anon;
grant execute on function public.host_session_state(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: participants follow quiz_sessions row changes
-- ---------------------------------------------------------------------------
alter table public.quiz_sessions replica identity full;
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.quiz_sessions;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Storage: public-read media bucket; staff upload into their own folder
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('quiz-media', 'quiz-media', true, 5242880,
        array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "quiz media staff insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'quiz-media'
    and public.is_staff()
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "quiz media staff update" on storage.objects for update to authenticated
  using (
    bucket_id = 'quiz-media'
    and public.is_staff()
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "quiz media staff delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'quiz-media'
    and (
      public.is_super_admin()
      or (public.is_staff() and (storage.foldername(name))[1] = auth.uid()::text)
    )
  );
