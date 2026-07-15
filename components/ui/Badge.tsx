import * as React from 'react';
import clsx from 'clsx';

type BadgeProps = {
  variant?: 'brand' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
  outline?: boolean;
  children: React.ReactNode;
  className?: string;
};

const variantClasses = {
  brand:   { solid: 'bg-brand-900 text-white',         outline: 'border border-brand-900 text-brand-900' },
  accent:  { solid: 'bg-accent-500 text-white',        outline: 'border border-accent-500 text-accent-700' },
  success: { solid: 'bg-success text-white',           outline: 'border border-success text-success' },
  warning: { solid: 'bg-warning text-white',           outline: 'border border-warning text-warning' },
  danger:  { solid: 'bg-danger text-white',            outline: 'border border-danger text-danger' },
  info:    { solid: 'bg-info text-white',              outline: 'border border-info text-info' }
};

export function Badge({ variant = 'brand', outline, children, className }: BadgeProps) {
  const v = variantClasses[variant];
  return (
    <span className={clsx('inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold', outline ? v.outline : v.solid, className)}>
      {children}
    </span>
  );
}