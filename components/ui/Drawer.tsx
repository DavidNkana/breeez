'use client';

import * as React from 'react';
import clsx from 'clsx';

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  side?: 'right' | 'bottom';
  title?: string;
  children: React.ReactNode;
  className?: string;
};

export function Drawer({ open, onClose, side = 'right', title, children, className }: DrawerProps) {
  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Lock body scroll
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  if (!open) return null;

  const isRight = side === 'right';

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={clsx(
          'absolute bg-white shadow-xl flex flex-col max-h-full',
          isRight
            ? 'right-0 top-0 h-full w-full sm:w-96'
            : 'bottom-0 left-0 right-0 h-auto max-h-[90vh] rounded-t-2xl',
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-brand-100 px-4 py-3">
            <h2 className="text-base font-semibold text-brand-950">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-md p-1 text-brand-500 hover:bg-brand-50 hover:text-brand-900"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M6 18L18 6" />
              </svg>
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}