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
  | 'tabbar'      // bottom bar, blocky, chunky targets — Duolingo / Blinkist / Headspace
  | 'topbar'      // top-only chrome: close · count · gear — Quizlet / Brilliant
  | 'toolbar'     // system-plain toolbar, no decoration — Anki
  | 'dock'        // floating pill above the content — Speechify
  | 'railtime'    // left rail as a time spine — Structured
  | 'sidebar';    // collapsible outline tree — Notion

export type HomeShape =
  | 'path'        // vertical journey list, one row per piece
  | 'deck'        // grid of decks; the card is the product
  | 'table'       // dense rows: name · due · interval
  | 'scan'        // one enormous primary action + a tool row
  | 'reader'      // the last piece of work IS the home screen
  | 'timeline'    // date strip + vertical timeline of rooms
  | 'daily'       // one hero for today + a day grid of what you have held
  | 'outline'     // nested collapsible tree: work → run → question
  | 'tiles'       // search + 2×2 category tiles + a guided-programme card
  | 'panel';      // panel rows with a tutor line under each

export type RunShape =
  | 'clean'       // full clear-out: no nav, progress + exit only
  | 'card'        // one full-bleed card, flips to reveal
  | 'ratingbar'   // bare text + a bottom rating row that names the interval
  | 'steps'       // one numbered solution sheet, rows expand in place
  | 'reader'      // source fills the screen; the question rises from a dock
  | 'agenda'      // questions as a timed agenda, current one open
  | 'chapter'     // "chapter N of M", big display title page per question
  | 'outline'     // toggle rows expanding inside the tree
  | 'guided'      // one centred soft card, generous air, slow pace
  | 'split';      // top panel holds the work, bottom is a tutor conversation

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
}

export const SCHEMES: Scheme[] = [
  {
    id: '01', ref: 'Duolingo', ratings: 5_398_782,
    name: 'The Path', nameZh: '路径',
    ideaZh: '一进练习就清场：没有导航，顶栏只剩「还剩多少」，选项大到点不错。',
    nav: 'tabbar', home: 'path', run: 'clean', logo: 'mark', navInRun: false,
  },
  {
    id: '02', ref: 'Quizlet', ratings: 1_104_312,
    name: 'The Card', nameZh: '卡片',
    ideaZh: '一张全出血的卡就是产品。顶栏只有关闭、计数、齿轮。',
    nav: 'topbar', home: 'deck', run: 'card', logo: 'wordmark', navInRun: true,
  },
  {
    id: '03', ref: 'Anki', ratings: 2_319,
    name: 'The Interval', nameZh: '间隔',
    ideaZh: '评级条即交互。按钮上直接写「选它之后多久再见你」。',
    nav: 'toolbar', home: 'table', run: 'ratingbar', logo: 'none', navInRun: true,
  },
  {
    id: '04', ref: 'Gauth · Photomath', ratings: 1_457_029,
    name: 'The Worked Sheet', nameZh: '解答单',
    ideaZh: '一次过一遍渲染成一份编号解答单，逐条展开原话与判定。',
    nav: 'topbar', home: 'scan', run: 'steps', logo: 'mark', navInRun: true,
  },
  {
    id: '05', ref: 'Speechify', ratings: 517_576,
    name: 'The Page', nameZh: '那页纸',
    ideaZh: '学生的原文占满整屏，问题从底部的坞里升起。永远不离开那页纸。',
    nav: 'dock', home: 'reader', run: 'reader', logo: 'mark', navInRun: true,
  },
  {
    id: '06', ref: 'Structured', ratings: 164_657,
    name: 'The Spine', nameZh: '时间轴',
    ideaZh: '首页就是一条通往那几间房的时间线：组会 8/31、答辩 9/12。',
    nav: 'railtime', home: 'timeline', run: 'agenda', logo: 'inline', navInRun: true,
  },
  {
    id: '07', ref: 'Blinkist', ratings: 153_947,
    name: 'The Daily', nameZh: '每日一问',
    ideaZh: '「今天这一问」当英雄位，日历格表现你已经站住了几天。',
    nav: 'tabbar', home: 'daily', run: 'chapter', logo: 'wordmark', navInRun: false,
  },
  {
    id: '08', ref: 'Notion', ratings: 89_863,
    name: 'The Outline', nameZh: '大纲',
    ideaZh: '没有卡片。作业 → 每一遍 → 每一问，天然是一棵可折叠的树。',
    nav: 'sidebar', home: 'outline', run: 'outline', logo: 'inline', navInRun: true,
  },
  {
    id: '09', ref: 'Headspace', ratings: 973_869,
    name: 'The Programme', nameZh: '引导',
    ideaZh: '2×2 分类瓷砖 +「引导程序」卡；一次一问，留足空气。',
    nav: 'tabbar', home: 'tiles', run: 'guided', logo: 'lockup', navInRun: false,
  },
  {
    id: '10', ref: 'Brilliant', ratings: 31_957,
    name: 'The Tutor', nameZh: '口试',
    ideaZh: '上半屏是作业面板，下半屏是导师对话气泡。判定以对话给出。',
    nav: 'topbar', home: 'panel', run: 'split', logo: 'mark', navInRun: true,
  },
];

export const DEFAULT_SCHEME: Scheme = {
  id: '00', ref: '—', ratings: 0, name: 'Base', nameZh: '基线',
  ideaZh: '未套用方案时的原始产品形态。',
  nav: 'tabbar', home: 'path', run: 'reader', logo: 'wordmark', navInRun: false,
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
