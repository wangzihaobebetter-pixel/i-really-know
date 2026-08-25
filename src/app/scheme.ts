/**
 * v7 · Ten UI schemes, each grounded in a shipped product with a real audience.
 *
 * The first attempt at this file was ten colour palettes. Wang's correction:
 * "我不是要你做10个调色盘，我是要你给我10个不同风格的UI设计，你可以把排版、logo、
 *  甚至是为了UI把功能做出排版调整。"
 *
 * So a scheme here is not a palette. It is four structural decisions taken from
 * a reference product's actual in-app screenshots (memory/ireallyknow-v7/appstore/):
 *
 *   nav   — where navigation lives, or whether it exists at all
 *   home  — how the home screen is composed: what the primary object is
 *   run   — how one run-through is presented; the single biggest difference
 *   logo  — how the brand mark is treated, including "not at all"
 *
 * Colour is the last five percent and lives in src/styles/ui/ui-NN.css.
 *
 * Every scheme drives the same application logic. Nothing here changes what the
 * product does — only the shape a person meets it in.
 */

export type NavModel =
  | 'tabbar'      // bottom bar, blocky, chunky targets
  | 'topbar'      // top-only chrome: close · count · gear
  | 'toolbar'     // system-plain toolbar, no decoration — Anki
  | 'dock'        // floating pill above the content — Speechify
  | 'railtime'    // left rail as a time spine — Structured
  | 'sidebar';    // collapsible outline tree — Notion

export type HomeShape =
  | 'reader'      // the page of work IS the home screen — GoodNotes / Speechify
  | 'confirm'     // "here is what I read in your work — is this right?"
  | 'spoken'      // pick how you want to be examined, then speak
  | 'honest'      // the standing bar: stuck · how many left · submit
  | 'table'       // dense rows: work · open · due — Anki
  | 'gates'       // a path whose real occasions are gates — Busuu / Structured
  | 'set'         // today is a closed, tickable set — Elevate / Readwise
  | 'scan'        // one enormous primary action + a tool row — Gauth / Photomath
  | 'outline'     // nested collapsible tree — Notion / Notability
  | 'deck';       // grid of sets; the card is the product — Quizlet

export type RunShape =
  | 'reader'      // the page never leaves; the question rises from a dock
  | 'anchored'    // every question carries the line you confirmed it came from
  | 'spoken'      // one large microphone; the exchange reads as a transcript
  | 'honest'      // a standing bar where "I'm stuck" is the size of "Submit"
  | 'ratingbar'   // bare text + a rating row that names the interval
  | 'agenda'      // questions as a timed agenda under a named occasion
  | 'set'         // today's closed set, ticked off one line at a time
  | 'steps'       // one numbered worked sheet with a staged waiting state
  | 'outline'     // toggle rows expanding inside the tree
  | 'card';       // full-bleed card; you commit before it opens

export type LogoShape =
  | 'wordmark'    // name set in the scheme's display face
  | 'mark'        // the glyph alone
  | 'lockup'      // glyph over name, centred
  | 'inline'      // a text line inside the chrome, no ceremony
  | 'none';       // no brand mark anywhere in the product

export interface Scheme {
  id: string;
  /** Reference product, and its App Store rating count as evidence of audience. */
  ref: string;
  ratings: number;
  /** What this scheme is called in the switcher. */
  name: string;
  nameZh: string;
  /** The one structural idea borrowed. */
  ideaZh: string;
  nav: NavModel;
  home: HomeShape;
  run: RunShape;
  logo: LogoShape;
  /** Does the run-through keep any navigation on screen? */
  navInRun: boolean;
  /**
   * Motion bound to character, not shared across the ten. Measured floors from
   * MEASURED.md: serious learning products run 120–150ms (Khan .125s,
   * Speechify .15s, Quizlet .12s); Headspace pairs 150ms with 400ms on a custom
   * curve; only Duolingo, the most gamified, reaches 300–400ms. Round one gave
   * all ten schemes the same duration, which is why none of them had a
   * character you could feel.
   */
  motion: { fast: number; slow: number; ease: string };
  /** One radius stance per scheme. 2px says restraint, 32px says softness,
   *  9999px says press me. Round one used 12–18px everywhere and said nothing. */
  radius: number;
  /** The question this scheme exists to answer — shown in the gallery. */
  asksZh: string;
}

