/**
 * Rebuild the Android launcher icons from brand-assets/main-app-launcher.png.
 *
 * Android adaptive icons are 108x108dp. The launcher masks them (circle,
 * squircle, teardrop, and every OEM's own shape), and only the centre
 * 72x72dp — 66% of the canvas — is guaranteed to survive the mask.
 *
 * A full-bleed logo therefore gets clipped by the mask and looks far too
 * zoomed in on the home screen. This script scales the logo into the safe
 * zone (ADAPTIVE_SCALE) and regenerates every density bucket:
 *
 *   ic_launcher.png            legacy square icon (pre-Android 8)
 *   ic_launcher_round.png      legacy round variant
 *   ic_launcher_foreground.png adaptive foreground layer (transparent)
 *
 * Run: node scripts/rebuild-android-icon.ts
 */
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const SOURCE = resolve('brand-assets/main-app-launcher.png');
const RES = resolve('android/app/src/main/res');

/** The logo occupies this much of the adaptive foreground canvas. */
const ADAPTIVE_SCALE = 0.6;
/** The legacy square icon keeps a little more of the logo. */
const LEGACY_SCALE = 0.78;

const DENSITIES = [
  { dir: 'mipmap-mdpi', legacy: 48, adaptive: 108 },
  { dir: 'mipmap-hdpi', legacy: 72, adaptive: 162 },
  { dir: 'mipmap-xhdpi', legacy: 96, adaptive: 216 },
  { dir: 'mipmap-xxhdpi', legacy: 144, adaptive: 324 },
  { dir: 'mipmap-xxxhdpi', legacy: 192, adaptive: 432 },
];

/**
 * The logo artwork on a transparent background.
 *
 * The source is a black square with the logo on it. For an adaptive icon the
 * black belongs on the BACKGROUND layer (so the masked shape is solid black),
 * and the foreground must carry the logo alone, otherwise the launcher shows
 * a black square floating inside a white circle.
 *
 * The background is pure black and the logo is white + brand red, so we can
 * knock the background out by treating near-black pixels as transparent and
 * keeping everything else.
 */
async function logoArtwork(size: number) {
  const { data, info } = await sharp(SOURCE)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < info.width * info.height; i++) {
    const r = data[i * info.channels];
    const g = data[i * info.channels + 1];
    const b = data[i * info.channels + 2];
    const max = Math.max(r, g, b);
    // Keep anything that is not the black background; soften the edge.
    const alpha = max <= 24 ? 0 : max <= 64 ? Math.round(((max - 24) / 40) * 255) : 255;
    pixels[i * 4] = r;
    pixels[i * 4 + 1] = g;
    pixels[i * 4 + 2] = b;
    pixels[i * 4 + 3] = alpha;
  }

  return sharp(pixels, { raw: { width: info.width, height: info.height, channels: 4 } })
    .resize(size, size, { fit: 'inside', withoutEnlargement: false })
    .png()
    .toBuffer();
}

/**
 * The visible part of an adaptive icon is the centre 66%. The logo is scaled
 * to 60% so it sits inside that with a little breathing room.
 */
async function adaptiveForeground(size: number) {
  const inner = Math.round(size * ADAPTIVE_SCALE);
  const logo = await logoArtwork(inner);
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toBuffer();
}

/** The legacy icon is a flat square: the logo on the brand black. */
async function legacyIcon(size: number) {
  const inner = Math.round(size * LEGACY_SCALE);
  const logo = await sharp(SOURCE)
    .resize(inner, inner, { fit: 'inside', withoutEnlargement: false })
    .png()
    .toBuffer();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toBuffer();
}

/** A round-masked legacy icon for launchers that ask for one. */
async function roundIcon(size: number) {
  const inner = Math.round(size * LEGACY_SCALE);
  const logo = await sharp(SOURCE)
    .resize(inner, inner, { fit: 'inside', withoutEnlargement: false })
    .png()
    .toBuffer();
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#000"/></svg>`,
  );
  return sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: logo, gravity: 'center' }, { input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

async function main() {
  if (!existsSync(SOURCE)) {
    console.error(`Source not found: ${SOURCE}`);
    process.exit(1);
  }

  for (const d of DENSITIES) {
    const dir = resolve(RES, d.dir);
    await mkdir(dir, { recursive: true });

    await writeFile(resolve(dir, 'ic_launcher.png'), await legacyIcon(d.legacy));
    await writeFile(resolve(dir, 'ic_launcher_round.png'), await roundIcon(d.legacy));
    await writeFile(resolve(dir, 'ic_launcher_foreground.png'), await adaptiveForeground(d.adaptive));

    console.log(`${d.dir}: legacy ${d.legacy}px, adaptive foreground ${d.adaptive}px`);
  }

  // Play Store listing icon.
  const store = resolve('native-assets-pre-handoff/play-store-icon-512.png');
  if (existsSync(dirname(store))) {
    const inner = Math.round(512 * 0.86);
    const logo = await sharp(SOURCE).resize(inner, inner, { fit: 'inside' }).png().toBuffer();
    await writeFile(
      store,
      await sharp({
        create: { width: 512, height: 512, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
      })
        .composite([{ input: logo, gravity: 'center' }])
        .png()
        .toBuffer(),
    );
    console.log('play-store-icon-512.png');
  }

  console.log('Launcher icons rebuilt.');
}

main();
