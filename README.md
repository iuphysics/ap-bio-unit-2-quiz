# Cell Study — AP Biology Unit 2

A quizzer built from the **exact 277 numbered problems** in the supplied 346-page AP Bio Unit 2 scoring-guide PDF: **183 multiple-choice questions and 94 free-response questions**.

## Run

Requires Node.js 20 or newer. No installation or build step is needed.

```sh
git clone https://github.com/iuphysics/ap-bio-unit-2-quiz.git
cd ap-bio-unit-2-quiz
npm start
```

Open **http://localhost:4173**. A static HTTPS host can serve the repository root, including the service worker, manifest, `vendor/`, `icons/`, and `assets/`. Opening the HTML directly with `file://` will not work because the question bank is loaded with `fetch`.

## Use without Wi-Fi

1. Open https://iuphysics.github.io/ap-bio-unit-2-quiz/ while online.
2. Select **Download for offline use** and keep the page open until it says **Ready offline**. The download is about 40 MB and includes every question, diagram, explanation, and FRQ rubric.
3. Reopen the same link in the same browser without a connection. You can optionally add the site to your home screen or install it using your browser's app menu.

Offline quizzes support answer selection, shuffle, missed-question practice, FRQ comparison, and saved progress. Interrupted downloads can resume. The status checks that every required file is cached; a partially downloaded set is never labeled ready. Use **Check offline files** to verify the saved set.

Downloads and scores belong to this browser/device. Clearing site data removes them, and browsers can evict offline files when storage is scarce. Private browsing may not retain them. If files are removed, reconnect and download again. Installation alone does not download the question bank; wait for **Ready offline**.

### Offline validation

With a local server running on port 4174 and Playwright available:

```sh
QUIZ_URL=http://localhost:4174 node tests/offline-browser.mjs
```

This test disables the browser connection, verifies interruption/retry and the complete cache, closes and reopens the page offline, answers questions, shuffles, opens a previously unvisited FRQ and its rubric, checks saved drafts, and repairs an intentionally missing cached image.

When changing application files or questions in a future release, bump `VERSION` in `sw.js` and update the matching cache name in the offline test. The new service worker installs a complete application shell before activating; the user then downloads that release's question assets. Offline clients keep their existing release until they reconnect.

## Practice

- **Multiple choice:** click the original answer text or diagram itself to see the correct answer and reasoning. The first selection counts for that round. Clicking other choices lets you review explanations without changing the recorded attempt.
- **Missed questions:** practice only items whose latest attempt was incorrect. Getting one right removes it from the *next* missed-question round. The current queue stays stable so navigation never skips an item. Enable “Include previously missed” to revisit recovered questions too.
- **Shuffle:** starts a fresh shuffled round of the active set without deleting your scores or drafts. Each question appears once per round. The original choice order stays unchanged to preserve figure labels and the exact source.
- **Free response:** type your answer, select **Get answer**, and compare it with the original scoring rubric. Mark it correct or needing practice yourself; FRQs are not automatically graded. For graph/drawing prompts, sketch on paper and describe your reasoning in the editor.
- **Question library:** jump directly to any question in the active round. Color indicates the latest saved result.
- **Progress:** MCQ accuracy reflects the latest result on each attempted MCQ. The “need practice” total includes MCQs and self-assessed FRQs. Round scores are separate from lifetime history; skipped questions are not marked wrong.
- **Persistence:** drafts, results, and the active round are saved in this browser's `localStorage`. There is no account, backend, cross-device sync, or automatic cloud backup. Reset explicitly clears all local progress. Switching practice tabs starts a new round in that mode.
- **Keyboard:** A–E to answer and arrow keys to navigate when focus is outside a control. All buttons also support normal keyboard activation.

## Exact source content

Problem and scoring-guide images preserve the PDF's original wording, diagrams, tables, equations, numbering, repeated problems, and even unrelated material that appears in the original (for example, question 132's stickleback passage). Shared setups travel with their questions in shuffled rounds. Tap an image to open it at full size.

Answer-key highlight graphics are removed **before rendering**. The original answer key is extracted independently from the unmodified PDF, using explicit “Answer” labels and highlighted-choice rectangles. Where both are present, extraction checks that they agree. Prompts are cropped separately from answers and FRQ rubrics so the latter appear only after answering/revealing them.

119 MCQs include written explanations from the PDF. The other 64 have **added study explanations**, clearly labeled in the app. Original explanation images remain available for formulas whose plain-text extraction is imperfect. The text transcript is a convenience; original images are authoritative for figures, equations, and layout.

FRQ rubric images contain the source's example point selectors and repeated criteria. These are part of the source and are **not** an automatic score for your typed response. The full source PDF is not bundled.

## Verification

```sh
npm test
```

The Node tests check all 277 IDs, asset completeness, answer keys, explanation/rubric coverage, shared setups, shuffle uniqueness, scoring lock, missed-question recovery, FRQ state persistence, and invalid saved-state recovery. GitHub Actions runs these tests on pushes and pull requests.

The app was also exercised in Chrome at desktop and mobile sizes for incorrect/correct choices, reload persistence, missed-only practice, recovered history, FRQ draft and answer reveal, self-assessment, shuffle, library navigation, and horizontal overflow.

## Reproduce the extraction

```sh
python -m pip install pymupdf pillow numpy
python scripts/extract.py '/path/to/AP Bio Unit 2 (2)-compressed (3).pdf'
```

The script expects this specific source document. Added explanations are maintained separately in `scripts/study-explanations.json`. After regeneration, run `npm test` and visually inspect the question and rubric images.

## Design and content

The app uses a restrained green study interface with DaisyUI as its component baseline and local responsive styles. DaisyUI is vendored locally with its MIT license so the interface has no network dependency.

The supplied assessment content and marks retain their original ownership. This private study repository does not claim ownership of the assessment material or affiliation with College Board.
