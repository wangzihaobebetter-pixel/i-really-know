/**
 * Voice answers (F7, P2 §4.1, P3 §6).
 *
 * The product is called an oral examination, so answering out loud is not a
 * nice-to-have. This uses the browser's own Web Speech API: no backend, no
 * audio upload, nothing leaves the machine except what the browser itself
 * sends to its platform recogniser — which is the same non-negotiable the API
 * key lives under.
 *
 * THREE THINGS THIS DELIBERATELY DOES NOT DO:
 *
 *  1. It never auto-submits. The transcript is ALWAYS shown as editable text
 *     before it is committed. Corpus 05 §2.1 records NYU's finding that "the
 *     difficulty wasn't in knowing the material but in articulating my
 *     thoughts under pressure in English" — letting the student repair a
 *     transcript before it is graded is a direct mitigation, and it is also
 *     the fallback for browser speech-to-text quality, which is the accepted
 *     risk in P2 §4.1.
 *  2. It never stops on silence. Corpus 05 §2.1 records NYU's fixed failure
 *     mode: a 5-second cut-off interrupted students mid-thought and was raised
 *     to 15 seconds with a 30-second target — "silence is thinking time".
 *     Continuous mode plus an explicit stop button means the student decides.
 *  3. It shows no countdown. v2's viva screen displayed a 1:30 ring.
 *
 * HONEST LIMIT: `SpeechRecognition` is Chromium and Safari; Firefox does not
 * ship it. `isSpeechSupported()` is the gate, and where it returns false the
 * UI says so plainly and offers typing rather than hiding the feature.
 */

type Ctor = new () => SpeechRecognitionLike;

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

function ctor(): Ctor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function isSpeechSupported(): boolean {
  return !!ctor();
}

export interface Dictation {
  stop(): void;
}

/**
 * Starts dictation. `onText` receives the full transcript so far — the caller
 * owns the text and can edit it at any point, including while recording.
 */
export function startDictation(
  lang: 'en' | 'zh-CN',
  onText: (text: string) => void,
  onError: (kind: string) => void,
  onEnd: () => void,
): Dictation | null {
  const C = ctor();
  if (!C) return null;

  const rec = new C();
  rec.lang = lang === 'zh-CN' ? 'zh-CN' : 'en-US';
  rec.continuous = true;
  rec.interimResults = true;

  let committed = '';
  let stopped = false;

  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const alt = e.results[i][0];
      if (!alt) continue;
      if (e.results[i].isFinal) committed += alt.transcript;
      else interim += alt.transcript;
    }
    onText((committed + interim).trimStart());
  };

  rec.onerror = (e) => {
    /* `no-speech` fires on a pause. It is not an error here — silence is
       thinking time — so it is swallowed rather than surfaced. */
    if (e.error === 'no-speech' || e.error === 'aborted') return;
    onError(e.error);
  };

  rec.onend = () => {
    /* Chromium ends the session on its own after a stretch of silence.
       Restart unless the student asked to stop, so a long pause mid-thought
       does not silently end the answer. */
    if (stopped) { onEnd(); return; }
    try { rec.start(); } catch { onEnd(); }
  };

  try {
    rec.start();
  } catch {
    return null;
  }

  return {
    stop() {
      stopped = true;
      try { rec.stop(); } catch { /* already stopped */ }
    },
  };
}
