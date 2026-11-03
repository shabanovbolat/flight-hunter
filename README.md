# ILIM QUIZ

QR-based quiz platform for Islamic knowledge competitions (madrasas, mosques,
community events) — and any other topic. Participants scan a QR code and play
in the phone browser with no registration; admins build quizzes, run them
self-paced or live on a projector, and export the results.

All UI text is Kazakh (`lib/i18n/kk.ts`). Arabic is shown right-to-left
(`dir="rtl" lang="ar"`, Amiri font) exactly as entered, with harakat intact.

**Stack:** Next.js 15 (App Router, Server Components, Server Actions) ·
TypeScript strict · Tailwind CSS v4 + shadcn-style components · Supabase
(Postgres, Auth, Realtime, Storage) via `@supabase/ssr` · Zod · `qrcode` ·
`xlsx`.

---

## Project structure

```
app/
  page.tsx                         home: public quiz list
  login/                           admin email login
  admin/                           admin area (auth-guarded, Kazakh sidebar)
    page.tsx                       Басты бет — dashboard
    quizzes/                       Викториналар
      new/                         create quiz
      [id]/                        questions list (+ publish/archive/delete)
        settings/                  quiz settings
        questions/new|[qid]/       question editor
        share/                     QR, link, PNG download, poster link
        qr.png/route.ts            QR PNG (RLS-checked)
        poster/                    A4 printable poster
        live/                      live host screen
        results/                   results table + exports
        export/route.ts            CSV (UTF-8 BOM) / XLSX
    questions/                     Сұрақтар базасы — question bank
    participants/                  Қатысушылар
    results/                       Нәтижелер — quiz history
    statistics/                    Статистика
    settings/                      Баптаулар — profile, categories, creators
  q/[slug]/                        participant flow
  q/[slug]/leaderboard/            public final leaderboard
components/
  ui/                              Button, Card, Input, Dialog, Switch, …
  admin/                           sidebar, forms, host screen, tables
  quiz/                            landing, self-paced + live players, result
lib/
  i18n/kk.ts                       every UI string
  supabase/                        server / browser / admin (service role) clients, generated types
  actions/                         Server Actions (all validated with Zod)
  validation/schemas.ts            Zod schemas
  scoring/normalize.ts             text-answer normalisation (mirror of SQL)
  ranking.ts                       standard competition ranking
  qr.ts, export.ts, results.ts     QR, CSV/XLSX, results loading
middleware.ts                      session refresh + /admin guard
supabase/
  migrations/                      schema, RLS, RPCs, realtime, storage
  seed.sql                         LOCAL demo data (never run in production)
  tests/db_test.sql                DB tests (RLS, scoring, leaks, live)
tests/
  e2e/{participant,admin,live}.mjs Playwright end-to-end tests
  load/live-300.mjs                300-participant live load test
```

## Migrations

| File | Contents |
| --- | --- |
| `20261103000001_schema.sql` | Enums, tables (`profiles`, `quiz_categories`, `quizzes`, `questions`, `answer_options`, `quiz_sessions`, `participants`, `participant_answers`, `quiz_results`, `rate_limits`), FKs, indexes, unique constraints |
| `20261103000002_auth_rls.sql` | Role helpers, profile trigger (anonymous users get no profile; role only from `app_metadata`), RLS on every table, `set_user_role`, `promote_super_admin` |
| `20261103000003_participant_rpc.sql` | Rate limiting, `normalize_answer`, `get_public_quiz`, `list_public_quizzes`, `join_quiz`, `get_participant_state`, `submit_answer`, `advance_participant`, `get_participant_result`, `get_leaderboard` |
| `20261103000004_live_admin.sql` | `set_quiz_pin` (bcrypt), live host RPCs (`host_open_session`, `host_control`, `host_session_state`), Realtime publication, `quiz-media` storage bucket + policies |
| `20261103000005_admin_stats.sql` | Dashboard, results overview and per-quiz statistics (security invoker → RLS) |
| `20261103000006_question_save.sql` | Atomic `save_question`, `move_question`, `duplicate_question` |

## How the security rules are enforced

