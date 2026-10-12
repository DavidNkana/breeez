type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type RefreshControllerOptions = {
  productSlug: string;
  onSuccess: () => void;
  onError: () => void;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
};

/** Performs the observable PDP request and only refreshes Next after it succeeds. */
export async function refreshPdp({
  productSlug,
  onSuccess,
  onError,
  fetchImpl = fetch,
  timeoutMs = 8000,
}: RefreshControllerOptions): Promise<boolean> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    timeout = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetchImpl(`/p/${encodeURIComponent(productSlug)}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`PDP refresh failed with ${response.status}`);
    onSuccess();
    return true;
  } catch {
    onError();
    return false;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
