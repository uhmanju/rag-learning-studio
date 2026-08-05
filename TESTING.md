# Testing this app

Two parts: **Part A** tests Demo Mode (frontend only, zero setup, no
backend required). **Part B** tests Local Mode against a real running
backend. Do Part A first — it's faster to iterate on and catches most UI
bugs; Part B is specifically for verifying the real backend integration
itself.

Both parts assume `cd frontend && npm install && npm run dev`, then open
the printed local URL. The app starts in Demo Mode by default.

---

## Part A — Demo Mode (frontend only)

### 0. Dashboard

- The Backend toggle (top right) should show **Demo** selected and
  **Local** visibly disabled/greyed — Local Mode only works when the app
  itself is running on `localhost`, so on a real hosted deployment (or if
  you're checking this against a build served from anywhere but
  `localhost`/`127.0.0.1`), Local should stay unavailable.
- **How this works** panel should be expanded by default (not collapsed).
- **Known limitations** (⚑ icon, top right, and the expanded panel further
  down the page) should list 6 items, including the new "one basic
  approach per stage" one and the OCR/scanned-page one referencing the
  Engineering Standards Manual sample specifically.
- Click **Start with a sample document** → should land on Upload with the
  sample picker, not a file dropzone (Demo Mode never shows a raw upload
  dropzone — only Local Mode does).

### 1. Upload → sample picker

- 4 cards should be visible: **FalconTest Automation Framework Guide**
  (★ Beginner, green "Clean" badge), **APIVerify Integration Handbook**
  (★★ Intermediate, amber "Moderate" badge), **AI Testing & RAG
  Playbook** (★★★ Advanced, red "Challenging" badge), **Engineering
  Standards Manual** (★★★★ Expert, red "Challenging" badge).
- Pick any one — should show a brief "Loading PDF…" state, then land on
  Parse automatically.

### 2. Parse

- Left column should say **"Original PDF (real render)"** with a
  **↓ Download** link, and actually show real rendered PDF pages (not
  placeholder text) — this is a real PDF.js render of the actual sample
  file, not extracted text formatted to look like a PDF.
- Click **Download** — should download the real PDF file.
- Right column ("Parsed Markdown") should show real extracted text with
  inline markers: 🖼 for images, `H1`/`H2` heading markers, `▦` for
  tables. If you picked the **Engineering Standards Manual**, page 8
  should visibly be lower-quality/noisier text — that's the real, actual
  OCR pass this document went through, not a bug.
- Scroll either column — both should move together (synced scroll).

### 3. Clean

- Should show real whitespace-diff marks if the sample had any, or an
  honest "already clean, nothing to change" message with an optional
  illustrative example toggle if it didn't — either is a correct result,
  not a broken page.

### 4. Chunk — the flagship interactive stage

- Heading should read "Entire Document → Colored Chunk Boundaries
  (Strategy: Recursive character splitting)" — the strategy note is
  inline with the heading, not a separate line.
- Chunk cards should be colored, grouped by page, with dashed overlap-seam
  boxes between adjacent chunks showing real shared text and a real
  character count.
- Drag chunk size down (~200) and back up — a sentence should visibly get
  cut mid-thought at the smaller size, then the overlap should cover the
  seam again once you bring overlap back up (per the Learning Card's
  "Try it" prompt).
- Click **Rebuild** — chunk cards should regenerate live.

### 5. Embed

- A 2D scatter plot of real chunk embeddings, plus a real vector-value
  preview when you click a point.
- If a single point looks like an extreme outlier relative to the rest,
  it should render pinned to the chart's edge with a dashed ring — not
  compress every other point into a corner.

### 6. Retrieve — test both the success and failure paths

- Type a real question the document can answer (each sample's own
  "Questions to Try" section, near the end of the document, is a good
  source) and click **Ask**.
- While the request is in flight: the question input, both sliders, and
  the Ask/Re-run buttons should all be disabled, and the Ask button
  should show a small spinner + "Asking…" — you should not be able to
  fire a second request until the first resolves.
- The vector-space chart and the ranked candidate list should sit
  side-by-side (chart on the left, candidates on the right on a wide
  screen), each scrolling independently.
- **Failure path (worth testing deliberately):** ask something the
  document doesn't cover — the **Engineering Standards Manual** sample's
  own "Questions to Try" list includes at least one question with no
  answer anywhere in the document, by design. You should see a real
  diagnosis panel (closest candidate's actual score vs. the threshold,
  with a one-click "try this threshold" suggestion), not just a bare "no
  results."
- Drag **Top K** or **Threshold** and click **Re-run retrieval** — the
  ranked list should change without re-asking the question.

