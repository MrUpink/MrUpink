package id.pintarceria.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.Voice;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.MissingResourceException;
import java.util.Set;

/**
 * Membungkus permainan HTML5 (assets/www) di dalam WebView dan menyediakan
 * suara pemandu Bahasa Indonesia lewat Text-to-Speech Android
 * (WebView Android tidak mendukung Web Speech API).
 */
public class MainActivity extends Activity {

    private WebView webView;
    private TextToSpeech tts;
    private volatile boolean ttsReady = false;
    private volatile String pendingVoice = null;
    private volatile float rate = 0.95f;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        tts = new TextToSpeech(this, status -> {
            if (status != TextToSpeech.SUCCESS) return;
            List<Voice> voices = indonesianVoices();
            if (!voices.isEmpty()) {
                tts.setVoice(voices.get(0)); // kualitas terbaik
            } else {
                int r = tts.setLanguage(new Locale("id", "ID"));
                if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) {
                    tts.setLanguage(new Locale("in", "ID")); // kode bahasa lama
                }
            }
            tts.setPitch(1.0f);
            tts.setSpeechRate(rate);
            ttsReady = true;
            if (pendingVoice != null) applyVoice(pendingVoice);
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

    private static boolean isIndonesian(Locale l) {
        try {
            return "ind".equals(l.getISO3Language());
        } catch (MissingResourceException e) {
            return "id".equals(l.getLanguage()) || "in".equals(l.getLanguage());
        }
    }

    /** Suara Bahasa Indonesia yang terpasang, diurutkan dari kualitas tertinggi (suara lokal didahulukan). */
    private List<Voice> indonesianVoices() {
        List<Voice> out = new ArrayList<>();
        Set<Voice> all;
        try {
            all = tts.getVoices();
        } catch (Exception e) {
            return out;
        }
        if (all == null) return out;
        for (Voice v : all) {
            if (v.getLocale() == null || !isIndonesian(v.getLocale())) continue;
            Set<String> f = v.getFeatures();
            if (f != null && f.contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)) continue;
            out.add(v);
        }
        out.sort((a, b) -> {
            int qa = a.getQuality() - (a.isNetworkConnectionRequired() ? 50 : 0);
            int qb = b.getQuality() - (b.isNetworkConnectionRequired() ? 50 : 0);
            if (qa != qb) return qb - qa;
            return a.getName().compareTo(b.getName());
        });
        return out;
    }

    private void applyVoice(String name) {
        for (Voice v : indonesianVoices()) {
            if (v.getName().equals(name)) {
                tts.setVoice(v);
                return;
            }
        }
    }

    private static String qualityLabel(int q) {
        if (q >= Voice.QUALITY_VERY_HIGH) return "Kualitas sangat tinggi";
        if (q >= Voice.QUALITY_HIGH) return "Kualitas tinggi";
        if (q >= Voice.QUALITY_NORMAL) return "Kualitas normal";
        return "Kualitas rendah";
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

        /** Daftar suara Indonesia sebagai JSON: [{name, label}]. */
        @JavascriptInterface
        public String voices() {
            JSONArray arr = new JSONArray();
            if (!ttsReady) return arr.toString();
            int i = 1;
            for (Voice v : indonesianVoices()) {
                try {
                    JSONObject o = new JSONObject();
                    o.put("name", v.getName());
                    o.put("label", "Suara " + i++ + " – " + qualityLabel(v.getQuality())
                            + (v.isNetworkConnectionRequired() ? " (perlu internet)" : ""));
                    arr.put(o);
                } catch (Exception ignored) {
                    // lewati suara ini
                }
            }
            return arr.toString();
        }

        @JavascriptInterface
        public String currentVoice() {
            if (!ttsReady) return "";
            Voice v = tts.getVoice();
            return v == null ? "" : v.getName();
        }

        @JavascriptInterface
        public void setVoice(String name) {
            if (name == null || name.isEmpty()) return;
            if (ttsReady) applyVoice(name);
            else pendingVoice = name;
        }

        @JavascriptInterface
        public void setRate(float r) {
            rate = Math.max(0.5f, Math.min(1.5f, r));
            if (ttsReady) tts.setSpeechRate(rate);
        }

        /** Membuka pengaturan Text-to-Speech agar orang tua bisa mengunduh suara Bahasa Indonesia. */
        @JavascriptInterface
        public void openSettings() {
            runOnUiThread(() -> {
                try {
                    startActivity(new Intent("com.android.settings.TTS_SETTINGS"));
                } catch (Exception e) {
                    try {
                        startActivity(new Intent(TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA));
                    } catch (Exception ignored) {
                        // tidak ada aplikasi pengaturan TTS
                    }
                }
            });
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
        // Biarkan permainan menangani tombol kembali dulu (kembali ke layar sebelumnya).
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
