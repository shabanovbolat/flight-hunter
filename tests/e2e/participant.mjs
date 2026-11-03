// E2E smoke test for the participant flow (mobile).
// Usage: BASE_URL=http://localhost:3000 node tests/e2e/participant.mjs
import { createRequire } from "node:module";
// Uses the globally installed Playwright (no project dependency needed).
const { chromium, devices } = createRequire(import.meta.url)("playwright");
import { execSync } from "node:child_process";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const DB = process.env.DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const sql = (q) => execSync(`psql "${DB}" -Atc "${q.replace(/"/g, '\\"')}"`).toString().trim();
const check = (ok, msg) => {
  if (!ok) throw new Error(`FAIL: ${msg}`);
  console.log(`ok - ${msg}`);
};

// explanation text of each demo question (only sent after that question is answered)
const EXPLANATIONS = ["1997 жылдан", "Марс пен Шолпан", "қайнау температурасы", "Аптада 7 күн", "китәбун"];

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["iPhone 13"], locale: "kk-KZ" });
const page = await ctx.newPage();
const bodies = [];
page.on("response", async (r) => {
  try {
    if (r.request().resourceType() === "fetch" || r.request().resourceType() === "document") bodies.push(await r.text());
  } catch {}
});
// Before answering question i (1-based): no explanation of question >= i and
// none of question i's correct option ids / accepted answers in any response.
const leaked = (i) => {
  const out = EXPLANATIONS.slice(i - 1).filter((s) => bodies.some((b) => b.includes(s)));
  const qid = sql(`select id from questions where quiz_id = '44444444-4444-4444-8444-444444444444' and position = ${i}`);
  const correct = sql(`select coalesce(string_agg(id::text, ','), '') from answer_options where question_id = '${qid}' and is_correct`).split(",").filter(Boolean);
  for (const b of bodies) {
    for (const m of b.matchAll(/correct_option_ids\\?":\[([^\]]*)\]/g)) {
      if (correct.some((id) => m[1].includes(id))) out.push(`correct option of q${i}`);
    }
    if (i === 4 && /accepted_answers\\?":\[[^\]]*жеті/.test(b)) out.push("accepted answers of q4");
  }
  return out;
};

const name = `E2E ${Date.now()}`;
await page.goto(`${BASE}/q/demo-quiz`);
await page.getByLabel("Аты-жөніңізді енгізіңіз").fill(name);
await page.getByRole("button", { name: "Бастау" }).click();
await page.getByText("1 / 5").waitFor();
check(leaked(1).length === 0, "no correctness data before first answer");

for (let i = 1; i <= 5; i++) {
  await page.getByText(`${i} / 5`).first().waitFor();
  if (i === 2) {
    await page.reload();
    await page.getByText("2 / 5").first().waitFor();
    check(true, "refresh resumes at question 2");
  }
  const textbox = page.getByPlaceholder("Жауабыңызды жазыңыз");
  if (await textbox.count()) {
    await textbox.fill("  ЖЕТІ ");
  } else {
    await page.locator("button[aria-pressed]").first().click();
  }
  const l = leaked(i);
  check(l.length === 0, `no leak before submitting question ${i} ${l.join(",")}`);
  const submit = page.getByRole("button", { name: "Жауап беру" });
  // double tap
  await submit.dblclick({ force: true }).catch(() => {});
  await page.getByRole("button", { name: i === 5 ? "Нәтижені көру" : "Келесі сұрақ" }).waitFor();
  await page.getByRole("button", { name: i === 5 ? "Нәтижені көру" : "Келесі сұрақ" }).click();
}

await page.getByText("Сіздің нәтижеңіз").waitFor();
check(leaked(1).length > 0, "leak detector does see feedback once a question is answered");
check(true, "result screen shown");
const pid = sql(`select id from participants where display_name = '${name}'`);
check(sql(`select count(*) from participant_answers where participant_id = '${pid}'`) === "5", "exactly 5 answer rows after double taps");
check(sql(`select status from participants where id = '${pid}'`) === "completed", "attempt completed");
await page.screenshot({ path: process.env.SHOT ?? "/tmp/result.png", fullPage: true });
await browser.close();
console.log("E2E PARTICIPANT PASSED");
