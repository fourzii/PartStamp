# Part Stamp: handoff

How the current app works, the rules it follows and why, what's still wrong, and how to rebuild it.
Written at the end of the original build (October 2026), which happened in a Claude chat whose
workspace could not install packages or reach the internet. That limit shaped several decisions
below; with Claude Code on the owner's computer, some of them should be revisited.

---

## 1. The workflow (what the owner sees)

1. **Upload** one PDF, or several PDFs that are already split into parts. A built-in sample score
   is available for trying it out.
2. **Check the parts.** The app shows the parts it found (name + page range) beside page thumbnails.
   The owner can rename, add or remove parts, add or remove pages (the + / ✓ button on a thumbnail
   corner, shift-click for a run, or the part buttons in a large page view), and set
   **"Parts start at page"** (everything before it is skipped). "Scan again" re-runs detection.
3. **Add performer names** in a spreadsheet-like grid: one column per part (in score order), one
   name per row. Typing, pasting from Excel / Numbers / Google Sheets (a block, a block whose first
   row is part names, or a two-column name/part list), multi-cell selection, delete, copy/cut,
   undo/redo.
4. **Name placement:** left/center/right, size, distance from top and side, font, colour (presets +
   custom), white backing, name on every page or first page only, copy order, blank pages for
   double-sided printing. Live preview of any performer's first page.
5. **Build printable PDF** → one PDF with every performer's copy, name stamped.

Settings are remembered in the browser (localStorage).

---

## 2. How each part works

