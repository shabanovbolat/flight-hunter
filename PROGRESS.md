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

## Phase 5 — Participant flow ✅
* Done: `/q/[slug]` landing (name, PIN, schedule/full/empty states),
  anonymous sign-in inside the join Server Action, one-question-at-a-time
  player (progress bar, "3 / 10", server-timed countdowns, big tap targets,
  sticky submit that locks on first tap), feedback (correct/incorrect,
  correct answer, explanation, reference verbatim), resume on refresh,
  result (score, accuracy, time, rank, top-10, answer review), public
  leaderboard page, offline banner.
* Tests: `tests/e2e/participant.mjs` (mobile Playwright): per-question
  network leak check, refresh-resume, double-tap → exactly one row each.

## Phase 6 — QR, PNG, poster ✅
* Done: share page (inline SVG QR, link + copy/open), PNG download route
  (`/admin/quizzes/[id]/qr.png`, RLS-checked, 1200px), A4 print poster
  (`@page A4`, logo, title, large QR, «QR-кодты сканерлеп, викторинаға
  қатысыңыз!»).

## Phase 7 — Live mode ✅
* Done: host screen (lobby with big QR + live joined count, start, per-question
  server-timed countdown, live answered count, reveal with per-option
  distribution, leaderboard between questions, end → final podium, new
  session, fullscreen). Participants follow `quiz_sessions` through Realtime
  `postgres_changes` (no answers on the wire — every event triggers a
  per-participant RPC refetch with 0–500 ms jitter) + polling fallback
  (3 s disconnected / 15 s connected) + refetch on visibility/online.
  Join routes into live automatically if a session opened after page load.
* Tests: `tests/e2e/live.mjs` — host + 2 phones, full 5-question quiz,
  reloads in lobby and mid-question, Realtime connection asserted.

## Phase 8 — Leaderboards, statistics, exports ✅
* Done: per-quiz results (filter: all / self-paced / each live session),
  standard competition ranking (`lib/ranking.ts`, unit-tested 1,1,3),
  medals, delete participant, public final leaderboard, results overview
  (quiz history), participants page, statistics (participants, completion
  rate, average score, correct/incorrect ratio, hardest questions, most
  common wrong answers incl. normalised text answers, per-question rate),
  CSV (UTF-8 BOM, formula-injection safe) and XLSX (results + questions
  sheets). Settings: profile, password, categories, super-admin creator
  management (service role, server-only) and role changes.

## Phase 9 — Test pass ✅ (see README checklist)
Bugs found and fixed:
* RLS: `INSERT … RETURNING` on quizzes failed (policy looked the row up by id
  through a STABLE function that can't see the new row) → policies check
  `owner_id` directly; DB test added.
* Next 15.5.x production client router intermittently aborts the refresh /
  navigation that follows a server action (not in dev; 15.4.11 is fine but
  has critical advisories, so 15.5.28 is pinned). Admin mutations now
  reload / hard-navigate after success; participant and host screens never
  depended on the router. Admin submit buttons stay disabled until hydrated.
* Unlinked labels in the question reference section (a11y) fixed.
* Arabic free-text answers now render with `dir="auto"`.
* Security hardening: image optimizer disabled (no sharp), security headers,
  postcss override; `xlsx` advisory remains (write-only usage).

## Phase 10 — Deployment guide ✅
* README: structure, migrations, security model, env vars, local dev,
  Supabase cloud + Vercel steps (anonymous sign-ins, anonymous rate limit
  for shared Wi-Fi, first super admin, Realtime plan sizing), checklist.
* Load test (`tests/load/live-300.mjs`): 300 participants, 3 live rounds →
  300/300 answers stored each round, ~2.4 ms DB time per RPC. Realtime is
  capped at 200 connections on the local stack / Supabase Free; the client's
  polling fallback covers the rest. Recommend Supabase Pro for 300+.

### Remaining / known issues
* Next 15.5 soft-router bug worked around with reloads in admin.
* `xlsx` npm advisory (write-only use).
* CSV verified programmatically (BOM + UTF-8), not in a real Excel install.
