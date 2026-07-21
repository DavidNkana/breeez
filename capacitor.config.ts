import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Breeez Capacitor config.
 *
 * Approach: The native app is a webview wrapping the live Vercel deployment
 * (breeez-lyart.vercel.app). This means:
 *   - Single source of truth (one Next.js codebase)
 *   - All SSR features (auth, cart, checkout) work normally
 *   - No static export needed (keeps dynamic routes like /account/orders/[id])
 *   - App updates instantly on web deploys (no app store review for fixes)
 *
 * Build flow:
 *   1. Web deploys to Vercel (continuous via git push)
 *   2. `npx cap sync` updates native assets (icons, splash, permissions)
 *   3. Open in Xcode / Android Studio and archive release build
 *
 * App IDs must match the bundles registered in App Store Connect / Play
 * Console:
 *   - iOS:    co.za.breeez.app
 *   - Android: za.co.breeez
 */
const config: CapacitorConfig = {
  appId: 'co.za.breeez.app',
  appName: 'Trends Day-to-Day',
  webDir: 'out',

  // Production: native app loads the live Vercel deployment.
  // For testing against a local dev server, change this to http://10.0.2.2:3000
  // (Android emulator's loopback to host) or http://localhost:3000 (iOS sim).
  server: {
    url: 'https://breeez-lyart.vercel.app',
    cleartext: false
  },

  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    backgroundColor: '#ffffff'
  },

  ios: {
    contentInset: 'automatic',
    backgroundColor: '#ffffff',
    limitsNavigationsToAppBoundDomains: true
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'default',
      backgroundColor: '#ffffff'
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;