### 2.1 Upload
- File picker (multiple) or drop anywhere on the page. Non-PDFs get a message.
- **Several files:** sorted by name with numeric awareness, opened with pdf-lib, and their pages
  copied into one combined PDF. For each file it records the start page and a fallback part name from
  the file name (words shared by every file name and leading numbers removed:
  "Winter Sky - 02 Oboe.pdf" → "Oboe"). The shared words name the output file.
  *(Rebuild: don't merge at intake. Keep the files open and map page numbers, see §5.)*
- The PDF is opened with pdf.js. A load counter cancels older loads when a new one starts.
  All previous state (parts, names, undo history, start page) is reset.
- For each page: aspect ratio; text items with positions; **letters stored one at a time are glued
  back into words** using item widths and gaps ("F l u t e" → "Flute"); top-left lines (top 25%,
  left 55%, line starting in the left 35%); instrument names down the left 22% (for score detection);
  the full text (identical text = probable copy); counts of text pieces / letters / errors, which
  decide whether the PDF "has text" and explain it when it doesn't.

### 2.2 Part detection: PDFs with real text
- Candidates per page are its top-left lines.
- **Lines that repeat across 3+ different pages are ignored** (title, composer, tempo). Identical
  copies of a page count once (this mattered: four copies of a Percussion part once made
  "Percussion" look like a repeating title).
- Prefer a line containing an instrument word; otherwise accept a short line that looks like a name
  (≤4 words, ≤32 chars, mostly letters, no digits first, no "=", "©"), unless it contains a tempo /
  style / front-matter word (`NOT_A_PART`: Allegro, Andante, Sweetly, Gently, Program Notes, Grade,
  copyright, photocopy, ...).
- If no part names are found in a PDF that has text, it does **not** silently fall back to the slow
  image reader; it says so and offers a "Read pages as images" button.

### 2.3 Part detection: image-only PDFs (ePrint)
1. **Duplicate copies from PDF structure:** pages with identical content streams and identical
   XObject/Font references are copies. ePrint copies reuse the same image object. Instant, no
   decoding. Falls back to pixel fingerprints if the structure check fails. On Beyond Reach: 80 unique
   of 174 pages, same answer as the pixel method.
2. **Layout pass on unique pages only**, drawn at 700 px wide, 2–4 at a time using up to 3 separate
   pdf.js documents (each has its own worker; one document = one decoding thread). Per page:
   - `first`: vertical position of the first staff line (a part's first page has the title above
     the music, so this is lower);
   - `gap`: spacing between lines within a staff;
   - `lines`: number of staff lines.
   - Fewer than 5 staff lines = not music (cover page with a rule or two). One-line percussion
     staves still count.
3. **Score pages by layout:** staff gap < 0.75 × the typical part's (80th percentile of all pages), or
   lines ≥ 1.5 × median and ≥ 60. On Beyond Reach the score gap is 3.3‰ of page height vs 5.5‰ for
   parts; on Don Hanna 3.3 vs 4.4. Score pages are never read for names.
4. **Choosing pages to read:** split unique non-score music pages at the biggest jump in `first`.
   If the biggest jump is < 0.025 (e.g. every part is one page long, as in Still, Still, Still),
   every music page is read. Pages whose ruled-line gap is > 1.4 × the typical part's are text
   pages (notes, instrument lists) and are skipped. In multi-file mode every file's first page is read.
5. **Reading names (`MiniOCR`):** a built-in recogniser, written because no OCR engine could be
   installed in the original workspace. It:
   - draws the alphabet in several fonts on this computer (Times-like, Georgia, Arial, Helvetica,
     Garamond-like; regular/bold/italic; two sizes) as 20×20 ink-map templates;
   - binarises the corner (Otsu), wipes long horizontal strokes (staff lines), finds connected
     components, groups them into lines left-to-right by vertical overlap **and similar size**
     (small part names printed beside a big title must not merge into the title's line), merges
     dots/accents, splits touching letters by cheapest template match;
   - corrects words against an instrument dictionary with a look-alike-aware edit distance
     (c/e, l/I/1, rn/m, cl/d, n/ri ...), rejoins words split by stray gaps, and fixes
     "Ist"/"lst" → "1st", lone "|"/"l" → "1", "E>"/"E7" → "E♭".
   - On the three test PDFs it reads every part-start corner correctly (≈0.27 s per page) and beat
     Tesseract on 3 corners. It is **not** a general reader: unusual fonts will do worse.
6. Parts appear in step 2 as they're found. Cancel stops everything and frees the extra readers.
7. If nothing can be read, a **layout-only fallback** finds part starts and shows each start page's
   top-left corner as a snapshot for the owner to type the name ("Part 1", "Part 2", ...).

### 2.4 Name normalising (shared by both paths)
- `normWords`/`norm`: lower-case, "in B♭/F/E♭" removed, "Bb Clarinet" key removed, roman numerals
  and 1st/2nd/3rd → digits, aliases (Sax, Tpt, Tbn, Hn, Perc, Cym, Tri, Tamb, Sus, S.D., B.D. ...),
  stray single letters dropped, leading number moved to the end ("2nd Trombone" → "trombone 2"),
  "T.C."/"B.C." kept as `tc`/`bc` so clef versions stay separate parts.
- `phrasesIn`: finds "[number] [qualifiers] instrument [number] [tc|bc]" phrases. The instrument and
  qualifier word lists include a long percussion vocabulary.
- `prettyLabel`: display tidying: "Ist Bb CLARINET" → "1st B♭ Clarinet".
- **Percussion:** "Percussion" followed by lines of percussion instruments keeps the list in its key
  and name ("Percussion (Suspended Cymbal, Chimes, Triangle, Crash Cymbal)"), so different
  percussion parts don't merge. A line made only of percussion instruments keeps them all
  ("Timpani, Triangle"). A later page headed just "Percussion" continues such a part.

### 2.5 Front matter, score, grouping
- `markFrontMatter`: score pages (layout, margin labels with 3+ instruments from 2+ sections, or a
  "Score/Conductor" heading) are skipped; everything before the first part **named with an
  instrument word** is front matter. Multi-file: the first part file marks the start.
- `partsFromLabels`: a part runs from its label until the next different label, a skipped page, or
  the start of another copy of itself (identical page). One copy per part is kept.
- **Multi-file rule:** a part only starts on a file's first page; later pages in a file continue it
  (a page-2 header like "Alto Saxophone 2", where 2 is the page number, used to start a new part).
- "Parts start at page" masks everything before it; typed names survive moving it back and forth.

### 2.6 Building the PDF
- pdf-lib. Each source page is embedded **once** as a Form XObject and drawn onto every copy that
  needs it (keeps output small). Falls back to copyPages if embedding fails.
- Name stamped with standard fonts; rotation-aware; optional white box. Names with characters the
  standard fonts can't encode are drawn as a high-resolution image of the text.
- Output saved through a normal download.

---

## 3. Known problems
- **Don Hanna stall:** in one browser test the image pass got through 65 of 78 unique pages and then
  stopped making progress. Never diagnosed (the test was stopped). Suspect: memory pressure from
  several pdf.js documents each holding the 136 MB file, or a render promise that never settles.
  Reproduce first.
- `MiniOCR` misreads some words that aren't in its dictionary ("Wind" → "wlnd", "Sleigh Bells" lost).
- Text-PDF path has had less real-world testing than the image path (no text PDFs were available).
- Score detection for text PDFs relies on margin labels being real text.
- The code is one large file; detection logic and UI are intertwined.

---

## 4. Test data
`test-pdfs/*.expected.json` hold the current results for three real ePrint PDFs: skipped pages,
every part's name and pages, and which pages are copies of which. They were produced by the app's
own detection code and checked against the page images, so treat them as a strong starting point,
not gospel. Fix any wrong names by hand (notes in each file). Summary:

| PDF | pages | skipped | parts |
|---|---|---|---|
| Beyond_Reach_EPRINT.pdf | 174 | 1–32 (cover + score) | 23, Flute (33–34) … Timpani (173–174) |
| Don_Hanna_EPRINT.pdf | 160 | 1–28 (notes + score) | 27, Flute 1 (29–30) … Mallet Percussion (159) |
| STILL_STILL_STILL_score_and_parts.pdf | 86 | 1–11 | 22 one-page parts, Flute (12) … Percussion (83) |

`tests/fixtures/multi-file/` has three small made-up part PDFs for the multi-file upload
(expected: Flute 1–2, Oboe 3 from its file name, Narrator 4).

---

## 5. Recommended rebuild
1. **Vite + TypeScript**, source split into modules: `intake`, `layout`, `ocr`, `detect`, `names`,
   `stamp`, `ui`. Detection must be runnable without the UI so tests can call it directly.
2. **Test runner first:** run detection on every PDF in `test-pdfs/`, diff against the expected
   files part by part, and time it. Make this pass before refactoring anything.
3. **Intake without merging:** keep each file's pdf.js document; map global page → (file, page).
   Merge only when building the output.
4. **Web Workers for everything heavy**, sized to the CPU. Transfer ArrayBuffers, don't copy them.
5. **Read ePrint corners without drawing whole pages:** each page is one embedded image; decode just
   that image (or its top band) at reduced size instead of rendering the full page. The layout pass
   (first-staff position, staff gap) can run on a downscaled decode.
6. **Bundle Tesseract (tesseract.js + core + eng.traineddata) for offline use**, and run it in a
   worker pool, with `MiniOCR`'s dictionary correction and normalising on top. Compare it with
   `MiniOCR` on the test set before choosing.
7. **Show confidence** per part (name from text / from image / from file name / layout only), so the
   owner knows what to check.
8. Ship as a **PWA** (works offline after the first visit) on free static hosting, plus a single-file
   build (e.g. `vite-plugin-singlefile`) for emailing or USB.
