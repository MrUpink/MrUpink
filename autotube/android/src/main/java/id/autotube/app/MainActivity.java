package id.autotube.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.text.InputType;
import android.view.Gravity;
import android.webkit.URLUtil;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.Toast;

/**
 * Membuka tampilan server AutoTube di WebView. Alamat server diisi sekali saat
 * pertama dibuka (tekan lama layar untuk mengganti).
 */
public class MainActivity extends Activity {

    private static final String PREFS = "autotube";
    private static final String KEY_URL = "server_url";

    private WebView webView;
    private SharedPreferences prefs;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE);

        webView = new WebView(this);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(true);
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                Uri server = Uri.parse(serverUrl());
                // Login Google tidak boleh di WebView, dan link YouTube dibuka di aplikasinya.
                boolean sameHost = uri.getHost() != null && uri.getHost().equals(server.getHost());
                if (!sameHost || uri.getPath() != null && uri.getPath().startsWith("/oauth/")) {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                    return true;
                }
                return false;
            }
        });
        webView.setDownloadListener((url, userAgent, contentDisposition, mimeType, length) -> {
            DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url));
            String name = URLUtil.guessFileName(url, contentDisposition, mimeType);
            req.setTitle(name);
            req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            req.setDestinationInExternalPublicDir(Environment.DIRECTORY_MOVIES, "AutoTube/" + name);
            ((DownloadManager) getSystemService(DOWNLOAD_SERVICE)).enqueue(req);
            Toast.makeText(this, "Mengunduh " + name, Toast.LENGTH_SHORT).show();
        });
        webView.setOnLongClickListener(v -> {
            askServerUrl();
            return true;
        });
        setContentView(webView);

        if (serverUrl().isEmpty()) {
            askServerUrl();
        } else {
            webView.loadUrl(serverUrl());
        }
    }

    private String serverUrl() {
        return prefs.getString(KEY_URL, "");
    }

    private void askServerUrl() {
        EditText input = new EditText(this);
        input.setInputType(InputType.TYPE_TEXT_VARIATION_URI);
        input.setHint("https://autotube.domainanda.com");
        input.setText(serverUrl());
        input.setGravity(Gravity.START);
        FrameLayout box = new FrameLayout(this);
        int pad = (int) (20 * getResources().getDisplayMetrics().density);
        box.setPadding(pad, pad / 2, pad, 0);
        box.addView(input);

        new AlertDialog.Builder(this)
                .setTitle("Alamat server AutoTube")
                .setMessage("Isi alamat server tempat AutoTube berjalan. Tekan lama layar untuk mengganti nanti.")
                .setView(box)
                .setCancelable(!serverUrl().isEmpty())
                .setPositiveButton("Simpan", (d, w) -> {
                    String url = input.getText().toString().trim().replaceAll("/+$", "");
                    if (!url.startsWith("http://") && !url.startsWith("https://")) url = "https://" + url;
                    prefs.edit().putString(KEY_URL, url).apply();
                    webView.loadUrl(url);
                })
                .show();
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
