// Load test: N anonymous participants in one live session (default 300).
// Each has its own Supabase client + Realtime socket, follows the session row,
// refetches state through the RPC on every change and submits an answer.
// Usage: N=300 SUPABASE_URL=… SUPABASE_ANON_KEY=… node tests/load/live-300.mjs
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const KEY = process.env.SUPABASE_ANON_KEY;
const N = Number(process.env.N ?? 300);
const QUIZ = "44444444-4444-4444-8444-444444444444";
if (!KEY) throw new Error("SUPABASE_ANON_KEY required");

const pct = (arr, p) => {
  const s = [...arr].sort((a, b) => a - b);
  return s.length ? Math.round(s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]) : NaN;
};
const stats = (name, arr) => console.log(`${name.padEnd(28)} n=${arr.length} p50=${pct(arr, 50)}ms p95=${pct(arr, 95)}ms max=${pct(arr, 100)}ms`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const opts = { auth: { persistSession: false, autoRefreshToken: false } };

// host
const host = createClient(URL, KEY, opts);
const { error: le } = await host.auth.signInWithPassword({ email: "admin@ilim.local", password: "ilimquiz123" });
if (le) throw le;
const { data: sessionId, error: se } = await host.rpc("host_open_session", { p_quiz_id: QUIZ });
if (se) throw se;
console.log(`session ${sessionId}, ${N} participants`);

// participants: sign in + join in batches
const players = [];
const errors = {};
const err = (k) => (errors[k] = (errors[k] ?? 0) + 1);
const joinMs = [];
for (let b = 0; b < N; b += 50) {
  await Promise.all(
    Array.from({ length: Math.min(50, N - b) }, async (_, i) => {
      const c = createClient(URL, KEY, opts);
      const t = Date.now();
      const { data: auth, error: ae } = await c.auth.signInAnonymously();
      if (ae) return err(`signin: ${ae.message}`);
      const { data: pid, error: je } = await c.rpc("join_quiz", { p_slug: "demo-quiz", p_name: `Load ${b + i}` });
      if (je) return err(`join: ${je.message}`);
      joinMs.push(Date.now() - t);
      c.realtime.setAuth(auth.session.access_token);
      players.push({ c, pid, events: 0, lastEventAt: 0 });
    }),
  );
}
stats("sign-in + join", joinMs);

// realtime subscriptions (STAGGER_MS spreads joins like phones scanning a QR)
const STAGGER = Number(process.env.STAGGER_MS ?? 20);
const subMs = [];
await Promise.all(
  players.map(
    (p, idx) =>
      new Promise((resolve) => setTimeout(resolve, idx * STAGGER)).then(() => new Promise((resolve) => {
        const t = Date.now();
        p.ch = p.c
          .channel(`s-${p.pid}`)
          .on("postgres_changes", { event: "UPDATE", schema: "public", table: "quiz_sessions", filter: `id=eq.${sessionId}` }, () => {
            p.events++;
            p.lastEventAt = Date.now();
          })
          .subscribe((st) => {
            if (st === "SUBSCRIBED") {
              subMs.push(Date.now() - t);
              resolve();
            } else if (st === "CHANNEL_ERROR" || st === "TIMED_OUT") {
              err(`realtime: ${st}`);
              resolve();
            }
          });
      })),
  ),
);
stats("realtime subscribe", subMs);
await sleep(1500);

async function phase(action) {
  const before = players.map((p) => p.events);
  const t0 = Date.now();
  const { error } = await host.rpc("host_control", { p_session_id: sessionId, p_action: action });
  if (error) throw error;
  // wait for realtime fan-out (max 10 s)
  while (Date.now() - t0 < 10000 && players.some((p, i) => p.events === before[i])) await sleep(50);
  const delivered = players.filter((p, i) => p.events > before[i]);
  const lat = delivered.map((p) => p.lastEventAt - t0);
  stats(`realtime '${action}' delivery`, lat);
  if (delivered.length < players.length) err(`realtime missed '${action}': ${players.length - delivered.length}`);
  return t0;
}

async function everyone(label, fn) {
  const lat = [];
  await Promise.all(
    players.map(async (p) => {
      await sleep(Math.random() * 500); // client-side jitter, as in the app
      const t = Date.now();
      try {
        await fn(p);
        lat.push(Date.now() - t);
      } catch (e) {
        err(`${label}: ${e.message}`);
      }
    }),
  );
  stats(label, lat);
}

for (let q = 0; q < 3; q++) {
  await phase("next");
  await everyone("get_participant_state", async (p) => {
    const { data, error } = await p.c.rpc("get_participant_state", { p_participant_id: p.pid });
    if (error) throw error;
    p.q = data.question;
    if (JSON.stringify(data).includes("is_correct")) throw new Error("leak");
  });
  await everyone("submit_answer", async (p) => {
    const opt = p.q.options[Math.floor(Math.random() * Math.max(1, p.q.options.length))];
    const { error } = await p.c.rpc("submit_answer", {
      p_participant_id: p.pid,
      p_question_id: p.q.id,
      p_option_ids: opt ? [opt.id] : [],
      p_text: p.q.type === "text" ? "7" : null,
    });
    if (error) throw error;
  });
  const { data: hs } = await host.rpc("host_session_state", { p_session_id: sessionId });
  console.log(`  host sees answered ${hs.answered_count}/${hs.participants_count}`);
  if (hs.answered_count !== players.length) err(`answered count ${hs.answered_count}`);
  await phase("reveal");
  await everyone("state after reveal", async (p) => {
    const { error } = await p.c.rpc("get_participant_state", { p_participant_id: p.pid });
    if (error) throw error;
  });
}
await phase("end");
for (const p of players) await p.c.removeChannel(p.ch);
console.log("errors:", Object.keys(errors).length ? errors : "none");
process.exit(Object.keys(errors).length ? 1 : 0);
