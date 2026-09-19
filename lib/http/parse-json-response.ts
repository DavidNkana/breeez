export type JsonResponseError = Error & { status?: number };

/**
 * Parse an API response without assuming that a proxy, redirect, or framework
 * error returned JSON. The response body is included when it is useful, but
 * HTML is never exposed as a misleading JSON parse error.
 */
export async function parseJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  const body = await response.text();
  let parsed: unknown;

  if (contentType.includes('application/json')) {
    try {
      parsed = JSON.parse(body);
    } catch {
      // Fall through to the actionable non-JSON error below.
    }
  }

  if (!response.ok) {
    const message = parsed && typeof parsed === 'object' && 'error' in parsed && typeof parsed.error === 'string'
      ? parsed.error
      : `Request failed (HTTP ${response.status})${contentType.includes('text/html') ? ': the server returned an HTML error page' : ''}`;
    const error: JsonResponseError = new Error(message);
    error.status = response.status;
    throw error;
  }

  if (parsed !== undefined) return parsed as T;
  throw new Error(contentType.includes('text/html')
    ? 'The server returned an HTML page instead of product data'
    : 'The server returned an invalid JSON response');
}
