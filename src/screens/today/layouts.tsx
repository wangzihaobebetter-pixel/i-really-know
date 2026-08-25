/**
 * v7 · Ten home screens.
 *
 * Same data, ten compositions. The point of the exercise is that the primary
 * object changes: a path row, a deck, a table line, one huge button, the page
 * of work itself, a timeline stop, today's single question, an outline node, a
 * category tile, a panel. Each is lifted from a product in
 * memory/ireallyknow-v7/RESEARCH.md that has an audience to prove it works.
 *
 * Nothing here invents data. Everything renders the same sessions, the same
 * due targets and the same specimen that the base Today screen renders.
 */
import React from 'react';
import { ArrowRight, Plus, RotateCcw, ChevronRight, ChevronDown, Search, Clock, Check } from 'lucide-react';
import { AnchoredText } from '../../ui';
import type { TextAnchor } from '../../ui';
import { packShort } from '../../packs';
import type { Session } from '../../types';
import type { HomeShape } from '../../app/scheme';

export interface Specimen {
  id: string; pack: string; text: string; kind: string;
  anchors: TextAnchor[]; question: string;
}

export interface HomeData {
  lang: 'en' | 'zh-CN';
  first: boolean;
  lead?: Session;
  unfinished?: Session;
  left: number;
  leadMinutes: number;
  dueCount: number;
  dueSession?: Session;
  recent: Session[];
  /** Sample runs. Kept out of "recently brought" — a sample is not your work —
      but a home screen that shows nothing after you ran one is lying about
      what you did. Every layout falls back to these when you have no own work. */
  tried: Session[];
  completedExample?: Session;
  specimen: Specimen | null;
  occasionText: (value: string | undefined) => string;
  formatDate: (at: number) => string;
  openPiece: (session: Session) => void;
  openFollowups: () => void;
  openBring: () => void;
  openPicker: () => void;
  openWork: () => void;
}

const zh = (d: HomeData) => d.lang === 'zh-CN';
/** What this home has to show: your own work first, otherwise what you tried. */
const pieces = (d: HomeData) => (d.recent.length ? d.recent : d.tried);

/* Small shared pieces. Every layout composes these differently; none of them
   restyles the others, so the difference between schemes stays structural. */

function BringLine({ d }: { d: HomeData }) {
  return (
    <button className="s-bring-line" type="button" onClick={d.openBring}>
      <Plus size={17} aria-hidden />{zh(d) ? '带一份新的来' : 'Bring something new'}
    </button>
  );
}

function DueLine({ d }: { d: HomeData }) {
  if (!d.dueCount) return null;
  return (
    <button className="s-due-line" type="button" onClick={d.openFollowups}>
      <RotateCcw size={17} aria-hidden />
      <span>
        <strong>{zh(d) ? `${d.dueCount} 句换个问法回来了` : `${d.dueCount} came back, asked differently`}</strong>
        <small>{d.dueSession?.title ?? ''}</small>
      </span>
      <ArrowRight size={16} aria-hidden />
    </button>
  );
}

function SpecimenBlock({ d, flat }: { d: HomeData; flat?: boolean }) {
  if (!d.specimen) return null;
  const s = d.specimen;
  return (
    <button className={flat ? 's-specimen s-specimen-flat' : 's-specimen'} type="button" onClick={d.openPicker} aria-label={s.question}>
      <span className="s-specimen-head">
        <em>{packShort(s.pack as never, d.lang)}</em>
        <small>{zh(d) ? '一份真实学生作业' : 'A real student piece'}</small>
      </span>
      <span className="s-specimen-page">
        <AnchoredText text={s.text} mode={s.kind === 'code' ? 'code' : 'prose'} anchors={s.anchors} />
      </span>
      <span className="s-specimen-ask"><i aria-hidden />{s.question}</span>
      <span className="s-specimen-go">{zh(d) ? '换一份，或者就从这份开始' : 'Pick another, or start with this one'}<ArrowRight size={16} aria-hidden /></span>
    </button>
  );
}

/* ── 01 · Duolingo — the path ─────────────────────────────────────────────
   A vertical journey. Every piece of work is a stop on it; the next thing to
   do is the widest stop and everything else is smaller. No cards, no sections. */
