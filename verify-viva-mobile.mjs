/**
 * P3 §9 item 6 — the Viva screen is rebuilt mobile-first at 390px.
 *
 * v2's viva dropped a full-width empty textarea on top of the probe
 * question and stacked timer + commit + skip below it. On a 390px iPhone the
 * question was body text in a card, the textarea was the largest element on
 * screen, and the probe scrolled out of view before the student had finished
 * reading. Voice was a side button, not the default input, and the
 * 15-second silence message ("沉默就是在思考。没有任何倒计时。") was never
 * referenced from the actual screen — it was a string nobody read.
 *
 * v3 inverts it: ONE question per page, the question is the largest text
 * element on the screen, voice is the default input mode when the browser
 * supports it and text otherwise, the transcript is always editable, and the
 * silence message is shown whenever the student is recording.
 *
 * If any of the following ever regresses, this file fails the build:
 *   1. The screen renders MORE than one question (a list/scroll, not a page).
 *   2. The answerMode default stops being 'voice' when speech is supported
 *      and 'text' otherwise (the type still has to allow both).
 *   3. The transcript `<textarea>` is conditional on voice being unavailable
 *      — it must be editable even mid-recording, and editable when voice
 *      is also off.
 *   4. The `voiceSilence` i18n key disappears from either language, OR the
 *      screen stops reading it (the silence message becomes wallpaper).
 *   5. The microphone button is no longer the default input affordance when
 *      speech is supported (it must precede the manual textarea in the
 *      rendered tree).
 *   6. The probe question CSS loses its `t-title` typography — the spec
 *      says it is the largest text element on the screen.
 *   7. The 15s silence note in `src/lib/speech.ts` is removed or weakened —
 *      silence is thinking time and the recogniser must continuous-loop
 *      rather than auto-stop on a pause.
 */
import { execSync } from 'node:child_process';
import { readFileSync, rmSync, mkdirSync } from 'node:fs';

const fails = [];
const note = (m) => console.log('  ' + m);

/* ---- 1. source: ONE question per page, voice default, transcript editable ---- */

const viva = readFileSync('src/screens/viva/VivaScreen.tsx', 'utf8');

/* (a) ONE question. The spec is "one question at a time", and the screen
 *     source MUST derive the question from `probe = session.probes[index]`
 *     — a single source. A `.map` over `session.probes` rendering multiple
 *     questions would be a regression. */
