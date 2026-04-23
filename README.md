# AI Job Intelligence & Resume Optimizer

This is my Assignment 5 app extended for Assignment 6.

The app compares a pasted job posting against a pasted resume, estimates match strength, identifies missing core skills, and suggests resume improvements. It is intentionally small and practical: no accounts, no uploads, no database, and no long-term user history.

## Live App

Vercel URL: `https://ai-job-intel-resume-optimizer.vercel.app`

## What The App Supports

- Compare a pasted resume to a job posting
- Surface likely missing must-have skills
- Show a match score based on structured requirements
- Suggest resume bullet improvements and keywords
- Show which stored reference job record was used during analysis

## What Is Out Of Scope

- PDF or DOCX parsing
- Direct resume rewriting inside the editor
- Multi-job tracking
- User authentication
- Large-scale retrieval over many documents

## Architecture Classification

I classify this app as a `Hybrid` architecture:

1. `Lightweight retrieval / lookup`
   The system reads `data/processed_jobs.json` and selects the best reference job record for the pasted posting.
2. `Prompt-first generation`
   The selected gaps plus the raw job and resume text are then passed to the LLM layer to generate resume-improvement suggestions.

This is not a full RAG system with embeddings or vector search. The stored dataset is only three structured job records, so a small deterministic lookup is cheaper and easier to debug than a full retrieval stack.

### Why this architecture fits

- `Amount of data / number of files`: the dataset is tiny, so vector retrieval would be unnecessary overhead.
- `Context-window limits`: only one selected reference record plus the pasted texts need to go into the prompt, so context pressure is low.
- `Retrieval or storage needs`: I still need stored structured job requirements, but simple JSON storage is enough.
- `Determinism needs`: match score and gap detection should be reproducible, so they are handled deterministically before the LLM step.
- `Cost`: deterministic analysis is effectively free; the LLM is only used for explanation and recommendations.
- `Operational overhead`: no database, embeddings pipeline, or tool orchestration are required.
- `Performance`: JSON lookup plus string matching is fast.
- `Ease of debugging`: the selected reference job, matched requirements, and score are inspectable.

### Main alternative I did not choose

The main alternative was a `Retrieval-first / RAG` architecture.

I did not choose full RAG because:

- the dataset is too small to justify embeddings and vector storage
- the source of truth is already structured
- the simpler deterministic lookup is easier to explain, test, and debug for this assignment

### Important capability I did not implement

I did not implement `tool calling`.

Tool calling could help if I later want the model to:

- parse uploaded resumes
- call a structured resume-rewrite function
- save analysis runs
- fetch live job postings from URLs

It would improve automation, but it would also add routing logic, tool validation, more failure modes, and more operational overhead. I would add it if the app grows beyond pasted text and starts supporting real document ingestion or multi-step resume editing workflows.

## Source Of Truth And Pipeline

### Raw input

- `data/jobs.json`: hand-curated raw job records
- user-pasted `jobText`
- user-pasted `resumeText`

### Transformation

- `scripts/etl.mjs` normalizes raw records into `data/processed_jobs.json`
- the analyzer normalizes wording, applies skill aliases, and chooses the best matching stored job record

### Stored artifacts

- `data/processed_jobs.json`: normalized source of truth for structured role requirements
- `evaluation/cases.json`: saved evaluation fixtures
- `evaluation/results.json`: saved evaluation output

### Runtime flow

1. User pastes a job posting and resume in `app/page.tsx`
2. `app/api/analyze/route.ts` receives both texts
3. `lib/jobs.ts` loads `data/processed_jobs.json`
4. `lib/analyze.ts` selects the best reference job and computes match score plus missing skills
5. `lib/llm.ts` generates resume suggestions from the pasted text plus detected gaps
6. The UI renders the score, gaps, keywords, LLM suggestions, and debug metadata

### Internal information kept for debugging and evaluation

- matched reference job title and ID
- selection score
- matched must-have requirements
- matched nice-to-have requirements
- missing core skills
- evaluation-case notes and expected outputs

## Evaluation Artifacts

- `evaluation/cases.json`
  Contains `5` representative cases and `2` failure cases.
- `evaluation/results.json`
  Saved output from the latest evaluation run.
- `scripts/evaluate.mjs`
  Runs the evaluation and compares the improved analyzer against a simple baseline.
- `lib/analyze.test.ts`
  Unit tests for deterministic analysis behavior.
- `tests/analyze.spec.ts`
  Playwright end-to-end UI check.

## Metrics

I evaluated three required areas:

1. `Output quality`
   Measured with gap-detection F1 and exact gap-match rate against annotated expected missing skills.
2. `End-to-end task success`
   A run counts as successful when the app selects the correct reference job, returns the expected missing skills, and produces valid recommendation output.
3. `One upstream component`
   I measured `reference_job_selection_accuracy`, because choosing the wrong stored job record causes downstream errors even if the rest of the pipeline works.

## Baseline Comparison

The lightweight baseline is the original Assignment 5 logic:

- match a stored job only when the pasted posting literally contains the full stored title
- detect skills with exact substring matching only

The improved system adds:

- better reference-job selection based on title variants plus requirement overlap
- alias-aware matching for phrases like `A/B testing` -> `experimentation`
- debug metadata in the result so job selection is visible in the UI

## Latest Evaluation Results

From `evaluation/results.json`:

- Baseline output-quality F1: `0.4286`
- Improved output-quality F1: `0.7143`
- Baseline exact gap-match rate: `0.4286`
- Improved exact gap-match rate: `0.7143`
- Baseline end-to-end success on representative cases: `0.6`
- Improved end-to-end success on representative cases: `1.0`
- Baseline reference-job selection accuracy on representative cases: `0.8`
- Improved reference-job selection accuracy on representative cases: `1.0`

## Evidence-Based Improvement

### Weak point found

The original analyzer failed when realistic wording differed from the tiny stored dataset.

Two concrete examples:

- `BI Developer` did not match `Business Intelligence Developer`
- `A/B testing` did not count as `experimentation`

### What I changed

- improved stored-job selection using title variants and skill overlap
- added alias-aware requirement matching
- exposed reference-job metadata in the UI to make debugging easier

### What improved

- all `5/5` representative cases now succeed end-to-end
- the upstream job-selection metric improved from `0.8` to `1.0` on representative cases
- exact gap matching improved from `0.4286` to `0.7143`

### What remains weak

The system still misses some implied or indirect phrasing:

- `controlled studies` is not yet mapped to `experimentation`
- `Microsoft BI suite` and `semantic models` are not yet mapped cleanly to `Power BI` and `data modeling`

Those are intentionally kept as documented failure cases in `evaluation/cases.json`.

## Local Setup

1. Install dependencies: `npm install`
2. Generate normalized data: `npm run etl`
3. Start the dev server: `npm run dev`
4. Run evaluation: `npm run eval`
5. Run unit tests: `npm test`
6. Run browser test: `npm run test:e2e`

## Environment Variables

- `OPENAI_API_KEY`: enables live model calls
- `OPENAI_MODEL`: optional, defaults to `gpt-4o-mini`

If no API key is set, the app falls back to deterministic stub suggestions so the app remains demoable and testable.
