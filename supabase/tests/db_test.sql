-- ILIM QUIZ — database tests (run: npm run test:db). Everything is rolled back.
\set ON_ERROR_STOP 1
begin;

create or replace function pg_temp.as_user(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
end $$;

create or replace function pg_temp.as_postgres() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

create or replace function pg_temp.assert(p_ok boolean, p_msg text) returns void language plpgsql as $$
begin
  if not coalesce(p_ok, false) then raise exception 'TEST FAILED: %', p_msg; end if;
  raise notice 'ok - %', p_msg;
end $$;

-- anonymous participants
insert into auth.users (instance_id, id, aud, role, is_anonymous, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-4000-8000-000000000001', 'authenticated', 'authenticated', true, now(), now()),
       ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-0000-4000-8000-000000000002', 'authenticated', 'authenticated', true, now(), now());

select pg_temp.assert(
  not exists (select 1 from public.profiles where id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  'anonymous users get no profile');

-- ------------------------------------------------------------------ RLS
-- creator creates own quiz
select pg_temp.as_user('22222222-2222-4222-8222-222222222222');
insert into public.quizzes (id, owner_id, slug, title) values
  ('55555555-5555-4555-8555-555555555555', '22222222-2222-4222-8222-222222222222', 'creator-quiz', 'Creator quiz');
do $$ declare v uuid; begin
  insert into public.quizzes (owner_id, slug, title)
  values ('22222222-2222-4222-8222-222222222222', 'creator-quiz-2', 'Second') returning id into v;
  perform pg_temp.assert(v is not null, 'creator insert ... returning works under RLS');
end $$;
select pg_temp.assert(
  (select count(*) from public.quizzes where slug = 'demo-quiz') = 0,
  'creator cannot read another creator''s quiz');
update public.quizzes set title = 'hacked' where slug = 'demo-quiz';
select pg_temp.assert(
  (select count(*) from public.questions where quiz_id = '44444444-4444-4444-8444-444444444444') = 0,
  'creator cannot read another creator''s questions');
do $$ begin
  insert into public.quizzes (owner_id, slug, title) values ('11111111-1111-4111-8111-111111111111', 'spoof-x', 'x');
  raise exception 'TEST FAILED: creator inserted quiz for someone else';
exception when insufficient_privilege then raise notice 'ok - creator cannot insert quiz owned by others';
end $$;
do $$ begin
  update public.profiles set role = 'super_admin' where id = auth.uid();
  raise exception 'TEST FAILED: creator escalated own role';
exception when insufficient_privilege then raise notice 'ok - creator cannot change own role';
end $$;
select pg_temp.as_postgres();
select pg_temp.assert(
  (select title from public.quizzes where slug = 'demo-quiz') <> 'hacked',
  'creator cannot update another creator''s quiz');

-- super admin sees everything
select pg_temp.as_user('11111111-1111-4111-8111-111111111111');
select pg_temp.assert((select count(*) from public.quizzes) >= 2, 'super admin sees all quizzes');

-- participants cannot read questions/options directly
select pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000001');
select pg_temp.assert((select count(*) from public.questions) = 0, 'participant cannot select questions');
select pg_temp.assert((select count(*) from public.answer_options) = 0, 'participant cannot select options');
select pg_temp.assert((select count(*) from public.quizzes) = 0, 'participant cannot select quizzes');

-- ------------------------------------------------------- participant flow
select pg_temp.assert(public.get_public_quiz('demo-quiz') ->> 'title' is not null, 'public quiz info');
select pg_temp.assert(public.get_public_quiz('demo-quiz')::text not like '%is_correct%', 'public info has no correctness');

create temp table t_ctx (pid uuid, state jsonb);
grant all on t_ctx to authenticated;
insert into t_ctx (pid) select public.join_quiz('demo-quiz', '  Тест   Қатысушы ', null);
select pg_temp.assert(
  public.join_quiz('demo-quiz', 'Тест', null) = (select pid from t_ctx),
  'joining again resumes the same attempt');

update t_ctx set state = public.get_participant_state(pid);
select pg_temp.assert((select state ->> 'total' from t_ctx) = '5', 'state has 5 questions');
select pg_temp.assert((select state::text from t_ctx) not like '%is_correct%', 'unanswered state leaks no is_correct');
select pg_temp.assert((select state::text from t_ctx) not like '%explanation%', 'unanswered state leaks no explanation');
select pg_temp.assert((select state::text from t_ctx) not like '%accepted_answers%', 'unanswered state leaks no accepted answers');

-- answer Q1 (single) correctly — look up the right option as postgres
select pg_temp.as_postgres();
create temp table t_q as
  select q.id, q.position, q.type,
         array(select o.id from public.answer_options o where o.question_id = q.id and o.is_correct) as correct,
         array(select o.id from public.answer_options o where o.question_id = q.id and not o.is_correct) as wrong
  from public.questions q where q.quiz_id = '44444444-4444-4444-8444-444444444444';
grant all on t_q to authenticated;
select pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000001');

create temp table t_submits (r jsonb);
grant all on t_submits to authenticated;
-- double submit: second call must not create a second row or double score
insert into t_submits
select public.submit_answer(t.pid, (s.state -> 'question' ->> 'id')::uuid,
         (select correct from t_q where id = (s.state -> 'question' ->> 'id')::uuid), null)
from t_ctx t, t_ctx s;
insert into t_submits
select public.submit_answer(t.pid, (t.state -> 'question' ->> 'id')::uuid,
         (select wrong from t_q where id = (t.state -> 'question' ->> 'id')::uuid), null)
from t_ctx t;
select pg_temp.as_postgres();
select pg_temp.assert(
  (select count(*) from public.participant_answers where participant_id = (select pid from t_ctx)) = 1,
  'double submit stores exactly one answer');
select pg_temp.assert(
  (select score from public.participants where id = (select pid from t_ctx)) = 1,
  'score counted once, answer not changeable');
select pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000001');
select pg_temp.assert((select (r -> 'feedback' ->> 'is_correct')::boolean from t_submits limit 1), 'feedback after submit says correct');

-- cannot skip without answering: advance then try advancing twice
update t_ctx set state = public.advance_participant(pid);
do $$ begin
  perform public.advance_participant((select pid from t_ctx));
  raise exception 'TEST FAILED: advanced without answering';
exception when sqlstate 'P0001' then
  if sqlerrm <> 'answer_required' then raise; end if;
  raise notice 'ok - cannot advance without answering';
end $$;

-- answer remaining questions: multiple wrong subset, true/false right, text with normalisation
do $$
declare v_state jsonb; v_pid uuid; v_qid uuid; v_type text; i int;
begin
  select pid into v_pid from t_ctx;
  for i in 1..4 loop
    v_state := public.get_participant_state(v_pid);
    exit when v_state ->> 'status' = 'completed';
    v_qid := (v_state -> 'question' ->> 'id')::uuid;
    v_type := v_state -> 'question' ->> 'type';
    if v_type = 'multiple' then
      -- only one of the two correct options → all-or-nothing → 0
      perform public.submit_answer(v_pid, v_qid, (select correct[1:1] from t_q where id = v_qid), null);
    elsif v_type = 'text' then
      perform public.submit_answer(v_pid, v_qid, '{}', '  ЖЕТІ ');
    else
      perform public.submit_answer(v_pid, v_qid, (select correct from t_q where id = v_qid), null);
    end if;
    v_state := public.advance_participant(v_pid);
  end loop;
  perform pg_temp.assert(v_state ->> 'status' = 'completed', 'attempt completes after last question');
end $$;

select pg_temp.as_postgres();
select pg_temp.assert(
  (select is_correct from public.participant_answers a join t_q on t_q.id = a.question_id
   where t_q.type = 'multiple' and a.participant_id = (select pid from t_ctx)) = false,
  'multiple choice is all-or-nothing');
select pg_temp.assert(
  (select is_correct from public.participant_answers a join t_q on t_q.id = a.question_id
   where t_q.type = 'text' and a.participant_id = (select pid from t_ctx)),
  'text answer normalised (case/space)');
select pg_temp.assert(
  (select score from public.quiz_results where participant_id = (select pid from t_ctx)) = 4,
  'final score = 1 + 0 + 1 + 1 + 1 = 4');
select pg_temp.assert(
  public.normalize_answer('بِسْمِ   ٱللَّهِ') = public.normalize_answer('بسم الله'),
  'arabic normalisation strips harakat and unifies alef');

-- second attempt blocked (multiple attempts off)
select pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000001');
do $$ begin
  perform public.join_quiz('demo-quiz', 'Тест', null);
  raise exception 'TEST FAILED: second attempt allowed';
exception when sqlstate 'P0001' then
  if sqlerrm <> 'already_completed' then raise; end if;
  raise notice 'ok - second attempt blocked';
end $$;

-- the other participant cannot read this participant's state
select pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000002');
do $$ begin
  perform public.get_participant_state((select pid from t_ctx));
  raise exception 'TEST FAILED: read other participant state';
exception when sqlstate 'P0001' then raise notice 'ok - cannot read other participant state';
end $$;

-- late answers score zero (simulate timer started long ago)
insert into t_ctx (pid) select public.join_quiz('demo-quiz', 'Кешіккен', null);
select public.get_participant_state((select id from public.participants where user_id = auth.uid())) is not null;
select pg_temp.as_postgres();
update public.participants set current_question_started_at = now() - interval '10 minutes'
 where user_id = 'aaaaaaaa-0000-4000-8000-000000000002';
select pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000002');
do $$
declare v_pid uuid; v_state jsonb;
begin
  select id into v_pid from public.participants where user_id = auth.uid();
  v_state := public.get_participant_state(v_pid);
  perform pg_temp.assert((v_state -> 'feedback' ->> 'timed_out')::boolean, 'expired question recorded as timed out');
  perform pg_temp.assert((v_state ->> 'score')::int = 0, 'timed out answer scores 0');
end $$;

-- leaderboard ranking (1,1,3)
select pg_temp.as_postgres();
select pg_temp.assert(
  (select count(*) from public.get_leaderboard('demo-quiz')) >= 1, 'leaderboard returns rows');

-- ------------------------------------------------------------- live mode
select pg_temp.as_user('11111111-1111-4111-8111-111111111111');
create temp table t_live (sid uuid);
grant all on t_live to authenticated;
insert into t_live select public.host_open_session('44444444-4444-4444-8444-444444444444');

select pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000001');
create temp table t_lp (pid uuid);
grant all on t_lp to authenticated;
insert into t_lp select public.join_quiz('demo-quiz', 'Live user', null);
select pg_temp.assert((public.get_participant_state((select pid from t_lp)) ->> 'phase') = 'lobby', 'live participant waits in lobby');
select pg_temp.assert((select count(*) from public.quiz_sessions) = 1, 'participant can read own session row (realtime)');

select pg_temp.as_user('11111111-1111-4111-8111-111111111111');
select public.host_control((select sid from t_live), 'next');

select pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000001');
do $$
declare v_state jsonb; v_qid uuid;
begin
  v_state := public.get_participant_state((select pid from t_lp));
  perform pg_temp.assert(v_state ->> 'phase' = 'question', 'live participant follows to question');
  perform pg_temp.assert(v_state::text not like '%is_correct%', 'live question leaks no correctness');
  v_qid := (v_state -> 'question' ->> 'id')::uuid;
  v_state := public.submit_answer((select pid from t_lp), v_qid, (select correct from t_q where id = v_qid), null);
  perform pg_temp.assert(v_state -> 'feedback' ->> 'is_correct' is null, 'live: correctness hidden until reveal');
end $$;

select pg_temp.as_user('11111111-1111-4111-8111-111111111111');
select pg_temp.assert((public.host_session_state((select sid from t_live)) ->> 'answered_count')::int = 1, 'host sees answer count');
select public.host_control((select sid from t_live), 'reveal');
select pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000001');
select pg_temp.assert(
  (public.get_participant_state((select pid from t_lp)) -> 'feedback' ->> 'is_correct')::boolean,
  'live: correctness shown after reveal');
select pg_temp.as_user('11111111-1111-4111-8111-111111111111');
select public.host_control((select sid from t_live), 'end');
select pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000001');
select pg_temp.assert((public.get_participant_state((select pid from t_lp)) ->> 'status') = 'completed', 'live: ended session completes participant');

-- creator cannot host another creator's quiz
select pg_temp.as_user('22222222-2222-4222-8222-222222222222');
do $$ begin
  perform public.host_open_session('44444444-4444-4444-8444-444444444444');
  raise exception 'TEST FAILED: creator hosted foreign quiz';
exception when insufficient_privilege then raise notice 'ok - creator cannot host foreign quiz';
end $$;

select pg_temp.as_postgres();
\echo 'ALL DB TESTS PASSED'
rollback;
