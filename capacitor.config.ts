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
  appName: 'Evasale',
  webDir: 'out',

  // Production: the native app loads the live storefront on its canonical
  // domain. Using the same origin as the website matters for payments: the
  // PayFast return/cancel URLs point at www.evasale.co.za, so if the app ran
  // on the Vercel alias the customer would be bounced out of the app to a
  // browser after paying. Same origin = the whole payment stays in-app.
  //
  // For testing against a local dev server, change this to http://10.0.2.2:3000
  // (Android emulator's loopback to host) or http://localhost:3000 (iOS sim).
  server: {
    url: 'https://www.evasale.co.za',
    cleartext: false
  },

  android: {
    allowMixedContent: false,
    // Use Android WebView's normal InputConnection. Capacitor's alternate
    // captured-input connection is intended for simpler keyboards and can
    // drop focus or typed characters in HTML inputs on Android WebView.
    captureInput: false,
    webContentsDebuggingEnabled: false,
    backgroundColor: '#000000'
  },

  ios: {
    // contentInset: 'never' + the webview filling the screen means the
    // status-bar strip is painted by our own dark header (with `.safe-top`
    // keeping the logo clear of the clock). This pairs with
    // `viewportFit: 'cover'` in app/layout.tsx: without it,
    // env(safe-area-inset-top) is 0 and the padding does nothing.
    contentInset: 'never',
    backgroundColor: '#000000',
    // Must be false: with it true the webview may only navigate to its own
    // origin, which blocks the hosted PayFast checkout from loading at all.
    // We keep the flow in-app by intercepting window.open in JS (see
    // components/app/NativeChrome.tsx) and by only ever navigating to the
    // payment provider from the checkout.
    limitsNavigationsToAppBoundDomains: false
  },

  plugins: {
    // Capacitor's default splash screen was the Capacitor template image
    // (a blue background with the white "C" logo), which shipped with the
    // original `npx cap add android` and was never replaced. We disable it
    // here so users go straight from the launcher-icon splash (your Evasale
    // branded one in mipmap-*/ic_launcher.png) to the WebView, which
    // shows the black-background AppSplash.tsx React component with the
    // real Evasale logo for ~5 seconds.
    //
    // To restore a native splash: replace the splash.png files in
    // android/app/src/main/res/drawable-{density}/ and revert the
    // launchShowDuration back to a positive number.
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#000000',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      // 'light' = LIGHT status bar text (white icons/clock). The app chrome is
      // dark, so dark text was invisible on iOS and made the status bar look
      // like an empty transparent strip.
      //
      // NOTE: on iOS the status bar background is always transparent — it can
      // only be controlled by what is rendered behind it. `backgroundColor`
      // below applies to Android only; on iOS the header's own background
      // (plus `contentInset: 'never'`) provides the strip.
      style: 'light',
      backgroundColor: '#000000'
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
