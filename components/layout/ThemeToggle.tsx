'use client';

import { useTheme, type Theme } from '@/lib/hooks/use-theme';
import { useEffect, useRef, useState } from 'react';

const OPTIONS: Array<{ value: Theme; label: string }> = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
];

export function ThemeToggle({ iconOnly = false }: { iconOnly?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  function chooseTheme(next: Theme) {
    setTheme(next);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={iconOnly
          ? 'rounded-md p-2 text-brand-700 hover:bg-brand-50 dark:bg-brand-900 dark:text-brand-100 dark:hover:bg-brand-800'
          : 'inline-flex items-center gap-1.5 rounded-md p-1.5 text-brand-700 hover:bg-brand-50 dark:bg-brand-900 dark:text-brand-100 dark:hover:bg-brand-800'}
        aria-label={iconOnly ? `Theme: ${theme}` : 'Theme'}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3l1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3l1.42-1.42" />
        </svg>
        {!iconOnly && <span className="text-xs">{OPTIONS.find((option) => option.value === theme)?.label ?? 'Dark'}</span>}
      </button>
      {open && (
        <div role="menu" aria-label="Choose theme" className="absolute right-0 top-full z-50 mt-1 min-w-28 rounded-md border border-brand-200 bg-white p-1 shadow-lg dark:border-brand-700 dark:bg-brand-900">
          {OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="menuitemradio"
              aria-checked={theme === option.value}
              onClick={() => chooseTheme(option.value)}
              className={`block w-full rounded px-3 py-1.5 text-left text-xs ${theme === option.value ? 'font-semibold text-accent-600 dark:text-accent-400' : 'text-brand-700 hover:bg-brand-50 dark:text-brand-100 dark:hover:bg-brand-800'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
