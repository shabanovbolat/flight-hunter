// Admin flow: create quiz with all 4 question types, publish, QR/PNG/poster,
// participant run, CSV (BOM + Kazakh) and XLSX export.
// Usage: BASE_URL=http://localhost:3000 node tests/e2e/admin.mjs
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const DB = process.env.DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const OUT = process.env.OUT_DIR ?? "/tmp";
const sql = (q) => execSync(`psql "${DB}" -Atc "${q.replace(/"/g, '\\"')}"`).toString().trim();
const check = (ok, msg) => {
  if (!ok) throw new Error(`FAIL: ${msg}`);
  console.log(`ok - ${msg}`);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("pageerror:", e.message.slice(0, 300)));
page.on("console", (m) => m.type() === "error" && console.log("console:", m.text().slice(0, 300)));
await page.goto(`${BASE}/login`);
await page.getByLabel("Электрондық пошта").fill("creator@ilim.local");
await page.getByLabel("Құпиясөз").fill("ilimquiz123");
await page.getByRole("button", { name: "Кіру" }).click();
await page.waitForURL(`${BASE}/admin`);
check(true, "creator logged in");

// RLS via UI: creator must not open the super admin's demo quiz
await page.goto(`${BASE}/admin/quizzes/44444444-4444-4444-8444-444444444444`);
await page.getByText("Бет табылмады").waitFor();
check(!(await page.content()).includes("Демо викторина"), "creator sees not-found (no data) for another creator's quiz");
const csvRes = await page.request.get(`${BASE}/admin/quizzes/44444444-4444-4444-8444-444444444444/export?format=csv`);
check(csvRes.status() === 404, "creator cannot export another creator's results");

// create quiz
const slug = `e2e-${Date.now().toString(36)}`;
await page.goto(`${BASE}/admin/quizzes/new`);
await page.locator("button[type=submit]:not([disabled])").waitFor(); // hydrated
await page.getByLabel("Атауы").fill("Тест: Әріптер ҒҚҢӨҰҮҺІ");
await page.getByLabel("Сілтеме (slug)").fill(slug);
await page.getByLabel("PIN-код").fill("4321");
await page.getByRole("button", { name: "Құру" }).click();
await page.waitForURL(/\/admin\/quizzes\/[0-9a-f-]{36}$/, { waitUntil: "commit" });
const quizId = page.url().split("/").pop();
check(sql(`select pin_hash like '$2%' from quizzes where id='${quizId}'`) === "t", "PIN stored as bcrypt hash");

async function addQuestion(type, fill) {
  await page.goto(`${BASE}/admin/quizzes/${quizId}/questions/new`);
  await page.locator("button[type=submit]:not([disabled])").waitFor(); // hydrated
  await page.getByRole("button", { name: type, exact: true }).click();
  await fill();
  const log = [];
  const t0 = Date.now();
  const onReq = (r) => log.push(`> ${Date.now() - t0}ms ${r.method()} ${r.url().replace(BASE, "")}`);
  const onRes = (r) => log.push(`< ${Date.now() - t0}ms ${r.status()} ${r.url().replace(BASE, "")} ${r.headers()["x-action-redirect"] ?? ""}`);
  const onFail = (r) => log.push(`x ${Date.now() - t0}ms ${r.url().replace(BASE, "")} ${r.failure()?.errorText}`);
  const onDone = (r) => log.push(`done ${Date.now() - t0}ms ${r.url().replace(BASE, "")}`);
  page.on("requestfinished", onDone);
  page.on("request", onReq); page.on("response", onRes); page.on("requestfailed", onFail);
  await page.getByRole("button", { name: "Сақтау" }).click();
  try {
    await page.waitForURL(`${BASE}/admin/quizzes/${quizId}`, { waitUntil: "commit", timeout: 15000 });
  } catch (e) {
    console.log("alerts:", await page.locator("[role=alert], .text-red-600").allTextContents());
    console.log(log.join("\n"));
    await page.screenshot({ path: `${OUT}/fail.png`, fullPage: true });
    throw e;
  } finally {
    page.off("request", onReq); page.off("response", onRes); page.off("requestfailed", onFail);
  }
  await page.getByRole("link", { name: "Сұрақ қосу" }).first().waitFor();
}
await addQuestion("Бір жауапты", async () => {
  await page.getByLabel("Сұрақ мәтіні").fill("Бір жауапты сұрақ");
  await page.locator("#q-ar").fill("مَا هَذَا؟");
  for (let i = 1; i <= 4; i++) await page.getByLabel(`Нұсқа ${i}`).fill(`Нұсқа-${i}`);
  await page.getByRole("button", { name: /Дұрыс/ }).nth(1).click();
});
await addQuestion("Бірнеше жауапты", async () => {
  await page.getByLabel("Сұрақ мәтіні").fill("Көп жауапты сұрақ");
  for (let i = 1; i <= 4; i++) await page.getByLabel(`Нұсқа ${i}`).fill(`М-${i}`);
  await page.getByRole("button", { name: /Дұрыс/ }).nth(0).click();
  await page.getByRole("button", { name: /Дұрыс/ }).nth(2).click();
});
await addQuestion("Ақиқат / Жалған", async () => {
  await page.getByLabel("Сұрақ мәтіні").fill("Ақиқат па?");
});
await addQuestion("Мәтіндік жауап", async () => {
  await page.getByLabel("Сұрақ мәтіні").fill("Араб сөзін жазыңыз");
  await page.getByLabel("Қабылданатын жауаптар").fill("كِتَابٌ\nкітап");
  await page.getByText("Дереккөз (міндетті емес)").click();
  await page.getByLabel("Кітап атауы").fill("Админ енгізген кітап");
});
check(sql(`select count(*) from questions where quiz_id='${quizId}'`) === "4", "4 questions of every type saved");
check(sql(`select string_agg(type::text, ',' order by position) from questions where quiz_id='${quizId}'`) === "single,multiple,true_false,text", "types in order");
const page1 = await page.content();
check(page1.includes('dir="rtl"') && page1.includes("مَا هَذَا؟"), "Arabic with harakat rendered RTL in admin");

