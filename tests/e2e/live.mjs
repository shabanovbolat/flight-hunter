// Live mode sync test: one host + two participant browsers through a full quiz.
// Usage: BASE_URL=http://localhost:3000 node tests/e2e/live.mjs
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const { chromium, devices } = createRequire(import.meta.url)("playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const DB = process.env.DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const QUIZ = "44444444-4444-4444-8444-444444444444";
const sql = (q) => execSync(`psql "${DB}" -Atc "${q.replace(/"/g, '\\"')}"`).toString().trim();
const check = (ok, msg) => {
  if (!ok) throw new Error(`FAIL: ${msg}`);
  console.log(`ok - ${msg}`);
};

sql(`update quiz_sessions set phase = 'ended' where quiz_id = '${QUIZ}' and phase <> 'ended'`);
const browser = await chromium.launch();

const hostCtx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const host = await hostCtx.newPage();
await host.goto(`${BASE}/login`);
await host.getByLabel("Электрондық пошта").fill("admin@ilim.local");
await host.getByLabel("Құпиясөз").fill("ilimquiz123");
await host.getByRole("button", { name: "Кіру" }).click();
await host.waitForURL(`${BASE}/admin`);
await host.goto(`${BASE}/admin/quizzes/${QUIZ}/live`);
await host.getByRole("button", { name: /Сессияны ашу|Жаңа сессия ашу/ }).click();
await host.getByText("Қосылғандар").waitFor();
check(true, "host opened session (lobby with QR)");

const players = [];
for (const name of ["Live Әлия", "Live Нұрлан"]) {
  const ctx = await browser.newContext({ ...devices["Pixel 7"] });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/q/demo-quiz`);
  await page.getByLabel("Аты-жөніңізді енгізіңіз").fill(name);
  await page.getByRole("button", { name: "Бастау" }).click();
  await page.getByText("Күте тұрыңыз…").waitFor();
  players.push(page);
}
check(true, "two participants wait in the lobby");
for (const p of players) await p.getByText("Қайта қосылуда…").waitFor({ state: "hidden", timeout: 10000 });
check(true, "participants connected to Realtime");
await host.getByText("2", { exact: true }).first().waitFor();

// reload one participant in the lobby → rejoins
await players[1].reload();
await players[1].getByText("Күте тұрыңыз…").waitFor();
check(true, "participant reload rejoins lobby");

await host.getByRole("button", { name: "Викторинаны бастау" }).click();
for (let i = 1; i <= 5; i++) {
  for (const p of players) await p.getByText(`${i} / 5`).first().waitFor({ timeout: 10000 });
  check(true, `both participants show question ${i}`);
  if (i === 3) {
    await players[0].reload();
    await players[0].getByText("3 / 5").first().waitFor();
    check(true, "participant reload rejoins the current question");
  }
  for (const p of players) {
    const tb = p.getByPlaceholder("Жауабыңызды жазыңыз");
    if (await tb.count()) await tb.fill("7");
    else await p.locator("button[aria-pressed]").first().click();
    await p.getByRole("button", { name: "Жауап беру" }).click();
    await p.getByText("Жауаптар жабылғанша күтіңіз").waitFor();
  }
  await host.getByText("2/2").waitFor({ timeout: 8000 });
  check(true, `host sees 2/2 answers on question ${i}`);
  await host.getByRole("button", { name: "Жауапты көрсету" }).click();
  for (const p of players) await p.getByText(/Дұрыс!|Қате/).first().waitFor({ timeout: 10000 });
  check(true, `participants see reveal for question ${i}`);
  if (i === 1) check((await players[0].getByText("Қайта қосылуда…").count()) === 0, "realtime still connected");
  await host.getByRole("button", { name: "Көшбасшылар" }).click();
  for (const p of players) await p.getByText("Келесі сұрақты күтіңіз").first().waitFor({ timeout: 10000 });
  if (i === 5) host.once("dialog", (d) => d.accept());
  await host.getByRole("button", { name: i === 5 ? "Викторинаны аяқтау" : "Келесі сұрақ" }).first().click();
}
for (const p of players) await p.getByText("Сіздің нәтижеңіз").waitFor({ timeout: 15000 });
check(true, "both participants see final result after host ends");
await host.getByText("Қорытынды нәтижелер").waitFor();
check(sql(`select count(*) from quiz_results r join quiz_sessions s on s.id = r.session_id where s.quiz_id = '${QUIZ}' and s.ended_at > now() - interval '5 minutes'`) === "2", "2 results stored for the session");
await host.screenshot({ path: process.env.SHOT ?? "/tmp/host.png" });
await browser.close();
console.log("E2E LIVE PASSED");