const probeVar = viva.match(/const probe = session\?\.probes\[index\]/);
if (!probeVar) {
  fails.push('VivaScreen.tsx no longer derives its question from `session.probes[index]` — the one-question-per-page invariant is gone');
}
const questionCount = (viva.match(/<p[^>]*className="probe-question[^"]*"/g) || []).length;
if (questionCount !== 1) {
  fails.push(`VivaScreen.tsx renders ${questionCount} <p class="probe-question …"/> tags — must be exactly 1 (one question per page)`);
}
const probeQuestionLen = (viva.match(/probe-question[^"]*"\s*>\s*\{probe\.question\}/g) || []).length;
if (probeQuestionLen < 1) {
  fails.push('VivaScreen.tsx no longer displays {probe.question} inside the .probe-question element');
} else {
  note(`VivaScreen.tsx: .probe-question renders {probe.question} from ` +
       `session.probes[index] — ONE question per page ✓`);
}

/* (b) voice default. The mic button is rendered when speech is supported,
 *     BEFORE the textarea, and the answerMode default is `'voice' if used,
 *     'text' otherwise`. The intent is: voice is the primary input affordance
 *     when the browser supports it, and the textarea is the fallback that
 *     doubles as the editable transcript mid-recording. */
const micRender = viva.match(/className="mic-btn"[\s\S]{0,200}onClick=\{toggleDictation\}/);
if (!micRender) {
  fails.push('VivaScreen.tsx mic button is no longer wired to toggleDictation (or has lost its class hook)');
}
const micIdx = viva.indexOf('className="mic-btn"');
const answerIdx = viva.indexOf('className="control viva-answer"');
if (micIdx < 0 || answerIdx < 0) {
  fails.push('VivaScreen.tsx is missing either the .mic-btn or the .viva-answer textarea');
} else if (micIdx >= answerIdx) {
  fails.push('VivaScreen.tsx renders the textarea BEFORE the mic button — voice is no longer the default input affordance');
} else {
  note(`VivaScreen.tsx: <button class="mic-btn"> precedes <textarea class="viva-answer"> — voice is the default input ✓`);
}
const answerModeDefault = viva.match(/answerMode:\s*usedVoice\.current\s*\?\s*'voice'\s*:\s*'text'/);
if (!answerModeDefault) {
  fails.push("VivaScreen.tsx no longer defaults answerMode to 'voice' (if usedVoice) else 'text' — the contract has changed");
}

/* (c) editable transcript. The textarea must be UNCONDITIONALLY rendered
 *     during the 'answering' phase — never gated on !voiceAvailable, never
 *     gated on recording. Spec: "the transcript is always editable before it
 *     is committed". Grep for the conditional patterns that would block it. */
const textareaOpen = viva.match(/<textarea[\s\S]*?id="viva-answer"[\s\S]*?\/>/);
if (!textareaOpen) {
  fails.push('VivaScreen.tsx no longer renders the editable <textarea id="viva-answer">');
} else {
  /* Confirm the textarea is NOT nested inside a `{speechAvailable ? ... : ...}`
   * — that's the voice-only guard we explicitly want to delete. */
  const enclosing = viva.match(/speechAvailable\s*\?\s*\([\s\S]{0,400}id="viva-answer"[\s\S]{0,400}\)/);
  if (enclosing) {
    fails.push('VivaScreen.tsx gates the <textarea id="viva-answer"> behind speechAvailable — the transcript must be editable even when voice is on');
  }
  /* It must NOT be `readOnly` / `disabled`. */
  if (/id="viva-answer"[\s\S]{0,200}readOnly/.test(viva)
      || /id="viva-answer"[\s\S]{0,200}disabled/.test(viva)) {
    fails.push('VivaScreen.tsx <textarea id="viva-answer"> is readOnly or disabled — the transcript must be editable');
  }
  if (!/id="viva-answer"[\s\S]{0,300}onChange/.test(viva)) {
    fails.push('VivaScreen.tsx <textarea id="viva-answer"> has no onChange — the transcript cannot be edited');
  }
  note(`VivaScreen.tsx: <textarea id="viva-answer"> is unconditional, editable, onChange wired ✓`);
}

/* ---- 2. silence: the 15s note lives in speech.ts AND the screen reads it ---- */

const speech = readFileSync('src/lib/speech.ts', 'utf8');
if (!/15\s*seconds?/i.test(speech) && !/15s/i.test(speech)) {
  fails.push('src/lib/speech.ts no longer references the 15-second silence rule — the recogniser may auto-stop on a pause again');
}
if (!/silence is thinking time/i.test(speech)) {
  fails.push("src/lib/speech.ts lost the 'silence is thinking time' invariant — Corpus 05 §2.1's fix is gone");
}
if (!/continuous\s*=\s*true/.test(speech)) {
  fails.push('src/lib/speech.ts recogniser is no longer continuous — a long pause mid-thought will silently end the answer');
}
if (!/rec\.start\(\)/.test(speech)) {
  fails.push('src/lib/speech.ts recogniser is no longer restarting on `onend` — a pause would end the session');
}
/* The screen must consume voiceSilence when recording. */
const silenceRead = viva.match(/recording\s*\?\s*t\('viva\.voiceSilence'\)/);
if (!silenceRead) {
  fails.push('VivaScreen.tsx no longer reads viva.voiceSilence when recording — the silence message is wallpaper, not a state');
}
note(`speech.ts: 15-second silence rule + continuous mode + restart on onend ✓`);
note(`VivaScreen.tsx: reads viva.voiceSilence when recording — the 15s silence state is reachable from the live code ✓`);

/* ---- 3. i18n: silence + voice + answer keys in BOTH languages ---- */

const v3 = readFileSync('src/i18n/v3.ts', 'utf8');
const screens = readFileSync('src/i18n/screens.ts', 'utf8');
/* The viva i18n table is split across two files: v3.ts owns the v3 NEW keys
 * (voiceSilence, selfTitleV3, voiceAnswer, voiceStop, voiceListening, ...)
 * and screens.ts owns the v2 carry-over (commit, skip, answerLabel, leave,
 * next, finish, ...). The union of both is the source of truth. */
const extractViva = (src) => {
  const m = src.match(/registerStrings\('viva',\s*\{([\s\S]*?)\n\}\);/m);
  return m ? m[1] : '';
};
const v3Block = extractViva(v3);
const screensBlock = extractViva(screens);
if (!v3Block && !screensBlock) {
  fails.push("could not find registerStrings('viva', ...) in either src/i18n/v3.ts or src/i18n/screens.ts — viva strings may have moved");
} else {
  const combined = v3Block + '\n' + screensBlock;
  for (const lang of ['en', "'zh-CN'"]) {
    const langBlock = (combined.match(new RegExp(`${lang}:\\s*\\{([\\s\\S]*?)\\n  \}`)) || [])[1] || '';
    if (!langBlock) {
      fails.push(`could not find the ${lang} block of the viva i18n table (v3 + screens combined)`);
      continue;
    }
    const required = [
      'voiceAnswer:',
      'voiceStop:',
      'voiceListening:',
      'voiceUnsupported:',
      'voiceReview:',
      'voiceSilence:',
      'selfTitleV3:',
    ];
    for (const k of required) {
      if (!langBlock.includes(k)) {
        fails.push(`viva i18n ${lang} block is missing key '${k.replace(':', '')}'`);
      }
    }
    if (lang === 'en' && !langBlock.includes('voiceAnswer:') && !langBlock.includes('voiceSilence:')) {
      fails.push("en viva block is missing both voiceAnswer and voiceSilence — the silence message is wallpaper in English");
    }
    note(`viva i18n ${lang}: 7 required keys checked (voiceAnswer/voiceStop/voiceListening/voiceUnsupported/voiceReview/voiceSilence/selfTitleV3) ✓`);
  }
}

/* ---- 4. CSS: the question is the largest text on the screen ---- */

const css = readFileSync('src/ui/ui.css', 'utf8');
const probeRule = (css.match(/\.probe-question\s*\{([^}]+)\}/) || [])[1] || '';
if (!probeRule) {
  fails.push('ui.css no longer has a .probe-question rule');
} else {
  /* The spec says the question is the largest text on the screen. We don't
   * assert a hard pixel size (different fonts ship different metrics), but
   * we DO assert that it uses the title typography scale and not body. */
  if (!/font-size:\s*var\(--t-title\)/.test(probeRule)) {
    fails.push('.probe-question no longer uses var(--t-title) — the question is no longer the largest text on the screen');
  }
  if (!/line-height:/.test(probeRule)) {
    fails.push('.probe-question has no line-height — the question will not read as the screen\'s hero');
  }
  if (!/font-weight:/.test(probeRule)) {
    fails.push('.probe-question has no font-weight — the question will not read as the screen\'s hero');
  }
  if (!/font-family:/.test(probeRule)) {
    fails.push('.probe-question has no font-family — the question will not read as the screen\'s hero');
  }
  note(`ui.css: .probe-question uses var(--t-title) + line-height + font-weight + font-family ✓`);
}

/* The textarea must be vertically resizable and at least one tap-target
 * high — 390px is the design width. */
const answerRule = (css.match(/\.viva-answer\s*\{([^}]+)\}/) || [])[1] || '';
if (!answerRule) {
  fails.push('ui.css no longer has a .viva-answer rule');
} else if (!/min-height:/.test(answerRule) || !/line-height:/.test(answerRule)) {
  fails.push('.viva-answer lost min-height or line-height — the editable transcript is not a usable input at 390px');
} else {
  note(`ui.css: .viva-answer has min-height + line-height ✓`);
}

