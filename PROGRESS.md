# ILIM QUIZ — Progress

## Phase 1 — Architecture plan

### Stack
Next.js 15 (App Router, RSC, Server Actions) · TypeScript strict · Tailwind v4 +
hand-written shadcn-style components (registry is unreachable from the build
sandbox) · Supabase (Postgres, Auth, Realtime, Storage) via `@supabase/ssr` ·
`qrcode` · `xlsx` · Zod.

### Folder structure
```
app/
  page.tsx                     marketing / entry page
  login/                       admin email login
  admin/                       admin area (sidebar layout, auth-guarded)
    page.tsx                   Басты бет (dashboard)
    quizzes/                   Викториналар (list, new, [id] edit, questions,
                               share/QR, poster, live host, results, export)
    questions/                 Сұрақтар базасы (question bank across own quizzes)
    participants/              Қатысушылар
    results/                   Нәтижелер (quiz history)
    statistics/                Статистика
    settings/                  Баптаулар (profile, categories, creators)
  q/[slug]/                    participant flow (+ /leaderboard)
  api/                         route handlers: QR PNG, CSV/XLSX export
components/ui/                 Button, Card, Input, Badge, ... (shadcn-style)
components/admin/              sidebar, forms, tables
components/quiz/               participant player, live player, leaderboard
lib/i18n/kk.ts                 every UI string (Kazakh)
lib/supabase/                  server, browser, admin (service role, server-only)
lib/validation/                Zod schemas
lib/scoring/                   text-answer normalisation (mirrors SQL)
supabase/migrations/           schema, RLS, RPCs, realtime, storage
supabase/seed.sql              demo admin + neutral demo quiz
```

### Data model
profiles · quiz_categories · quizzes · questions · answer_options ·
quiz_sessions · participants · participant_answers · quiz_results ·
rate_limits (helper).

### Security model
* Participants use Supabase **anonymous sign-in** → real `auth.uid()`.
* Participants have **no SELECT** on `questions` / `answer_options`.
  Everything participant-facing goes through `SECURITY DEFINER` RPCs
  (`join_quiz`, `get_participant_state`, `submit_answer`, `advance_participant`,
  `get_leaderboard`) that never return `is_correct` / accepted answers /
  explanations for a question the caller hasn't answered.
* Scoring and timing in Postgres only (`now()` vs `question_started_at`,
  +2 s grace). Unique `(participant_id, question_id)` blocks double submits.
* RLS on every table; creators see only rows of quizzes they own; super_admin
  sees all. Profiles are only created for non-anonymous users. New sign-ups
  are `pending` unless the account was created by a super admin (role is read
  from `app_metadata`, which users can't edit) or it's the very first account.
* PIN stored as bcrypt hash (`pgcrypto crypt()`).
* Rate limiting: `rate_limits` table + `check_rate_limit()` in join/submit.
* Service role key only in `lib/supabase/admin.ts` (`server-only`).

### Live mode
`quiz_sessions` row holds phase (`lobby|question|reveal|leaderboard|ended`),
current question and `question_started_at`. Host changes it via RPCs;
participants subscribe to `postgres_changes` on that row and re-fetch their
state through the RPC (plus a slow polling fallback). Timers use server time
(RPC returns `server_now`, client computes clock offset).

## Phase 2 — Database, RLS, clients, types ✅
* Done: 5 migrations (schema, auth+RLS, participant RPCs, live/admin/storage,
  admin stats), `seed.sql` (local demo admin + creator, neutral demo quiz),
  `supabase/tests/db_test.sql` (40 assertions: RLS isolation, no answer
  leaks, double-submit, all-or-nothing, text normalisation, timeouts, live
  sync), server/browser/service-role clients, generated `database.types.ts`.
* Known issues: SheetJS CDN is blocked in the sandbox, so `xlsx@0.18.5` from
  npm is used (only for *writing* files; the known CVEs affect parsing).

## Phase 3 — Auth + admin layout + dashboard ✅
* Done: email login (Server Action + Zod), middleware session refresh and
  `/admin` guard, role-aware `requireStaff()`, Kazakh sidebar (mobile drawer),
  dashboard cards (quizzes, participants, active, completed, average score,
  recent activity) via `admin_dashboard_stats()` (security invoker → RLS).
* Remaining: quiz/question CRUD (Phase 4).

## Phase 4 — Quiz + question CRUD ✅
* Done: quiz list/create/edit (all settings incl. PIN → bcrypt via
  `set_quiz_pin`, cover upload to Storage, slug generator, local→UTC date
  handling), publish/unpublish/archive/delete, question editor for all four
  types with Arabic RTL inputs, option editor, accepted answers, optional
  Islamic reference block (shown verbatim), reorder/duplicate/delete,
  question bank with search + type filter. Question + options are saved
  atomically by `save_question()` (security invoker → RLS applies).