export const SCHEMES: Scheme[] = [
  {
    id: '01', ref: 'GoodNotes · Speechify', ratings: 443_855,
    name: 'The Page', nameZh: '那页纸',
    asksZh: '被追问的时候，我的原文该在哪？',
    ideaZh: '页在上、问在下，页从头到尾不被替换。判定回来时，原文里那句话的下划线改变颜色。',
    nav: 'dock', home: 'reader', run: 'reader', logo: 'mark', navInRun: true,
    motion: { fast: 150, slow: 240, ease: 'cubic-bezier(.4,0,.2,1)' }, radius: 18,
  },
  {
    id: '02', ref: 'GoodNotes', ratings: 443_855,
    name: 'Read Back', nameZh: '我读到的是这句',
    asksZh: '系统凭什么问我这一句？',
    ideaZh: '先把「我读到这份作业里有 6 个地方站不住」摊开，让你逐条确认或换一句，然后才出题。',
    nav: 'topbar', home: 'confirm', run: 'anchored', logo: 'inline', navInRun: true,
    motion: { fast: 130, slow: 200, ease: 'cubic-bezier(.42,0,1,1)' }, radius: 8,
  },
  {
    id: '03', ref: 'Babbel', ratings: 750_907,
    name: 'Say It', nameZh: '说出来',
    asksZh: '口试为什么要打字？',
    ideaZh: '先问「这次想怎么被考」，然后一个 72px 的麦克风是唯一的动作。整场读起来是一份转录。',
    nav: 'tabbar', home: 'spoken', run: 'spoken', logo: 'wordmark', navInRun: false,
    motion: { fast: 160, slow: 320, ease: 'cubic-bezier(.32,.94,.6,1)' }, radius: 16,
  },
  {
    id: '04', ref: 'Khan Academy · Elevate', ratings: 649_946,
    name: 'The Honest Bar', nameZh: '诚实条',
    asksZh: '承认不会，为什么比编一个更难？',
    ideaZh: '底部常驻一条栏：「我卡住了」和「提交」等大并排，中间一句白话说还剩几问。',
    nav: 'topbar', home: 'honest', run: 'honest', logo: 'mark', navInRun: true,
    motion: { fast: 125, slow: 180, ease: 'ease' }, radius: 4,
  },
  {
    id: '05', ref: 'Anki', ratings: 2_319,
    name: 'The Interval', nameZh: '间隔',
    asksZh: '自评到底在承诺什么？',
    ideaZh: '自评按钮上写的不是形容词，是承诺：「站住了 · 7 天后再问」。选完立刻给出那个日期。',
    nav: 'toolbar', home: 'table', run: 'ratingbar', logo: 'none', navInRun: true,
    motion: { fast: 120, slow: 160, ease: 'ease' }, radius: 5,
  },
  {
    id: '06', ref: 'Busuu · Structured', ratings: 264_918,
    name: 'The Gate', nameZh: '关卡',
    asksZh: '我到底在为哪一场准备？',
    ideaZh: '首页是一条路径，真实场次（组会 8/31、答辩 9/12）是路上的门。每一问都知道自己为哪一场服务。',
    nav: 'railtime', home: 'gates', run: 'agenda', logo: 'inline', navInRun: true,
    motion: { fast: 140, slow: 260, ease: 'cubic-bezier(.2,.7,.2,1)' }, radius: 10,
  },
  {
    id: '07', ref: 'Elevate · Readwise', ratings: 541_289,
    name: 'Today’s Set', nameZh: '今日一组',
    asksZh: '今天做到什么程度算做完了？',
    ideaZh: '今天 5 问，做完就结束。完成态只给两行数字：你说站住了几句 / 其中真的站住几句。',
    nav: 'tabbar', home: 'set', run: 'set', logo: 'lockup', navInRun: false,
    motion: { fast: 150, slow: 400, ease: 'cubic-bezier(.32,.94,.6,1)' }, radius: 22,
  },
  {
    id: '08', ref: 'Gauth · Photomath · Chegg', ratings: 2_395_115,
    name: 'The Worked Sheet', nameZh: '解答单',
    asksZh: '一次口试结束后留下什么？',
    ideaZh: '整场是一份编号解答单，可以打印带走。等待判定时给的是三段状态线，不是转圈。',
    nav: 'topbar', home: 'scan', run: 'steps', logo: 'mark', navInRun: true,
    motion: { fast: 130, slow: 220, ease: 'cubic-bezier(.4,0,.2,1)' }, radius: 14,
  },
  {
    id: '09', ref: 'Notion · Notability', ratings: 542_928,
    name: 'The Outline', nameZh: '大纲',
    asksZh: '一学期下来这些东西怎么组织？',
    ideaZh: '没有卡片，只有一棵可折叠的树。界面文字与阅读文字用两套字体，阅读那套是衬线 18/28。',
    nav: 'sidebar', home: 'outline', run: 'outline', logo: 'inline', navInRun: true,
    motion: { fast: 200, slow: 300, ease: 'cubic-bezier(.42,0,1,1)' }, radius: 5,
  },
  {
    id: '10', ref: 'Quizlet · Elevate · Busuu', ratings: 1_744_549,
    name: 'Commit First', nameZh: '卡片',
    asksZh: '判定之前，能不能先逼我表个态？',
    ideaZh: '打字之前先按一个二值判断：「这句我站得住」或「这句我说不清」。说完之后，两次表态一起给你看。',
    nav: 'topbar', home: 'deck', run: 'card', logo: 'wordmark', navInRun: true,
    motion: { fast: 120, slow: 200, ease: 'cubic-bezier(.47,0,.745,.715)' }, radius: 12,
  },
];

export const DEFAULT_SCHEME: Scheme = {
  id: '00', ref: '—', ratings: 0, name: 'Base', nameZh: '基线',
  asksZh: '未套用方案时的原始产品形态。',
  ideaZh: '未套用方案时的原始产品形态。',
  nav: 'tabbar', home: 'reader', run: 'reader', logo: 'wordmark', navInRun: false,
  motion: { fast: 180, slow: 260, ease: 'cubic-bezier(.2,.7,.2,1)' }, radius: 16,
};

const BY_ID = new Map(SCHEMES.map((scheme) => [scheme.id, scheme]));

export function schemeById(id: string | null | undefined): Scheme {
  if (!id) return DEFAULT_SCHEME;
  return BY_ID.get(id) ?? DEFAULT_SCHEME;
}

/** Read once at module load; index.html has already written data-ui pre-paint. */
export function activeSchemeId(): string | null {
  if (typeof document === 'undefined') return null;
  return document.documentElement.getAttribute('data-ui');
}

export function activeScheme(): Scheme {
  return schemeById(activeSchemeId());
}