/* The mic button is 64px — Apple HIG 44pt minimum, Material 48dp, this
 * overshoots both and survives the 390px design width. */
const micRule = (css.match(/\.mic-btn\s*\{([^}]+)\}/) || [])[1] || '';
if (!/width:\s*64px/.test(micRule) || !/height:\s*64px/.test(micRule)) {
  fails.push('.mic-btn is no longer 64px square — the primary input affordance is below the touch-target minimum');
} else {
  note(`ui.css: .mic-btn is 64px square (above 44pt HIG) ✓`);
}

/* ---- 5. type contract: answerMode still allows 'voice' | 'text' ---- */

const types = readFileSync('src/types/index.ts', 'utf8');
if (!/answerMode\?:\s*'text'\s*\|\s*'voice'/.test(types)) {
  fails.push("src/types/index.ts no longer types answerMode as 'text' | 'voice' — the default-mode contract is gone");
} else {
  note(`types/index.ts: answerMode = 'text' | 'voice' (the default-mode contract) ✓`);
}

/* ---- 6. compile: VivaScreen.tsx + speech.ts still parse ---- */

mkdirSync('.tmp-vivamobile', { recursive: true });
try {
  execSync('npx esbuild src/screens/viva/VivaScreen.tsx --format=esm --outfile=.tmp-vivamobile/viva.mjs --jsx=automatic --loader:.tsx=tsx --bundle=false', { stdio: 'pipe' });
  execSync('npx esbuild src/lib/speech.ts --format=esm --outfile=.tmp-vivamobile/speech.mjs', { stdio: 'pipe' });
  note(`VivaScreen.tsx + speech.ts compile via esbuild ✓`);
} catch (err) {
  fails.push(`VivaScreen.tsx + speech.ts failed to compile: ${err.message.split('\n')[0]}`);
} finally {
  rmSync('.tmp-vivamobile', { recursive: true, force: true });
}

/* ---- result ---- */

console.log(`\nverify-viva-mobile: 6 sections checked (source · silence · i18n · css · types · compile)`);
if (fails.length) {
  console.error(`verify-viva-mobile: ${fails.length} FAIL — the mobile-first viva contract is at risk`);
  fails.forEach((f) => console.error('  ✗ ' + f));
  process.exit(1);
}
console.log('verify-viva-mobile: ONE question per page, voice default, editable transcript, 15s silence wired, t-title typography, 64px mic ✓');
