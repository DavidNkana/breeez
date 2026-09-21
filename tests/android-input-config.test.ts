import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);

test('Android uses the WebView input connection and resizes for the keyboard', async () => {
  const capacitorConfig = await readFile(new URL('capacitor.config.ts', root), 'utf8');
  const manifest = await readFile(new URL('android/app/src/main/AndroidManifest.xml', root), 'utf8');

  assert.match(capacitorConfig, /captureInput:\s*false/);
  assert.doesNotMatch(capacitorConfig, /captureInput:\s*true/);
  assert.match(manifest, /android:windowSoftInputMode="adjustResize"/);
});

test('the startup splash cannot intercept input before hydration', async () => {
  const splash = await readFile(new URL('components/app/AppSplash.tsx', root), 'utf8');

  assert.match(splash, /className="pointer-events-none\s+fixed/);
});
