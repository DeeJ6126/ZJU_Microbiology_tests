# Repository Overview

This document is a working map for future agents. It describes the project boundaries, frontend flow, content-generation pipeline, and the facts that are easy to miss when entering the repository cold.

## Purpose

The app is a static microbiology review tool. It supports:

- final-review chapter selection and randomized practice;
- immediate answer feedback with optional AI explanations;
- a local mistake notebook backed by `localStorage`;
- full-paper past-exam practice for already generated midterm papers;
- static deployment through Netlify or GitHub Pages.

There is no server-side runtime. All app state is either loaded from static files in `public/` or stored in the browser.

## Runtime Architecture

`src/main.tsx` mounts React under `BrowserRouter`:

```tsx
<BrowserRouter basename={import.meta.env.BASE_URL}>
  <App />
</BrowserRouter>
```

`src/App.tsx` then:

1. calls `useQuestionBank()` to fetch `question-bank.json`;
2. shows loading/error screens while the question bank is unavailable;
3. wraps the application in `PracticeProvider`;
4. renders the route table.

Current routes:

| Route | Component | Notes |
| --- | --- | --- |
| `/` | `IntroPage` | Landing/dashboard entry. |
| `/chapters` | `ChapterSelectionPage` | Selects scoped chapters and starts chapter practice. |
| `/past-exams` | `PastExamsPage` | Lists generated past-exam papers. |
| `/past-exams/:examId` | `PastExamPaperPage` | Runs one static past-exam paper. |
| `/practice` | `PracticePage` | Runs chapter or mistake practice from `PracticeContext`. |
| `/mistakes` | `MistakesPage` | Lists and starts mistake practice. |
| `/results` | `ResultsPage` | Summarizes the current practice session. |
| `/about` | `AboutPage` | Static about/contact page. |

`src/components/AppLayout.tsx` provides the shared shell, navigation, active session progress, and mistake count.

## Data Contracts

`src/types.ts` is the authoritative TypeScript contract for generated JSON and runtime state.

Main data types:

- `QuestionBank`: `generatedAt`, `totalQuestions`, `chapters`, `questions`.
- `Question`: chapter metadata, prompt/options, `answerKey`, source PDF/page, `hasFigure`, optional `aiExplanation`.
- `PracticeSession`: mode, title, selected chapters, shuffled `questionOrder`, current index, answers, start time.
- `MistakeRecord`: one persisted record per wrong or unknown question.
- `PastExamBank`: generated exam set.
- `PastExam`: title/source/summary/questions for a paper.
- `PastExamQuestion`: prompt/options, optional answer/explanation, fuzzy-match metadata.

When changing the JSON shape, update `src/types.ts`, the generator scripts, and the consuming page/hook together.

## Chapter Practice State

`src/context/PracticeContext.tsx` is the state owner for the normal practice workflow. It is intentionally broader than a simple context wrapper: it builds a question lookup, sanitizes persisted state against the current question bank, writes to localStorage, and exposes all practice actions.

Persistent browser keys:

- `microbiology-final-review-session`
- `microbiology-final-review-selection`
- `microbiology-final-review-mistakes`

Key behavior:

- Chapter selection is normalized through `normalizeChapterSelection()` and filtered by `src/lib/chapterScope.ts`.
- `beginPractice()` creates a new shuffled session for selected chapters.
- `beginMistakePractice()` creates a session from current mistake records.
- `restartPractice()` preserves the mode: mistake sessions restart from mistakes, chapter sessions restart from their selected chapter IDs.
- `recordAnswer()` ignores duplicate answers for the same question in a session.
- Wrong answers and `UNKNOWN` are inserted into the mistake notebook.
- Correct answers remove a question from the mistake notebook only when the active session mode is `mistakes`.
- `sanitizeSession()` and `sanitizeMistakes()` protect the app from stale localStorage after regenerated content changes question IDs or chapter scope.

Pure helpers live in `src/lib/practice.ts`:

- `normalizeChapterSelection()`
- `getPracticePool()`
- `createPracticeSession()`
- `createMistakePracticeSession()`
- `buildQuestionLookup()`
- `findAnswer()`
- `getScoreSummary()`
- `getPdfHref()`

## Chapter Scope

`src/lib/chapterScope.ts` defines the user-visible final-review range:

```ts
export const SCOPED_CHAPTER_IDS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 19, 20,
]
```

The full generated question bank contains all 33 chapters, but normal practice pages show only this scope. If the course scope changes, update this file first and then verify counts on the intro and chapter selection pages.

Current inspected counts:

- Full bank: 33 chapters, 1586 questions.
- Scoped bank: 14 chapters, 667 questions.
- AI explanations: 933 total, 667 inside the scoped set.

## Past-Exam State

Past-exam practice is separate from chapter/mistake practice.

`src/hooks/usePastExamBank.ts` fetches `public/past-exams.json`.

`src/pages/PastExamPaperPage.tsx` keeps:

- `currentIndex` in component state;
- selected answers in `Record<number, OptionKey>`;
- score by comparing selected answers to each question's `answerKey`.

Past-exam selections are not persisted, are not written to the mistake notebook, and are reset by remounting or calling the page's restart handler.

Current inspected past-exam data:

| ID | Title | Source PDF | Questions | Answers | Explanations |
| --- | --- | --- | ---: | ---: | ---: |
| `midterm-24` | 2024 Spring-Summer midterm | 2024 midterm PDF under `tests/` | 51 | 51 | 51 |
| `midterm-25` | 2025 Spring-Summer midterm | 2025 midterm PDF under `tests/` | 50 | 50 | 50 |

