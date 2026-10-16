# 🦉 Pintar Ceria — Game Edukasi Anak (Android)

Game mobile Android interaktif untuk anak umur **1–10 tahun**: belajar huruf, membaca,
angka, berhitung, serta melatih motorik dan kecerdasan. Seluruh permainan berbahasa
Indonesia, dilengkapi **suara pemandu** (Text-to-Speech), efek suara, bintang hadiah,
dan berjalan **100% offline** tanpa iklan.

## Fitur

Pilih umur anak di layar utama — tingkat kesulitan setiap permainan menyesuaikan:

| Level | Umur | Contoh penyesuaian |
|---|---|---|
| 1 | 1–3 tahun | 3 pilihan jawaban, ada contoh/gambar bantu, gerakan lambat |
| 2 | 4–6 tahun | 4 pilihan, tanpa petunjuk, soal lebih bervariasi |
| 3 | 7–10 tahun | 6 pilihan, huruf kecil, perkalian/pembagian, teka-teki |

**📚 Huruf & Membaca** — Kenal Huruf (A–Z + gambar), Belajar Suku Kata (BA BI BU BE BO),
Cari Huruf, Huruf Awal, Susun Huruf, Susun Suku Kata, Ayo Membaca.

**🔢 Angka & Berhitung** — Kenal Angka (0–20), Ayo Berhitung (ketuk untuk menghitung),
Tambah & Kurang (level 3: × dan :), Banyak & Sedikit, Angka Hilang (pola bilangan),
Membaca Jam.

**✋ Motorik & Kreasi** — Ayo Menulis (menebalkan huruf/angka dengan jari, dinilai
otomatis), Menggambar (warna, kuas, stempel), Pecah Balon, Sentuh & Dengar (untuk balita),
Piano & Ingat Nada (melatih memori urutan).

**🧠 Logika & Pengetahuan** — Kenal Warna, Kenal Bentuk, Kenal Hewan (suara & teka-teki),
Tebak Bayangan, Kartu Memori, Lanjutkan Pola.

## Mendapatkan APK

**Cara termudah:** setiap push ke GitHub otomatis membangun APK lewat GitHub Actions.
Buka tab **Actions → Build APK → run terakhir → Artifacts → `PintarCeria-debug-apk`**,
unduh, ekstrak, lalu pasang `app-debug.apk` di HP Android (izinkan *Instal dari sumber
tidak dikenal*).

**Build sendiri** (perlu JDK 17 + Android SDK, atau Android Studio):

```bash
./gradlew assembleDebug
# hasil: app/build/outputs/apk/debug/app-debug.apk
```

Atau buka folder ini di **Android Studio** lalu tekan ▶ Run.

> Suara pemandu memakai mesin TTS di HP. Untuk hasil terbaik, pasang data suara
> **Bahasa Indonesia** di *Pengaturan → Bahasa → Output text-to-speech (Google)*.

## Mencoba di browser

Game ini HTML5 murni, jadi bisa langsung dicoba dengan membuka
`app/src/main/assets/www/index.html` di Chrome (mode tampilan HP disarankan).

## Struktur proyek

```
app/src/main/
├── assets/www/            # Game (HTML/CSS/JS, tanpa dependensi)
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── core.js        # suara, TTS, utilitas, kerangka ronde
│       ├── data.js        # huruf, kata, warna, bentuk, hewan
│       ├── games-*.js     # permainan per kategori
│       └── app.js         # menu, navigasi, hadiah, pengaturan
├── java/.../MainActivity.java   # WebView + jembatan Text-to-Speech
└── AndroidManifest.xml
```

Menambah permainan baru cukup dengan memanggil `registerGame({...})` di salah satu
file `games-*.js`.

## Rilis ke Play Store

Build `release` saat ini ditandatangani dengan kunci debug. Sebelum mengunggah ke
Play Store, buat keystore sendiri dan atur `signingConfig` di `app/build.gradle`,
lalu jalankan `./gradlew bundleRelease`.
