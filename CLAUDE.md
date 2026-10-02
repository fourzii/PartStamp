# Part Stamp

A browser app for band and orchestra directors. You give it the sheet-music PDF you bought (or the
parts as separate PDFs) and the performers' names; it finds each instrument part, skips the cover,
notes and full score, keeps one copy of each part, and builds one printable PDF with every
performer's name stamped on their own copy of their part.

The owner is a music director, not a programmer. Explain changes in plain language, and keep the
app working at every step: they use it for real rehearsals.

## Hard requirements
- **Everything runs in the browser.** PDFs and names are never uploaded anywhere.
- **Must work fully offline** as a single double-clickable HTML file (`dist/Part Stamp.html`).
  If the app becomes a hosted site, keep producing this single-file build as well.
- **Fast on big image-only PDFs.** J.W. Pepper ePrint files are 150+ MB, 170+ pages, and every page
  is one large embedded image with no text at all. Chrome only makes their text selectable by running
  its own text recognition; the file itself contains none.

## Where things are
- `src/part-stamp.html` — the whole app: markup, styles and script in one file. In this source form
  it loads pdf.js 3.11 and pdf-lib from a CDN.
- `build/build_offline.py` — makes `dist/Part Stamp.html`: embeds pdf.js 5.x (legacy build) and
  pdf-lib from `node_modules` and removes the web fonts. Run `npm install` first.
- `dist/Part Stamp.html` — the current offline build the owner uses.
- `test-pdfs/*.expected.json` — the correct results for three real PDFs. The PDFs themselves are not
  included (copyrighted, 60–150 MB each); the owner will put them in `test-pdfs/`.
- `tests/dev-scripts/` — the rough scripts used to test during the original build. See
  `tests/README.md`. They need adapting to this folder layout before they run.
- `HANDOFF.md` — how every part of the app works, every detection rule and why it exists, known
  problems, and the recommended rebuild plan. **Read it before changing detection.**

## Working rules
- Before changing part detection, run it against every PDF in `test-pdfs/` and compare with the
  `.expected.json` files. A fix for one PDF must not break the others. Report results part by part.
- When the owner reports a new problem PDF, add it to `test-pdfs/` with an expected file first.
- The app has two text-reading paths: PDFs with real text (read directly) and image-only PDFs (read
  with the built-in part-name reader, `MiniOCR`). Test both.
- After any change, rebuild `dist/Part Stamp.html` and open it in a browser with the network blocked
  to confirm it still works offline.
- Don't run long tests the owner can't see without saying so first and roughly how long they take.