### 7. Prompt

- Real assembled prompt sections (system / context / question), each
  context section color-linked back to its source chunk. Copy button on
  the final assembled prompt should work.

### 8. Generate

- With a default key configured or your own key added (see the key icon,
  top right): a real generated answer, with source chips below it and a
  small "Model: …" line.
- With **no** key available at all: a clearly labeled blocked state
  ("No answer generated — no LLM available") — not a fabricated-looking
  answer, and not silence.
- If you asked a genuinely unanswerable question in step 6, a real model
  should abstain ("I don't know based on the provided context") rather
  than guessing — that's the correct, intended behavior, not a bug.

### 9. Evaluate

- Should show the "coming soon" panel exactly — no numbers, no charts,
  just the honest placeholder. If you see any metric values here, that's
  a regression back to an earlier, incorrect version of this page.

### 10. Cross-cutting checks

- Every stage's Learning Card should say **"Learn more ▸"** collapsed /
  **"Show less ▾"** expanded (not "Expand"/"Collapse"), with a small
  pulsing dot next to "Learn more" until you've opened it once.
- The header on every stage page should show **"Working with:
  <filename>.pdf"** — not a stage-specific technical description.
- The ⚑ (Known limitations) icon should be present in the header on
  every page, and clicking it from any non-Dashboard page should navigate
  to the Dashboard and scroll straight to the expanded limitations
  section — not open a duplicate popup.
- The 🔑 (LLM settings) icon should be visible in the Dashboard header
  only — it should **not** appear in the shared header on Parse/Clean/
  Chunk/etc.

---

## Part B — Local Mode (real backend)

### Setup

```bash
cd backend
pip install -e .
ollama serve &            # or set LLM_PROVIDER=anthropic in config.py
uvicorn api:app --reload --port 8000
```

In `frontend/.env.local` (copy from `.env.example` if you haven't):

```
VITE_PIPELINE_DATA_SOURCE=http
VITE_API_BASE_URL=http://localhost:8000/api
```

Restart `npm run dev` after editing `.env.local` — Vite only reads it at
startup.

### 1. Confirm the backend is actually up

```bash
curl http://localhost:8000/api/health
```

Should return `{"status":"ok","activeRuns":0}`. If Local Mode's status
pill in the app still shows "Trying to connect…" a while after this
succeeds, something's wrong with the frontend's own connection, not the
backend — check the browser console.

### 2. Upload one of your own PDFs

- On Upload, the toggle should now allow **Local** to be selected (you're
  on `localhost`), and the page should show a real drag-and-drop
  dropzone instead of the sample picker.
- Upload a real PDF you have on hand — any genuine, text-based PDF works
  for a first test.
- Check the browser's network tab: you should see a real `POST
  /api/documents` request. If it 404s even though `curl .../health`
  works, check that `VITE_API_BASE_URL` is actually set — without it,
  requests silently go to Vite's own dev server instead of the backend
  (see `httpPipelineDataSource.ts`'s comments on `checkHealth()` for why
  this specific failure mode is easy to misdiagnose).
- Parse should show a real PDF.js render of *your* actual uploaded file
  (with a working Download link), and Parse/Clean/Chunk/Embed should all
  populate with your document's real text and page count, not any
  bundled sample's.

### 3. Ask a real question

- Type a question you know the actual answer to from your own document.
- Retrieval should show real distance/similarity scores computed by the
  real backend, not any illustrative placeholder values.

### 4. Test the LLM-down path deliberately

- Stop Ollama (or otherwise make generation fail) and ask a question.
- You should get a clear, honest error — not a fabricated-looking answer
  and not a silent hang.

### 5. Test chunk rebuild against your real document

- On Chunk, drag the sliders and click Rebuild — this should trigger a
  real `POST /api/runs/{run_id}/chunks` call and regenerate chunks from
  your actual document text.

### 6. Compare against Demo Mode

- Flip `.env.local` back to `VITE_PIPELINE_DATA_SOURCE=mock` (or just use
  the in-app Backend toggle) and restart if needed. The UI should look
  and behave identically — same components, same interactions — just
  against the bundled sample data instead of your real backend. If
  something looks structurally different between the two modes (not just
  "different data," but a different layout or a missing feature), that's
  a real bug in how one of the two `PipelineDataSource` adapters is
  wired up, not an intentional difference.

---

## If something in this list doesn't match what you see

That's either a real regression worth filing an issue for, or this
document itself has drifted out of sync with the app again — check the
actual running UI against this file's description and, if they disagree,
trust the UI and flag the doc as stale rather than assuming you're doing
something wrong.
