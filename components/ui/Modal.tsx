'use client';

import * as React from 'react';
import clsx from 'clsx';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
};

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl'
};

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const restoreFocusRef = React.useRef<HTMLElement | null>(null);
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  const titleId = React.useId();

  React.useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const focusable = dialog?.querySelector<HTMLElement>('[data-modal-initial-focus], button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    focusable?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (!dialog || !dialog.contains(document.activeElement)) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !dialog) return;
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
        .filter((element) => !element.hasAttribute('disabled'));
      if (controls.length === 0) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      restoreFocusRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
        <div
          ref={dialogRef}
          className={clsx('relative rounded-lg bg-white shadow-xl dark:bg-brand-900 w-full', sizeClasses[size])}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? `modal-title-${titleId}` : undefined}
         aria-label={title ? undefined : 'Dialog'}
       >
         {title && (
           <div className="flex items-center justify-between border-b border-brand-100 px-5 py-3">
               <h2 id={`modal-title-${titleId}`} className="text-lg font-semibold text-brand-950 dark:text-white">{title}</h2>
            <button
              type="button"
              onClick={onClose}
               aria-label={`Close ${title}`}
              className="rounded-md p-1 text-brand-500 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-800 hover:text-brand-900"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M6 18L18 6" />
              </svg>
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
