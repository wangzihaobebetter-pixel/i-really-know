import React, { useState } from 'react';
import { useStore, selectHasKey } from '../../store';
import { PACKS, getPack } from '../../packs';
import { useNavigate } from '../../router';
import { useT, useLang } from '../../i18n';
import { Button, Callout, EmptyState, Input, Select, Sheet, Tag } from '../../ui';
import { formatDate } from '../../lib/session-ops';
import { id, now } from '../../lib/ids';
import { buildDemoCohort } from '../../samples';
import type { Cohort, PackId } from '../../types';

export default function ClassScreen() {
  const t = useT();
  const lang = useLang();
  const nav = useNavigate();
  const cohorts = useStore((s) => s.cohorts);
  const settings = useStore((s) => s.settings);
  const hasKey = useStore(selectHasKey);
  const upsertCohort = useStore((s) => s.upsertCohort);
  const upsertSession = useStore((s) => s.upsertSession);

  const [name, setName] = useState('');
  const [packId, setPackId] = useState<PackId>('cs');
  const [occasion, setOccasion] = useState('');
  const [occasionDate, setOccasionDate] = useState('');

  function create() {
    if (!name.trim() || !occasion.trim() || !occasionDate) return;
    const cohort: Cohort = {
      id: id('c'),
      name: name.trim(),
      packId,
      preset: settings.preset,
      difficulty: settings.difficulty,
      createdAt: now(),
      occasion: occasion.trim(),
      occasionAt: new Date(`${occasionDate}T12:00:00`).getTime(),
      submissions: [],
    };
    upsertCohort(cohort);
    setName('');
    setOccasion('');
    setOccasionDate('');
    nav('cohort', { cohortId: cohort.id });
  }

  function loadDemo() {
    const { cohort, sessions } = buildDemoCohort();
    sessions.forEach(upsertSession);
    upsertCohort(cohort);
    nav('cohort', { cohortId: cohort.id });
  }

  return (
    <div className="col-data stack teacher-home-v5">
      <header className="row-between wrap" style={{ alignItems: 'flex-start' }}>
        <div className="stack-tight">
          <h1 className="t-display-2">{t('class.title')}</h1>
          <p className="t-body ink-2 measure">{t('class.subtitle')}</p>
        </div>
        <Button variant="ghost" onClick={() => nav('settings')}>{t('common.action.back')}</Button>
      </header>

      <Callout tone="neutral">{t('teacher4.local')}</Callout>

      {/* The instructor tier is the business, so it has to be reviewable
          before anyone spends a token on it. */}
      <Callout tone="action" title={t('class.demoTitle')}
               action={<Button size="sm" onClick={loadDemo}>{t('class.demo')}</Button>}>
        {t('class.demoBody')}
      </Callout>

      {!hasKey && <Callout tone="action">{t('class.needKey')}</Callout>}

      <Sheet elevation={1}>
        <div className="stack-tight">
          <Input
            label={t('class.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="CS 621 · Problem Set 3"
          />
          <Select
            label={t('import.detected')}
            value={packId}
            onChange={(e) => setPackId(e.target.value as PackId)}
            options={PACKS.map((p) => ({ value: p.id, label: p.name }))}
          />
          <Input
            label={t('teacher4.event')}
            value={occasion}
            onChange={(e) => setOccasion(e.target.value)}
            placeholder={t('bring4.occasionCustom')}
          />
          <label className="stack-tight">
            <span className="field-label">{t('teacher4.eventDate')}</span>
            <input className="control" type="date" value={occasionDate} onChange={(e) => setOccasionDate(e.target.value)} />
          </label>
          <div className="row">
            <Button variant="primary" onClick={create} disabled={!name.trim() || !occasion.trim() || !occasionDate}>{t('class.newCohort')}</Button>
          </div>
        </div>
      </Sheet>

      {cohorts.length === 0 ? (
        <EmptyState title={t('class.empty')} />
      ) : (
        <div className="stack-tight">
          {cohorts.map((c) => (
            <Sheet key={c.id} elevation={1} padding="var(--space-4) var(--space-5)">
              <div className="row-between wrap" style={{ gap: 'var(--space-3)' }}>
                <div className="stack-tight">
                  <div className="row wrap" style={{ gap: 'var(--space-2)' }}>
                    <span className="t-body-strong">{c.name}</span>
                    <Tag mono>{getPack(c.packId).shortName}</Tag>
                  </div>
                  <span className="t-small ink-3">
                    {formatDate(c.createdAt, lang)} · {c.submissions.length} {t('class.submissions').toLowerCase()}
                  </span>
                </div>
                <Button size="sm" variant="secondary" onClick={() => nav('cohort', { cohortId: c.id })}>
                  {t('class.openSheet')}
                </Button>
              </div>
            </Sheet>
          ))}
        </div>
      )}
    </div>
  );
}
