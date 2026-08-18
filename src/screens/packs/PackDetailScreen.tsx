import React from 'react';
import { getPack, MED_SAFETY_NOTE } from '../../packs';
import { useRoute, useNavigate } from '../../router';
import { useT } from '../../i18n';
import { Button, Callout, Sheet, Tag } from '../../ui';
import type { PackId } from '../../types';

export default function PackDetailScreen() {
  const t = useT();
  const nav = useNavigate();
  const packId = useRoute().params.packId as PackId;
  const pack = getPack(packId);

  return (
    <div className="col-read stack">
      <header className="stack-tight">
        <div className="row wrap" style={{ gap: 'var(--space-3)' }}>
          <h1 className="t-display-2">{pack.name}</h1>
          <Tag mono tone="action">{pack.shortName}</Tag>
        </div>
        <p className="t-serif-it t-body-lg measure">{pack.tagline}</p>
        <p className="t-small ink-3">{pack.materialKinds.join(' · ')}</p>
      </header>

      {pack.id === 'med' && <Callout tone="shaky">{MED_SAFETY_NOTE}</Callout>}

      <section className="stack-tight">
        <h2 className="t-title">{t('packs.dimensions')}</h2>
        {pack.dimensions.map((d) => (
          <Sheet key={d.id} elevation={1} padding="var(--space-4) var(--space-5)">
            <div className="stack-tight">
              <div className="row wrap" style={{ gap: 'var(--space-2)' }}>
                <span className="t-body-strong">{d.label}</span>
                <Tag mono>{d.id}</Tag>
              </div>
              <p className="t-small ink-2 measure">{d.oneLine}</p>
              <ul className="reference-list">
                {d.examinerMoves.map((m, i) => <li key={i} className="t-small">{m}</li>)}
              </ul>
              <div className="dim-poles">
                <p className="t-small"><span className="ink-owned">3 —</span> {d.ownedLooksLike}</p>
                <p className="t-small"><span className="ink-borrowed">1 —</span> {d.surfaceLooksLike}</p>
              </div>
            </div>
          </Sheet>
        ))}
      </section>

      <section className="stack-tight">
        <h2 className="t-title">{t('packs.levers')}</h2>
        <div className="row wrap" style={{ gap: 'var(--space-2)' }}>
          {pack.counterfactualLevers.map((l) => <Tag key={l}>{l}</Tag>)}
        </div>
      </section>

      <section className="stack-tight">
        <h2 className="t-title">{t('packs.traps')}</h2>
        <div className="row wrap" style={{ gap: 'var(--space-2)' }}>
          {pack.vocabularyTraps.map((v) => <Tag key={v} mono tone="shaky">{v}</Tag>)}
        </div>
      </section>

      <section className="stack-tight">
        <h2 className="t-title">{t('packs.examples')}</h2>
        {pack.sampleProbes.map((p, i) => (
          <Sheet key={i} elevation={0} padding="var(--space-4) var(--space-5)">
            <p className="t-body measure">{p}</p>
          </Sheet>
        ))}
      </section>

      <section className="stack-tight">
        <h2 className="t-title">{t('packs.aims')}</h2>
        <Callout tone="neutral">{t('packs.aimsNote')}</Callout>
        <ul className="reference-list">
          {pack.tells.map((x, i) => <li key={i} className="t-small">{x}</li>)}
        </ul>
      </section>

      <div className="row wrap">
        <Button variant="primary" onClick={() => nav('import')}>{t('packs.useThis')}</Button>
        <Button variant="ghost" onClick={() => nav('packs')}>{t('common.action.back')}</Button>
      </div>
    </div>
  );
}
