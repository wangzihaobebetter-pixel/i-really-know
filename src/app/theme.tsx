import React, { useEffect } from 'react';
import { useStore } from '../store';
import { readUiSlice, writeUiSlice } from '../lib/storage';
import { resolveLang, setLang } from '../i18n';

/** Applies data-theme before paint via index.html; this keeps it in sync after hydration. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useStore((s) => s.settings.theme);
  const language = useStore((s) => s.settings.language);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const resolved = theme === 'system' ? (mq.matches ? 'slate' : 'paper') : theme;
      document.documentElement.dataset.theme = resolved;
      document.querySelector('meta[name="theme-color"]')?.setAttribute(
        'content', resolved === 'slate' ? '#141518' : '#F5F2EA',
      );
      writeUiSlice({ theme });
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);

  useEffect(() => {
    setLang(resolveLang(language));
    writeUiSlice({ language });
  }, [language]);

  return <>{children}</>;
}

/** Read once at module load so the very first render already matches the pre-paint theme. */
export const bootTheme = readUiSlice().theme ?? 'system';
