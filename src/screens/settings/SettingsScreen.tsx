import React, { useRef, useState } from 'react';
import { useStore } from '../../store';
import { PROVIDER_PRESETS } from '../../store/presets';
import { useT } from '../../i18n';
import { useNavigate } from '../../router';
import {
  Button, Callout, Input, Segmented, Select, Sheet, Spinner, Toggle, useToast,
} from '../../ui';
import { ping, describeError } from '../../lib/llm';
import type { Difficulty, ProviderId, RunPreset, Settings, StoreV2 } from '../../types';

export default function SettingsScreen() {
  const t = useT();
  const nav = useNavigate();
  const toast = useToast();
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const applyProviderPreset = useStore((s) => s.applyProviderPreset);
  const exportAll = useStore((s) => s.exportAll);
  const importAll = useStore((s) => s.importAll);
  const wipeAll = useStore((s) => s.wipeAll);
  const runV1Migration = useStore((s) => s.runV1Migration);
  const migratedV1 = useStore((s) => s.ui.migratedV1);

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setSettings({ [key]: value } as Partial<Settings>);

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      await ping(settings);
      setTestResult({ ok: true, message: t('settings.testOk') });
    } catch (err) {
      setTestResult({ ok: false, message: describeError(err) });
    } finally {
      setTesting(false);
    }
  }

  function doExport() {
    const blob = new Blob([JSON.stringify(exportAll(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `i-really-know-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function doImport(file: File | undefined) {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text()) as Partial<StoreV2>;
      const result = importAll(data, 'merge');
      toast.push(t('settings.imported', result), { tone: 'defended' });
    } catch {
      toast.push(t('common.state.error.title'), { tone: 'undefended' });
    }
  }

  function doWipe() {
    if (!window.confirm(t('settings.wipeConfirm'))) return;
    wipeAll();
    toast.push(t('common.action.confirm'), { tone: 'neutral' });
  }

  return (
    <div className="col-read stack">
      <h1 className="t-display-2">{t('settings.title')}</h1>

      <section className="stack-tight">
        <h2 className="t-title">{t('settings.providerTitle')}</h2>
        <Callout tone="neutral">{t('settings.providerHint')}</Callout>
        <Sheet elevation={1}>
          <div className="stack-tight">
            <Select
              label={t('settings.provider')}
              value={settings.provider}
              onChange={(e) => applyProviderPreset(e.target.value as ProviderId)}
              options={PROVIDER_PRESETS.map((p) => ({ value: p.id, label: p.label }))}
            />
            <Input
              label={t('settings.apiBase')}
              value={settings.apiBase}
              mono
              onChange={(e) => set('apiBase', e.target.value)}
              placeholder="https://api.openai.com/v1"
            />
            <Input
              label={t('settings.apiKey')}
              type="password"
              autoComplete="off"
              value={settings.apiKey}
              mono
              onChange={(e) => set('apiKey', e.target.value)}
              placeholder="sk-…"
            />
            <Input
              label={t('settings.model')}
              value={settings.model}
              mono
              onChange={(e) => set('model', e.target.value)}
            />
            <div className="row wrap">
              <Button variant="secondary" onClick={testConnection} disabled={testing || !settings.apiKey.trim()}>
                {testing ? t('settings.testing') : t('settings.test')}
              </Button>
              {testing && <Spinner />}
            </div>
            {testResult && (
              <Callout tone={testResult.ok ? 'neutral' : 'danger'}>{testResult.message}</Callout>
            )}
          </div>
        </Sheet>
      </section>

      <section className="stack-tight">
        <h2 className="t-title">{t('settings.runTitle')}</h2>
        <Sheet elevation={1}>
          <div className="stack-tight">
            <Select
              label={t('settings.count')}
              value={String(settings.count)}
              onChange={(e) => set('count', Number(e.target.value) as Settings['count'])}
              options={[4, 5, 6, 7].map((n) => ({ value: String(n), label: String(n) }))}
            />
            <div className="stack-tight">
              <span className="field-label">{t('settings.preset')}</span>
              <Segmented<RunPreset>
                ariaLabel={t('settings.preset')}
                value={settings.preset}
                onChange={(v) => set('preset', v)}
                options={(['quick', 'standard', 'defense'] as RunPreset[]).map((p) => ({ value: p, label: t(`common.preset.${p}`) }))}
              />
            </div>
            <div className="stack-tight">
              <span className="field-label">{t('settings.difficulty')}</span>
              <Segmented<Difficulty>
                ariaLabel={t('settings.difficulty')}
                value={settings.difficulty}
                onChange={(v) => set('difficulty', v)}
                options={(['foundations', 'standard', 'defense'] as Difficulty[]).map((d) => ({ value: d, label: t(`common.difficulty.${d}`) }))}
              />
            </div>
            <Toggle label={t('settings.voice')} checked={settings.voiceEnabled} onChange={(v) => set('voiceEnabled', v)} />
          </div>
        </Sheet>
      </section>

      <section className="stack-tight">
        <h2 className="t-title">{t('settings.appearanceTitle')}</h2>
        <Sheet elevation={1}>
          <div className="stack-tight">
            <div className="stack-tight">
              <span className="field-label">{t('settings.theme')}</span>
              <Segmented<Settings['theme']>
                ariaLabel={t('settings.theme')}
                value={settings.theme}
                onChange={(v) => set('theme', v)}
                options={[
                  { value: 'paper', label: 'Paper' },
                  { value: 'slate', label: 'Slate' },
                  { value: 'system', label: 'System' },
                ]}
              />
            </div>
            <div className="stack-tight">
              <span className="field-label">{t('settings.language')}</span>
              <Segmented<Settings['language']>
                ariaLabel={t('settings.language')}
                value={settings.language}
                onChange={(v) => set('language', v)}
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'zh-CN', label: '中文' },
                  { value: 'auto', label: 'Auto' },
                ]}
              />
            </div>
          </div>
        </Sheet>
      </section>

      <section className="stack-tight teacher-entrance">
        <h2 className="t-title">{t('teacher4.entranceTitle')}</h2>
        <Sheet elevation={1}>
          <div className="stack-tight">
            <p className="t-body ink-2 measure">{t('teacher4.entranceBody')}</p>
            <Button variant="secondary" onClick={() => nav('class')}>{t('teacher4.entranceAction')}</Button>
          </div>
        </Sheet>
      </section>

      <section className="stack-tight">
        <h2 className="t-title">{t('settings.dataTitle')}</h2>
        <Callout tone="neutral">{t('settings.dataHint')}</Callout>
        <div className="row wrap">
          <Button variant="secondary" onClick={doExport}>{t('settings.exportAll')}</Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>{t('settings.importAll')}</Button>
          {!migratedV1 && (
            <Button
              variant="ghost"
              onClick={() => {
                const n = runV1Migration();
                toast.push(t('settings.migrated', { n }), { tone: 'neutral' });
              }}
            >
              v1 →
            </Button>
          )}
          <Button variant="danger" onClick={doWipe}>{t('settings.wipe')}</Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="visually-hidden"
          onChange={(e) => { void doImport(e.target.files?.[0]); e.target.value = ''; }}
        />
      </section>
    </div>
  );
}