* **No early answers.** Participants have no `SELECT` on `questions`,
  `answer_options` or `quizzes`. They only call `SECURITY DEFINER` RPCs that
  return a question without `is_correct`, accepted answers or explanations;
  feedback is only built for a question the caller already answered (in live
  mode only after the host reveals). Realtime carries only the session row
  (phase, question id, start time) — never answers.
* **Server-side scoring and timing.** The client sends only option ids or
  text. Correctness, points and time are computed in Postgres from
  `question_started_at` (set by the server when the question is first served)
  with a 2-second grace; late answers score 0, and an expired question is
  recorded as timed out on the next state fetch.
* **One answer per question.** `unique (participant_id, question_id)` plus a
  row lock on the participant; submit buttons also lock on the first tap.
* **Isolation between creators.** RLS on every table; creators see only their
  own quizzes and everything under them, super admins see all.
* **Anonymous participants** use Supabase anonymous sign-in, so every
  participant has a real `auth.uid()`.
* **Rate limiting** in Postgres: join 10/min per user, PIN 8 per 5 min per user
  and quiz, submit 30 per 10 s per user.
* **PIN** stored as bcrypt (`pgcrypto`). The service role key is only used in
  `lib/supabase/admin.ts` (`server-only`) to create creator accounts.

## Environment variables

Copy `.env.example` to `.env.local`:

| Variable | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | creating creator accounts in Баптаулар |
| `NEXT_PUBLIC_SITE_URL` | client + server | base URL printed in QR codes (e.g. `https://quiz.example.kz`) |
| `NEXT_PUBLIC_TIMEZONE` | optional | date display, default `Asia/Almaty` |

## Local development

Requirements: Node 20+, Docker, Supabase CLI (`npm i -g supabase`).

```bash
npm install
supabase start                 # prints API URL + anon/service keys
cp .env.example .env.local     # paste the keys from `supabase status`
supabase db reset              # applies migrations + seed.sql
npm run dev                    # http://localhost:3000
```

Local demo accounts (from `seed.sql`, **local only**):

* `admin@ilim.local` / `ilimquiz123` — super admin
* `creator@ilim.local` / `ilimquiz123` — creator (for RLS tests)

Demo quiz: http://localhost:3000/q/demo-quiz (neutral general knowledge, no
religious content).

To test on a phone on the same Wi-Fi, run `npm run dev -- -H 0.0.0.0`, set
`NEXT_PUBLIC_SITE_URL=http://<your-LAN-IP>:3000`, and expose Supabase on the LAN
too (or use a Supabase cloud project).

### Scripts

```bash
npm run build && npm run lint && npm run typecheck
npm test                 # unit tests (normalisation, ranking)
npm run test:db          # SQL tests against local Supabase (rolled back)
npm run db:types         # regenerate lib/supabase/database.types.ts

# end-to-end (needs `npm run build && npm start` on :3000 and local Supabase)
node tests/e2e/participant.mjs
node tests/e2e/admin.mjs
node tests/e2e/live.mjs

# load test: 300 participants in one live session (talks to Supabase directly)
SUPABASE_ANON_KEY=… N=300 node tests/load/live-300.mjs
```

The e2e tests use the globally installed Playwright (`require("playwright")`).

## Deployment

### 1. Supabase (cloud)

1. Create a project (choose a region close to your users, e.g. Frankfurt).
2. **Authentication → Sign In / Providers:** enable *Email* and **enable
   *Anonymous sign-ins***. Keep "Allow new users to sign up" **on** (anonymous
   sign-in needs it); new email sign-ups become `pending` and can't access
   anything until a super admin approves them.
3. **Authentication → Rate Limits:** raise *anonymous sign-ins per hour*
   (default 30 per IP). At an event, hundreds of phones share one Wi-Fi IP —
   set it to at least the expected audience size (e.g. 1000).
4. **Authentication → URL Configuration:** set *Site URL* to your domain.
5. Push the schema (do **not** push `seed.sql` to production):
   ```bash
   supabase login
   supabase link --project-ref <ref>
   supabase db push
   ```
6. Create the first super admin: **Authentication → Users → Add user** (email +
   password, auto-confirm), then in the SQL editor:
   ```sql
   select public.promote_super_admin('you@example.kz');
   ```
   Further creators are created from **Баптаулар → Пайдаланушылар** in the app.
