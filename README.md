# ZJU Microbiology Tests

一个用于浙江大学微生物学期末复习的静态前端题库。项目基于 React + Vite + TypeScript，支持章节随机练习、历年真题练习、即时答案反馈和本地错题本。

## 已实现

- 前言页、章节选择页、刷题页、结果页、错题本页、关于页
- 支持单章或多章节混练
- 开始练习时统一乱序，一次一题作答
- 点击选项后立即显示正确答案和解析
- 答错或点击“不知道”的题自动进入本地错题本
- 可发起“只练错题”
- 移动端底部固定操作区，方便手机使用
- 少量图题保留原 PDF 页跳转
- 支持 GitHub Pages 和 Netlify 静态部署

## 题库来源

- 章节 PDF 来源目录：`mid_exam/tests`
- 当前已生成题库：`public/question-bank.json`
- 当前已复制静态 PDF：`public/pdfs/*.pdf`
- 历年真题来源目录：`tests/*.pdf`
- 当前真题题库：`public/past-exams.json`

当前题库包含 33 个章节、1586 道选择题。期末复习范围由 `src/lib/chapterScope.ts` 控制，目前保留章节 `1-9, 11-13, 19-20`，共 667 道选择题。

## 本地运行

PowerShell 中建议使用 `npm.cmd`：

```powershell
npm.cmd install
npm.cmd run dev
```

开发服务器启动后打开：

```text
http://127.0.0.1:5173
```

## 本地构建

```powershell
npm.cmd run build
```

构建产物目录：

```text
dist/
```

## 内容更新

题库生成脚本不会在部署构建时自动执行，这是为了让 GitHub Pages / Netlify 部署不依赖 Python、PyMuPDF、pypdf 或 `pdftotext`。

如果你修改了 `mid_exam/tests` 下的章节 PDF，请手动刷新题库：

```powershell
npm.cmd run refresh:content
```

如果你修改了 `tests` 下的真题 PDF，请手动刷新真题题库：

```powershell
npm.cmd run generate:past-exams
```

如果需要补充 AI 解析，需要配置 `DASHSCOPE_API_KEY_BIOLOGY` 或 `DASHSCOPE_API_KEY`，再运行：

```powershell
npm.cmd run generate:explanations
npm.cmd run generate:past-exam-ai
```

## 部署

GitHub Pages：

- workflow：`.github/workflows/deploy.yml`
- 触发方式：push 到 `main`
- 构建时设置 `GITHUB_PAGES=true`
- Vite base path 自动变为 `/ZJU_Microbiology_tests/`

Netlify：

- 配置文件：`netlify.toml`
- Build command：`npm run build`
- Publish directory：`dist`
- SPA fallback：`public/_redirects`

因为题库 JSON 和 PDF 都已经在仓库内，部署平台只需要普通前端构建，不需要后端。

## 主要文件

- `src/pages/`：前言、选章、练习、结果、错题本、真题、关于页面
- `src/context/PracticeContext.tsx`：练习状态和错题本状态
- `src/lib/chapterScope.ts`：期末复习章节范围
- `src/lib/practice.ts`：乱序、会话和题库工具函数
- `scripts/generate_question_bank.py`：章节题库刷新脚本
- `scripts/generate_past_exam_bank.py`：真题题库刷新脚本
- `AGENTS.md` 和 `docs/repository-overview.md`：给后续维护者/AI agent 的交接说明
