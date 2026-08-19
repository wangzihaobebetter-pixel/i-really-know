import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, LockKeyhole, Sparkles } from 'lucide-react';
import { useStore, selectHasKey } from '../../store';
import { useNavigate } from '../../router';
import { useLang, useT } from '../../i18n';
import { BottomSheet, Button, FileDrop, Input } from '../../ui';
import { detectPack, packLabel, PACKS } from '../../packs';
import { detectMaterialKind, titleFromMaterial } from '../../lib/analysis';
import { buildFeaturedSampleSession } from '../../samples';
import { PRESET_DIFFICULTY } from '../../store/presets';
import type { PackId, RunPreset } from '../../types';

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
  const lang = useLang();
  const nav = useNavigate();
  const createSession = useStore((state) => state.createSession);
  const upsertSession = useStore((state) => state.upsertSession);
  const hasKey = useStore(selectHasKey);

  const [material, setMaterial] = useState('');
  const [title, setTitle] = useState('');
  const [occasion, setOccasion] = useState<Occasion>('lab');
  const [customOccasion, setCustomOccasion] = useState('');
  const [date, setDate] = useState('');
  const [pace, setPace] = useState<RunPreset>('standard');
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
  const paceOptions: { value: RunPreset; label: string }[] = [
    { value: 'quick', label: t('v5.bringPace5') },
    { value: 'standard', label: t('v5.bringPace10') },
    { value: 'defense', label: t('v5.bringPace15') },
  ];

  async function loadFile(file: File) {
    const raw = await file.text();
    const next = file.name.endsWith('.ipynb') ? parseNotebook(raw) : raw;
    setMaterial(next.slice(0, 50000));
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''));
  }

  function useExample() {
    const session = buildFeaturedSampleSession(lang);
    upsertSession(session);
    setConnectOpen(false);
    nav('run', { sessionId: session.id });
  }

  function submit() {
    setError('');
    if (material.trim().length < 80) { setError(t('bring4.tooShort')); return; }
    if (!date || (occasion === 'other' && !customOccasion.trim())) {
      setError(occasion === 'other' && !customOccasion.trim() ? t('bring4.occasionCustom') : t('bring4.date'));
      return;
    }
    if (!hasKey) { setConnectOpen(true); return; }
    const session = createSession({
      title: title.trim() || titleFromMaterial(material),
      material: material.slice(0, 50000),
      materialKind: detectMaterialKind(material),
      packId,
      detected: { packId: detected.packId, confidence: detected.confidence },
      occasion: occasion === 'other' ? customOccasion.trim() : occasion,
      occasionAt: new Date(`${date}T12:00:00`).getTime(),
      preset: pace,
      difficulty: PRESET_DIFFICULTY[pace],
      status: 'generating',
      mode: 'viva',
    });
    nav('read', { sessionId: session.id });
  }

  return (
    <div className="col-read bring-v5 page-enter" data-testid="bring-screen">
      <header className="bring-v5-top">
        <button type="button" onClick={() => nav('today')}><ArrowLeft size={17} />{t('v5.bringBack')}</button>
        <span className="product-wordmark"><span className="living-mark" aria-hidden /><strong>{t('v5.brand')}</strong></span>
      </header>

      <section className="bring-v5-opening">
        <span className="v5-eyebrow">{t('v5.bringEyebrow')}</span>
        <h1>{t('v5.bringTitle')}</h1>
        <p>{t('v5.bringBody')}</p>
      </section>

      <section className="room-picker-v5">
        <div className="occasion-row" role="group" aria-label={t('bring4.occasion')}>
          {occasionOptions.map((option) => (
            <button type="button" aria-pressed={occasion === option.value} key={option.value} onClick={() => setOccasion(option.value)}>{option.label}</button>
          ))}
        </div>
        <div className="bring-date-row">
          {occasion === 'other' && <Input label={t('bring4.occasionCustom')} value={customOccasion} onChange={(event) => setCustomOccasion(event.target.value)} />}
          <Input label={t('bring4.date')} type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
      </section>

      <section className="material-v5">
        <div className="material-v5-head"><div><h2>{t('v5.bringMaterialTitle')}</h2><p>{t('v5.bringMaterialBody')}</p></div><button type="button" onClick={() => setPackOpen(true)}><Sparkles size={15} />{packLabel(packId, lang)}</button></div>
        <label className="visually-hidden" htmlFor="bring-material">{t('bring4.material')}</label>
        <textarea id="bring-material" value={material} maxLength={50000} placeholder={t('bring4.materialHint')} onChange={(event) => setMaterial(event.target.value)} />
        <div className="material-v5-foot"><span>{t('v5.bringPrivacy')}</span><span>{material.length.toLocaleString()}</span></div>
        <FileDrop
          accept={['.txt', '.md', '.py', '.js', '.ts', '.tsx', '.java', '.c', '.cpp', '.ipynb', 'text/*']}
          label={material ? (title || t('bring4.material')) : 'TXT · MD · CODE · IPYNB'}
          hint={material ? undefined : t('bring4.materialHint')}
          onFiles={(files) => { if (files[0]) void loadFile(files[0]); }}
        />
      </section>

      <section className="bring-details-v5">
        <Input label={t('bring4.titleLabel')} placeholder={t('bring4.titlePlaceholder')} value={title} maxLength={72} onChange={(event) => setTitle(event.target.value)} />
        <fieldset className="pace-v5"><legend>{t('v5.bringPace')}</legend><div>{paceOptions.map((option) => <button type="button" key={option.value} aria-pressed={pace === option.value} onClick={() => setPace(option.value)}>{option.label}</button>)}</div></fieldset>
      </section>

      {error && <p className="form-kind-error" role="alert">{error}</p>}
      <Button className="bring-submit-v5" size="lg" variant="primary" block onClick={submit} iconRight={<ArrowRight size={19} />}>
        {t('bring4.start')}
      </Button>

      <BottomSheet open={packOpen} onClose={() => setPackOpen(false)} title={t('bring4.subject', { pack: packLabel(packId, lang) })}>
        <div className="pack-picker">
          {PACKS.map((pack) => (
            <button type="button" key={pack.id} aria-pressed={pack.id === packId} onClick={() => { setOverridePack(pack.id); setPackOpen(false); }}>
              <strong>{packLabel(pack.id, lang)}</strong>{lang === 'en' && <small>{pack.tagline}</small>}
            </button>
          ))}
        </div>
      </BottomSheet>

      <BottomSheet open={connectOpen} onClose={() => setConnectOpen(false)} title={t('bring4.connectTitle')} footer={<Button variant="ghost" onClick={useExample}>{t('bring4.useExample')}</Button>}>
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
