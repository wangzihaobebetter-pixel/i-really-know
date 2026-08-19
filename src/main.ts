import "./styles-mirror.css";

const app = document.getElementById("root")!;
app.innerHTML = `
<div class="col-doc" style="padding: 32px 16px;">
  <p class="t-micro">Token verification harness</p>

  <h1 class="t-sentence">Your examiner, before the examiner.</h1>
  <p class="t-body-lg ink-2">Bring something you made. I'll ask what they'll ask — and show you which parts of it hold.</p>
  <p class="t-body">Body copy uses Inter at 1.0625rem / 1.6. The student's text reads at 17 px on desktop, 15.5 px on a 390 px phone.</p>

  <p class="t-question">In the room, would that hold?</p>
  <p class="t-title">A title at 1.25rem</p>
  <p class="t-small ink-3">Small print at 0.875rem</p>
  <p class="t-micro">A TRUE LABEL · 0.75rem</p>

  <hr class="hairline" />

  <p>
    <span class="ink-held">Held</span> ·
    <span class="ink-half-held">Half-held</span> ·
    <span class="ink-slipped">Slipped</span> ·
    <span class="ink-held-more">Held — more than you thought</span>
  </p>

  <p>
    <span class="bg-held" style="padding: 2px 6px;">held wash</span> ·
    <span class="bg-half-held" style="padding: 2px 6px;">half-held wash</span> ·
    <span class="bg-slipped" style="padding: 2px 6px;">slipped wash</span> ·
    <span class="bg-held-more" style="padding: 2px 6px;">held-more wash</span>
  </p>

  <p>
    <span class="ink-defended">v2 defended</span> ·
    <span class="ink-partial">v2 partial</span> ·
    <span class="ink-undefended">v2 undefended</span> ·
    <span class="ink-underclaimed">v2 underclaimed</span>
  </p>

  <p>
    <span class="ink-over">over</span> ·
    <span class="ink-under">under</span> ·
    <span class="ink-accent">terracotta accent</span>
  </p>

  <p>
    <span class="anchor-held" style="text-decoration: underline wavy var(--held); text-underline-offset: 4px;">anchor held</span> ·
    <span class="anchor-half-held" style="text-decoration: underline dashed var(--half-held); text-underline-offset: 4px;">anchor half-held</span> ·
    <span class="anchor-slipped" style="text-decoration: underline dotted var(--slipped); text-underline-offset: 4px;">anchor slipped</span> ·
    <span class="anchor-held-more" style="text-decoration: underline solid var(--held-more); text-underline-offset: 4px;">anchor held-more</span>
  </p>

  <p>
    <span class="anchor-defended" style="text-decoration: underline wavy var(--held); text-underline-offset: 4px;">v2 anchor defended</span> ·
    <span class="anchor-partial" style="text-decoration: underline dashed var(--half-held); text-underline-offset: 4px;">v2 anchor partial</span> ·
    <span class="anchor-undefended" style="text-decoration: underline dotted var(--slipped); text-underline-offset: 4px;">v2 anchor undefended</span> ·
    <span class="anchor-underclaimed" style="text-decoration: underline solid var(--held-more); text-underline-offset: 4px;">v2 anchor underclaimed</span>
  </p>

  <hr class="hairline" />

  <button class="btn-primary" style="background: var(--primary-button-bg); color: var(--primary-button-ink); border: 0; border-radius: var(--r-control); padding: 14px 24px; font-weight: 600;">Bring a piece of your work</button>
  <button class="btn-secondary" style="background: transparent; color: var(--ink); border: 1px solid var(--hairline); border-radius: var(--r-control); padding: 14px 24px; font-weight: 600; margin-left: 8px;">Watch a run-through</button>

  <hr class="hairline" />

  <div class="sample-card" style="background: var(--sheet); border: 1px solid var(--hairline); border-radius: var(--r-sheet); padding: 16px; margin-top: 16px;">
    <p class="t-small">Sample card blurb</p>
    <p class="sample-card-title t-title">Sample card title</p>
    <p class="t-small ink-2">Secondary text on the card</p>
  </div>

  <div class="glass" style="background: var(--glass); backdrop-filter: blur(12px); border: 1px solid var(--glass-hairline); border-radius: var(--r-control); padding: 12px; margin-top: 16px;">
    <p class="t-small">Glass chrome text</p>
  </div>

  <div class="doc" style="background: var(--sheet); border: 1px solid var(--hairline); border-radius: var(--r-sheet); padding: 24px; margin-top: 16px;">
    <p class="doc-method t-small">A method line in the document</p>
    <p class="doc-quote t-mono">"A quotation in the document"</p>
    <p class="t-micro">Doc micro label</p>
  </div>
</div>
`;
