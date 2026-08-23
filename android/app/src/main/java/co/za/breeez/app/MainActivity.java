package co.za.breeez.app;

import android.os.Bundle;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

/**
 * Breeez — Capacitor 6 + Android 13+ (predictive back) main activity.
 *
 * Fix: ensure the Android system Back button (hardware or gesture) walks the
 * WebView's history stack before letting Android default-exit the activity.
 *
 * Without this override, on Android 13+ (predictive back enabled by default
 * with targetSdk 35), `BridgeActivity.onBackPressed()` is called
 * inconsistently — deep routes were closing the app instead of popping one
 * frame of webview history.
 *
 * What we do:
 *   - If the WebView has history (`webView.canGoBack()`), call `webView.goBack()`
 *     and consume the back press.
 *   - If the WebView is at the bottom of its stack (e.g. on Home `/`), fall
 *     through to default behavior, which exits the activity. That matches
 *     user expectation: deep routes navigate, Home lets the user leave.
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Register a back-press callback that uses the WebView's own history.
        // This works correctly with Android 13+ predictive back as long as
        // the WebView has history to pop.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (getBridge() != null
                        && getBridge().getWebView() != null
                        && getBridge().getWebView().canGoBack()) {
                    // Pop one entry of the WebView's history stack.
                    getBridge().getWebView().goBack();
                } else {
                    // We're at the bottom of the WebView stack (e.g. on Home `/`).
                    // Disable this callback so the default behavior runs once,
                    // exiting the activity cleanly.
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                }
            }
        });
    }
}
