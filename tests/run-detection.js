// Detection test runner.
//
// For every test-pdfs/*.expected.json: opens the real app in headless Chromium, uploads the matching PDF,
// waits for part detection to finish, and compares the result with the expected file part by part
// (skipped pages, each part's name and pages, and which pages are copies of which). Also times each PDF.
//
//   node tests/run-detection.js                 test every PDF against dist/Part Stamp.html, internet blocked
//   node tests/run-detection.js --app src       test src/part-stamp.html instead (loads pdf.js from the internet)
//   node tests/run-detection.js --only Beyond   only PDFs whose name contains "Beyond"
//   node tests/run-detection.js --sample        also run the built-in sample score (checks the runner itself works)
//   node tests/run-detection.js --timeout 30    minutes to wait per PDF (default 20)
//   CHROMIUM_PATH=/path/to/chrome node tests/run-detection.js   use an existing Chromium instead of Playwright's own
//
// What the app found is saved to tests/results/<pdf>.actual.json, in the same shape as the expected files.
// Exit code: 0 all passed, 1 something differed or failed, 2 nothing failed but some PDFs are missing.
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const PDF_DIR = path.join(ROOT, "test-pdfs");
const OUT_DIR = path.join(__dirname, "results");

const args = process.argv.slice(2);
const opt = (name, dflt) => { const i = args.indexOf("--" + name); return i < 0 ? dflt : args[i + 1]; };
const APP = opt("app", "dist");
const ONLY = opt("only", "");
const TIMEOUT_MIN = +opt("timeout", 20);
const SAMPLE = args.includes("--sample");
const APP_FILE = APP === "src" ? path.join(ROOT, "src", "part-stamp.html") : path.join(ROOT, "dist", "Part Stamp.html");

// detection is finished when the status bar says one of these
const DONE = /Check them in step 2|No parts found|No part names found|Scan cancelled|couldn't be read|password protected/;

