# Agent Handoff Notes

This repository is a static Vite + React + TypeScript practice app for ZJU microbiology review. Read this file first before changing code or regenerating content.

## Current Shape

- App runtime is entirely client-side. There is no backend.
- Routing is defined in `src/App.tsx` and uses `react-router-dom` with `BrowserRouter` from `src/main.tsx`.
- Practice data is fetched from `public/question-bank.json` by `src/hooks/useQuestionBank.ts`.
- Past-exam data is fetched from `public/past-exams.json` by `src/hooks/usePastExamBank.ts`.
- Chapter PDFs are served from `public/pdfs/chapter-XX.pdf`.
- Build output goes to `dist/`.

## Important Commands

Use `npm.cmd` in PowerShell. Plain `npm` can fail on Windows because `npm.ps1` may be blocked by execution policy.

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run build
npm.cmd run lint
```

Content generation commands:

```powershell
npm.cmd run generate:question-bank
npm.cmd run generate:explanations
npm.cmd run generate:past-exams
npm.cmd run generate:past-exam-ai
```

The Python scripts are not part of the deploy build. Static JSON/PDF assets are committed and deployed directly.

## High-Value Files

- `src/types.ts` defines the JSON and app state contracts.
- `src/context/PracticeContext.tsx` owns selected chapters, current practice session, mistake records, and localStorage persistence.
- `src/context/practiceContextObject.ts` defines the context interface.
- `src/lib/practice.ts` builds sessions, shuffles question order, scores sessions, and builds PDF links.
- `src/lib/chapterScope.ts` limits the visible final-review chapter set.
- `src/pages/PracticePage.tsx` is the main chapter/mistake practice UI.
- `src/pages/PastExamPaperPage.tsx` is the past-exam paper UI and uses local component state only.
- `scripts/generate_question_bank.py` extracts chapter questions and copies chapter PDFs into `public/pdfs`.
- `scripts/generate_past_exam_bank.py` extracts/matches past-exam PDFs and writes `public/past-exams.json`.
- `scripts/generate_explanations.py` and `scripts/generate_past_exam_ai.py` call DashScope-compatible chat completions.

## Practice Flow

1. `App` loads `question-bank.json`.
2. `PracticeProvider` creates a question lookup and restores localStorage state.
3. `ChapterSelectionPage` writes selected chapter IDs and starts a shuffled `PracticeSession`.
4. `PracticePage` records each first answer only. Incorrect answers and `UNKNOWN` go into the mistake notebook.
5. In mistake mode, a correct answer removes that question from the mistake notebook.
6. `ResultsPage` summarizes the active session and can restart or clear it.

The localStorage keys are:

- `microbiology-final-review-session`
- `microbiology-final-review-selection`
- `microbiology-final-review-mistakes`

## Past-Exam Flow

Past-exam pages do not use `PracticeContext` for answers or mistakes.

1. `PastExamsPage` loads `past-exams.json`.
2. `PastExamPaperPage` stores selected answers in component state.
3. Answers reset when the paper component remounts or the user clicks restart.
4. Past-exam answers do not enter the mistake notebook.

## Data Snapshot

As last inspected:

- `public/question-bank.json`: 33 chapters, 1586 total questions.
- Active final-review scope in `src/lib/chapterScope.ts`: chapters 1-9, 11-13, 19-20.
- Scoped question count: 667.
- AI explanations in question bank: 933 total, 667 in scope.
- `public/past-exams.json`: 2024 and 2025 midterm papers only.
- A 2026 Spring-Summer midterm PDF may exist locally under `tests/26春夏-期中.pdf`; it is not represented in `public/past-exams.json` unless the past-exam generator has been rerun.

## Content Pipeline Notes

`generate_question_bank.py` reads source chapter PDFs from `mid_exam/tests` inside this repository. It expects files named `chapter 1.pdf`, `chapter 2.pdf`, and so on. It writes:

- `public/question-bank.json`
- `public/pdfs/chapter-XX.pdf`

`generate_past_exam_bank.py` reads all `tests/*.pdf`, matches questions against `public/question-bank.json`, preserves existing answers/explanations when possible, writes:

- `public/past-exams.json`
- `tests/past-exams-match-report.md`

`generate_explanations.py` and `generate_past_exam_ai.py` require one of:

- `DASHSCOPE_API_KEY_BIOLOGY`
- `DASHSCOPE_API_KEY`

Python dependencies are not pinned in this repo. The scripts import `fitz`/PyMuPDF and `pypdf`; `generate_question_bank.py` also shells out to `pdftotext`.

## Deployment

- Netlify uses `netlify.toml`: build command `npm run build`, publish `dist`, Node 22.
- GitHub Pages uses `.github/workflows/deploy.yml`, sets `GITHUB_PAGES=true`, and Vite uses the repository-name base path.
- `public/_redirects` rewrites all routes to `/index.html` for SPA routing.

## Known Risks and Conventions

- Many UI strings and some comments display as mojibake in the current files. Do not mass-rewrite text unless the task is specifically to fix encoding/content.
- `question-bank.json` may contain a UTF-8 BOM. Browser `response.json()` handles it, but simple Node `JSON.parse(fs.readFileSync(..., "utf8"))` needs BOM stripping.
- Keep app data contracts in sync with `src/types.ts` before changing generated JSON shape.
- Do not regenerate content casually. Generation updates large JSON files and may overwrite preserved explanations.
- If adding 2026 past-exam support, first decide whether `tests/26春夏-期中.pdf` should be tracked, then run the past-exam generation path and inspect `tests/past-exams-match-report.md`.
- There are no dedicated unit tests at the moment. Use `npm.cmd run build` as the baseline verification after code changes.

More detail is in `docs/repository-overview.md`.
