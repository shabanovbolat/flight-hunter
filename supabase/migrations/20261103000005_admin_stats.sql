-- ILIM QUIZ — admin statistics. SECURITY INVOKER: RLS limits every query to
-- the quizzes the caller owns (or everything for a super admin).

create or replace function public.admin_dashboard_stats()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'total_quizzes', (select count(*) from public.quizzes),
    'total_participants', (select count(*) from public.participants),
    'active_quizzes', (
      select count(*) from public.quizzes q
      where q.status = 'published'
        and (q.starts_at is null or q.starts_at <= now())
        and (q.ends_at is null or q.ends_at > now())
    ),
    'completed_quizzes', (
      select count(*) from public.quizzes q
      where q.status = 'archived' or (q.status = 'published' and q.ends_at is not null and q.ends_at <= now())
    ),
    'average_score', (select round(avg(score)::numeric, 1) from public.quiz_results),
    'average_accuracy', (select round(avg(accuracy)::numeric, 1) from public.quiz_results),
    'recent', coalesce((
      select jsonb_agg(row_to_json(t))
      from (
        select p.id, p.display_name, p.status, p.score, p.started_at, p.finished_at,
               q.title as quiz_title, q.id as quiz_id
        from public.participants p
        join public.quizzes q on q.id = p.quiz_id
        order by greatest(p.started_at, coalesce(p.finished_at, p.started_at)) desc
        limit 8
      ) t
    ), '[]'::jsonb)
  );
$$;
grant execute on function public.admin_dashboard_stats() to authenticated;

create or replace function public.admin_results_overview()
returns table (
  quiz_id uuid,
  title text,
  slug text,
  status public.quiz_status,
  participants bigint,
  completed bigint,
  average_score numeric,
  last_activity timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select q.id, q.title, q.slug, q.status,
         count(p.id),
         count(p.id) filter (where p.status = 'completed'),
         round(avg(p.score) filter (where p.status = 'completed'), 1),
         max(coalesce(p.finished_at, p.started_at))
  from public.quizzes q
  left join public.participants p on p.quiz_id = q.id
  group by q.id
  order by max(coalesce(p.finished_at, p.started_at)) desc nulls last, q.created_at desc;
$$;
grant execute on function public.admin_results_overview() to authenticated;

create or replace function public.admin_quiz_statistics(p_quiz_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with quiz as (
    select * from public.quizzes where id = p_quiz_id
  ),
  parts as (
    select p.* from public.participants p join quiz on quiz.id = p.quiz_id
  ),
  answers as (
    select a.* from public.participant_answers a join quiz on quiz.id = a.quiz_id
  ),
  per_question as (
    select q.id, q.position, q.text, q.type,
           count(a.id) as answers,
           count(a.id) filter (where a.is_correct) as correct,
           case when count(a.id) > 0
             then round(count(a.id) filter (where a.is_correct) * 100.0 / count(a.id), 1)
           end as correct_rate
    from public.questions q
    join quiz on quiz.id = q.quiz_id
    left join answers a on a.question_id = q.id
    group by q.id
  ),
  wrong_options as (
    select a.question_id, o.text as answer, count(*) as cnt
    from answers a
    join public.answer_options o on o.id = any (a.selected_option_ids)
    where not a.is_correct and not o.is_correct
    group by a.question_id, o.text
    union all
    select a.question_id, public.normalize_answer(a.text_answer), count(*)
    from answers a
    where not a.is_correct and a.text_answer is not null and btrim(a.text_answer) <> ''
    group by a.question_id, public.normalize_answer(a.text_answer)
  )
  select case when not exists (select 1 from quiz) then null else jsonb_build_object(
    'total_participants', (select count(*) from parts),
    'completed', (select count(*) from parts where status = 'completed'),
    'completion_rate', (
      select case when count(*) > 0
        then round(count(*) filter (where status = 'completed') * 100.0 / count(*), 1) end
      from parts
    ),
    'average_score', (select round(avg(score)::numeric, 1) from parts where status = 'completed'),
    'average_accuracy', (
      select round(avg(accuracy)::numeric, 1) from public.quiz_results r join quiz on quiz.id = r.quiz_id
    ),
    'correct_answers', (select count(*) from answers where is_correct),
    'incorrect_answers', (select count(*) from answers where not is_correct),
    'questions', coalesce((
      select jsonb_agg(row_to_json(pq) order by pq.position, pq.text) from per_question pq
    ), '[]'::jsonb),
    'hardest', coalesce((
      select jsonb_agg(row_to_json(h))
      from (
        select * from per_question where answers > 0
        order by correct_rate asc, answers desc
        limit 5
      ) h
    ), '[]'::jsonb),
    'common_wrong', coalesce((
      select jsonb_agg(row_to_json(w))
      from (
        select w.question_id, q.text as question, w.answer, w.cnt
        from wrong_options w
        join public.questions q on q.id = w.question_id
        order by w.cnt desc
        limit 10
      ) w
    ), '[]'::jsonb)
  ) end;
$$;
grant execute on function public.admin_quiz_statistics(uuid) to authenticated;