const ranges = (nums) => {   // [1,2,3,7,9,10] -> "1–3, 7, 9–10"
  const s = [...new Set(nums)].sort((a, b) => a - b), out = [];
  for (let i = 0; i < s.length; i++) {
    let j = i; while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
    out.push(i === j ? `${s[i]}` : `${s[i]}–${s[j]}`); i = j;
  }
  return out.join(", ") || "none";
};
const fmtTime = (ms) => ms < 60000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.floor(ms / 60000)} min ${Math.round(ms % 60000 / 1000)} s`;

async function openApp(browser){
  const page = await browser.newPage({ viewport: { width: 1300, height: 950 } });
  const errors = [];
  let blocked = 0;
  if (APP !== "src") await page.route(/^https?:\/\//, r => { blocked++; r.abort(); });   // the offline file must need no internet
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text().slice(0, 300)); });
  page.on("crash", () => errors.push("PAGE CRASHED"));
  await page.goto("file://" + APP_FILE);
  await page.waitForFunction(() => window.pdfjsLib && window.PDFLib, null, { timeout: 60000 });
  return { page, errors, blocked: () => blocked };
}

// wait for detection to finish, printing progress every 15 s so a long run is visibly alive
async function waitForDetection(page, t0){
  const deadline = t0 + TIMEOUT_MIN * 60000;
  let last = 0;
  for (;;) {
    const st = await page.evaluate(() => ({ msg: document.getElementById("bar-msg").textContent, parts: S.parts.length }));
    if (DONE.test(st.msg)) return st.msg;
    if (Date.now() > deadline) throw new Error(`gave up after ${TIMEOUT_MIN} min. Last status: "${st.msg}", ${st.parts} parts so far`);
    if (Date.now() - last > 15000) { if (last) console.log(`    … ${fmtTime(Date.now() - t0)}: ${st.msg.trim().slice(-80) || "(working)"} (${st.parts} parts so far)`); last = Date.now(); }
    await page.waitForTimeout(500);
  }
}

// read the app's results in the same shape as the expected files (1-based pages)
const collect = (page) => page.evaluate(() => {
  const skipped = Object.entries(S.skip || {}).map(([k, v]) => ({ page: +k + 1, reason: v })).sort((a, b) => a.page - b.page);
  const copies = {};
  (S.rep || []).forEach((r, i) => { if (r !== i) (copies[r + 1] = copies[r + 1] || []).push(i + 1); });
  const status = document.getElementById("scan-status")?.textContent || "";
  return {
    pages: S.numPages, hasText: S.hasText, status: status.trim(), bar: document.getElementById("bar-msg").textContent,
    skippedPages: skipped, parts: S.parts.map(p => ({ name: p.label, pages: p.pages.map(x => x + 1) })), duplicateCopies: copies,
  };
});

function compare(exp, act){
  const lines = [], problems = [];
  const bad = (t) => { lines.push("  ✗ " + t); problems.push(t); };

  if (exp.pages !== act.pages) bad(`page count: expected ${exp.pages}, got ${act.pages}`);

  // skipped pages
  const es = new Map(exp.skippedPages.map(s => [s.page, s.reason])), as = new Map(act.skippedPages.map(s => [s.page, s.reason]));
  const notSkipped = [...es.keys()].filter(p => !as.has(p)), extraSkipped = [...as.keys()].filter(p => !es.has(p));
  const reasonDiff = [...es.keys()].filter(p => as.has(p) && as.get(p) !== es.get(p));
  if (!notSkipped.length && !extraSkipped.length && !reasonDiff.length) lines.push(`  ✓ skipped pages ${ranges([...es.keys()])}`);
  else {
    if (notSkipped.length) bad(`should be skipped but weren't: pages ${ranges(notSkipped)}`);
    if (extraSkipped.length) bad(`skipped but shouldn't be: pages ${ranges(extraSkipped)} (${[...new Set(extraSkipped.map(p => as.get(p)))].join(", ")})`);
    for (const p of reasonDiff) bad(`page ${p} skipped as "${as.get(p)}", expected "${es.get(p)}"`);
  }

  // parts: match by name first, then by first page (a misread name)
  const used = new Set();
  const w = Math.max(...exp.parts.map(p => p.name.length), 10);
  for (const ep of exp.parts) {
    let i = act.parts.findIndex((ap, k) => !used.has(k) && ap.name === ep.name);
    if (i < 0) i = act.parts.findIndex((ap, k) => !used.has(k) && ap.pages[0] === ep.pages[0]);
    const label = ep.name.padEnd(w) + "  " + ranges(ep.pages).padEnd(9);
    if (i < 0) { bad(`${label}  MISSING (no part named this or starting on page ${ep.pages[0]})`); continue; }
    used.add(i);
    const ap = act.parts[i], samePages = ap.pages.join() === ep.pages.join();
    if (ap.name === ep.name && samePages) lines.push(`  ✓ ${label}`);
    else bad(`${label}  got "${ap.name}" pages ${ranges(ap.pages)}`
      + (ap.name !== ep.name ? "  [name differs]" : "") + (!samePages ? "  [pages differ]" : ""));
  }
  act.parts.forEach((ap, k) => { if (!used.has(k)) bad(`extra part "${ap.name}" pages ${ranges(ap.pages)}`); });
  const order = act.parts.filter((_, k) => used.has(k)).map(p => p.pages[0]);
  if (order.some((v, k) => k && v < order[k - 1])) bad("parts are not in page order");

  // duplicate copies
  const key = (m) => Object.entries(m).map(([r, c]) => r + ":" + c.join(",")).sort();
  const ek = key(exp.duplicateCopies || {}), ak = new Set(key(act.duplicateCopies || {}));
  const missingGroups = ek.filter(g => !ak.has(g)), extraGroups = [...ak].filter(g => !ek.includes(g));
  if (!missingGroups.length && !extraGroups.length) lines.push(`  ✓ duplicate copies (${ek.length} groups)`);
  else {
    for (const g of missingGroups) bad(`copies expected but not found: page ${g.replace(":", " → ")}`);
    for (const g of extraGroups) bad(`copies found but not expected: page ${g.replace(":", " → ")}`);
  }
  return { lines, problems };
}

