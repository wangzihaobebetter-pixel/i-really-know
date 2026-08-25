# I Really Know / 我真会

**A rehearsal before the room — not a certificate for anyone else.**

Before they ask you, this asks you first. The output is for the person who ran it; nothing here is designed to be handed to a third party as evidence.

Bring a piece of work you have already written and name the room you are preparing for. The app reads it visibly, asks 4–7 questions that cannot be answered by copying, records your own read before showing any judgement, and brings loose links back from a different angle.

「我真会」是一场站在真实场合之前的私人彩排：把已经写好的论文、报告、代码或笔记带进来，先在这里听到难问，再把自己说过且站住的话留下。它不会替你改写作业，也不检测或指控 AI 使用。

The student surface is built around a **living margin**: one visible line connects the exact source passage to the hard question, the student's answer, and the mark that remains. Today is framed by the next room and date; Work keeps each marked piece; You begins with the student's own words rather than a score.

Before any question is asked, the app **reads the work in front of you**: your own text on screen, a light passing down it, and the places worth explaining out loud surfacing one at a time in your own words. The pass has a floor, so it happens even when the questions are already cached — being read is the point, not waiting.

Nine student screens: 今天 · 提交 · 读 · 过一遍 · 结果 · 作业 · 你 · 欢迎 · 设置. A returning question is answered on 过一遍 like any other, and 作业 opens a piece in place rather than on a screen of its own.

## Sample coverage

Eleven real student artifacts ship, each with a source URL, hand-written probes and Simplified Chinese for everything the student reads — medicine ×2, computer science, statistics, machine learning, biology ×2, physics, argument writing, epidemiology and mathematics. They are reachable from Today without a key, so any of them can be run end to end on a first open.

**There is no chemistry sample and that is deliberate.** No genuine student-submitted chemistry lab report could be found under a usable licence; the closest candidate was an instructor template bylined "Joe Student". `verify-samples` prints the gap on every build rather than letting an invented one fill it. The chemistry pack itself works the moment a student brings their own work — what is missing is the no-key demonstration, not the capability.

## Product boundaries

- Never writes, rewrites or improves submitted work.
- Never claims to detect AI or authorship.
- Never positions itself as proof for a third party. A run-through is a rehearsal the student runs on themselves.
- The gap between the self-estimate and the verdict is kept and computed, but it is an internal diagnostic — never a headline, never a first-screen claim.
- No student scores, percentages, rankings or peer comparison.
- Self-assessment is recorded before any model or manual judgement.
- No account, analytics or application backend.
- A provider key is entered only in **Settings** and remains in that browser.

## Student and instructor flows

- **Student:** one live sourced exchange → bring work + occasion + date → visible reading → one question at a time → self-read → one-line response → own words + marked page → scheduled returns.
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

`npm run build` runs the static gates only — types, sample anchors and provenance, bilingual parity, discipline detection, copy lint, routing, IA. **It does not run anything that needs a rendered page.** Contrast, the 390 px browser flow, the offline route, the teacher return loop and PDF output all live behind `verify:all`, which starts its own preview and mock servers:

```bash
npm run verify:all
```

Run that before believing a change is safe. A darkened page colour once passed every build gate and still broke WCAG AA on thirteen sampled surfaces, because the gate that measures rendered pixels was not in `build`.

Browser tests use Google Chrome on macOS by default. Set `CHROME_PATH=/path/to/chrome` elsewhere.

**Do not keep this checkout inside an iCloud-synced folder** (`~/Desktop` and `~/Documents` are synced by default when Desktop & Documents sync is on). iCloud evicts files to `compressed,dataless` placeholders, and reads of them fail with `Unknown system error -11`. It surfaces as `npm ci` failing at random, or as `tsc` reporting `@types/react` "not found" while `ls` shows the file present. Check with `ls -laOR node_modules | grep -c dataless`.

## Deployment

The public GitHub Pages workflow builds on pushes to `main`. Vite keeps `base: './'`, navigation uses hash routes, and the generated service worker precaches every emitted chunk for offline use.

No real API key belongs in this repository, test output, issue or chat. Real-provider question quality and iPhone installation are final human acceptance checks performed from the deployed app.