function PathHome({ d }: { d: HomeData }) {
  const stops = [d.lead, ...pieces(d).filter((s) => s.id !== d.lead?.id)].filter(Boolean) as Session[];
  return (
    <div className="s-path">
      <h1 className="s-path-title">{zh(d) ? '接着走' : 'Keep going'}</h1>
      {stops.length === 0 && (
        <button className="s-path-stop is-next" type="button" onClick={d.openBring}>
          <span className="s-path-node" aria-hidden><Plus size={26} /></span>
          <strong>{zh(d) ? '带一份你已经写好的东西' : 'Bring something you already wrote'}</strong>
        </button>
      )}
      {stops.map((s, i) => (
        <button key={s.id} className={`s-path-stop${i === 0 ? ' is-next' : ''}`} type="button" onClick={() => d.openPiece(s)}>
          <span className="s-path-node" aria-hidden>{s.status === 'complete' ? <Check size={24} /> : <span>{i + 1}</span>}</span>
          <strong>{s.title}</strong>
          <small>{d.occasionText(s.occasion)}{s.occasionAt ? ` · ${d.formatDate(s.occasionAt)}` : ''}</small>
          {i === 0 && d.unfinished && <em>{zh(d) ? `还剩 ${d.left} 问` : `${d.left} left`}</em>}
        </button>
      ))}
      {stops.length > 0 && (
        <button className="s-path-stop s-path-add" type="button" onClick={d.openBring}>
          <span className="s-path-node" aria-hidden><Plus size={22} /></span>
          <strong>{zh(d) ? '再带一份' : 'Bring another'}</strong>
        </button>
      )}
      <DueLine d={d} />
      {d.first && <SpecimenBlock d={d} />}
    </div>
  );
}

/* ── 02 · Quizlet — the deck ──────────────────────────────────────────────
   The card is the product, so home is a grid of decks: one tile per piece,
   showing how many questions are in it. Nothing else competes for the eye. */
function DeckHome({ d }: { d: HomeData }) {
  const decks = pieces(d);
  return (
    <div className="s-deck">
      <h1 className="s-deck-title">{zh(d) ? '你的卡组' : 'Your sets'}</h1>
      <div className="s-deck-grid">
        <button className="s-deck-tile s-deck-new" type="button" onClick={d.openBring}>
          <Plus size={26} aria-hidden /><strong>{zh(d) ? '新建' : 'New set'}</strong>
        </button>
        {decks.map((s) => (
          <button key={s.id} className="s-deck-tile" type="button" onClick={() => d.openPiece(s)}>
            <span className="s-deck-count">{s.probes.length} {zh(d) ? '问' : 'terms'}</span>
            <strong>{s.title}</strong>
            <small>{d.occasionText(s.occasion)}</small>
          </button>
        ))}
      </div>
      <DueLine d={d} />
      {d.first && <SpecimenBlock d={d} />}
    </div>
  );
}

/* ── 03 · Anki — the table ────────────────────────────────────────────────
   Decks as a plain table: name, new, due. Anki's home has no imagery at all
   and that restraint is the whole identity. */
function TableHome({ d }: { d: HomeData }) {
  const rows = pieces(d);
  return (
    <div className="s-table">
      <div className="s-table-head"><span>{zh(d) ? '作业' : 'Deck'}</span><span>{zh(d) ? '问' : 'New'}</span><span>{zh(d) ? '到期' : 'Due'}</span></div>
      {rows.length === 0 && <p className="s-table-empty">{zh(d) ? '还没有作业。' : 'No decks yet.'}</p>}
      {rows.map((s) => {
        const open = s.probes.filter((p) => !p.committedAt).length;
        return (
          <button key={s.id} className="s-table-row" type="button" onClick={() => d.openPiece(s)}>
            <span>{s.title}</span><span>{open}</span><span>{s.id === d.dueSession?.id ? d.dueCount : 0}</span>
          </button>
        );
      })}
      <div className="s-table-actions">
        <button type="button" onClick={d.openBring}>{zh(d) ? '带一份' : 'Add'}</button>
        <button type="button" onClick={d.openPicker}>{zh(d) ? '范例' : 'Samples'}</button>
        {d.dueCount > 0 && <button type="button" onClick={d.openFollowups}>{zh(d) ? `复习 ${d.dueCount}` : `Review ${d.dueCount}`}</button>}
      </div>
      {d.first && <SpecimenBlock d={d} flat />}
    </div>
  );
}

