/**
 * v7 · Ten ways to present one run-through.
 *
 * This is where the schemes differ most, because it is where the reference
 * products differ most. Duolingo clears the screen; Quizlet gives you one card;
 * Anki gives you a rating row that names the interval; Photomath gives you a
 * numbered worked sheet; Speechify never leaves the page; Structured makes it
 * an agenda; Blinkist makes it a chapter; Notion keeps it inside the tree;
 * Headspace gives it air; Brilliant turns it into a conversation.
 *
 * All ten receive the same slots from VivaScreen and arrange them. None of them
 * owns any state, calls the model, or decides a verdict — the run logic is
 * untouched, which is what makes ten of these safe to ship at once.
 */
import React from 'react';
import { ArrowLeft, X, Check } from 'lucide-react';
import type { RunShape } from '../../app/scheme';

export interface RunStep { id: string; question: string; done: boolean }

export interface RunSlots {
  lang: 'en' | 'zh-CN';
  phase: string;
  index: number;
  total: number;
  steps: RunStep[];
  title: string;
  onLeave: () => void;
  sourceLabel: string;
  source: React.ReactNode | null;
  question: string;
  guidance: string;
  /** The phase-specific body: dock, blank plan, self-grade, scoring, manual, reveal. */
  body: React.ReactNode;
  /** What the student committed, when there is one — used by card and chat shapes. */
  answer?: string;
  verdict: string;
}

const zh = (s: RunSlots) => s.lang === 'zh-CN';
const showsQuestion = (s: RunSlots) => s.phase === 'answering' || s.phase === 'blankplan' || s.phase === 'revealed';

function Bar({ s }: { s: RunSlots }) {
  return (
    <div className="s-run-bar" aria-label={`${s.index + 1} / ${s.total}`}>
      <i style={{ width: `${((s.index) / Math.max(1, s.total)) * 100}%` }} />
    </div>
  );
}

function Dots({ s }: { s: RunSlots }) {
  return (
    <div className="s-run-dots" aria-label={`${s.index + 1} / ${s.total}`}>
      {s.steps.map((step, i) => <span key={step.id} data-state={i < s.index ? 'done' : i === s.index ? 'current' : 'later'} />)}
    </div>
  );
}

/* 01 · Duolingo — everything else leaves. Progress and a way out, nothing more. */
function CleanRun({ s }: { s: RunSlots }) {
  return (
    <main className="s-run s-run-clean" data-testid="run-screen">
      <header className="s-run-clean-top">
        <button type="button" onClick={s.onLeave} aria-label={zh(s) ? '离开' : 'Leave'}><X size={22} /></button>
        <Bar s={s} />
        <span className="s-run-count">{s.index + 1}/{s.total}</span>
      </header>
      {showsQuestion(s) && <h1 className="s-run-clean-q">{s.question}</h1>}
      {s.source && <div className="s-run-clean-src">{s.source}</div>}
      <div className="s-run-clean-body">{s.body}</div>
    </main>
  );
}

/* 02 · Quizlet — one card, full bleed. The card is the product. */
function CardRun({ s }: { s: RunSlots }) {
  const flipped = s.phase === 'revealed' || s.phase === 'selfgrade' || s.phase === 'manualgrade' || s.phase === 'scoring';
  return (
    <main className="s-run s-run-card" data-testid="run-screen">
      <header className="s-run-card-top">
        <button type="button" onClick={s.onLeave} aria-label={zh(s) ? '关闭' : 'Close'}><X size={20} /></button>
        <span>{s.index + 1} / {s.total}</span>
        <span className="s-run-card-title">{s.title}</span>
      </header>
      <div className="s-card-face" data-flipped={flipped}>
        {!flipped ? (
          <>
            {s.source && <div className="s-card-src">{s.source}</div>}
            <p className="s-card-q">{s.question}</p>
          </>
        ) : (
          <>
            <span className="s-card-back-label">{zh(s) ? '你说的' : 'Your answer'}</span>
            <blockquote className="s-card-answer">{s.answer ? `“${s.answer}”` : '—'}</blockquote>
          </>
        )}
      </div>
      <div className="s-run-card-body">{s.body}</div>
    </main>
  );
}

