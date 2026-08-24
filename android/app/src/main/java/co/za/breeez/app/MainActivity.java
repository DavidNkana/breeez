package co.za.breeez.app;

import android.os.Bundle;
import android.util.Log;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.Bridge;
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
 *  2. Offline / "no internet" page: install a custom BridgeWebViewClient
 *     that intercepts connectivity failures on the WebView and loads the
 *     bundled `public/offline.html` from the APK's assets instead. The HTML
 *     is a static, self-contained branded page that works even with zero
 *     network. This prevents Android from showing its default "no internet"
 *     page when breeez-lyart.vercel.app is unreachable.
 *
 * The offline HTML is loaded from `file:///android_asset/public/offline.html`.
 * `npx cap sync android` copies `public/offline.html` into the Android assets
 * during the build. See docs/CAPACITOR_SETUP.md for full rebuild steps.
 */
public class MainActivity extends BridgeActivity {

    private static final String TAG = "BreeezMainActivity";
    private static final String OFFLINE_ASSET_URL = "file:///android_asset/public/offline.html";

    // Connectivity-shaped error codes from the Android WebView.
    // We redirect to the offline page when we see one of these on a main-frame load.
    private static final int ERR_HOST_LOOKUP   = -2;
    private static final int ERR_CONNECTION    = -6;
    private static final int ERR_TIMEOUT        = -7;
    private static final int ERR_IO             = -8;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // === Back-button fix (Android 13+ predictive back) ===
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                Bridge b = getBridge();
                WebView wv = (b != null) ? b.getWebView() : null;
                if (wv != null && wv.canGoBack()) {
                    // Pop one entry of the WebView's history stack.
                    wv.goBack();
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
        // serves a bundled branded offline page. Do this AFTER super.onCreate
        // so getBridge() is non-null and the WebView is fully initialised.
        Bridge bridge = getBridge();
        if (bridge != null && bridge.getWebView() != null) {
            OfflineBridgeWebViewClient client = new OfflineBridgeWebViewClient(bridge);
            bridge.getWebView().setWebViewClient(client);
        }
    }

    /**
     * Custom WebViewClient that intercepts WebView load failures and routes to
     * the bundled offline page when the failure is connectivity-related.
     *
     * We override only the modern onReceivedError(WebView, WebResourceRequest,
     * WebResourceError) overload. The deprecated (int errorCode, ...) overload
     * is no longer overridden because WebResourceError has a package-private
     * constructor on Android and cannot be subclassed from app code.
     */
    private static class OfflineBridgeWebViewClient extends BridgeWebViewClient {
        private String lastOfflineAttemptedUrl = null;

        OfflineBridgeWebViewClient(Bridge bridge) {
            super(bridge);
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            // Always let Capacitor's default handling run first (it may want
            // to log / surface the error elsewhere). Then decide whether to
            // route to the offline page.
            super.onReceivedError(view, request, error);
            handleConnectivityError(view, request, error);
        }

        /**
         * If the error is connectivity-shaped and on a main-frame load,
         * navigate the WebView to the bundled offline page.
         */
        private void handleConnectivityError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (request == null || error == null) return;
            if (!request.isForMainFrame()) return;

            String url = request.getUrl() != null ? request.getUrl().toString() : null;
            if (url == null) return;

            // Don't loop: if we're already showing the offline page, ignore.
            if (url.startsWith(OFFLINE_ASSET_URL)) return;

            // If this URL previously loaded OK, the user is on it now —
            // the failure is for a sub-resource (image, script, etc.). Don't
            // blow the whole app away for a sub-resource miss.
            if (url.equals(lastOfflineAttemptedUrl)) return;

            int code = error.getErrorCode();
            boolean connectivity = (code == ERR_HOST_LOOKUP
                                || code == ERR_CONNECTION
                                || code == ERR_TIMEOUT
                                || code == ERR_IO);

            // Defensive: some WebView builds return code 0 with a descriptive
            // string that mentions offline. Match on description too.
            if (!connectivity) {
                CharSequence desc = error.getDescription();
                if (desc != null) {
                    String s = desc.toString().toLowerCase();
                    if (s.contains("internet") || s.contains("network")
                            || s.contains("offline") || s.contains("unreachable")
                            || s.contains("dns")) {
                        connectivity = true;
                    }
                }
            }

            if (connectivity) {
                Log.w(TAG, "WebView connectivity failure: " + url + " — code=" + code);
                lastOfflineAttemptedUrl = url;
                view.stopLoading();
                view.loadUrl(OFFLINE_ASSET_URL);
            }
        }
    }
}
