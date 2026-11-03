-- ILIM QUIZ — auth helpers, profile trigger and row level security

-- ---------------------------------------------------------------------------
-- Role helpers (SECURITY DEFINER so they can read profiles under RLS)
-- ---------------------------------------------------------------------------
create or replace function public.current_role_name()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'super_admin'
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('super_admin', 'creator')
  );
$$;

create or replace function public.owns_quiz(p_quiz_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.quizzes q
    join public.profiles p on p.id = auth.uid()
    where q.id = p_quiz_id
      and (
        p.role = 'super_admin'
        or (p.role = 'creator' and q.owner_id = auth.uid())
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- Profile creation for non-anonymous users.
-- The role comes from app_metadata (only settable with the service role),
-- otherwise the account stays "pending" until a super admin approves it.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role := 'pending';
  v_meta text := new.raw_app_meta_data ->> 'role';
begin
  if coalesce(new.is_anonymous, false) then
    return new;
  end if;
  if v_meta in ('super_admin', 'creator') then
    v_role := v_meta::public.user_role;
  end if;
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    v_role
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- An anonymous participant that later links an email still never becomes staff
-- automatically: the profile is created as "pending".
create or replace function public.handle_user_upgraded()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(old.is_anonymous, false) and not coalesce(new.is_anonymous, false) then
    insert into public.profiles (id, email, role)
    values (new.id, new.email, 'pending')
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_upgraded
  after update of is_anonymous on auth.users
  for each row execute function public.handle_user_upgraded();

-- Super admin role management
create or replace function public.set_user_role(p_user_id uuid, p_role public.user_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_super_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() and p_role <> 'super_admin' then
    raise exception 'cannot_demote_self' using errcode = 'P0001';
  end if;
  update public.profiles set role = p_role where id = p_user_id;
end;
$$;

-- Bootstrap helper for the SQL editor (not callable by API users)
create or replace function public.promote_super_admin(p_email text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles set role = 'super_admin' where lower(email) = lower(p_email);
$$;
revoke execute on function public.promote_super_admin(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.quiz_categories enable row level security;
alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.answer_options enable row level security;
alter table public.quiz_sessions enable row level security;
alter table public.participants enable row level security;
alter table public.participant_answers enable row level security;
alter table public.quiz_results enable row level security;
alter table public.rate_limits enable row level security;

-- profiles: read self, super admin reads all. Only full_name is user-editable.
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_super_admin());
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from anon, authenticated;
grant update (full_name) on public.profiles to authenticated;
revoke insert, delete on public.profiles from anon, authenticated;

-- categories: staff read and create; edit/delete own (super admin: all)
create policy categories_select on public.quiz_categories for select to authenticated
  using (public.is_staff());
create policy categories_insert on public.quiz_categories for insert to authenticated
  with check (public.is_staff() and created_by = auth.uid());
create policy categories_update on public.quiz_categories for update to authenticated
  using (public.is_super_admin() or (public.is_staff() and created_by = auth.uid()))
  with check (public.is_super_admin() or (public.is_staff() and created_by = auth.uid()));
create policy categories_delete on public.quiz_categories for delete to authenticated
  using (public.is_super_admin() or (public.is_staff() and created_by = auth.uid()));

-- quizzes: owner (creator) or super admin. Checked on the row itself (not via
-- owns_quiz(id)) so INSERT ... RETURNING can see the freshly inserted row.
create policy quizzes_select on public.quizzes for select to authenticated
  using (public.is_super_admin() or (owner_id = auth.uid() and public.is_staff()));
create policy quizzes_insert on public.quizzes for insert to authenticated
  with check (public.is_staff() and owner_id = auth.uid());
create policy quizzes_update on public.quizzes for update to authenticated
  using (public.is_super_admin() or (owner_id = auth.uid() and public.is_staff()))
  with check (public.is_super_admin() or (public.is_staff() and owner_id = auth.uid()));
create policy quizzes_delete on public.quizzes for delete to authenticated
  using (public.is_super_admin() or (owner_id = auth.uid() and public.is_staff()));

-- questions / options: only through the owning quiz
create policy questions_all on public.questions for all to authenticated
  using (public.owns_quiz(quiz_id))
  with check (public.owns_quiz(quiz_id));

create policy answer_options_all on public.answer_options for all to authenticated
  using (exists (
    select 1 from public.questions q where q.id = question_id and public.owns_quiz(q.quiz_id)
  ))
  with check (exists (
    select 1 from public.questions q where q.id = question_id and public.owns_quiz(q.quiz_id)
  ));

-- sessions: owners manage; participants of the session may read the row
-- (needed for Realtime). The row holds no secrets.
create or replace function public.is_session_participant(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.participants
    where session_id = p_session_id and user_id = auth.uid()
  );
$$;

create policy sessions_owner on public.quiz_sessions for all to authenticated
  using (public.owns_quiz(quiz_id))
  with check (public.owns_quiz(quiz_id) and host_id = auth.uid());
create policy sessions_participant_select on public.quiz_sessions for select to authenticated
  using (public.is_session_participant(id));

-- participants: owners read/delete; participants read their own rows.
-- Writes only happen through SECURITY DEFINER RPCs.
create policy participants_owner_select on public.participants for select to authenticated
  using (public.owns_quiz(quiz_id));
create policy participants_self_select on public.participants for select to authenticated
  using (user_id = auth.uid());
create policy participants_owner_delete on public.participants for delete to authenticated
  using (public.owns_quiz(quiz_id));

create policy answers_owner_select on public.participant_answers for select to authenticated
  using (public.owns_quiz(quiz_id));

create policy results_owner_select on public.quiz_results for select to authenticated
  using (public.owns_quiz(quiz_id));
create policy results_owner_delete on public.quiz_results for delete to authenticated
  using (public.owns_quiz(quiz_id));

-- rate_limits: no policies → no client access

-- Defence in depth: anon role gets nothing on tables directly.
revoke all on all tables in schema public from anon;
revoke insert, update on public.participants, public.participant_answers, public.quiz_results
  from authenticated;
