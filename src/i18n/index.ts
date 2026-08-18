/**
 * Minimal string registry (spec §8, WP0). Every package registers its own
 * table from `src/i18n/<pkg>.ts` and never edits another package's file.
 *
 *   registerStrings('home', { en: {...}, 'zh-CN': {...} })
 *   const t = useT(); t('home.title')
 */
import { useSyncExternalStore } from 'react';

export type Lang = 'en' | 'zh-CN';
export type StringTable = Record<string, string>;

const tables: Record<Lang, StringTable> = { en: {}, 'zh-CN': {} };
const listeners = new Set<() => void>();
let version = 0;

function emit() {
  version++;
  listeners.forEach((l) => l());
}

export function registerStrings(pkg: string, table: { en: StringTable; 'zh-CN': StringTable }): void {
  for (const lang of ['en', 'zh-CN'] as Lang[]) {
    for (const [k, v] of Object.entries(table[lang] ?? {})) {
      tables[lang][k.startsWith(`${pkg}.`) ? k : `${pkg}.${k}`] = v;
    }
  }
  emit();
}

let current: Lang = 'en';

export function setLang(lang: Lang): void {
  if (lang === current) return;
  current = lang;
  document.documentElement.lang = lang;
  emit();
}

export function getLang(): Lang {
  return current;
}

export function resolveLang(pref: 'en' | 'zh-CN' | 'auto'): Lang {
  if (pref !== 'auto') return pref;
  const nav = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'en';
  return nav.startsWith('zh') ? 'zh-CN' : 'en';
}

/** Interpolates {name} placeholders. Missing key falls back to the key itself. */
export function translate(key: string, vars?: Record<string, string | number>): string {
  const raw = tables[current][key] ?? tables.en[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useT() {
  useSyncExternalStore(subscribe, () => version, () => version);
  return translate;
}

export function useLang(): Lang {
  useSyncExternalStore(subscribe, () => version, () => version);
  return current;
}
