# I Really Know v5 — Product Direction

**Status:** design contract for the heartfelt rebuild
**Authority:** Shai's 2026-08-19 feedback + `IReallyKnow_Task_Brief_CN.md`
**Purpose:** prevent another technically-complete but emotionally unfinished release.

## 1. The honest diagnosis

The deployed v4 is a competent flow map, not a mature product.

- Welcome explains six concepts instead of letting the user feel one useful exchange.
- Today has one CTA and large empty space, so "calm" reads as unfinished.
- Run-through is a large web form: excerpt, question, mic, textarea, buttons. It does not feel like somebody is listening.
- Result reads like a generated report. Counts, labels and disclaimers arrive before a memorable human takeaway.
- The visual language is mostly serif headings + borders + one accent. It has no product object, no tactile rhythm and no ownable motion.
- Copy repeatedly explains product ethics rather than proving them through behavior.
- Dark mode makes the first experience colder, while the research explicitly rejected dark-academia as the default.
- Automated gates proved invariants and browser safety; they did not prove desire, warmth or craft.

This is a composition failure, not a polish failure. Recoloring v4 would preserve the wrong product.

## 2. North star

> **A private rehearsal that pays attention, remembers what you said, and gives the hard part back in a kinder shape.**

The user should leave with three feelings, in this order:

1. **Seen:** it actually read the exact thing I brought.
2. **Fair:** it asked the hard question without treating me as suspicious or stupid.
3. **More solid:** I know what I can stand behind, what I need to revisit, and I do not have to organise that revisit myself.

The product is not a quiz maker, AI detector, report generator, tutor that writes for you, or gamified revision feed.

## 3. Value ladder — how the product becomes complete without becoming crowded

### In the first 45 seconds
A real excerpt lifts, one non-copyable question appears, the user makes one choice, and the product shows how the page changes. No tour carousel and no settings.

### In one run-through
The product holds one focused conversation: question → answer → user's read → one reply. The conversation has an opening, a middle and a deliberate ending.

### The next day
The product remembers the exact weak point and returns it with a different question. The user did not make a deck, schedule a reminder or choose an interval.

### Over several weeks
The product keeps a private collection of the user's own sentences that held and shows whether their read on themselves is getting sharper. It builds identity, not a score.

## 4. Product architecture

The three-tab contract stays, but each tab must answer one human question.

- **Today — What should I do now?** One state-aware lead action, the next room/date, due returns, then recent work.
- **Work — What happened with this piece?** Each piece is a living object: marked page, run-through history, words that held, next occasion.
- **You — What is becoming solid?** Words bank first; self-read trend and recurring weak shapes second. No dashboard metrics above identity.
- **Settings — How does this stay mine?** Model, language, voice, theme and local data. A gear, not a student tab.

Core-flow surfaces stay at five:

1. Today
2. Bring + visible reading as states of one surface
3. Run-through, including answer/self-read/reply as states of one surface
4. Result + marked page + ending as one surface
5. Follow-up, reusing the run-through surface

Work and You are return surfaces, not extra steps in the core flow.

## 5. The original product object

### The living margin
A continuous, slightly imperfect **margin line** is the product's signature. It begins beside the passage the app is reading, bends toward the question, pauses while the user answers, then settles into an underline when the exchange is complete.

It is not decoration. It shows the causal chain:

`your words → the hard question → your spoken answer → what now holds`

Competitors can copy cards or an oral-exam chat. The living margin is a persistent, ownable expression of artifact anchoring plus self-assessment.

### The room card
Every piece is attached to a real room and date: lab meeting, defence, code review, exam, or "just checking." The Today lead object is not a generic upload CTA; it is the next room the user is preparing to enter.

### The words that held
The highest-value accumulated artifact is a collection of the user's own answers that survived questioning. It appears in Result, Work and You in the same visual treatment: a clean quotation with the source passage folded behind it.

## 6. Emotional arc

| Moment | User fear | Product behavior | Visual posture |
|---|---|---|---|
| Open | "Another quiz app" | Demonstrate one exchange immediately | Bright, concise, tactile; no school-document wall |
| Bring | "Will this steal or judge my work?" | Ask for the room/date; keep privacy visible but secondary | One generous input object, not a settings form |
| Reading | "Is it actually looking?" | Show exact passages becoming question targets | The living margin moves; one sentence at a time |
| Question | "I might sound stupid" | Ask one thing; let voice/text feel equally native | Question has space; answer dock sits in thumb zone |
| Self-read | "Tell me if I failed" | User speaks first; no verdict visible | Full-screen, three tactile positions, quiet physics |
| Reply | "Was that bad?" | One line: what held first, then the missing link | Same weight/motion for every outcome; never red |
| Result | "What does this mean for Thursday?" | Give one takeaway, one marked page, one promise | Identity and next action before report detail |
| Return | "I failed this already" | Same point, genuinely different shape | Familiar object returning, not a debt or queue |
| End | "Do I need to keep working?" | Name what returns, then explicitly stop | A short closure card; no feed trying to retain them |

