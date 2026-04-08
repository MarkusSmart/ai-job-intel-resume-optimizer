# AI Job Intelligence & Resume Optimizer

End-to-end AI application for analyzing a job posting against a resume, identifying gaps, and suggesting improvements. This repo is built as a proof of concept for an assignment emphasizing ingestion ? ETL ? storage ? reasoning ? UI.

Planned core user tasks:
- What skills am I missing?
- How can I improve my resume for this job?
- How well do I match this job?

Scope constraints:
- No accounts
- No file uploads (paste text only)
- No database
- No multi-job tracking

## Local setup

1. Install dependencies: `npm install`
2. Run ETL to generate processed data: `npm run etl`
3. Start dev server: `npm run dev`

## LLM configuration

Set `OPENAI_API_KEY` in your environment to enable the live model call.
Optional: `OPENAI_MODEL` (defaults to `gpt-4o-mini`).
