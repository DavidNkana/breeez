import {
  getVerticalPullDistance,
  initialPullState,
  isPullStartAllowed,
  transitionPullState,
  type PullState,
} from './pdp-pull-to-refresh';

type TouchListenerRoot = Pick<HTMLElement, 'addEventListener' | 'removeEventListener'>;
type TouchWindow = Pick<Window, 'matchMedia'> & { ontouchstart?: unknown; scrollY: number };

type ListenerOptions = {
  root: TouchListenerRoot;
  window: TouchWindow;
  isRefreshing: () => boolean;
  isTargetExcluded: (target: EventTarget | null) => boolean;
  getState: () => PullState;
  setState: (state: PullState) => void;
  onRefresh: () => void;
};

export function attachPdpPullToRefreshListeners({
  root,
  window,
  isRefreshing,
  isTargetExcluded,
  getState,
  setState,
  onRefresh,
}: ListenerOptions): () => void {
  const mobile = window.matchMedia('(max-width: 767px)');
  let gesture: { x: number; y: number } | null = null;

  const onStart = (event: globalThis.TouchEvent) => {
    if (isRefreshing() || event.touches.length !== 1) return;
    const touch = event.touches[0];
    if (!isPullStartAllowed({
      isMobile: mobile.matches && 'ontouchstart' in window,
      scrollY: window.scrollY,
      targetExcluded: isTargetExcluded(event.target),
    })) return;
    gesture = { x: touch.clientX, y: touch.clientY };
    setState(initialPullState);
  };

  const onMove = (event: globalThis.TouchEvent) => {
    if (!gesture || isRefreshing() || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const distance = getVerticalPullDistance(gesture.x, gesture.y, touch.clientX, touch.clientY);
    if (distance === null) {
      gesture = null;
      setState(initialPullState);
      return;
    }
    const next = transitionPullState(getState(), { type: 'move', distance });
    setState(next);
    if (next.status === 'ready') event.preventDefault();
  };

  const onEnd = (event: globalThis.TouchEvent) => {
    if (!gesture) return;
    const wasReady = getState().status === 'ready';
    gesture = null;
    if (wasReady) {
      event.preventDefault();
      onRefresh();
    } else {
      setState(initialPullState);
    }
  };

  const onCancel = () => {
    gesture = null;
    if (!isRefreshing()) setState(initialPullState);
  };

  root.addEventListener('touchstart', onStart, { passive: true });
  root.addEventListener('touchmove', onMove, { passive: false });
  root.addEventListener('touchend', onEnd, { passive: false });
  root.addEventListener('touchcancel', onCancel, { passive: true });

  return () => {
    gesture = null;
    root.removeEventListener('touchstart', onStart);
    root.removeEventListener('touchmove', onMove);
    root.removeEventListener('touchend', onEnd);
    root.removeEventListener('touchcancel', onCancel);
  };
}
