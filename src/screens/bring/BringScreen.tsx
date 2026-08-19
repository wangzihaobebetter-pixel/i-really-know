import React, { useMemo, useState } from 'react';
import { ArrowRight, LockKeyhole, Sparkles } from 'lucide-react';
import { useStore, selectHasKey } from '../../store';
import { useNavigate } from '../../router';
import { useT } from '../../i18n';
import { BottomSheet, Button, FileDrop, Input, Segmented, Textarea } from '../../ui';
import { detectPack, getPack, PACKS } from '../../packs';
import { detectMaterialKind, titleFromMaterial } from '../../lib/analysis';
import { buildSampleSession, SAMPLES } from '../../samples';
import type { PackId } from '../../types';

const OCCASIONS = ['lab', 'defense', 'review', 'exam', 'other'] as const;
type Occasion = typeof OCCASIONS[number];

function parseNotebook(raw: string) {
  try {
    const notebook = JSON.parse(raw) as { cells?: { source?: string[] | string }[] };
    if (!Array.isArray(notebook.cells)) return raw;
    return notebook.cells
      .map((cell) => Array.isArray(cell.source) ? cell.source.join('') : (cell.source ?? ''))
      .filter(Boolean)
      .join('\n\n');
  } catch {
    return raw;
  }
}

export default function BringScreen() {
  const t = useT();
  const nav = useNavigate();
  const createSession = useStore((s) => s.createSession);
  const upsertSession = useStore((s) => s.upsertSession);
  const hasKey = useStore(selectHasKey);
  const settings = useStore((s) => s.settings);

  const [material, setMaterial] = useState('');
  const [title, setTitle] = useState('');
  const [occasion, setOccasion] = useState<Occasion>('lab');
  const [customOccasion, setCustomOccasion] = useState('');
  const [date, setDate] = useState('');
  const detected = useMemo(() => detectPack(material), [material]);
  const [overridePack, setOverridePack] = useState<PackId | null>(null);
  const [packOpen, setPackOpen] = useState(false);
  const [connectOpen, setConnectOpen] = useState(false);
  const [error, setError] = useState('');
  const packId = overridePack ?? detected.packId;

  const occasionOptions = [
    { value: 'lab' as const, label: t('bring4.occasionLab') },
    { value: 'defense' as const, label: t('bring4.occasionDefense') },
    { value: 'review' as const, label: t('bring4.occasionReview') },
    { value: 'exam' as const, label: t('bring4.occasionExam') },
    { value: 'other' as const, label: t('bring4.occasionOther') },
  ];

  async function loadFile(file: File) {
    const raw = await file.text();
    const next = file.name.endsWith('.ipynb') ? parseNotebook(raw) : raw;
    setMaterial(next.slice(0, 50000));
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''));
  }

  function useExample() {
    const session = buildSampleSession(SAMPLES[0]);
    upsertSession(session);
    setConnectOpen(false);
    nav('run', { sessionId: session.id });
  }

  function submit() {
    setError('');
    if (material.trim().length < 80) {
      setError(t('bring4.tooShort'));
      return;
    }
    if (!date || (occasion === 'other' && !customOccasion.trim())) {
      setError(occasion === 'other' && !customOccasion.trim() ? t('bring4.occasionCustom') : t('bring4.date'));
      return;
    }
    if (!hasKey) {
      setConnectOpen(true);
      return;
    }
    const session = createSession({
      title: title.trim() || titleFromMaterial(material),
      material: material.slice(0, 50000),
      materialKind: detectMaterialKind(material),
      packId,
      detected: { packId: detected.packId, confidence: detected.confidence },
      occasion: occasion === 'other' ? customOccasion.trim() : occasion,
      occasionAt: new Date(`${date}T12:00:00`).getTime(),
      preset: settings.preset,
      difficulty: settings.difficulty,
      status: 'generating',
      mode: 'viva',
    });
    nav('read', { sessionId: session.id });
  }

  return (
    <div className="col-read stack page-enter bring-page" data-testid="bring-screen">
      <header className="stack-tight">
        <span className="t-micro ink-accent">{t('bring4.eyebrow')}</span>
        <h1 className="t-sentence">{t('bring4.title')}</h1>
        <p className="t-body-lg ink-2 measure">{t('bring4.body')}</p>
      </header>

      <section className="bring-section stack-tight">
        <span className="field-label">{t('bring4.occasion')}</span>
        <div className="occasion-grid" role="group" aria-label={t('bring4.occasion')}>
          {occasionOptions.map((option) => (
            <button
              type="button"
              className="occasion-chip"
              aria-pressed={occasion === option.value}
              key={option.value}
              onClick={() => setOccasion(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        {occasion === 'other' && (
          <Input label={t('bring4.occasionCustom')} value={customOccasion} onChange={(event) => setCustomOccasion(event.target.value)} />
        )}
        <Input label={t('bring4.date')} type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      </section>

      <section className="bring-section stack-tight">
        <Input
          label={t('bring4.titleLabel')}
          placeholder={t('bring4.titlePlaceholder')}
          value={title}
          maxLength={72}
          onChange={(event) => setTitle(event.target.value)}
        />
        <Textarea
          label={t('bring4.material')}
          hint={t('bring4.materialHint')}
          value={material}
          rows={10}
          maxLength={50000}
          autogrow
          onChange={(event) => setMaterial(event.target.value)}
        />
        <FileDrop
          accept={['.txt', '.md', '.py', '.js', '.ts', '.tsx', '.java', '.c', '.cpp', '.ipynb', 'text/*']}
          label={material ? (title || t('bring4.material')) : 'TXT · MD · CODE · IPYNB'}
          hint={material ? `${material.length.toLocaleString()} characters` : undefined}
          onFiles={(files) => { if (files[0]) void loadFile(files[0]); }}
        />
      </section>

      <button className="subject-chip" type="button" onClick={() => setPackOpen(true)}>
        <Sparkles size={15} aria-hidden />
        <span>{t('bring4.subject', { pack: getPack(packId).name })}</span>
        <span className="ink-accent">{t('bring4.change')}</span>
      </button>

      {error && <p className="form-kind-error" role="alert">{error}</p>}
      <Button size="lg" variant="primary" block onClick={submit} iconRight={<ArrowRight size={19} />}>
        {t('bring4.start')}
      </Button>

      <BottomSheet
        open={packOpen}
        onClose={() => setPackOpen(false)}
        title={t('bring4.subject', { pack: getPack(packId).name })}
      >
        <div className="pack-picker">
          {PACKS.map((pack) => (
            <button
              type="button"
              key={pack.id}
              aria-pressed={pack.id === packId}
              onClick={() => { setOverridePack(pack.id); setPackOpen(false); }}
            >
              <strong>{pack.name}</strong>
              <small>{pack.tagline}</small>
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        title={t('bring4.connectTitle')}
        footer={<Button variant="ghost" onClick={useExample}>{t('bring4.useExample')}</Button>}
      >
        <div className="stack">
          <span className="privacy-lock" aria-hidden><LockKeyhole size={22} /></span>
          <p className="t-body-lg measure">{t('bring4.connectBody')}</p>
          <p className="t-small ink-3 measure">{t('bring4.privacy')}</p>
          <Button variant="primary" block onClick={() => nav('settings')}>{t('bring4.connect')}</Button>
        </div>
      </BottomSheet>
    </div>
  );
}
