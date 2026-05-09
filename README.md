# Microbiology Mid Exam Practice App

一个可直接部署到 Netlify 的微生物学章节选择题练习前端。

## 已实现

- 前言页、章节选择页、刷题页、结果页、错题本页
- 支持单章或多章节混练
- 开始练习时统一乱序，一次一题作答
- 点击选项后立即显示正确答案
- 做错的题自动进入本地错题本
- 可发起“只练错题”
- 移动端底部固定操作区，方便手机单手使用
- 保留少量图题的原 PDF 页跳转
- BrowserRouter + `_redirects`，适合直接部署到 Netlify

## 题库来源

- PDF 来源目录：`../mid_exam/tests`
- 当前已生成题库：`public/question-bank.json`
- 当前已复制静态 PDF：`public/pdfs/*.pdf`

当前题库包含 33 个章节、1586 道选择题。

## 本地运行

```bash
npm.cmd install
npm.cmd run dev
```

开发服务器启动后打开：

```text
http://127.0.0.1:5173
```

## 本地构建

```bash
npm.cmd run build
```

构建产物目录：

```text
dist/
```

## 如果 PDF 更新了

题库生成脚本不会在构建时自动执行，这是为了让 Netlify 部署不依赖本地 Python/PDF 工具链。

如果你修改了 `mid_exam/tests` 下的 PDF，请手动刷新题库：

```bash
npm.cmd run refresh:content
```

然后再执行：

```bash
npm.cmd run build
```

## Netlify 部署

项目已经包含：

- `netlify.toml`
- `public/_redirects`
- `public/manifest.webmanifest`

推荐做法：

1. 把整个 `mid_exam_practice_app` 目录推到 Git 仓库。
2. 在 Netlify 中选择该仓库创建站点。
3. Build command 填 `npm run build`
4. Publish directory 填 `dist`

因为题库 JSON 和 PDF 都已经在仓库内，Netlify 只需要普通前端构建，不需要额外后端。

## 主要文件

- `src/pages/`: 前言、选章、练习、结果、错题本页面
- `src/context/PracticeContext.tsx`: 练习状态和错题本状态
- `src/lib/practice.ts`: 乱序、会话和题库工具函数
- `scripts/generate_question_bank.py`: 本地题库刷新脚本
