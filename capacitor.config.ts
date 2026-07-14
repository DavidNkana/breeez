import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Breeez Capacitor config.
 *
 * Pattern matches Laudium: web app in `out/` (Next.js static export) wrapped into
 * native Android + iOS shells via `npx cap sync`.
 *
 * When we deploy to Vercel, the production web URL replaces the localhost dev URL
 * in the `server.url` field. For app store builds the `server.url` is REMOVED so
 * the app uses the bundled `out/` assets (offline-capable).
 */
const config: CapacitorConfig = {
  appId: 'co.za.breeez.app',
  appName: 'Breeez',
  webDir: 'out',
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#ffffff'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ffffff'
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#ffffff'
    }
  }
};

export default config;