/* ── 04 · Gauth / Photomath — the scan ────────────────────────────────────
   One enormous primary action, a row of tools under it, and history below.
   These apps open with a shutter, not a dashboard. */
function ScanHome({ d }: { d: HomeData }) {
  return (
    <div className="s-scan">
      <button className="s-scan-primary" type="button" onClick={d.openBring}>
        <Plus size={34} aria-hidden />
        <strong>{zh(d) ? '交一份作业' : 'Submit your work'}</strong>
        <small>{zh(d) ? '粘贴、拖文件，或者直接打字' : 'Paste, drop a file, or type it'}</small>
      </button>
      <div className="s-scan-tools">
        <button type="button" onClick={d.openPicker}>{zh(d) ? '范例' : 'Samples'}</button>
        <button type="button" onClick={d.openWork}>{zh(d) ? '历史' : 'History'}</button>
        {d.dueCount > 0 && <button type="button" onClick={d.openFollowups}>{zh(d) ? `回访 ${d.dueCount}` : `Follow-ups ${d.dueCount}`}</button>}
      </div>
      {pieces(d).length > 0 && (
        <section className="s-scan-history">
          <h2>{zh(d) ? '最近' : 'Recent'}</h2>
          {pieces(d).slice(0, 4).map((s) => (
            <button key={s.id} className="s-scan-row" type="button" onClick={() => d.openPiece(s)}>
              <span className="s-scan-num">{s.probes.length}</span>
              <span><strong>{s.title}</strong><small>{d.occasionText(s.occasion)}</small></span>
              <ChevronRight size={17} aria-hidden />
            </button>
          ))}
        </section>
      )}
      {d.first && <SpecimenBlock d={d} />}
    </div>
  );
}

/* ── 05 · Speechify — the page ────────────────────────────────────────────
   Home is the page of work itself, full bleed, with the dock floating over it.
   You never leave the paper; everything else is secondary text above it. */
function ReaderHome({ d }: { d: HomeData }) {
  const piece = d.lead ?? pieces(d)[0];
  return (
    <div className="s-reader">
      <span className="s-reader-kicker">{piece ? (zh(d) ? '接着这页读' : 'Pick up this page') : (zh(d) ? '还没有页' : 'No page yet')}</span>
      {piece ? (
        <>
          <h1 className="s-reader-title">{piece.title}</h1>
          <p className="s-reader-meta">{d.occasionText(piece.occasion)}{piece.occasionAt ? ` · ${d.formatDate(piece.occasionAt)}` : ''}{d.unfinished ? ` · ${zh(d) ? `还剩 ${d.left} 问` : `${d.left} left`}` : ''}</p>
          <div className="s-reader-page">
            <AnchoredText
              text={piece.material.slice(0, 1400)}
              mode={piece.materialKind === 'code' ? 'code' : 'prose'}
              anchors={piece.probes[0]?.anchor.placed && piece.probes[0].anchor.start !== undefined
                ? [{ id: 'p0', start: piece.probes[0].anchor.start, end: piece.probes[0].anchor.end ?? piece.probes[0].anchor.start, verdict: 'none' }]
                : []}
            />
          </div>
          <button className="s-reader-play" type="button" onClick={() => d.openPiece(piece)}>
            {d.unfinished ? (zh(d) ? '接着过' : 'Continue') : (zh(d) ? '过一遍' : 'Run it')}<ArrowRight size={18} aria-hidden />
          </button>
        </>
      ) : (
        <>
          <h1 className="s-reader-title">{zh(d) ? '把你写的东西放上来' : 'Put your writing here'}</h1>
          <SpecimenBlock d={d} flat />
          <button className="s-reader-play" type="button" onClick={d.openBring}>{zh(d) ? '带一份来' : 'Bring one'}<ArrowRight size={18} aria-hidden /></button>
        </>
      )}
      <DueLine d={d} />
    </div>
  );
}

