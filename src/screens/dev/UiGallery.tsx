import React, { useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import {
  Button, IconButton, Input, Textarea, Select, Segmented, Toggle, Tag, Mark, ScorePip,
  Sheet, Callout, EmptyState, Skeleton, Spinner, Kbd, Tooltip, Dialog, useToast,
  SegmentStrip, TimerRing, OwnershipBar, DimensionLedger, AnchoredText, MarginNote,
  DataTable, FileDrop,
} from '../../ui';
import type { Verdict } from '../../types';
import { useStore } from '../../store';

const VERDICTS: Verdict[] = ['defended', 'partial', 'undefended', 'underclaimed', 'none'];

/* Every state the contrast gate samples has to actually exist on a page it
     can reach, or the gate silently measures nothing — which is how v2's AA
     claim came to be true about six selectors and silent about the product. */
function GateSpecimen() {
  return (
    <section className="stack" style={{ marginBottom: 'var(--space-8)' }}>
      <h2 className="t-title">Axis A · demonstrated</h2>
      <div className="anchored anchored-prose">
        <p className="md-p">
          <mark className="anchor-span anchor-defended">defended span</mark>{' · '}
          <mark className="anchor-span anchor-partial">partly defended span</mark>{' · '}
          <mark className="anchor-span anchor-undefended">could not defend span</mark>{' · '}
          <mark className="anchor-span anchor-underclaimed">defended but not claimed</mark>{' · '}
          <mark className="anchor-span anchor-defended is-active">focused span, wash on</mark>
        </p>
      </div>
      <div className="row wrap" style={{ gap: 'var(--space-5)' }}>
        <Mark verdict="defended" />
        <Mark verdict="partial" />
        <Mark verdict="undefended" />
        <Mark verdict="underclaimed" />
      </div>
      <h2 className="t-title">Axis B · divergence</h2>
      <div className="row wrap" style={{ gap: 'var(--space-5)' }}>
        <span className="ink-over t-body">claimed more than demonstrated</span>
        <span className="ink-under t-body">demonstrated more than claimed</span>
      </div>
      <h2 className="t-title">Glass chrome</h2>
      <div className="glass" style={{ padding: 'var(--space-5)' }}>
        <span className="t-small">Chrome text over glass. Never over the student&rsquo;s own words.</span>
      </div>
    </section>
  );
}


function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 'var(--space-8)' }}>
      <h2 className="t-micro ink-3" style={{ marginBottom: 'var(--space-4)' }}>{title}</h2>
      <div className="row wrap" style={{ gap: 'var(--space-4)', alignItems: 'flex-start' }}>{children}</div>
    </section>
  );
}

const SAMPLE = `def bfs(graph, start):
    seen = {start}
    q = deque([start])
    while q:
        node = q.popleft()
        for nxt in graph[node]:
            if nxt not in seen:
                seen.add(nxt)
                q.append(nxt)
    return seen`;