(async () => {
  if (!fs.existsSync(APP_FILE)) {
    console.error(`Can't find ${path.relative(ROOT, APP_FILE)}.` + (APP === "src" ? "" : " Run: npm install && npm run build:offline"));
    process.exit(1);
  }
  const expected = fs.readdirSync(PDF_DIR).filter(f => f.endsWith(".expected.json") && f.includes(ONLY)).sort();
  console.log(`Part Stamp detection tests — app: ${path.relative(ROOT, APP_FILE)}${APP === "src" ? "" : " (internet blocked)"}\n`);

  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const summary = [];
  fs.mkdirSync(OUT_DIR, { recursive: true });

  if (SAMPLE) {
    console.log("● Built-in sample score (runner self-check, no expected file)");
    const t0 = Date.now();
    const { page, errors } = await openApp(browser);
    await page.click("#try-sample");
    const bar = await waitForDetection(page, t0);
    const act = await collect(page);
    console.log(`  ${bar}  (${fmtTime(Date.now() - t0)})`);
    console.log(`  skipped pages: ${ranges(act.skippedPages.map(s => s.page))}`);
    for (const p of act.parts) console.log(`    ${p.name.padEnd(28)} ${ranges(p.pages)}`);
    if (errors.length) console.log("  browser errors:", errors);
    await page.close();
    console.log();
  }

  for (const f of expected) {
    const exp = JSON.parse(fs.readFileSync(path.join(PDF_DIR, f), "utf8"));
    const pdf = path.join(PDF_DIR, exp.pdf || f.replace(/\.expected\.json$/, ".pdf"));
    console.log(`● ${path.basename(pdf)}  (${exp.pages} pages, ${exp.parts.length} parts expected)`);
    if (!fs.existsSync(pdf)) {
      console.log(`  – NOT RUN: PDF not found. Put it at test-pdfs/${path.basename(pdf)}\n`);
      summary.push({ pdf: path.basename(pdf), result: "missing" });
      continue;
    }
    const t0 = Date.now();
    const { page, errors, blocked } = await openApp(browser);
    let act, problems;
    try {
      await page.setInputFiles("#pdf-input", pdf);
      await waitForDetection(page, t0);
      act = await collect(page);
      const ms = Date.now() - t0;
      fs.writeFileSync(path.join(OUT_DIR, path.basename(pdf, ".pdf") + ".actual.json"),
        JSON.stringify({ pdf: path.basename(pdf), seconds: +(ms / 1000).toFixed(1), ...act }, null, 1));
      const r = compare(exp, act);
      problems = r.problems;
      r.lines.forEach(l => console.log(l));
      console.log(`  ${act.hasText ? "read from the PDF's text" : "read from page images"} · ${fmtTime(ms)}`
        + (APP !== "src" ? ` · internet requests blocked: ${blocked()}` : ""));
      if (errors.length) console.log("  browser errors:\n    " + errors.join("\n    "));
      summary.push({ pdf: path.basename(pdf), result: problems.length ? "FAIL" : "pass", problems: problems.length, ms,
        parts: `${act.parts.length}/${exp.parts.length}` });
    } catch (e) {
      console.log(`  ✗ ERROR: ${e.message}`);
      if (errors.length) console.log("  browser errors:\n    " + errors.join("\n    "));
      summary.push({ pdf: path.basename(pdf), result: "ERROR", ms: Date.now() - t0 });
    }
    await page.close();
    console.log();
  }
  await browser.close();

  console.log("Summary");
  for (const s of summary) {
    const extra = s.result === "missing" ? "PDF not in test-pdfs/" : s.result === "ERROR" ? `after ${fmtTime(s.ms)}`
      : `${s.problems} difference(s), parts found ${s.parts}, ${fmtTime(s.ms)}`;
    console.log(`  ${s.result.padEnd(7)} ${s.pdf.padEnd(42)} ${extra}`);
  }
  if (!summary.length) console.log("  no expected files matched");
  process.exit(summary.some(s => s.result === "FAIL" || s.result === "ERROR") ? 1 : summary.some(s => s.result === "missing") ? 2 : 0);
})().catch(e => { console.error(e); process.exit(1); });
