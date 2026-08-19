# I Really Know / 我真会

**Learning verification, not learning acceleration.**

Bring a piece of work you have already written. The app reads it, asks 4–7 questions that cannot be answered by copying, records your own read before showing any judgement, marks the exact source passages, and returns weak concepts after 1, 3 and 7 days from a different angle.

「我真会」让你把已经写好的论文、报告、代码或笔记带进来，先遇见考官可能会问的问题，再看哪些地方站住、哪些地方需要换个角度回来。它不会替你改写作业，也不检测或指控 AI 使用。

## Product boundaries

- Never writes, rewrites or improves submitted work.
- Never claims to detect AI or authorship.
- No student scores, percentages, rankings or peer comparison.
- Self-assessment is recorded before any model or manual judgement.
- No account, analytics or application backend.
- A provider key is entered only in **Settings** and remains in that browser.

## Student and instructor flows

- **Student:** 60-second sourced example → bring work + occasion + date → visible reading → one question at a time → self-read → one-line response → marked page → scheduled returns.
- **Instructor:** local CSV roster → one private student link per submission → student sends a private result link back → local evidence sheet and concept-level reteach map → print or direct PDF download.

Student and result links are self-contained URL fragments. They are never sent to this app's hosting server; anyone who receives a link can read the material inside it, so share it only with the intended person. Returned result links are student-controlled, not identity-authenticated, and stay out of the class reteach map until the instructor explicitly reviews them.

## Local development

```bash
npm ci
npm run dev
```

Production build:

```bash
npm run build
```

Complete local verification (build, isolated preview/mock servers, 390 px browser flow, offline route, teacher return loop/PDFs, error recovery and contrast):

```bash
npm run verify:all
```

Browser tests use Google Chrome on macOS by default. Set `CHROME_PATH=/path/to/chrome` elsewhere.

## Deployment

The public GitHub Pages workflow builds on pushes to `main`. Vite keeps `base: './'`, navigation uses hash routes, and the generated service worker precaches every emitted chunk for offline use.

No real API key belongs in this repository, test output, issue or chat. Real-provider question quality and iPhone installation are final human acceptance checks performed from the deployed app.
