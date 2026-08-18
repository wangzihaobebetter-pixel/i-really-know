import React from 'react';
import { PACKS } from '../../packs';
import { useNavigate } from '../../router';
import { useT } from '../../i18n';
import { Sheet, Tag } from '../../ui';

export default function PacksScreen() {
  const t = useT();
  const nav = useNavigate();

  return (
    <div className="col-read stack">
      <header className="stack-tight">
        <h1 className="t-display-2">{t('packs.title')}</h1>
        <p className="t-body ink-2 measure">{t('packs.subtitle')}</p>
      </header>

      <div className="pack-grid">
        {PACKS.map((pack) => (
          <button
            key={pack.id}
            type="button"
            className="sample-card"
            onClick={() => nav('packDetail', { packId: pack.id })}
          >
            <div className="row-between">
              <Tag mono tone="action">{pack.shortName}</Tag>
              <span className="t-mono-small ink-3">{pack.dimensions.length}</span>
            </div>
            <span className="t-body-strong sample-card-title">{pack.name}</span>
            <span className="t-serif-it t-small ink-2">{pack.tagline}</span>
          </button>
        ))}
      </div>

      <Sheet elevation={0}>
        <div className="stack-tight">
          <span className="t-micro ink-3">{t('packs.scale')}</span>
          <ul className="reference-list">
            {PACKS[0].rubric.scale.map((line, i) => <li key={i} className="t-small">{line}</li>)}
          </ul>
        </div>
      </Sheet>
    </div>
  );
}
