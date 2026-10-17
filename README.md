# 🦉 Pintar Ceria — Game Edukasi Anak (Android)

Game mobile Android interaktif untuk anak umur **1–10 tahun**: belajar huruf, membaca,
angka, berhitung, serta melatih motorik dan kecerdasan. Seluruh permainan berbahasa
Indonesia, dilengkapi **suara pemandu** (Text-to-Speech), efek suara, bintang hadiah,
dan berjalan **100% offline** tanpa iklan.

## Fitur

Alur aplikasi: **pilih umur (1–10 tahun) → pilih kategori belajar → pilih permainan → pilih level**.

- Hanya permainan yang cocok untuk umur anak yang ditampilkan.
- Tingkat kesulitan (skala 1–10) = umur anak + level yang dipilih. Setiap permainan
  menyesuaikan isi soal: jumlah pilihan, rentang angka, panjang kata, kalimat,
  ketelitian jam, kecepatan balon, dan lain-lain.
- Setiap permainan punya beberapa level yang terbuka bertahap; tiap level diberi
  1–3 bintang sesuai jawaban benar pada percobaan pertama.
- Suara pemandu memilih suara Bahasa Indonesia berkualitas tertinggi di HP; orang tua
  dapat mengganti suara & kecepatan bicara di ⚙️ Pengaturan. Ejaan pelafalan huruf dan
  suku kata diatur di `LETTER_SAY` / `saySyllable` pada `js/core.js`.

**📚 Huruf & Membaca** — Kenal Huruf (A–Z + gambar), Belajar Suku Kata (BA BI BU BE BO),
Cari Huruf, Huruf Awal, Susun Huruf, Susun Suku Kata, Ayo Membaca (kata & kalimat), Menulis Huruf.

**🔢 Angka & Berhitung** — Kenal Angka, Ayo Menghitung (ketuk untuk menghitung),
Matematika (+ − × :), Banyak & Sedikit, Angka Hilang (pola bilangan), Membaca Jam,
Menulis Angka.

**🎨 Motorik & Kreasi** — Menggambar (warna, kuas, stempel), Pecah Balon (semua balon →
warna → huruf → angka → hitungan), Sentuh & Dengar (untuk balita), Piano Hewan.

**🧠 Logika & Pengetahuan** — Kenal Warna, Kenal Bentuk, Kenal Hewan (suara & teka-teki),
Tebak Bayangan, Kartu Memori, Lanjutkan Pola, Ingat Nada (melatih memori urutan).

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