7. **Realtime capacity:** each live participant holds one Realtime
   connection. The Free plan allows 200 concurrent connections; **for ~300
   phones use Pro (500)** or higher. Participants over the limit keep
   working through the built-in 3-second polling fallback, just with slightly
   slower updates.

### 2. Vercel

1. Import the Git repository in Vercel (framework preset: Next.js).
2. Add the environment variables from the table above (Production +
   Preview). Mark `SUPABASE_SERVICE_ROLE_KEY` as server-only (never prefix it
   with `NEXT_PUBLIC_`).
3. Deploy, then set `NEXT_PUBLIC_SITE_URL` to the final domain and redeploy so
   QR codes point to it.
4. Add the domain to Supabase *Site URL* (step 4 above).

### Housekeeping (optional)

Anonymous users accumulate; to remove old ones that never joined anything:

```sql
delete from auth.users u
where u.is_anonymous and u.created_at < now() - interval '30 days'
  and not exists (select 1 from public.participants p where p.user_id = u.id);
```

## Testing checklist

Verified on 2026-11-03 against local Supabase + a production build.

| # | Check | Status | How |
| --- | --- | --- | --- |
| 1 | Admin creates a quiz, adds all 4 question types, publishes, gets QR | ✅ Pass | `tests/e2e/admin.mjs` (create, single/multiple/true-false/text, publish, SVG QR, PNG download, A4 poster to PDF) |
| 2 | Participant on a phone scans, joins, finishes, sees result and rank | ✅ Pass | `tests/e2e/participant.mjs` (iPhone 13 emulation), `admin.mjs` (PIN quiz) |
| 3 | Network responses never reveal a correct answer early | ✅ Pass | per-question check of every response before each submit in `participant.mjs` (detector verified to fire after answering); SQL tests on RPC payloads; live mode hides correctness until reveal |
| 4 | Double-tapping submit creates only one answer row | ✅ Pass | `participant.mjs` double-clicks every submit → exactly 5 rows; SQL test submits twice → 1 row, score once |
| 5 | A creator cannot read or edit another creator's quiz (RLS) | ✅ Pass | `db_test.sql` (select/update/insert-as-other/role escalation/host foreign quiz) and `admin.mjs` (page + export blocked) |
| 6 | Live mode: 2+ browser windows stay in sync through a full quiz | ✅ Pass | `tests/e2e/live.mjs`: host + 2 phones, 5 questions, reveal + leaderboard each round, reloads in lobby and mid-question, Realtime connection asserted |
| 7 | Arabic with harakat renders RTL; Kazakh letters render everywhere | ✅ Pass | `admin.mjs` checks `dir="rtl"` + harakat text; screenshots reviewed; Arabic text answer matched without harakat; Inter `cyrillic-ext` covers Ә Ғ Қ Ң Ө Ұ Ү Һ І |
| 8 | CSV opens in Excel with correct Kazakh characters | ✅ Pass (automated) | `admin.mjs` asserts UTF-8 BOM + Kazakh header/name; XLSX read back. Not opened in a real Excel install in this environment |
| — | 300 concurrent participants (live) | ✅ Pass with note | `tests/load/live-300.mjs`: 300/300 answers recorded every round, DB time ≈2.4 ms per call. Realtime capped at 200 connections on the local stack (= Supabase Free); the rest use polling → use Supabase Pro for 300 |
| — | Text answer normalisation, ranking 1-1-3 | ✅ Pass | `npm test`, `db_test.sql` |

## Known issues / notes

* **Next.js version:** pinned to `15.5.28` (the patched 15.x line). In
  production builds its client router sometimes drops the refresh that
  follows a server action, so admin mutations reload the page or do a full
  navigation after success. Participant and host screens don't rely on it.
* **`xlsx`:** the SheetJS CDN build couldn't be fetched from the build
  sandbox, so the npm `xlsx@0.18.5` is used. Its advisories concern *parsing*
  untrusted files; the app only *writes* XLSX. Swap to
  `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` when possible.
* The Next image optimizer is disabled (`images.unoptimized`); images are
  served straight from Supabase Storage.
* Speed bonus (optional per quiz): up to +50% of the question's points,
  proportional to the time left; only for questions with a time limit.
