'use client';

import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';
const KEY = 'evasale.theme';

function systemDark() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(theme: Theme) {
  const dark = theme === 'dark' || (theme === 'system' && systemDark());
  document.documentElement.classList.toggle('dark', dark);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('system');

  useEffect(() => {
    const saved = window.localStorage.getItem(KEY) as Theme | null;
    const next = saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
    setThemeState(next);
    applyTheme(next);
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => { if (next === 'system') applyTheme('system'); };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  function setTheme(next: Theme) {
    setThemeState(next);
    window.localStorage.setItem(KEY, next);
    applyTheme(next);
  }

  return { theme, setTheme };
}
