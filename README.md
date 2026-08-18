# I Really Know · 我真会

A learning-**verification** tool. You submit work you have already written; it does not help you
finish it. It generates an oral-examination style interrogation aimed at what *you* wrote, and
returns a map of what you can actually defend versus what the AI understood on your behalf.

**Live:** https://wangzihaobebetter-pixel.github.io/i-really-know/

## The three refusals

1. It never helps complete, fix or improve the submitted work.
2. It never asks anything answerable by copying from the material — every probe demands a
   justification, an origin, a perturbation, a weakness, or a restatement with a boundary case.
3. It never accuses. Stylistic patterns aim the questions; the app never claims your work was
   written by anyone else. The vocabulary is *owned / working / surface / absent*.

## How a run works

Paste your work → the discipline is detected locally → probes are generated, each anchored to a
verbatim span of your own text → you answer → **you self-grade before any score is shown** → then
the AI score is revealed.

That ordering is the product. If the score comes first, self-assessment anchors on it and the
divergence signal is destroyed. The interesting output is not the score, it is the gap:

| Class | Meaning |
|---|---|
| **Illusion** | You said you owned it. You could not defend it. |
| **Undersold** | You sold yourself short. |
| **Owned** | Both agree. |
| **Borrowed** | An honest gap. |
| **Half-held** | Everything else. |

It ends on the **Painted Page**: your own submission, rendered as a page, with each examined span
inked in its verdict colour.

## Discipline packs

A generic template produces questions a fluent parrot can answer. Eleven packs encode what a real
examiner in each field actually attacks:

CS/Software · Biology · Medicine/Clinical · Mathematics & Proof · Statistics · Machine Learning ·
Chemistry · Clinical Research & Epidemiology · Physics & Engineering · Argument & Essay · General

Each carries its own dimensions, examiner moves, counterfactual levers, vocabulary traps and 0–3
rubric. A CS examiner asks about the invariant on line 23; a clinician asks which finding moved PE
below pneumonia; a statistician asks you to reconstruct df = 47.

## Works with no API key

Eight pre-baked sample runs ship with the app — real submissions across CS, medicine, biology, ML,
statistics, chemistry, policy evaluation and nursing, each with a hand-written examiner set. The
whole product, including the Painted Page and self-grading, is usable offline on first open.

## Your own work needs a key

Bring your own OpenAI-compatible key (OpenAI, DeepSeek, OpenRouter, Moonshot, SiliconFlow, or any
custom base URL). **There is no server in this product.** The key is stored in your browser and
requests go straight from your machine to the provider you choose. Exports never include the key.

## Develop

```bash
npm install
npm run dev              # http://localhost:4173
npm run build            # tsc + sample anchors + i18n parity + PWA assets + vite build

# Static checks (run inside the build):
npm run verify:samples   # every sample anchor is a verbatim substring of its material
npm run verify:i18n      # every t() key resolves, in BOTH languages
npm run verify:pwa       # every declared icon exists at its declared size

# Browser checks (need `npm run preview` on :4177, and `npm run mock` on :4188):
npm run verify:e2e       # a full keyless run, the Painted Page, 390px, every route
npm run verify:keyed     # the keyed path against a mock provider — all five calls
npm run verify:errors    # rejected key, rate-limit backoff, malformed-JSON repair
npm run verify:contrast  # WCAG AA on real computed colours, both themes
```

`mock-provider.mjs` is a local OpenAI-compatible server used by the keyed and
error tests. It asserts the request contract too — bearer token, model,
temperature, exactly system+user, and the material wrapped in its untrusted
delimiters — so the client cannot quietly drift out of shape.

Stack: React 18 · TypeScript · Vite · Zustand (persisted to IndexedDB) · hash routing · PWA.
No backend, no analytics, no accounts.
