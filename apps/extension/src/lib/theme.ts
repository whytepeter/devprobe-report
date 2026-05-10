/**
 * Theme helpers — shared by popup and content scripts.
 *
 * Persists the user's preference in chrome.storage.local.
 * Themes: 'light' | 'dark'
 *
 * Popup:          applies .dark / .light class to document.documentElement
 * Content script: applies .dark / .light class to each shadow-root container div
 */

import { isExtensionAlive } from './extension.js';

export type Theme = 'light' | 'dark';

const KEY = 'dp:theme';

export async function getTheme(): Promise<Theme> {
  if (!isExtensionAlive()) return 'light';
  try {
    const result = await chrome.storage.local.get(KEY);
    return (result[KEY] as Theme) ?? 'light';
  } catch {
    return 'light';
  }
}

export async function setTheme(t: Theme): Promise<void> {
  if (!isExtensionAlive()) return;
  try {
    await chrome.storage.local.set({ [KEY]: t });
  } catch { /* storage unavailable */ }
}

export async function toggleTheme(): Promise<Theme> {
  const current = await getTheme();
  const next: Theme = current === 'dark' ? 'light' : 'dark';
  await setTheme(next);
  return next;
}

/** Apply theme classes to a DOM element (popup: <html>, content: container div). */
export function applyThemeClass(el: HTMLElement, theme: Theme): void {
  el.classList.toggle('dark',  theme === 'dark');
  el.classList.toggle('light', theme === 'light');
}

/** Watch storage for theme changes and re-apply to the given element. */
export function watchTheme(el: HTMLElement): () => void {
  if (!isExtensionAlive()) return () => {};
  try {
    const handler = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (!isExtensionAlive()) return;
      if (area === 'local' && changes[KEY]) {
        applyThemeClass(el, changes[KEY].newValue as Theme);
      }
    };
    chrome.storage.onChanged.addListener(handler);
    return () => { try { chrome.storage.onChanged.removeListener(handler); } catch { /* ignore */ } };
  } catch {
    return () => {};
  }
}

/**
 * Subscribe to theme changes with a raw callback.
 * Useful in contexts that manage multiple targets (e.g. content script shadow roots).
 * Returns an unsubscribe function.
 */
export function onThemeChange(cb: (theme: Theme) => void): () => void {
  if (!isExtensionAlive()) return () => {};
  try {
    const handler = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (!isExtensionAlive()) return;
      if (area === 'local' && changes[KEY]) {
        cb(changes[KEY].newValue as Theme);
      }
    };
    chrome.storage.onChanged.addListener(handler);
    return () => { try { chrome.storage.onChanged.removeListener(handler); } catch { /* ignore */ } };
  } catch {
    return () => {};
  }
}
