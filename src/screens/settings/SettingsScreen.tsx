import React, { useRef, useState } from 'react';
import { useStore } from '../../store';
import { PROVIDER_PRESETS } from '../../store/presets';
import { useT } from '../../i18n';
import { useNavigate } from '../../router';
import {
  BottomSheet, Button, Callout, Input, Segmented, Select, Sheet, Spinner, Toggle, useToast,
} from '../../ui';
import { ping, describeError } from '../../lib/llm';
import type { ProviderId, Settings, StoreV2 } from '../../types';

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
  const [wipeOpen, setWipeOpen] = useState(false);
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
    wipeAll();
    setWipeOpen(false);
    toast.push(t('common.action.confirm'), { tone: 'neutral' });
  }

  return (
    <div className="col-read stack settings-v5">
      <header className="product-wordmark"><span className="living-mark" aria-hidden /><strong>{t('v5.brand')}</strong></header>
      <section className="return-surface-opening"><span className="v5-eyebrow">{t('settings.title')}</span><h1>{t('settings.title')}</h1><p>{t('settings.dataHint')}</p></section>

      <section className="settings-connect-v5">
        <div><h2>{t('settings.providerTitle')}</h2><p>{t('settings.providerHint')}</p></div>
        <Sheet elevation={1} className="model-connect-v5">
          <div className="stack-tight">
            <Select label={t('settings.provider')} value={settings.provider} onChange={(e) => applyProviderPreset(e.target.value as ProviderId)} options={PROVIDER_PRESETS.map((preset) => ({ value: preset.id, label: preset.label }))} />
            <Input label={t('settings.apiKey')} type="password" autoComplete="off" value={settings.apiKey} onChange={(e) => set('apiKey', e.target.value)} placeholder="••••••••••••" />
            <Input label={t('settings.model')} value={settings.model} onChange={(e) => set('model', e.target.value)} />
            <details className="settings-advanced-v5">
              <summary>{t('v5.advanced')}</summary>
              <Input label={t('settings.apiBase')} value={settings.apiBase} mono onChange={(e) => set('apiBase', e.target.value)} placeholder="https://api.openai.com/v1" />
            </details>
            <div className="row wrap">
              <Button variant="primary" onClick={testConnection} disabled={testing || !settings.apiKey.trim()}>{testing ? t('settings.testing') : t('settings.test')}</Button>
              {testing && <Spinner />}
            </div>
            {testResult && <Callout tone={testResult.ok ? 'neutral' : 'danger'}>{testResult.message}</Callout>}
            <p className="settings-privacy-v5">{t('bring4.privacy')}</p>
          </div>
        </Sheet>
      </section>

      <section className="stack-tight">
        <h2 className="t-title">{t('settings.appearanceTitle')}</h2>
        <Sheet elevation={1}>
          <div className="stack-tight">
            <Toggle label={t('settings.voice')} checked={settings.voiceEnabled} onChange={(v) => set('voiceEnabled', v)} />
            <div className="stack-tight">
              <span className="field-label">{t('settings.theme')}</span>
              <Segmented<Settings['theme']>
                ariaLabel={t('settings.theme')}
                value={settings.theme}
                onChange={(v) => set('theme', v)}
                options={[
                  { value: 'paper', label: 'Sunlit' },
                  { value: 'slate', label: 'Night' },
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
          <Button variant="danger" onClick={() => setWipeOpen(true)}>{t('settings.wipe')}</Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="visually-hidden"
          onChange={(e) => { void doImport(e.target.files?.[0]); e.target.value = ''; }}
        />
      </section>

      <BottomSheet open={wipeOpen} onClose={() => setWipeOpen(false)} title={t('settings.wipe')} footer={<Button variant="danger" onClick={doWipe}>{t('common.action.confirm')}</Button>}>
        <p className="t-body ink-2 measure">{t('settings.wipeConfirm')}</p>
      </BottomSheet>
    </div>
  );
}