A 2026 Spring-Summer midterm PDF may be present locally as `tests/26春夏-期中.pdf`, but it is not included in `public/past-exams.json` unless the past-exam generator has been rerun.

## Static Assets

Important files under `public/`:

- `question-bank.json`: generated chapter question bank.
- `past-exams.json`: generated past-exam bank.
- `pdfs/chapter-01.pdf` through `pdfs/chapter-33.pdf`: copied source PDFs used by source links.
- `_redirects`: Netlify SPA rewrite.
- `404.html`, `manifest.webmanifest`, `icons.svg`, `favicon.svg`: static app assets.

The app uses `import.meta.env.BASE_URL` when fetching JSON or linking PDFs, so GitHub Pages base paths work when `GITHUB_PAGES=true`.

## Content Generation Pipeline

The generated files are committed. They are not regenerated in Netlify or GitHub Pages builds.

### Question Bank

Command:

```powershell
npm.cmd run generate:question-bank
```

Script:

```text
scripts/generate_question_bank.py
```

Inputs:

- `mid_exam/tests/chapter 1.pdf` through `mid_exam/tests/chapter 33.pdf` inside this repository.
- A system `pdftotext` executable.
- Python package `fitz` from PyMuPDF.

Outputs:

- `public/question-bank.json`
- `public/pdfs/chapter-XX.pdf`

The parser extracts the multiple-choice section between "Multiple Choice Questions" and the next "True/False Questions" or "Essay Questions" marker. It uses regexes for `A)`, `B)`, `C)`, `D)`, and `Answer:` blocks. It also attempts to locate the original PDF page and marks figure-related questions by text patterns such as "shown below" and "following figure".

### Chapter Explanations

Command:

```powershell
npm.cmd run generate:explanations
```

Script:

```text
scripts/generate_explanations.py
```

Inputs:

- `public/question-bank.json`
- `DASHSCOPE_API_KEY_BIOLOGY` or `DASHSCOPE_API_KEY`

Behavior:

- Uses DashScope-compatible chat completions.
- Default model is `qwen3.5-122b-a10b`.
- Processes scoped chapters by default, with `--all-chapters` available.
- Preserves existing explanations unless `--force` is passed.
- Writes back after each batch.

Useful dry run:

```powershell
python scripts/generate_explanations.py --dry-run --limit 5
```

### Past-Exam Bank

Command:

```powershell
npm.cmd run generate:past-exams
```

Script:

```text
scripts/generate_past_exam_bank.py
```

Inputs:

- `tests/*.pdf`
- `public/question-bank.json`
- Python package `pypdf`

Outputs:

- `public/past-exams.json`
- `tests/past-exams-match-report.md`

Behavior:

- Extracts questions from each PDF.
- Parses reference answers when present.
- Matches each exam question against the question bank using normalized text and option similarity.
- Auto-fills answer/explanation from exact or high-confidence matches.
- Preserves existing generated answers/explanations when prompts still match.
- Applies a small set of manual explanation corrections inside the script.

Because the script reads every `tests/*.pdf`, adding a new PDF can change `public/past-exams.json` on the next run.

### Past-Exam AI Fill

Command:

```powershell
npm.cmd run generate:past-exam-ai
```

Script:

```text
scripts/generate_past_exam_ai.py
```

Inputs:

- `public/past-exams.json`
- `DASHSCOPE_API_KEY_BIOLOGY` or `DASHSCOPE_API_KEY`

Behavior:

- Fills missing answer keys and explanations for past-exam questions.
- Can be scoped with `--exam-id`.
- Preserves filled items unless `--force` is passed.

Useful dry run:

```powershell
python scripts/generate_past_exam_ai.py --dry-run --exam-id midterm-24 --limit 5
```

## Deployment

Netlify:

- `netlify.toml`
- build command: `npm run build`
- publish directory: `dist`
- Node version: 22
- SPA fallback: `public/_redirects`

GitHub Pages:

- `.github/workflows/deploy.yml`
- triggers on push to `main`
- sets `GITHUB_PAGES=true`
- Vite base becomes `/ZJU_Microbiology_tests/`

Local build verification:

```powershell
npm.cmd run build
```

Use `npm.cmd`, not plain `npm`, in PowerShell environments with restricted script execution.

## Current Worktree Notes

Before making changes, run:

```powershell
git status --short --branch
```

The repository may contain local-only handoff docs or newly supplied PDFs. In particular, `tests/26春夏-期中.pdf` is not included in `public/past-exams.json` until `npm.cmd run generate:past-exams` is run and the resulting JSON/report are reviewed.

Do not remove or overwrite user-provided PDFs unless explicitly asked.

## Known Gotchas

- Several source files and docs display Chinese strings as mojibake in PowerShell output. Avoid broad text rewrites unless the task explicitly targets encoding or copy fixes.
- `public/question-bank.json` may start with a UTF-8 BOM. Browser fetch parsing is fine, but ad hoc Node scripts should strip it before `JSON.parse`.
- There is no `requirements.txt` or Python lockfile. Install Python dependencies manually if running generators.
- There are no dedicated automated tests beyond TypeScript build/lint tooling.
- Large generated JSON files can change substantially after generator runs. Review diffs carefully.
- Past-exam mode and mistake mode are intentionally separate; do not connect them unless the product requirement says so.
