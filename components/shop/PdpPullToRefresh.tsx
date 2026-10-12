'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  initialPullState,
  PULL_THRESHOLD,
  transitionPullState,
  type PullState,
  type PullStatus,
} from './pdp-pull-to-refresh';
import { attachPdpPullToRefreshListeners } from './pdp-pull-to-refresh-listeners';
import { refreshPdp } from './pdp-refresh-controller';

const EXCLUDED_TARGETS = [
  'a',
  'button',
  'input',
  'select',
  'textarea',
  '[contenteditable="true"]',
  '[role="button"]',
  '[data-pdp-no-pull]',
].join(',');

type Props = { children: ReactNode; productSlug: string };

function isExcludedTarget(target: EventTarget | null): boolean {
  return typeof Element !== 'undefined' && target instanceof Element && Boolean(target.closest(EXCLUDED_TARGETS));
}

function statusLabel(status: PullStatus): string {
  switch (status) {
    case 'ready': return 'Release to refresh';
    case 'refreshing': return 'Refreshing…';
    case 'updated': return 'Updated';
    case 'error': return 'Refresh failed. Tap to retry.';
    case 'pulling': return 'Pull to refresh';
    default: return '';
  }
}

export function PdpPullToRefresh({ children, productSlug }: Props) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<PullState>(initialPullState);
  const refreshingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const refreshRef = useRef<() => void>(() => {});
  const [state, setState] = useState<PullState>(initialPullState);

  function updateState(next: PullState) {
    stateRef.current = next;
    setState(next);
  }

  function clearTimer() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }

  async function refresh() {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    updateState(transitionPullState(stateRef.current, { type: 'refresh' }));

    const success = () => {
      if (!mountedRef.current) return;
      // The observable PDP response is the success gate; router.refresh itself returns void.
      router.refresh();
      timerRef.current = setTimeout(() => {
        refreshingRef.current = false;
        updateState(transitionPullState(stateRef.current, { type: 'success' }));
        timerRef.current = setTimeout(() => updateState(initialPullState), 1600);
      }, 650);
    };
    const error = () => {
      if (!mountedRef.current) return;
      refreshingRef.current = false;
      updateState(transitionPullState(stateRef.current, { type: 'error' }));
    };
    void refreshPdp({
      productSlug,
      onSuccess: success,
      onError: error,
    });
  }
  refreshRef.current = refresh;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    return attachPdpPullToRefreshListeners({
      root,
      window,
      isRefreshing: () => refreshingRef.current,
      isTargetExcluded: isExcludedTarget,
      getState: () => stateRef.current,
      setState: updateState,
      onRefresh: () => refreshRef.current(),
    });
  }, []);

  useEffect(() => () => {
    mountedRef.current = false;
    clearTimer();
  }, []);

  const visible = state.status !== 'idle';
  const pullProgress = Math.min(state.distance / PULL_THRESHOLD, 1);

  return (
    <div ref={rootRef} className="pdp-pull-surface relative">
      <div className="flex justify-end px-1 pt-2">
        <button
          type="button"
          className="rounded-md px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100 dark:text-brand-200 dark:hover:bg-brand-800"
          onClick={refresh}
          disabled={refreshingRef.current}
        >
          Refresh product
        </button>
      </div>
      {visible && (
        <div
          className="pdp-pull-indicator pointer-events-none absolute inset-x-0 top-1 z-10 flex justify-center px-4"
          aria-live="polite"
          aria-atomic="true"
          role="status"
        >
          <div className="pointer-events-auto flex min-h-9 items-center gap-2 rounded-full border border-brand-700 bg-brand-900/95 px-3 py-1 text-xs font-medium text-brand-50 shadow-lg safe-top">
            {(state.status === 'refreshing' || state.status === 'updated') && (
              <span className={state.status === 'refreshing' ? 'pdp-refresh-spinner h-3 w-3 rounded-full border-2 border-brand-400 border-t-white' : 'text-success'} aria-hidden="true">
                {state.status === 'updated' ? '✓' : ''}
              </span>
            )}
            {state.status === 'error' ? (
              <button type="button" className="underline underline-offset-2" onClick={refresh}>
                {statusLabel(state.status)}
              </button>
            ) : (
              <span>{statusLabel(state.status)}</span>
            )}
            {state.status === 'pulling' || state.status === 'ready' ? (
              <span className="sr-only">{Math.round(pullProgress * 100)} percent</span>
            ) : null}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