await page.waitForLoadState("networkidle");
await page.getByRole("button", { name: "Жариялау" }).click();
await page.getByRole("button", { name: "Жобаға қайтару" }).waitFor();
check(sql(`select status from quizzes where id='${quizId}'`) === "published", "quiz published");

await page.goto(`${BASE}/admin/quizzes/${quizId}/share`);
check((await page.locator("svg path").count()) > 0, "QR rendered on share page");
const png = await page.request.get(`${BASE}/admin/quizzes/${quizId}/qr.png`);
const pngBuf = await png.body();
check(png.headers()["content-type"] === "image/png" && pngBuf.subarray(1, 4).toString() === "PNG", "QR PNG download");
await page.goto(`${BASE}/admin/quizzes/${quizId}/poster`);
await page.getByText("QR-кодты сканерлеп, викторинаға қатысыңыз!").waitFor();
await page.emulateMedia({ media: "print" });
await page.pdf({ path: `${OUT}/poster.pdf`, format: "A4", printBackground: true });
await page.emulateMedia({ media: "screen" });
check(true, "A4 poster prints to PDF");

// participant on a phone
const phone = await browser.newContext({ ...devices["iPhone 13"] });
const pp = await phone.newPage();
await pp.goto(`${BASE}/q/${slug}`);
await pp.getByLabel("Аты-жөніңізді енгізіңіз").fill("Ғалия Құрманова");
await pp.locator("#pin").fill("1111");
await pp.getByRole("button", { name: "Бастау" }).click();
await pp.getByText("PIN-код қате.").waitFor();
check(true, "wrong PIN rejected");
await pp.locator("#pin").fill("4321");
await pp.getByRole("button", { name: "Бастау" }).click();
for (let i = 1; i <= 4; i++) {
  await pp.getByText(`${i} / 4`).first().waitFor();
  const tb = pp.getByPlaceholder("Жауабыңызды жазыңыз");
  if (await tb.count()) await tb.fill("كتاب");
  else await pp.locator("button[aria-pressed]").first().click();
  await pp.getByRole("button", { name: "Жауап беру" }).click();
  await pp.getByRole("button", { name: i === 4 ? "Нәтижені көру" : "Келесі сұрақ" }).click();
}
await pp.getByText("Сіздің нәтижеңіз").waitFor();
check(sql(`select is_correct from participant_answers a join questions q on q.id=a.question_id where q.quiz_id='${quizId}' and q.type='text'`) === "t", "Arabic text answer matched without harakat");
await pp.getByText("Жауаптарды қарау").click();
await pp.getByText("Админ енгізген кітап").first().waitFor();
check(true, "reference shown exactly as entered");
await pp.screenshot({ path: `${OUT}/phone-review.png`, fullPage: true });

// exports
const csv = await page.request.get(`${BASE}/admin/quizzes/${quizId}/export?format=csv`);
const csvBuf = await csv.body();
check(csvBuf[0] === 0xef && csvBuf[1] === 0xbb && csvBuf[2] === 0xbf, "CSV starts with UTF-8 BOM");
check(csvBuf.toString("utf8").includes("Ғалия Құрманова") && csvBuf.toString("utf8").includes("Аты-жөні"), "CSV has Kazakh header and name");
const xlsx = await page.request.get(`${BASE}/admin/quizzes/${quizId}/export?format=xlsx`);
const XLSX = require(process.cwd() + "/node_modules/xlsx");
const wb = XLSX.read(await xlsx.body(), { type: "buffer" });
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
check(rows[1][1] === "Ғалия Құрманова" && rows[0][0] === "Орын", "XLSX has Kazakh header and name");

await page.goto(`${BASE}/admin/statistics?quiz=${quizId}`);
await page.getByText("Ең қиын сұрақтар").waitFor();
check(true, "statistics page renders");
for (const p of ["/admin", "/admin/questions", "/admin/participants", "/admin/results", "/admin/settings", `/admin/quizzes/${quizId}/results`, `/admin/quizzes/${quizId}/live`]) {
  const r = await page.goto(`${BASE}${p}`);
  check(r.status() === 200, `GET ${p} 200`);
}
// cleanup
sql(`delete from quizzes where id='${quizId}'`);
await browser.close();
console.log("E2E ADMIN PASSED");
