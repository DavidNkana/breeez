import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getVerticalPullDistance,
  initialPullState,
  isPullStartAllowed,
  PULL_THRESHOLD,
  transitionPullState,
} from '../components/shop/pdp-pull-to-refresh';
import { attachPdpPullToRefreshListeners } from '../components/shop/pdp-pull-to-refresh-listeners';
import { refreshPdp } from '../components/shop/pdp-refresh-controller';

test('pull state reaches release threshold only for a vertical downward gesture', () => {
  assert.equal(getVerticalPullDistance(10, 10, 10, 73), 63);
  assert.equal(getVerticalPullDistance(10, 10, 30, 20), null);
  assert.deepEqual(transitionPullState(initialPullState, { type: 'move', distance: PULL_THRESHOLD - 1 }), {
    status: 'pulling', distance: PULL_THRESHOLD - 1,
  });
  assert.deepEqual(transitionPullState(initialPullState, { type: 'move', distance: PULL_THRESHOLD }), {
    status: 'ready', distance: PULL_THRESHOLD,
  });
});

test('pull starts only at the top on a mobile PDP and not on interactive targets', () => {
  assert.equal(isPullStartAllowed({ isMobile: true, scrollY: 0, targetExcluded: false }), true);
  assert.equal(isPullStartAllowed({ isMobile: true, scrollY: 1, targetExcluded: false }), false);
  assert.equal(isPullStartAllowed({ isMobile: false, scrollY: 0, targetExcluded: false }), false);
  assert.equal(isPullStartAllowed({ isMobile: true, scrollY: 0, targetExcluded: true }), false);
});

test('release, refresh success, and refresh error have distinct states', () => {
  const ready = transitionPullState(initialPullState, { type: 'move', distance: PULL_THRESHOLD });
  const refreshing = transitionPullState(ready, { type: 'release' });
  assert.equal(refreshing.status, 'refreshing');
  assert.equal(transitionPullState(refreshing, { type: 'success' }).status, 'updated');
  assert.equal(transitionPullState(refreshing, { type: 'error' }).status, 'error');
  assert.equal(transitionPullState(initialPullState, { type: 'release' }).status, 'idle');
});

test('component listeners stay scoped, top-only, and clean up exactly once', () => {
  type Handler = (event: globalThis.TouchEvent) => void;
  const handlers = new Map<string, Handler>();
  const root = {
    addEventListener(type: string, handler: Handler) { handlers.set(type, handler); },
    removeEventListener(type: string, handler: Handler) {
      if (handlers.get(type) === handler) handlers.delete(type);
    },
  } as unknown as HTMLElement;
  let state = initialPullState;
  let refreshing = false;
  let refreshes = 0;
  let scrollY = 0;
  const browserWindow = {
    get scrollY() { return scrollY; },
    ontouchstart: null,
    matchMedia: () => ({ matches: true }),
  } as unknown as Window;
  const excludedTargets = new Set(['button', 'gallery', 'input']);
  const event = (type: string, target: string, y: number) => {
    let prevented = false;
    const touchEvent = {
      target,
      touches: [{ clientX: 10, clientY: y }],
      preventDefault: () => { prevented = true; },
    } as unknown as globalThis.TouchEvent;
    handlers.get(type)?.(touchEvent);
    return prevented;
  };
  const cleanup = attachPdpPullToRefreshListeners({
    root,
    window: browserWindow,
    isRefreshing: () => refreshing,
    isTargetExcluded: (target) => excludedTargets.has(String(target)),
    getState: () => state,
    setState: (next) => { state = next; },
    onRefresh: () => {
      refreshes += 1;
      refreshing = true;
      state = transitionPullState(state, { type: 'refresh' });
    },
  });

  assert.deepEqual([...handlers.keys()].sort(), ['touchcancel', 'touchend', 'touchmove', 'touchstart']);
  scrollY = 1;
  event('touchstart', 'page', 10);
  assert.equal(state.status, 'idle');
  scrollY = 0;
  for (const target of ['button', 'gallery', 'input']) {
    event('touchstart', target, 10);
    assert.equal(state.status, 'idle');
  }
  event('touchstart', 'page', 10);
  assert.equal(event('touchmove', 'page', 74), true);
  event('touchend', 'page', 74);
  assert.equal(refreshes, 1);
  assert.equal(state.status, 'refreshing');
  event('touchstart', 'page', 10);
  assert.equal(refreshes, 1);
  state = transitionPullState(state, { type: 'error' });
  assert.equal(state.status, 'error');
  refreshing = false;
  cleanup();
  assert.equal(handlers.size, 0);
  event('touchstart', 'page', 10);
  assert.equal(refreshes, 1);
});

test('the accessible refresh activation uses a no-store request and refreshes only after OK', async () => {
  const calls: RequestInit[] = [];
  let routerRefreshes = 0;
  let errors = 0;
  const response = await refreshPdp({
    productSlug: 'fresh product',
    fetchImpl: async (input, init) => {
      assert.equal(input, '/p/fresh%20product');
      calls.push(init ?? {});
      return { ok: true, status: 200 } as Response;
    },
    onSuccess: () => { routerRefreshes += 1; },
    onError: () => { errors += 1; },
  });

  assert.equal(response, true);
  assert.equal(calls[0].cache, 'no-store');
  assert.equal(routerRefreshes, 1);
  assert.equal(errors, 0);
});

test('non-OK and timeout responses report errors without false success, and retry works', async () => {
  let attempts = 0;
  let successes = 0;
  let errors = 0;
  const refresh = () => refreshPdp({
    productSlug: 'stocked-item',
    fetchImpl: async (_input, init) => {
      attempts += 1;
      if (attempts === 1) return { ok: false, status: 503 } as Response;
      assert.ok(init?.signal);
      return { ok: true, status: 200 } as Response;
    },
    onSuccess: () => { successes += 1; },
    onError: () => { errors += 1; },
  });

  assert.equal(await refresh(), false);
  assert.equal(successes, 0);
  assert.equal(errors, 1);
  assert.equal(await refresh(), true);
  assert.equal(successes, 1);
  assert.equal(errors, 1);

  let aborted = false;
  const timedOut = await refreshPdp({
    productSlug: 'slow-item',
    timeoutMs: 1,
    fetchImpl: async (_input, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => { aborted = true; reject(new Error('aborted')); });
    }),
    onSuccess: () => { successes += 1; },
    onError: () => { errors += 1; },
  });
  assert.equal(timedOut, false);
  assert.equal(aborted, true);
  assert.equal(successes, 1);
  assert.equal(errors, 2);
});

test('refresh does not emit analytics events regardless of consent', async () => {
  const originalWindow = globalThis.window;
  const events: Event[] = [];
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { dispatchEvent: (event: Event) => { events.push(event); return true; } },
  });
  try {
    await refreshPdp({
      productSlug: 'private-item',
      fetchImpl: async () => ({ ok: true, status: 200 } as Response),
      onSuccess: () => {},
      onError: () => {},
    });
    assert.equal(events.length, 0);
  } finally {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
  }
});
