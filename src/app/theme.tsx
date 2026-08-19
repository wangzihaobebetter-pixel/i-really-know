import React, { useEffect } from 'react';
import { useStore } from '../store';
import { readUiSlice, writeUiSlice } from '../lib/storage';
import { resolveLang, setLang } from '../i18n';

/** Applies data-theme before paint via index.html; this keeps it in sync after hydration. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useStore((s) => s.settings.theme);
  const language = useStore((s) => s.settings.language);
  const setSettings = useStore((s) => s.setSettings);

  useEffect(() => {
    if (theme === 'system') setSettings({ theme: 'paper' });
  }, [theme, setSettings]);

  useEffect(() => {
    const resolved = theme === 'slate' ? 'slate' : 'paper';
    document.documentElement.dataset.theme = resolved;
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content', resolved === 'slate' ? '#17181B' : '#F6F3EA',
    );
    writeUiSlice({ theme: resolved });
  }, [theme]);

  useEffect(() => {
    setLang(resolveLang(language));
    writeUiSlice({ language });
  }, [language]);

  return <>{children}</>;
}

/** Read once at module load so the very first render already matches the pre-paint theme. */
export const bootTheme = readUiSlice().theme === 'slate' ? 'slate' : 'paper';
