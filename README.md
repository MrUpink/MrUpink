# 🦉 Pintar Ceria — Game Edukasi Anak (Android)

Game mobile Android interaktif untuk anak umur **1–10 tahun**: belajar huruf, membaca,
angka, berhitung, serta melatih motorik dan kecerdasan. Seluruh permainan berbahasa
Indonesia, dilengkapi **suara pemandu** (Text-to-Speech), efek suara, bintang hadiah,
dan berjalan **100% offline** tanpa iklan.

## Fitur

Alur aplikasi seperti **Duolingo**: **pilih umur (1–10 tahun) → Beranda → pilih kategori → jalur belajar**.

- **Jalur belajar per kategori**, dibagi menjadi **Unit** (Mudah → Sedang → Menantang → Sulit → Juara).
  Pelajaran dibuka satu per satu; setiap pelajaran memberi 1–3 bintang.
- **Ujian di akhir setiap unit**: soal campuran dari pelajaran di unit itu, dengan **3 nyawa ❤️**.
  Lulus ujian membuka unit berikutnya.
- **Misi harian** (3 misi berganti setiap hari, mis. "Selesaikan 3 pelajaran", "Jawab 4 soal benar
  berturut-turut") dengan **peti hadiah 🎁** bila semua selesai.
- **Streak 🔥**: jumlah hari belajar berturut-turut.
- **Pojok Jelajah**: permainan bebas (kenal huruf/angka, menggambar, piano, dll.).
- Tingkat kesulitan (skala 1–10) = umur anak + unit. Hanya permainan yang cocok untuk umur anak
  yang ditampilkan.
- **Suara natural offline**: kalimat pemandu direkam dengan suara neural Bahasa Indonesia saat APK
  dibangun dan disimpan di dalam APK — tidak butuh internet saat dipakai. Bila ada kalimat yang
  belum terekam, otomatis memakai suara HP.

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

## Suara natural (offline)

Rekaman suara dibuat otomatis di GitHub Actions saat build:

1. `tools/voice/phrases.js` mendaftar semua potongan kalimat yang diucapkan aplikasi
   (huruf, suku kata, kata, angka, soal, pujian, dll.).
2. `tools/voice/build_audio.py` merekamnya dengan suara neural `id-ID-GadisNeural`
   (lewat paket `edge-tts`) ke `app/src/main/assets/www/audio/` beserta `manifest.js`.
3. Aplikasi memutar klip tersebut; angka disusun dari klip angka. Kalimat tanpa rekaman
   diucapkan oleh mesin TTS HP sebagai cadangan.

Setelah menambah atau mengubah kalimat di permainan, jalankan
`AGES=1,5,10 node tools/voice/coverage.js` (butuh Playwright) untuk memastikan semua kalimat
sudah terdaftar di `phrases.js`.

> Catatan: `edge-tts` memakai layanan *Read Aloud* Microsoft Edge yang gratis tetapi tidak resmi.
> Untuk publikasi di Play Store, pertimbangkan mesin suara dengan lisensi jelas
> (mis. Piper) — cukup ganti `build_audio.py`, format `manifest.js` tetap sama.

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
