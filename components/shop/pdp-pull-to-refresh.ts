export const PULL_THRESHOLD = 64;

export type PullStatus = 'idle' | 'pulling' | 'ready' | 'refreshing' | 'updated' | 'error';

export type PullState = {
  status: PullStatus;
  distance: number;
};

export type PullEvent =
  | { type: 'move'; distance: number }
  | { type: 'release' }
  | { type: 'cancel' }
  | { type: 'refresh' }
  | { type: 'success' }
  | { type: 'error' };

export const initialPullState: PullState = { status: 'idle', distance: 0 };

export function isPullStartAllowed({
  isMobile,
  scrollY,
  targetExcluded,
}: {
  isMobile: boolean;
  scrollY: number;
  targetExcluded: boolean;
}): boolean {
  return isMobile && scrollY <= 0 && !targetExcluded;
}

export function getVerticalPullDistance(
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
): number | null {
  const dx = Math.abs(currentX - startX);
  const dy = currentY - startY;
  if (dy <= 0 || dx > dy) return null;
  return dy;
}

export function transitionPullState(state: PullState, event: PullEvent): PullState {
  switch (event.type) {
    case 'move':
      return {
        distance: Math.max(0, event.distance),
        status: event.distance >= PULL_THRESHOLD ? 'ready' : 'pulling',
      };
    case 'release':
      return state.status === 'ready' ? { ...state, status: 'refreshing' } : initialPullState;
    case 'refresh':
      return { ...state, status: 'refreshing' };
    case 'success':
      return { ...state, status: 'updated' };
    case 'error':
      return { ...state, status: 'error' };
    case 'cancel':
      return initialPullState;
  }
}
