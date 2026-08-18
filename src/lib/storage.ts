/**
 * IndexedDB-backed storage adapter for zustand `persist` (spec §7.2).
 * Falls back to localStorage when IndexedDB is unavailable (private mode,
 * old Safari) so the app never hard-fails on hydration.
 */
import { get, set, del } from 'idb-keyval';
import type { StateStorage } from 'zustand/middleware';

let idbBroken = false;

const lsFallback: StateStorage = {
  getItem: (name) => {
    try { return localStorage.getItem(name); } catch { return null; }
  },
  setItem: (name, value) => {
    try { localStorage.setItem(name, value); } catch { /* quota — drop silently */ }
  },
  removeItem: (name) => {
    try { localStorage.removeItem(name); } catch { /* noop */ }
  },
};

export const idbStorage: StateStorage = {
  async getItem(name) {
    if (idbBroken) return lsFallback.getItem(name);
    try {
      const v = await get<string>(name);
      return v ?? null;
    } catch {
      idbBroken = true;
      return lsFallback.getItem(name);
    }
  },
  async setItem(name, value) {
    if (idbBroken) return lsFallback.setItem(name, value);
    try {
      await set(name, value);
    } catch {
      idbBroken = true;
      lsFallback.setItem(name, value);
    }
  },
  async removeItem(name) {
    if (idbBroken) return lsFallback.removeItem(name);
    try {
      await del(name);
    } catch {
      idbBroken = true;
      lsFallback.removeItem(name);
    }
  },
};

/** Synchronous UI slice read before paint (theme/language). See index.html. */
export const UI_SLICE_KEY = 'irk-ui';

export function readUiSlice(): { theme?: string; language?: string } {
  try {
    return JSON.parse(localStorage.getItem(UI_SLICE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function writeUiSlice(patch: { theme?: string; language?: string }): void {
  try {
    const next = { ...readUiSlice(), ...patch };
    localStorage.setItem(UI_SLICE_KEY, JSON.stringify(next));
  } catch { /* noop */ }
}
