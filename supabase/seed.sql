-- ILIM QUIZ — local development seed.
-- Demo accounts (LOCAL ONLY — never run against production):
--   admin@ilim.local   / ilimquiz123  (super_admin)
--   creator@ilim.local / ilimquiz123  (creator, used for RLS tests)
-- The demo quiz is neutral general knowledge with no religious references.

do $$
declare
  v_admin uuid := '11111111-1111-4111-8111-111111111111';
  v_creator uuid := '22222222-2222-4222-8222-222222222222';
  v_cat uuid := '33333333-3333-4333-8333-333333333333';
  v_quiz uuid := '44444444-4444-4444-8444-444444444444';
  v_q uuid;
  r record;
begin
  for r in
    select * from (values
      (v_admin, 'admin@ilim.local', 'super_admin', 'Демо әкімші'),
      (v_creator, 'creator@ilim.local', 'creator', 'Демо автор')
    ) as t(id, email, role, name)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', r.id, 'authenticated', 'authenticated',
      r.email, extensions.crypt('ilimquiz123', extensions.gen_salt('bf')), now(),
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email'), 'role', r.role),
      jsonb_build_object('full_name', r.name), now(), now(), '', '', '', ''
    ) on conflict (id) do nothing;

    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), r.id, r.id::text,
      jsonb_build_object('sub', r.id::text, 'email', r.email, 'email_verified', true),
      'email', now(), now(), now()
    ) on conflict do nothing;
  end loop;

  insert into public.quiz_categories (id, name, created_by)
  values (v_cat, 'Жалпы білім', v_admin)
  on conflict do nothing;

  insert into public.quizzes (
    id, owner_id, category_id, slug, title, description, status, published_at,
    shuffle_options, show_correct_immediately, is_public
  ) values (
    v_quiz, v_admin, v_cat, 'demo-quiz', 'Демо викторина: жалпы білім',
    'Платформаны сынауға арналған қысқа викторина.', 'published', now(),
    true, true, true
  ) on conflict do nothing;

  -- 1. single choice
  insert into public.questions (quiz_id, position, type, text, points, time_limit_seconds, explanation)
  values (v_quiz, 1, 'single', 'Қазақстанның астанасы қай қала?', 1, 30,
          '1997 жылдан бері елдің астанасы — Астана.')
  returning id into v_q;
  insert into public.answer_options (question_id, position, text, is_correct) values
    (v_q, 1, 'Алматы', false), (v_q, 2, 'Астана', true),
    (v_q, 3, 'Шымкент', false), (v_q, 4, 'Қарағанды', false);

  -- 2. multiple choice
  insert into public.questions (quiz_id, position, type, text, points, time_limit_seconds, explanation)
  values (v_quiz, 2, 'multiple', 'Төмендегілердің қайсысы — Күн жүйесінің планеталары?', 2, 40,
          'Марс пен Шолпан — планеталар. Ай — Жердің серігі, Күн — жұлдыз.')
  returning id into v_q;
  insert into public.answer_options (question_id, position, text, is_correct) values
    (v_q, 1, 'Марс', true), (v_q, 2, 'Шолпан', true),
    (v_q, 3, 'Ай', false), (v_q, 4, 'Күн', false);

  -- 3. true / false
  insert into public.questions (quiz_id, position, type, text, points, time_limit_seconds, explanation)
  values (v_quiz, 3, 'true_false', 'Қалыпты атмосфералық қысымда су 100 °C-та қайнайды.', 1, 20,
          'Теңіз деңгейінде судың қайнау температурасы шамамен 100 °C.')
  returning id into v_q;
  insert into public.answer_options (question_id, position, text, is_correct) values
    (v_q, 1, 'Ақиқат', true), (v_q, 2, 'Жалған', false);

  -- 4. text answer
  insert into public.questions (quiz_id, position, type, text, points, time_limit_seconds, explanation, accepted_answers)
  values (v_quiz, 4, 'text', 'Бір аптада неше күн бар? (санмен немесе сөзбен жазыңыз)', 1, 30,
          'Аптада 7 күн бар.', array['7', 'жеті'])
  returning id into v_q;

  -- 5. single choice with an Arabic word (language example, not religious)
  insert into public.questions (quiz_id, position, type, text, arabic_text, points, time_limit_seconds, explanation)
  values (v_quiz, 5, 'single', 'Араб тіліндегі мына сөздің мағынасы қандай?', 'كِتَابٌ', 1, 30,
          '«كِتَابٌ» (китәбун) — «кітап» деген сөз.')
  returning id into v_q;
  insert into public.answer_options (question_id, position, text, is_correct) values
    (v_q, 1, 'Кітап', true), (v_q, 2, 'Қалам', false),
    (v_q, 3, 'Үй', false), (v_q, 4, 'Су', false);
end $$;
