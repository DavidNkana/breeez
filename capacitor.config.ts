import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Breeez — Capacitor 6 + Android (and iOS, when added) main activity config.
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
  appId: 'com.breeez.app',
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
    // Capacitor's default splash screen was the Capacitor template image
    // (a blue background with the white "C" logo), which shipped with the
    // original `npx cap add android` and was never replaced. We disable it
    // here so users go straight from the launcher-icon splash (your Trends
    // branded one in mipmap-*/ic_launcher.png) to the WebView, which
    // shows the white-background AppSplash.tsx React component with the
    // real Trends logo for ~5 seconds.
    //
    // To restore a native splash: replace the splash.png files in
    // android/app/src/main/res/drawable-{density}/ and revert the
    // launchShowDuration back to a positive number.
    SplashScreen: {
      launchShowDuration: 0,
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