/* ── 06 · Structured — the spine ──────────────────────────────────────────
   A date strip and a vertical timeline. This product already has real dates —
   組會 8/31, 答辯 9/12, and 1/3/7-day returns — so the timeline is not decor. */
function TimelineHome({ d }: { d: HomeData }) {
  const now = new Date();
  const days = Array.from({ length: 7 }, (_, i) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + i - 2));
  const items = [...(d.dueCount ? [{ kind: 'due' as const }] : []), ...pieces(d).map((s) => ({ kind: 'piece' as const, s }))];
  return (
    <div className="s-time">
      <div className="s-time-strip">
        {days.map((day, i) => (
          <span key={i} className={`s-time-day${i === 2 ? ' is-today' : ''}`}>
            <small>{zh(d) ? ['日', '一', '二', '三', '四', '五', '六'][day.getDay()] : ['S', 'M', 'T', 'W', 'T', 'F', 'S'][day.getDay()]}</small>
            <strong>{day.getDate()}</strong>
          </span>
        ))}
      </div>
      <div className="s-time-list">
        {items.length === 0 && (
          <button className="s-time-item" type="button" onClick={d.openBring}>
            <span className="s-time-at">{zh(d) ? '现在' : 'Now'}</span>
            <span className="s-time-body"><strong>{zh(d) ? '带一份作业来' : 'Bring a piece of work'}</strong><small>{zh(d) ? '大约 8 分钟' : 'About 8 min'}</small></span>
          </button>
        )}
        {items.map((item, i) => item.kind === 'due' ? (
          <button key="due" className="s-time-item" type="button" onClick={d.openFollowups}>
            <span className="s-time-at"><RotateCcw size={15} aria-hidden /></span>
            <span className="s-time-body"><strong>{zh(d) ? `${d.dueCount} 句回来了` : `${d.dueCount} came back`}</strong><small>{zh(d) ? '换了个问法' : 'Asked differently'}</small></span>
          </button>
        ) : (
          <button key={item.s.id} className="s-time-item" type="button" onClick={() => d.openPiece(item.s)}>
            <span className="s-time-at">{item.s.occasionAt ? d.formatDate(item.s.occasionAt) : <Clock size={15} aria-hidden />}</span>
            <span className="s-time-body">
              <strong>{item.s.title}</strong>
              <small>{d.occasionText(item.s.occasion)} · {item.s.probes.length} {zh(d) ? '问' : 'questions'}</small>
            </span>
            <span className="s-time-ring" aria-hidden data-done={item.s.status === 'complete'}>{i + 1}</span>
          </button>
        ))}
      </div>
      <BringLine d={d} />
      {d.first && <SpecimenBlock d={d} />}
    </div>
  );
}

/* ── 07 · Blinkist — the daily ────────────────────────────────────────────
   One hero for today plus a day grid. Blinkist's DAY 1…12 strip is a record of
   showing up; here it records the days something actually held. */
function DailyHome({ d }: { d: HomeData }) {
  const s = d.specimen;
  const hero = d.lead ?? pieces(d)[0];
  const done = pieces(d).filter((x) => x.status === 'complete').length;
  return (
    <div className="s-daily">
      <span className="s-daily-eyebrow">{zh(d) ? '今天这一问' : 'Question of the day'}</span>
      <button className="s-daily-hero" type="button" onClick={d.lead ? () => d.openPiece(d.lead!) : d.openPicker}>
        <span className="s-daily-hero-body">
          <strong>{hero ? hero.title : (s ? s.question : (zh(d) ? '带一份作业来' : 'Bring a piece of work'))}</strong>
          <small>{hero
            ? (d.unfinished ? (zh(d) ? `还剩 ${d.left} 问 · 约 ${d.leadMinutes} 分钟` : `${d.left} left · about ${d.leadMinutes} min`) : (zh(d) ? `${hero.probes.length} 问 · 标过的原文和站住的话都在` : `${hero.probes.length} questions · your marked page is here`))
            : (s ? packShort(s.pack as never, d.lang) : (zh(d) ? '开始只要一分钟' : 'A minute to start'))}</small>
        </span>
        <span className="s-daily-hero-go"><ArrowRight size={20} aria-hidden /></span>
      </button>
      <div className="s-daily-grid" aria-label={zh(d) ? '你站住的日子' : 'Days something held'}>
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} className={`s-daily-cell${i < done ? ' is-held' : ''}`}>
            <small>DAY</small><strong>{i + 1}</strong>
          </span>
        ))}
      </div>
      <DueLine d={d} />
      {pieces(d).length > 0 && (
        <section className="s-daily-shelf">
          <h2>{zh(d) ? '书架上的' : 'On your shelf'}</h2>
          <div className="s-daily-scroll">
            {pieces(d).map((x) => (
              <button key={x.id} className="s-daily-spine" type="button" onClick={() => d.openPiece(x)}>
                <strong>{x.title}</strong><small>{x.probes.length} {zh(d) ? '问' : 'q'}</small>
              </button>
            ))}
          </div>
        </section>
      )}
      <BringLine d={d} />
    </div>
  );
}

