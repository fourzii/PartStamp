# Tests

## What's here
- `../test-pdfs/*.expected.json` — the correct results for three real PDFs (see HANDOFF.md §4).
  Put the PDFs themselves next to them with the same base names.
- `fixtures/multi-file/` — three small made-up part PDFs for testing multi-file upload.
- `dev-scripts/` — the rough scripts used during the original build. They are **not** a ready-made
  test suite: they were written for a scratch folder (they read `app.js`, the script extracted from
  `src/part-stamp.html`, and cached results in folders like `peek/`, `dh/`, `ss/`), and some use
  poppler (`pdftoppm`) and the `tesseract` command line. Use them as working examples when building
  a proper test runner.

## The dev scripts
| Script | What it does |
|---|---|
| `harness_struct.py` | Finds duplicate pages from PDF structure (same idea as the app). Writes `struct.json`. |
| `harness_layout.js` | Runs the app's own `pageLayout` / `scorePagesByLayout` / `layoutStarts` on pages rendered at 700 px by `pdftoppm`. Prints score pages and the pages it would read. |
| `harness_ocr.py` | Reads candidate corners with the `tesseract` command line (reference results). |
| `ss_ocr.js`, `ocr_run.js` | Run the app's `MiniOCR` in headless Chromium (Playwright) on corner images. |
| `ocr_cmp.js` | Compares MiniOCR with Tesseract corner by corner. |
| `harness_parts.js`, `harness_mini_parts.js` | Run the app's detection functions on cached text and print the part list. |
| `dump_expected.js` | Wrote the `.expected.json` files. |
| `e2e_browser.js` | Opens `dist/Part Stamp.html` with the network blocked, runs the sample score end to end, downloads the result. |
| `e2e_multi.js`, `mkmulti.js` | Multi-file upload test and the script that made its fixtures. |
| `diag.js` | Watches a long run and logs browser errors (written to chase the Don Hanna stall). |

## Detection test runner
`npm run test:detection` (= `node tests/run-detection.js`). Needs `npm install` and
`npm run build:offline` first.

For each `test-pdfs/*.expected.json` it opens `dist/Part Stamp.html` in headless Chromium with the
internet blocked, uploads the matching PDF, waits for detection to finish, and prints the skipped
pages, every part (✓ or what differs) and the duplicate-copy groups, plus the time taken. PDFs that
aren't in `test-pdfs/` are reported as "NOT RUN". What the app found is saved to
`tests/results/<pdf>.actual.json`.

Options: `--app src` (test the source file, needs internet), `--only <name>`, `--sample` (also run
the built-in sample score, to check the runner itself), `--timeout <minutes>` (default 20 per PDF).
`CHROMIUM_PATH=...` uses an existing Chromium instead of Playwright's own.
