import React, { useMemo, useState } from 'react';
import { useStore, selectHasKey } from '../../store';
import { PACKS, getPack, DETECT_FLOOR, detectPack } from '../../packs';
import { navigate, useNavigate } from '../../router';
import { useT, useLang } from '../../i18n';
import {
  Button, Callout, Segmented, Select, Sheet, Spinner, Textarea, FileDrop, Tag, useToast,
} from '../../ui';
import { MATERIAL_CAP } from '../../lib/prompts';
import { createDraft, generateFor } from '../../lib/session-ops';
import { describeError } from '../../lib/llm';
import type { PackId, RunPreset } from '../../types';
import { PRESET_COUNTS, PRESET_DIFFICULTY, PRESET_MINUTES } from '../../store/presets';

const MIN_CHARS = 240;

export default function ImportScreen() {
  const t = useT();
  const lang = useLang();
  const nav = useNavigate();
  const toast = useToast();
  const hasKey = useStore(selectHasKey);
  const settings = useStore((s) => s.settings);

  const [material, setMaterial] = useState('');
  const [override, setOverride] = useState<PackId | ''>('');
  const [preset, setPreset] = useState<RunPreset>(settings.preset);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detection = useMemo(
    () => (material.trim().length >= 40 ? detectPack(material) : null),
    [material],
  );
  const packId: PackId = override || detection?.packId || 'general';
  const pack = getPack(packId);
  const unsure = !override && (!detection || detection.confidence < DETECT_FLOOR);
  const tooShort = material.trim().length < MIN_CHARS;

  async function onFiles(files: File[]) {
    const file = files[0];
    if (!file) return;
    const text = await file.text();
    setMaterial((prev) => (prev.trim() ? `${prev}\n\n${text}` : text));
  }

  async function start() {
    if (tooShort || busy) return;
    setError(null);
    setBusy(true);
    try {
      const draft = createDraft({
        material,
        packId,
        preset,
        difficulty: PRESET_DIFFICULTY[preset],
      });
      const ready = await generateFor(draft, settings, lang);
      nav('run', { sessionId: ready.id });
    } catch (err) {
      setError(describeError(err));
      toast.push(describeError(err), { tone: 'borrowed' });
    } finally {
      setBusy(false);
    }
  }

  if (busy) {
    return (
      <div className="col-read stack">
        <Sheet elevation={1}>
          <div className="stack-tight" style={{ alignItems: 'flex-start' }}>
            <Spinner label={t('import.generating')} />
            <p className="t-body ink-2 measure">{t('import.generatingHint')}</p>
          </div>
        </Sheet>
      </div>
    );
  }

  return (
    <div className="col-read stack">
      <header className="stack-tight">
        <h1 className="t-display-2">{t('import.title')}</h1>
      </header>

      {!hasKey && (
        <Callout
          tone="action"
          title={t('import.needKey')}
          action={<Button size="sm" onClick={() => navigate('settings')}>{t('import.needKeyAction')}</Button>}
        >
          {t('home.noKeyBody')}
        </Callout>
      )}

      <Textarea
        label={t('import.pasteLabel')}
        hint={t('import.pasteHint')}
        value={material}
        onChange={(e) => setMaterial(e.target.value)}
        rows={14}
        mono
        counter
        placeholder="…"
      />

      <FileDrop
        label={t('import.dropLabel')}
        hint={t('import.dropHint')}
        accept={['.txt', '.md', '.py', '.js', '.ts', '.tsx', '.java', '.cpp', '.c', '.go', '.rs', '.r', '.ipynb', '.tex', '.csv']}
        onFiles={onFiles}
      />

      {material.length > MATERIAL_CAP && <Callout tone="shaky">{t('import.capped')}</Callout>}

      {detection && (
        <Sheet elevation={1}>
          <div className="stack-tight">
            <div className="row-between wrap" style={{ gap: 'var(--space-3)' }}>
              <div className="row wrap" style={{ gap: 'var(--space-2)' }}>
                <span className="t-small ink-3">{t('import.detected')}</span>
                <Tag tone="action" mono>{pack.shortName}</Tag>
                <span className="t-body-strong">{pack.name}</span>
              </div>
              <span className="t-mono-small ink-3">
                {Math.round((detection.confidence || 0) * 100)}%
              </span>
            </div>
            {unsure && <Callout tone="shaky">{t('import.lowConfidence')}</Callout>}
            <Select
              label={t('import.override')}
              value={packId}
              onChange={(e) => setOverride(e.target.value as PackId)}
              options={PACKS.map((p) => ({ value: p.id, label: p.name }))}
            />
            <p className="t-small ink-3 measure">{pack.tagline}</p>
          </div>
        </Sheet>
      )}

      <div className="stack-tight">
        <span className="t-small ink-3">{t('import.presetLabel')}</span>
        <Segmented
          ariaLabel={t('import.presetLabel')}
          value={preset}
          onChange={setPreset}
          options={(['quick', 'standard', 'defense'] as RunPreset[]).map((p) => ({
            value: p,
            label: t(`common.preset.${p}`),
            hint: `${PRESET_COUNTS[p]} · ~${PRESET_MINUTES[p]} min`,
          }))}
        />
      </div>

      {error && <Callout tone="borrowed" title={t('common.state.error.title')}>{error}</Callout>}
      {tooShort && material.length > 0 && <p className="t-small ink-3">{t('import.tooShort')}</p>}

      <div className="row">
        <Button variant="primary" size="lg" disabled={tooShort || !hasKey} onClick={start}>
          {t('import.start')}
        </Button>
      </div>
    </div>
  );
}