/** Dev-only primitive gallery (§8 WP0 verification). Route: #/dev/ui */
export default function UiGallery() {
  const [seg, setSeg] = useState<'quick' | 'standard' | 'defense'>('standard');
  const [on, setOn] = useState(true);
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const toast = useToast();
  const theme = useStore((s) => s.settings.theme);
  const setSettings = useStore((s) => s.setSettings);

  return (
    <div className="col-data">
      <GateSpecimen />
      <div className="row-between wrap">
        <h1 className="t-display-2">Primitive gallery</h1>
        <Segmented
          ariaLabel="Theme"
          options={[{ value: 'paper', label: 'Paper' }, { value: 'slate', label: 'Slate' }, { value: 'system', label: 'System' }]}
          value={theme}
          onChange={(v) => setSettings({ theme: v as 'paper' | 'slate' | 'system' })}
        />
      </div>

      <Row title="Button">
        <Button variant="primary">Start viva</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger" icon={<Trash2 size={16} />}>Wipe data</Button>
        <Button variant="primary" loading>Loading</Button>
        <Button variant="secondary" size="sm">Small</Button>
        <Button variant="secondary" size="lg" icon={<Check size={18} />}>Large</Button>
        <IconButton icon={<Trash2 size={18} />} label="Delete" />
        <Tooltip label="Tooltip copy"><Button variant="ghost" size="sm">Hover me</Button></Tooltip>
      </Row>

      <Row title="Fields">
        <div style={{ minWidth: 260 }}><Input label="Model" placeholder="gpt-4o-mini" hint="Free text; the test call verifies it." /></div>
        <div style={{ minWidth: 260 }}><Input label="With error" error="That key was rejected." defaultValue="sk-…" /></div>
        <div style={{ minWidth: 300 }}>
          <Textarea label="Your submission" counter maxLength={200} autogrow value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste your own finished work." />
        </div>
        <div style={{ minWidth: 220 }}>
          <Select label="Provider" options={[{ value: 'openai', label: 'OpenAI' }, { value: 'deepseek', label: 'DeepSeek' }]} />
        </div>
        <Segmented ariaLabel="Preset" options={[{ value: 'quick', label: 'Quick' }, { value: 'standard', label: 'Standard' }, { value: 'defense', label: 'Defense' }]} value={seg} onChange={setSeg} />
        <Toggle label="Timers" hint="Off means untimed probes." checked={on} onChange={setOn} />
      </Row>

      <Row title="Marks, tags, scores">
        {VERDICTS.map((v) => <Mark key={v} verdict={v} />)}
        {(['neutral', 'action', 'defended', 'partial', 'undefended', 'underclaimed'] as const).map((t) => <Tag key={t} tone={t}>{t}</Tag>)}
        <Tag mono tone="neutral">provenance</Tag>
        {[0, 1, 2, 3].map((s) => <ScorePip key={s} score={s as 0} />)}
        <ScorePip score={null} />
      </Row>

      <Row title="Meters">
        <div style={{ width: 260 }}><SegmentStrip total={6} current={2} states={['defended', 'underclaimed', 'none', 'none', 'none', 'none']} /></div>
        <TimerRing totalSec={90} remainingSec={62} />
        <TimerRing totalSec={90} remainingSec={22} />
        <TimerRing totalSec={90} remainingSec={9} />
        <div style={{ width: 320 }}>
          <OwnershipBar counts={{ defended: 3, partial: 1, undefended: 1, underclaimed: 1, none: 0, total: 6 }} showLegend />
        </div>
        <div style={{ width: 360 }}>
          <DimensionLedger
            compareSelf
            rows={[
              { dimensionId: 'invariants', mean: 2.4, selfMean: 3, n: 2 },
              { dimensionId: 'complexity', mean: 1.2, selfMean: 1.5, n: 2 },
              { dimensionId: 'provenance', mean: 0.5, selfMean: 3, n: 2 },
            ]}
          />
        </div>
      </Row>

      <Row title="Surfaces">
        <Sheet elevation={1} style={{ maxWidth: 320 }}>
          <div className="t-heading">Sheet</div>
          <p className="t-small ink-2">Flat paper, hairline structure, no drop shadow doing structural work.</p>
        </Sheet>
        <div style={{ maxWidth: 340 }}>
          <Callout tone="action" title="AI scoring needs a key" action={<Button size="sm">Add one</Button>}>
            The self-grade track works without one.
          </Callout>
        </div>
        <div style={{ width: 260 }}><Skeleton lines={3} /></div>
        <Spinner label="Composing probes…" />
        <span className="row"><Kbd>1</Kbd><Kbd>?</Kbd></span>
        <Button variant="secondary" onClick={() => setOpen(true)}>Open dialog</Button>
        <Button variant="secondary" onClick={() => toast.push('Added 3 items to the retraining queue.', { tone: 'defended' })}>Toast</Button>
      </Row>

      <Row title="Painted page">
        <div style={{ maxWidth: 520, width: '100%' }}>
          <AnchoredText
            mode="code"
            text={SAMPLE}
            staggered
            anchors={[
              { id: 'a1', start: SAMPLE.indexOf('seen = {start}'), end: SAMPLE.indexOf('seen = {start}') + 14, verdict: 'defended' },
              { id: 'a2', start: SAMPLE.indexOf('q.popleft()'), end: SAMPLE.indexOf('q.popleft()') + 11, verdict: 'underclaimed' },
              { id: 'a3', start: SAMPLE.indexOf('seen.add(nxt)'), end: SAMPLE.indexOf('seen.add(nxt)') + 13, verdict: 'undefended' },
            ]}
          />
        </div>
        <div style={{ maxWidth: 260 }}>
          <MarginNote tone="underclaimed">You marked this Owned. It isn't yet.</MarginNote>
        </div>
      </Row>

      <Row title="Data">
        <div style={{ width: 'min(560px, 100%)' }}>
          <DataTable
            stickyHeader
            columns={[
              { key: 'label', header: 'Submission', sortable: true, value: (r) => r.label },
              { key: 'score', header: 'Ownership', align: 'right', render: (r) => <ScorePip score={r.score as 0} /> },
            ]}
            rows={[{ id: '1', label: 'student-04.py', score: 2 }, { id: '2', label: 'student-11.py', score: 0 }]}
          />
        </div>
        <div style={{ width: 'min(360px, 100%)' }}>
          <FileDrop accept={['.py', '.md']} label="Drop your file" hint=".txt .md .py .js .ts .ipynb — no PDF in v2" onFiles={() => {}} />
        </div>
      </Row>

      <Row title="Empty">
        <div style={{ width: 'min(420px, 100%)' }}>
          <EmptyState title="Nothing to retrain yet." action={<Button variant="primary">Run a verification</Button>} />
        </div>
      </Row>

      <Dialog
        open={open} onClose={() => setOpen(false)} title="Abandon this run?"
        footer={<><Button onClick={() => setOpen(false)}>Keep going</Button><Button variant="danger" onClick={() => setOpen(false)}>Abandon</Button></>}
      >
        <p className="t-body ink-2">Answers you have already committed stay committed. You can resume from the next probe.</p>
      </Dialog>
    </div>
  );
}