/* 03 · Anki — bare text and a rating row. The row is the interaction. */
function RatingRun({ s }: { s: RunSlots }) {
  return (
    <main className="s-run s-run-rating" data-testid="run-screen">
      <header className="s-run-rating-top">
        <button type="button" onClick={s.onLeave}>{zh(s) ? '‹ 牌组' : '‹ Decks'}</button>
        <span>{s.index + 1} / {s.total}</span>
      </header>
      <div className="s-rating-face">
        {s.source && <div className="s-rating-src">{s.source}</div>}
        {showsQuestion(s) && <p className="s-rating-q">{s.question}</p>}
      </div>
      <div className="s-rating-dock">{s.body}</div>
    </main>
  );
}

/* 04 · Photomath / Gauth — the whole run as one numbered worked sheet. */
function StepsRun({ s }: { s: RunSlots }) {
  return (
    <main className="s-run s-run-steps" data-testid="run-screen">
      <header className="s-run-steps-top">
        <button type="button" onClick={s.onLeave} aria-label={zh(s) ? '返回' : 'Back'}><ArrowLeft size={19} /></button>
        <strong>{s.title}</strong>
        <span>{s.index + 1}/{s.total}</span>
      </header>
      <ol className="s-steps-sheet">
        {s.steps.map((step, i) => (
          <li key={step.id} className="s-step" data-state={i < s.index ? 'done' : i === s.index ? 'current' : 'later'}>
            <span className="s-step-num">{i + 1}</span>
            <div className="s-step-body">
              <p className="s-step-q">{i <= s.index ? step.question : (zh(s) ? '还没到' : 'Not yet')}</p>
              {i === s.index && (
                <>
                  {s.source && <div className="s-step-src">{s.source}</div>}
                  <div className="s-step-work">{s.body}</div>
                </>
              )}
              {i < s.index && <span className="s-step-done"><Check size={14} aria-hidden />{zh(s) ? '已答' : 'Answered'}</span>}
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}

/* 05 · Speechify — the page fills the screen, the question rises from a dock. */
function ReaderRun({ s }: { s: RunSlots }) {
  return (
    <main className="s-run s-run-reader" data-testid="run-screen">
      <header className="s-run-reader-top">
        <button type="button" onClick={s.onLeave} aria-label={zh(s) ? '离开' : 'Leave'}><ArrowLeft size={19} /></button>
        <span>{s.title}</span>
        <span className="s-run-count">{s.index + 1}/{s.total}</span>
      </header>
      <div className="s-reader-surface">
        <span className="s-reader-label">{s.sourceLabel}</span>
        {s.source}
      </div>
      <section className="s-reader-dock">
        {showsQuestion(s) && <p className="s-reader-q">{s.question}</p>}
        {s.body}
      </section>
    </main>
  );
}

/* 06 · Structured — the run as a timed agenda; the current item is open. */
function AgendaRun({ s }: { s: RunSlots }) {
  return (
    <main className="s-run s-run-agenda" data-testid="run-screen">
      <header className="s-run-agenda-top">
        <button type="button" onClick={s.onLeave} aria-label={zh(s) ? '离开' : 'Leave'}><ArrowLeft size={18} /></button>
        <strong>{s.title}</strong>
        <span>{zh(s) ? `约 ${Math.max(2, Math.round((s.total - s.index) * 1.6))} 分钟` : `~${Math.max(2, Math.round((s.total - s.index) * 1.6))} min`}</span>
      </header>
      <div className="s-agenda">
        {s.steps.map((step, i) => (
          <div key={step.id} className="s-agenda-item" data-state={i < s.index ? 'done' : i === s.index ? 'current' : 'later'}>
            <span className="s-agenda-time">{`${String(9 + Math.floor((i * 5) / 60)).padStart(2, '0')}:${String((i * 5) % 60).padStart(2, '0')}`}</span>
            <span className="s-agenda-node" aria-hidden />
            <div className="s-agenda-body">
              <p className="s-agenda-q">{i <= s.index ? step.question : (zh(s) ? '之后再问' : 'Later')}</p>
              {i === s.index && (
                <>
                  {s.source && <div className="s-agenda-src">{s.source}</div>}
                  <div className="s-agenda-work">{s.body}</div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

/* 07 · Blinkist — each question is a chapter with its own title page. */
function ChapterRun({ s }: { s: RunSlots }) {
  return (
    <main className="s-run s-run-chapter" data-testid="run-screen">
      <header className="s-run-chapter-top">
        <button type="button" onClick={s.onLeave} aria-label={zh(s) ? '离开' : 'Leave'}><X size={19} /></button>
        <Dots s={s} />
      </header>
      <span className="s-chapter-eyebrow">{zh(s) ? `第 ${s.index + 1} 章 · 共 ${s.total} 章` : `Chapter ${s.index + 1} of ${s.total}`}</span>
      {showsQuestion(s) && <h1 className="s-chapter-q">{s.question}</h1>}
      {s.source && <div className="s-chapter-src">{s.source}</div>}
      <div className="s-chapter-body">{s.body}</div>
    </main>
  );
}

/* 08 · Notion — the run happens inside the tree, as toggle rows. */
function OutlineRun({ s }: { s: RunSlots }) {
  return (
    <main className="s-run s-run-outline" data-testid="run-screen">
      <div className="s-outline-crumb">
        <button type="button" onClick={s.onLeave}>{zh(s) ? '作业' : 'Work'}</button>
        <span>/</span><strong>{s.title}</strong>
      </div>
      <h1 className="s-outline-h1">{s.title}</h1>
      {s.steps.map((step, i) => (
        <div key={step.id} className="s-outline-item" data-state={i < s.index ? 'done' : i === s.index ? 'current' : 'later'}>
          <span className="s-outline-tri" aria-hidden>{i === s.index ? '▾' : '▸'}</span>
          <div className="s-outline-line">
            <p>{i <= s.index ? step.question : (zh(s) ? '未展开' : 'Collapsed')}</p>
            {i === s.index && (
              <div className="s-outline-open">
                {s.source && <div className="s-outline-src">{s.source}</div>}
                {s.body}
              </div>
            )}
          </div>
        </div>
      ))}
    </main>
  );
}

/* 09 · Headspace — one soft card, centred, with air around it. */
function GuidedRun({ s }: { s: RunSlots }) {
  return (
    <main className="s-run s-run-guided" data-testid="run-screen">
      <header className="s-run-guided-top">
        <button type="button" onClick={s.onLeave} aria-label={zh(s) ? '离开' : 'Leave'}><X size={20} /></button>
        <span className="s-guided-ring" aria-label={`${s.index + 1} / ${s.total}`} style={{ ['--p' as string]: `${((s.index) / Math.max(1, s.total)) * 100}%` }}>
          <i>{s.index + 1}</i>
        </span>
      </header>
      <div className="s-guided-card">
        <span className="s-guided-eyebrow">{zh(s) ? '慢一点，先想清楚再说' : 'Take your time. Think, then speak.'}</span>
        {showsQuestion(s) && <h1 className="s-guided-q">{s.question}</h1>}
        {s.source && <div className="s-guided-src">{s.source}</div>}
        <div className="s-guided-body">{s.body}</div>
      </div>
    </main>
  );
}

/* 10 · Brilliant — the work on top, the tutor underneath, in conversation. */
function SplitRun({ s }: { s: RunSlots }) {
  return (
    <main className="s-run s-run-split" data-testid="run-screen">
      <section className="s-split-panel">
        <header className="s-split-top">
          <button type="button" onClick={s.onLeave} aria-label={zh(s) ? '离开' : 'Leave'}><ArrowLeft size={18} /></button>
          <strong>{s.title}</strong>
          <span>{s.index + 1}/{s.total}</span>
        </header>
        {s.source ?? <p className="s-split-nosrc">{zh(s) ? '这一问不指向具体某一句。' : 'This one is not anchored to a line.'}</p>}
      </section>
      <section className="s-split-talk">
        {showsQuestion(s) && (
          <div className="s-bubble s-bubble-them">
            <span className="s-bubble-who" aria-hidden />
            <p>{s.question}</p>
          </div>
        )}
        {s.answer && s.phase !== 'answering' && (
          <div className="s-bubble s-bubble-me"><p>{s.answer}</p></div>
        )}
        <div className="s-split-body">{s.body}</div>
      </section>
    </main>
  );
}

const RUNS: Record<RunShape, (props: { s: RunSlots }) => JSX.Element> = {
  clean: CleanRun, card: CardRun, ratingbar: RatingRun, steps: StepsRun, reader: ReaderRun,
  agenda: AgendaRun, chapter: ChapterRun, outline: OutlineRun, guided: GuidedRun, split: SplitRun,
};

export function RunFrame({ shape, slots }: { shape: RunShape; slots: RunSlots }) {
  const View = RUNS[shape] ?? ReaderRun;
  return <View s={slots} />;
}
