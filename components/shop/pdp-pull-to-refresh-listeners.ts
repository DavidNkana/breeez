import { Capacitor } from '@capacitor/core';
import {
  getVerticalPullDistance,
  initialPullState,
  isPullStartAllowed,
  transitionPullState,
  type PullState,
} from './pdp-pull-to-refresh';

type TouchListenerRoot = Pick<HTMLElement, 'addEventListener' | 'removeEventListener'>;
type TouchWindow = Pick<Window, 'matchMedia'> & {
  innerWidth?: number;
  pageYOffset?: number;
  scrollY: number;
  PointerEvent?: unknown;
  getComputedStyle?: (element: Element) => CSSStyleDeclaration;
  document?: { scrollingElement: Element | null };
};

type ListenerOptions = {
  root: TouchListenerRoot;
  window: TouchWindow;
  isRefreshing: () => boolean;
  isTargetExcluded: (target: EventTarget | null) => boolean;
  getState: () => PullState;
  setState: (state: PullState) => void;
  onRefresh: () => void;
};

type Point = { x: number; y: number };
type Gesture = Point & { input: 'touch' | 'pointer' };

function isNativePlatform(): boolean {
  try {
    if (Capacitor.isNativePlatform()) return true;
    const capacitor = (globalThis as typeof globalThis & {
      Capacitor?: { isNativePlatform?: () => boolean };
    }).Capacitor;
    return capacitor?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

function isMobileEnvironment(browserWindow: TouchWindow): boolean {
  return browserWindow.matchMedia('(max-width: 767px)').matches
    || (browserWindow.innerWidth !== undefined && browserWindow.innerWidth <= 767)
    || isNativePlatform();
}

function getScrollContainer(root: TouchListenerRoot, browserWindow: TouchWindow): HTMLElement | null {
  let element = root as HTMLElement | null;
  while (element) {
    const style = browserWindow.getComputedStyle?.(element);
    if (style && /(auto|scroll|overlay)/.test(style.overflowY) && element.scrollHeight > element.clientHeight) {
      return element;
    }
    element = element.parentElement;
  }
  return (browserWindow.document?.scrollingElement as HTMLElement | null) ?? null;
}

function isAtTop(root: TouchListenerRoot, browserWindow: TouchWindow): boolean {
  const container = getScrollContainer(root, browserWindow);
  if (container) return container.scrollTop <= 0;
  return (browserWindow.scrollY ?? browserWindow.pageYOffset ?? 0) <= 0;
}

export function attachPdpPullToRefreshListeners({
  root,
  window,
  isRefreshing,
  isTargetExcluded,
  getState,
  setState,
  onRefresh,
}: ListenerOptions): () => void {
  let gesture: Gesture | null = null;

  const onStart = (event: Event) => {
    if (isRefreshing()) return;
    const touchEvent = event as TouchEvent;
    const pointerEvent = event as PointerEvent;
    const isPointer = event.type === 'pointerdown';
    const input = isPointer ? 'pointer' : 'touch';
    // Browsers commonly dispatch pointerdown before touchstart. Let the real
    // touch stream take ownership because native scrolling may cancel pointers.
    if (gesture && input === 'pointer') return;
    if (isPointer && pointerEvent.isPrimary === false) return;
    if (isPointer && pointerEvent.pointerType && pointerEvent.pointerType !== 'touch') return;
    if (!isPointer && touchEvent.touches.length !== 1) return;
    const point = isPointer
      ? { x: pointerEvent.clientX, y: pointerEvent.clientY }
      : { x: touchEvent.touches[0].clientX, y: touchEvent.touches[0].clientY };
    if (!isPullStartAllowed({
      isMobile: isMobileEnvironment(window),
      scrollY: isAtTop(root, window) ? 0 : 1,
      targetExcluded: isTargetExcluded(event.target),
    })) return;
    gesture = { ...point, input };
    setState(initialPullState);
  };

  const onMove = (event: Event) => {
    const input = event.type === 'pointermove' ? 'pointer' : 'touch';
    if (!gesture || gesture.input !== input || isRefreshing()) return;
    const touchEvent = event as TouchEvent;
    const pointerEvent = event as PointerEvent;
    if (input === 'touch' && touchEvent.touches.length !== 1) return;
    const point = gesture.input === 'pointer'
      ? { x: pointerEvent.clientX, y: pointerEvent.clientY }
      : { x: touchEvent.touches[0].clientX, y: touchEvent.touches[0].clientY };
    const distance = getVerticalPullDistance(gesture.x, gesture.y, point.x, point.y);
    if (distance === null) {
      gesture = null;
      setState(initialPullState);
      return;
    }
    const next = transitionPullState(getState(), { type: 'move', distance });
    setState(next);
    if (next.status === 'ready') event.preventDefault();
  };

  const onEnd = (event: Event) => {
    const input = event.type === 'pointerup' ? 'pointer' : 'touch';
    if (!gesture || gesture.input !== input) return;
    const wasReady = getState().status === 'ready';
    gesture = null;
    if (wasReady) {
      event.preventDefault();
      onRefresh();
    } else {
      setState(initialPullState);
    }
  };

  const onCancel = (event: Event) => {
    const input = event.type === 'pointercancel' ? 'pointer' : 'touch';
    if (!gesture || gesture.input !== input) return;
    gesture = null;
    if (!isRefreshing()) setState(initialPullState);
  };

  root.addEventListener('touchstart', onStart, { passive: true });
  root.addEventListener('touchmove', onMove, { passive: false });
  root.addEventListener('touchend', onEnd, { passive: false });
  root.addEventListener('touchcancel', onCancel, { passive: true });

  const usePointerEvents = window.PointerEvent !== undefined;
  if (usePointerEvents) {
    root.addEventListener('pointerdown', onStart, { passive: true });
    root.addEventListener('pointermove', onMove, { passive: false });
    root.addEventListener('pointerup', onEnd, { passive: false });
    root.addEventListener('pointercancel', onCancel, { passive: true });
  }

  return () => {
    gesture = null;
    root.removeEventListener('touchstart', onStart);
    root.removeEventListener('touchmove', onMove);
    root.removeEventListener('touchend', onEnd);
    root.removeEventListener('touchcancel', onCancel);
    if (usePointerEvents) {
      root.removeEventListener('pointerdown', onStart);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerup', onEnd);
      root.removeEventListener('pointercancel', onCancel);
    }
  };
}