## 7. Visual direction

### Surface choice
- Today: **Operate** — one context-aware action dominates; no marketing hero.
- Run-through: **Command / Inspect** — the passage and question are causally connected; the answer dock is persistent.
- Result: **Inspect / Reflect** — one human takeaway controls the page; evidence is available, not dumped.

### Palette
Default is a **sunlit studio**, not dark paper:

- canvas: warm mineral `#F6F3EA`
- ink: soft near-black `#20201D`
- brand: electric vermilion `#FF5A36`
- counter-accent: lucid blue `#3B63F3`
- warm signal: marigold `#F5C84B`
- held: deep leaf `#167C5A`
- held-more: bright cyan `#24A9C7`
- slipped: iris `#6563A8`

Color appears in large, intentional fields and in the living margin—not as dozens of tiny status chips.

### Type
- Display: a characterful rounded/grotesk face for product sentences, not old-school editorial serif everywhere.
- Reading: neutral humanist sans for questions and material.
- Student words never use personality type.
- Chinese must receive equal typographic design; no reliance on a Latin font to carry the identity.

### Shape and depth
- One bold contained object per viewport.
- Tactile controls use visible edge/press depth, not generic soft shadow.
- Cards differ by purpose; no universal rounded rectangle.
- Chrome may use restrained translucency; student text never sits under blur.

### Motion
- The living margin owns motion.
- Controls compress on press; self-read has three physical detents.
- Reading reveals targets sequentially.
- Held and slipped use identical duration and amplitude.
- No decorative loops, confetti, shake, guilt or red student-state animation.

## 8. Copy discipline

- Do not explain values when behavior can prove them.
- Do not say "we care"; remember the room, the date and the user's exact words.
- Do not lead with counts.
- Do not use policy prose in the primary flow.
- After each answer: one sentence. The first clause names what held; the second names the missing link only when needed.
- "I'd blank" produces a method answer, not an apology.
- End sessions cleanly. Retention is earned by memory and return value, not an infinite feed.

## 9. Keep / rebuild / remove

### Keep as infrastructure
- Real sourced samples and exact anchors
- Discipline packs and allowed question kinds
- LLM transport, JSON repair, retries and browser-only credentials
- Self-read-before-judgement invariant
- 1/3/7-day follow-up scheduling and varied questions
- Local IndexedDB store and migrations
- Student↔teacher zero-backend evidence transfer
- PDF/CSV/PWA/security bounds and verification gates

### Rebuild
- Welcome
- Today
- Bring and reading choreography
- Run-through composition and answer dock
- Self-read interaction
- Result hierarchy and ending
- Work/You accumulated-value surfaces
- Teacher workspace and document typography
- Tokens, components, icons, motion and most student copy

### Remove or demote
- Six-step tour
- Dark default
- Generic Lucide icon-everywhere treatment
- Repeated micro-uppercase labels
- Counts as the result sentence
- Policy/disclaimer boxes in the student's primary hierarchy
- Bottom navigation inside immersive run/result endings
- Large blank regions that signal missing content rather than calm
- Universal cards, left accent rails and generic SaaS gradients

## 10. Definition of finished

A release is not complete until all are true:

1. A first-time person can explain the mechanism after one interactive exchange, not after reading a tour.
2. At 390 px, the primary action for every state is visible or fixed in the thumb zone.
3. Today feels deliberately useful in first-use, active-session, due-follow-up and empty-return states.
4. The user can point to a distinctive product object that competitors do not have: the living margin plus their words that held.
5. Side-by-side screenshots with a mature consumer learning/growth app do not look like a school portal or generated template.
6. A full run-through feels like a conversation with opening and closure, not form completion followed by a report.
7. The student sees no score, comparison, AI accusation, guilt mechanic or writing help.
8. Existing safety, data and offline gates still pass.
9. The main agent has personally inspected every primary state in English and Chinese at 390 px and desktop.
10. Shai still retains final subjective acceptance; automated green is never presented as proof of taste.
