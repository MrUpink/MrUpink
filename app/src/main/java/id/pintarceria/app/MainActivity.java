package id.pintarceria.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.util.Locale;

/**
 * Membungkus permainan HTML5 (assets/www) di dalam WebView dan menyediakan
 * suara pemandu Bahasa Indonesia lewat Text-to-Speech Android
 * (WebView Android tidak mendukung Web Speech API).
 */
public class MainActivity extends Activity {

    private WebView webView;
    private TextToSpeech tts;
    private volatile boolean ttsReady = false;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        tts = new TextToSpeech(this, status -> {
            if (status != TextToSpeech.SUCCESS) return;
            int r = tts.setLanguage(new Locale("id", "ID"));
            if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) {
                // Kode bahasa lama untuk Bahasa Indonesia
                r = tts.setLanguage(new Locale("in", "ID"));
            }
            if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) {
                tts.setLanguage(Locale.getDefault());
            }
            tts.setSpeechRate(0.9f);
            tts.setPitch(1.1f);
            ttsReady = true;
        });

        webView = new WebView(this);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setTextZoom(100);
        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.addJavascriptInterface(new TtsBridge(), "AndroidTTS");
        webView.loadUrl("file:///android_asset/www/index.html");
        setContentView(webView);
        hideSystemBars();
    }

    /** Dipanggil dari JavaScript sebagai window.AndroidTTS. */
    public class TtsBridge {
        @JavascriptInterface
        public void speak(String text) {
            if (ttsReady && text != null) {
                tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "pc" + System.nanoTime());
            }
        }

        @JavascriptInterface
        public void stop() {
            if (ttsReady) tts.stop();
        }
    }

    @SuppressWarnings("deprecation")
    private void hideSystemBars() {
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_FULLSCREEN);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        // Biarkan permainan menangani tombol kembali dulu (tutup permainan/dialog).
        webView.evaluateJavascript("(window.handleBack && window.handleBack()) ? '1' : '0'", result -> {
            if (!"\"1\"".equals(result)) finish();
        });
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (ttsReady) tts.stop();
        webView.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
    }

    @Override
    protected void onDestroy() {
        if (tts != null) tts.shutdown();
        webView.destroy();
        super.onDestroy();
    }
}
