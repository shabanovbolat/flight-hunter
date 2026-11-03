-- ILIM QUIZ — atomic question save / reorder / duplicate.
-- SECURITY INVOKER: RLS (owns_quiz) is enforced on every statement.

create or replace function public.save_question(p_question_id uuid, p_payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid := p_question_id;
  v_quiz uuid := (p_payload ->> 'quiz_id')::uuid;
  v_type public.question_type := (p_payload ->> 'type')::public.question_type;
  v_keep uuid[] := '{}';
  v_opt jsonb;
  v_pos integer := 0;
  v_opt_id uuid;
begin
  if not public.owns_quiz(v_quiz) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_id is null then
    insert into public.questions (quiz_id, position, type, text)
    values (
      v_quiz,
      coalesce((select max(position) + 1 from public.questions where quiz_id = v_quiz), 1),
      v_type,
      p_payload ->> 'text'
    )
    returning id into v_id;
  elsif not exists (select 1 from public.questions where id = v_id and quiz_id = v_quiz) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.questions set
    type = v_type,
    text = p_payload ->> 'text',
    arabic_text = p_payload ->> 'arabic_text',
    image_path = p_payload ->> 'image_path',
    points = coalesce((p_payload ->> 'points')::integer, 1),
    time_limit_seconds = (p_payload ->> 'time_limit_seconds')::integer,
    explanation = p_payload ->> 'explanation',
    accepted_answers = case when v_type = 'text'
      then coalesce(array(select jsonb_array_elements_text(p_payload -> 'accepted_answers')), '{}')
      else '{}' end,
    arabic_original = p_payload ->> 'arabic_original',
    kazakh_translation = p_payload ->> 'kazakh_translation',
    reference_type = (p_payload ->> 'reference_type')::public.reference_type,
    book_name = p_payload ->> 'book_name',
    chapter = p_payload ->> 'chapter',
    reference_number = p_payload ->> 'reference_number',
    source_attribution = p_payload ->> 'source_attribution',
    extra_explanation = p_payload ->> 'extra_explanation'
  where id = v_id;

  if v_type <> 'text' then
    for v_opt in select * from jsonb_array_elements(coalesce(p_payload -> 'options', '[]'::jsonb))
    loop
      v_pos := v_pos + 1;
      v_opt_id := nullif(v_opt ->> 'id', '')::uuid;
      if v_opt_id is not null and exists (
        select 1 from public.answer_options where id = v_opt_id and question_id = v_id
      ) then
        update public.answer_options set
          position = v_pos,
          text = v_opt ->> 'text',
          arabic_text = nullif(v_opt ->> 'arabic_text', ''),
          is_correct = coalesce((v_opt ->> 'is_correct')::boolean, false)
        where id = v_opt_id;
      else
        insert into public.answer_options (question_id, position, text, arabic_text, is_correct)
        values (
          v_id, v_pos, v_opt ->> 'text', nullif(v_opt ->> 'arabic_text', ''),
          coalesce((v_opt ->> 'is_correct')::boolean, false)
        )
        returning id into v_opt_id;
      end if;
      v_keep := v_keep || v_opt_id;
    end loop;
  end if;

  delete from public.answer_options where question_id = v_id and not (id = any (v_keep));
  return v_id;
end;
$$;
grant execute on function public.save_question(uuid, jsonb) to authenticated;

create or replace function public.move_question(p_question_id uuid, p_direction integer)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_q public.questions;
  v_other public.questions;
begin
  select * into v_q from public.questions where id = p_question_id;
  if not found then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  -- normalise positions first so swaps are well-defined
  update public.questions q set position = s.rn
  from (
    select id, row_number() over (order by position, created_at) as rn
    from public.questions where quiz_id = v_q.quiz_id
  ) s
  where q.id = s.id and q.position is distinct from s.rn;
  select * into v_q from public.questions where id = p_question_id;

  select * into v_other from public.questions
  where quiz_id = v_q.quiz_id
    and position = v_q.position + case when p_direction < 0 then -1 else 1 end;
  if found then
    update public.questions set position = v_other.position where id = v_q.id;
    update public.questions set position = v_q.position where id = v_other.id;
  end if;
end;
$$;
grant execute on function public.move_question(uuid, integer) to authenticated;

create or replace function public.duplicate_question(p_question_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_new uuid;
begin
  insert into public.questions (
    quiz_id, position, type, text, arabic_text, image_path, points, time_limit_seconds,
    explanation, accepted_answers, arabic_original, kazakh_translation, reference_type,
    book_name, chapter, reference_number, source_attribution, extra_explanation
  )
  select quiz_id,
         (select max(position) + 1 from public.questions x where x.quiz_id = q.quiz_id),
         type, text, arabic_text, image_path, points, time_limit_seconds,
         explanation, accepted_answers, arabic_original, kazakh_translation, reference_type,
         book_name, chapter, reference_number, source_attribution, extra_explanation
  from public.questions q where id = p_question_id
  returning id into v_new;
  if v_new is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  insert into public.answer_options (question_id, position, text, arabic_text, is_correct)
  select v_new, position, text, arabic_text, is_correct
  from public.answer_options where question_id = p_question_id;
  return v_new;
end;
$$;
grant execute on function public.duplicate_question(uuid) to authenticated;
