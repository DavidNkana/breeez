import type { TimelineStep } from '@/lib/orders/receipt';

const STEP_ICON: Record<string, string> = {
  done: 'M5 13l4 4L19 7',
  current: 'M12 8v4l3 2',
  upcoming: 'M12 8v4l3 2',
  failed: 'M6 6l12 12M18 6L6 18',
};

function TimelineIcon({ step }: { step: TimelineStep }) {
  const done = step.state === 'done';
  const current = step.state === 'current';
  return (
    <span
      className={[
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border',
        done ? 'border-success bg-success text-white' : '',
        current ? 'border-accent-500 bg-accent-500 text-white' : '',
        step.state === 'upcoming' ? 'border-brand-300 bg-brand-50 text-brand-400 dark:border-brand-700 dark:bg-brand-900' : '',
        step.state === 'failed' ? 'border-danger bg-danger text-white' : '',
      ].join(' ')}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d={STEP_ICON[step.key] ?? STEP_ICON.upcoming} />
      </svg>
    </span>
  );
}

export function OrderTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="space-y-0">
      {steps.map((step, index) => (
        <li key={step.key} className="relative flex gap-3 pb-6 last:pb-0">
          {index < steps.length - 1 && (
            <span
              aria-hidden
              className={[
                'absolute left-4 top-8 h-[calc(100%-1.5rem)] w-0.5',
                step.state === 'done' ? 'bg-success/40' : 'bg-brand-200 dark:bg-brand-800',
              ].join(' ')}
            />
          )}
          <TimelineIcon step={step} />
          <div className="min-w-0 pt-1">
            <p
              className={[
                'text-sm font-semibold',
                step.state === 'done' ? 'text-brand-950' : '',
                step.state === 'current' ? 'text-accent-700' : '',
                step.state === 'upcoming' ? 'text-brand-400 dark:text-brand-500' : '',
              ].join(' ')}
            >
              {step.label}
            </p>
            <p className="mt-0.5 text-xs text-brand-600 dark:text-brand-300">{step.description}</p>
            {step.at && (
              <p className="mt-0.5 text-xs text-brand-500">
                {new Date(step.at).toLocaleString('en-ZA', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                  timeZone: 'Africa/Johannesburg',
                })}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