/* ── 08 · Notion — the outline ────────────────────────────────────────────
   No cards at all. Work → run → question is already three levels deep, so the
   whole home screen is one collapsible tree with toggle triangles. */
function OutlineHome({ d }: { d: HomeData }) {
  const [open, setOpen] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setOpen((prev) => ({ ...prev, [id]: !prev[id] }));
  return (
    <div className="s-outline">
      <h1 className="s-outline-title">{zh(d) ? '我真会' : 'I Really Know'}</h1>
      <p className="s-outline-lead">{zh(d) ? '你交上来的每一份，和它问出来的每一句。' : 'Everything you brought, and every question it produced.'}</p>
      {d.dueCount > 0 && (
        <button className="s-outline-row is-callout" type="button" onClick={d.openFollowups}>
          <RotateCcw size={14} aria-hidden />{zh(d) ? `${d.dueCount} 句换个问法回来了` : `${d.dueCount} came back, asked differently`}
        </button>
      )}
      {pieces(d).length === 0 && <p className="s-outline-empty">{zh(d) ? '还是空的。' : 'Empty.'}</p>}
      {pieces(d).map((s) => (
        <div key={s.id} className="s-outline-node">
          <span className="s-outline-row">
            <button type="button" className="s-outline-toggle" onClick={() => toggle(s.id)} aria-expanded={!!open[s.id]} aria-label={s.title}>
              {open[s.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            <button type="button" className="s-outline-name" onClick={() => d.openPiece(s)}>{s.title}</button>
            <em>{s.probes.length}</em>
          </span>
          {open[s.id] && (
            <div className="s-outline-kids">
              {s.probes.map((p, i) => (
                <button key={p.id} type="button" className="s-outline-kid" onClick={() => d.openPiece(s)}>
                  <span>{i + 1}.</span>{p.question}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
      <button className="s-outline-row s-outline-add" type="button" onClick={d.openBring}><Plus size={14} aria-hidden />{zh(d) ? '新建一页' : 'New page'}</button>
      <button className="s-outline-row s-outline-add" type="button" onClick={d.openPicker}><Plus size={14} aria-hidden />{zh(d) ? '从范例开始' : 'Start from a sample'}</button>
    </div>
  );
}

/* ── 09 · Headspace — the programme ───────────────────────────────────────
   A search line, four category tiles, and a guided-programme card. The rooms
   this product prepares you for (組會 / 答辯 / review / 考試) are the tiles. */
const TILES: Array<{ id: string; en: string; zh: string }> = [
  { id: 'lab', en: 'Lab meeting', zh: '组会' },
  { id: 'defense', en: 'Defence', zh: '答辩' },
  { id: 'review', en: 'Code review', zh: '代码 review' },
  { id: 'exam', en: 'Exam', zh: '考试' },
];
function TilesHome({ d }: { d: HomeData }) {
  const hero = d.lead ?? pieces(d)[0];
  return (
    <div className="s-tiles">
      <button className="s-tiles-search" type="button" onClick={d.openWork}>
        <Search size={17} aria-hidden />{zh(d) ? '找一份你交过的' : 'Find something you brought'}
      </button>
      <h1 className="s-tiles-title">{zh(d) ? '今天要过哪一间？' : 'Which room today?'}</h1>
      <div className="s-tiles-grid">
        {TILES.map((tile) => {
          const mine = pieces(d).find((s) => s.occasion === tile.id);
          return (
            <button key={tile.id} className="s-tile" data-tile={tile.id} type="button" onClick={() => mine ? d.openPiece(mine) : d.openBring()}>
              <span className="s-tile-glyph" aria-hidden />
              <strong>{zh(d) ? tile.zh : tile.en}</strong>
              <small>{mine ? mine.title : (zh(d) ? '还没有' : 'Nothing yet')}</small>
            </button>
          );
        })}
      </div>
      <section className="s-tiles-programme">
        <span className="s-tiles-eyebrow">{zh(d) ? '给你的' : 'For you'}</span>
        <button className="s-programme-card" type="button" onClick={hero ? () => d.openPiece(hero) : d.openPicker}>
          <span className="s-programme-face" aria-hidden />
          <span className="s-programme-copy">
            <strong>{hero ? hero.title : (zh(d) ? '先过一份真实作业' : 'Run a real piece first')}</strong>
            <small>{hero
              ? (d.unfinished ? (zh(d) ? `接着上次 · 约 ${d.leadMinutes} 分钟` : `Pick up · about ${d.leadMinutes} min`) : (zh(d) ? '再过一遍' : 'Run it again'))
              : (zh(d) ? '不用你自己的东西也能开始' : 'You can start without your own work')}</small>
          </span>
          <ArrowRight size={19} aria-hidden />
        </button>
      </section>
      <DueLine d={d} />
      <BringLine d={d} />
    </div>
  );
}

/* ── 10 · Brilliant — the panel ───────────────────────────────────────────
   Rows that read like a course: a panel, then a tutor line underneath saying
   what it will ask you. The voice of the examiner is present on home. */
function PanelHome({ d }: { d: HomeData }) {
  return (
    <div className="s-panel">
      <h1 className="s-panel-title">{zh(d) ? '接着口试' : 'Continue the viva'}</h1>
      {pieces(d).length === 0 && (
        <div className="s-panel-row">
          <div className="s-panel-face">
            <strong>{zh(d) ? '还没有可以问你的东西' : 'Nothing to ask you about yet'}</strong>
            <small>{zh(d) ? '交一份你已经写好的，我先当着你的面读一遍。' : 'Bring something you already wrote; I read it in front of you first.'}</small>
          </div>
          <p className="s-panel-say">{zh(d) ? '「你写的哪一句，最怕被追问？」' : '“Which line of yours are you least ready to defend?”'}</p>
          <button type="button" onClick={d.openBring}>{zh(d) ? '交一份' : 'Bring one'}<ArrowRight size={17} aria-hidden /></button>
        </div>
      )}
      {pieces(d).map((s) => (
        <div key={s.id} className="s-panel-row">
          <div className="s-panel-face">
            <strong>{s.title}</strong>
            <small>{d.occasionText(s.occasion)}{s.occasionAt ? ` · ${d.formatDate(s.occasionAt)}` : ''} · {s.probes.length} {zh(d) ? '问' : 'questions'}</small>
          </div>
          <p className="s-panel-say">“{s.probes[0]?.question ?? (zh(d) ? '这一段是你自己想出来的吗？' : 'Did you arrive at this yourself?')}”</p>
          <button type="button" onClick={() => d.openPiece(s)}>{s.status === 'complete' ? (zh(d) ? '看结果' : 'See result') : (zh(d) ? '接着答' : 'Continue')}<ArrowRight size={17} aria-hidden /></button>
        </div>
      ))}
      <DueLine d={d} />
      {d.first && <SpecimenBlock d={d} />}
      <BringLine d={d} />
    </div>
  );
}

const HOMES: Record<HomeShape, (props: { d: HomeData }) => JSX.Element> = {
  path: PathHome, deck: DeckHome, table: TableHome, scan: ScanHome, reader: ReaderHome,
  timeline: TimelineHome, daily: DailyHome, outline: OutlineHome, tiles: TilesHome, panel: PanelHome,
};

export function HomeLayout({ shape, data }: { shape: HomeShape; data: HomeData }) {
  const View = HOMES[shape] ?? PathHome;
  return <View d={data} />;
}
