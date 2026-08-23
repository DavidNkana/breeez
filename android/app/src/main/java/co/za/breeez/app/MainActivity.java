package co.za.breeez.app;

import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

/**
 * Breeez — Capacitor 6 + Android 13+ main activity.
 *
 * Two overrides vs the default BridgeActivity:
 *
 *  1. Back-button fix (predictive back gesture on Android 13+):
 *     Walks the WebView's history stack before letting Android default-exit.
 *     See the OnBackPressedCallback below.
 *
 *  2. Offline / "no internet" page (the change that fixes the bug Chris
 *     reported on 2026-08-23 — Android's WebView shows Chrome's
 *     "ERR_INTERNET_DISCONNECTED" page when the site can't be reached,
 *     which is ugly and on-brand-breaking). Now we install a custom
 *     BridgeWebViewClient that intercepts network errors on the initial
 *     load (or any load), checks if the failure is connectivity-related
 *     (not a 404 or other app-level error), and if so, loads the bundled
 *     `public/offline.html` from the APK's assets. That HTML is a static,
 *     self-contained branded page — works even when the device has no
 *     network at all (which is the entire point).
 *
 *  The fallback URL is loaded from `file:///android_asset/public/offline.html`.
 *  The `public/offline.html` source is at the top of the web repo and is
 *  copied into the Android assets by `npx cap sync` (so a future
 *  AAB rebuild is required to bundle the asset; see
 *  native-assets-pre-handoff/README.md for the rebuild steps).
 */
public class MainActivity extends BridgeActivity {

    private static final String TAG = "BreeezMainActivity";
    private static final String OFFLINE_ASSET_URL = "file:///android_asset/public/offline.html";

    // Track which URL we're currently trying to load. When the WebView is
    // showing the offline page, the active URL will be the offline file URL
    // and we don't want to loop and re-load it on every error.
    private String lastAttemptedUrl = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // === Back-button fix (Android 13+ predictive back) ===
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (getBridge() != null
                        && getBridge().getWebView() != null
                        && getBridge().getWebView().canGoBack()) {
                    // Pop one entry of the WebView's history stack.
                    getBridge().getWebView().goBack();
                } else {
                    // Bottom of the WebView stack (e.g. on Home `/`).
                    // Disable this callback so the default behavior runs once,
                    // exiting the activity cleanly.
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                }
            }
        });

        // === Offline-page fix ===
        // Install a custom WebViewClient that intercepts network errors and
        // serves a bundled branded offline page. We do this AFTER super.onCreate
        // so getBridge() is non-null and the WebView is fully initialised.
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();

            // Use a subclass of the default Capacitor WebViewClient so we
            // keep the Capacitor-aware behaviour (deep-link routing, etc.)
            // and only override the error path.
            BridgeWebViewClient client = new BridgeWebViewClient(this, getBridge()) {
                @Override
                public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                    super.onReceivedError(view, request, error);
                    handleWebError(request, error);
                }

                // Older WebView callback signature (pre-Lollipop kept for safety;
                // BridgeActivity may still call it on some Android versions).
                @SuppressWarnings("deprecation")
                @Override
                public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                    super.onReceivedError(view, errorCode, description, failingUrl);
                    if (request == null) {
                        WebResourceRequest req = new SimpleWebResourceRequest(failingUrl);
                        WebResourceError err = new SimpleWebResourceError(errorCode, description);
                        handleWebError(req, err);
                    }
                }
            };

            webView.setWebViewClient(client);
        }
    }

    /**
     * Decide whether to redirect the WebView to the bundled offline page.
     *
     * Heuristic: only redirect on errors that look like network failures
     * (no host, connection timeout, disconnected) and only on the main-frame
     * request (not subresource). A 404 / 500 on an API call should still
     * surface as a real error in the app UI, not be replaced by an offline
     * screen. If the user is already viewing the offline page itself, do
     * nothing (prevent loops).
     */
    private void handleWebError(WebResourceRequest request, WebResourceError error) {
        if (request == null || error == null) return;

        // Only react to main-frame loads.
        if (request.isForMainFrame() == false) return;

        String url = request.getUrl() != null ? request.getUrl().toString() : null;
        if (url == null) return;

        // Don't loop: if the user is already looking at the offline page, ignore.
        if (url.startsWith(OFFLINE_ASSET_URL)) return;

        // If we successfully loaded this URL before, the user is just hitting
        // a flaky sub-page. Don't blow away the whole app for that.
        if (url.equals(lastAttemptedUrl)) return;

        // Log the error for diagnostics. (Not user-visible.)
        Log.w(TAG, "WebView load failed: " + url + " — " + error.getDescription());

        // Only redirect on connectivity-shaped errors. Error codes:
        //   -2  ERROR_HOST_LOOKUP (no DNS)
        //   -6  ERROR_CONNECTION (no network)
        //   -7  ERROR_TIMEOUT
        //   -8  ERROR_IO
        //   -14 ERROR_BAD_URL (rare)
        int code = error.getErrorCode();
        boolean connectivity = (code == -2 || code == -6 || code == -7 || code == -8);
        // Defensive: also redirect if the description mentions a connectivity word.
        // (Some WebView builds return code 0 with a description that hints at offline.)
        if (!connectivity && error.getDescription() != null) {
            String desc = error.getDescription().toString().toLowerCase();
            if (desc.contains("internet") || desc.contains("network") || desc.contains("offline")
                    || desc.contains("unreachable") || desc.contains("dns")) {
                connectivity = true;
            }
        }

        if (connectivity) {
            lastAttemptedUrl = url;
            WebView webView = (getBridge() != null) ? getBridge().getWebView() : null;
            if (webView != null) {
                webView.stopLoading();
                webView.loadUrl(OFFLINE_ASSET_URL);
            }
        }
    }

    /**
     * Minimal WebResourceRequest adapter for the deprecated onReceivedError
     * overload. We only need isForMainFrame() and getUrl() to behave correctly.
     */
    private static class SimpleWebResourceRequest implements WebResourceRequest {
        private final String url;
        SimpleWebResourceRequest(String url) { this.url = url; }
        @Override public Uri getUrl() { return Uri.parse(url); }
        @Override public boolean isForMainFrame() { return true; }
        @Override public boolean isRedirect() { return false; }
        @Override public boolean hasGesture() { return false; }
        @Override public String getMethod() { return "GET"; }
        @Override public java.util.Map<String, String> getRequestHeaders() { return java.util.Collections.emptyMap(); }
    }

    /**
     * Minimal WebResourceError adapter for the deprecated onReceivedError
     * overload. We only need getErrorCode() and getDescription() to behave.
     */
    private static class SimpleWebResourceError implements WebResourceError {
        private final int code;
        private final String description;
        SimpleWebResourceError(int code, String description) {
            this.code = code;
            this.description = description;
        }
        @Override public int getErrorCode() { return code; }
        @Override public CharSequence getDescription() { return description; }
    }
}
