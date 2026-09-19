import assert from 'node:assert/strict';
import test from 'node:test';
import { parseJsonResponse } from '../lib/http/parse-json-response';

test('API response parser reports the server error instead of parsing an HTML page', async () => {
  await assert.rejects(
    parseJsonResponse(new Response('<!DOCTYPE html><html>error</html>', {
      status: 500,
      headers: { 'content-type': 'text/html' },
    })),
    (error: unknown) => error instanceof Error && error.message === 'Request failed (HTTP 500): the server returned an HTML error page',
  );
});

test('API response parser preserves JSON API errors', async () => {
  await assert.rejects(
    parseJsonResponse(new Response(JSON.stringify({ ok: false, error: 'Could not fetch product page' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    })),
    (error: unknown) => error instanceof Error && error.message === 'Could not fetch product page',
  );
});

test('API response parser accepts successful JSON data', async () => {
  const result = await parseJsonResponse<{ ok: boolean }>(new Response('{"ok":true}', {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  }));
  assert.deepEqual(result, { ok: true });
});

test('API response parser gives a safe status error for plain-text failures', async () => {
  await assert.rejects(
    parseJsonResponse(new Response('upstream exploded', {
      status: 502,
      headers: { 'content-type': 'text/plain' },
    })),
    (error: unknown) => error instanceof Error
      && error.message === 'Request failed (HTTP 502)'
      && (error as Error & { status?: number }).status === 502,
  );
});

test('API response parser does not parse or expose a successful non-JSON body', async () => {
  await assert.rejects(
    parseJsonResponse(new Response('not actually json', {
      status: 200,
      headers: { 'content-type': 'text/plain' },
    })),
    (error: unknown) => error instanceof Error && error.message === 'The server returned an invalid JSON response',
  );
});
