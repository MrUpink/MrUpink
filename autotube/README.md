# AutoTube: Pembuat Video YouTube Otomatis

Aplikasi Android + server online yang **otomatis penuh** membuat dan mengupload video **orisinal**
ke channel YouTube Anda sendiri:

1. **Riset tren**: membaca video yang sedang naik cepat di niche Anda dan trending di negara Anda
   (YouTube Data API resmi, hanya metadata: judul, views/jam, tag).
2. **Naskah orisinal**: Claude membuat topik, sudut pandang baru, judul, deskripsi, tag, dan naskah per scene.
   Tren hanya dipakai sebagai sinyal topik, bukan untuk disalin.
3. **Suara narasi**: suara neural (edge-tts), pilihan suara pria/wanita Indonesia, Malaysia, atau Inggris.
4. **Footage**: stok video bebas lisensi dari Pexels (boleh dipakai komersial), dipilih per scene.
5. **Render**: ffmpeg merakit video 9:16 (Shorts) atau 16:9 dengan subtitle besar gaya Shorts.
6. **Upload** ke channel Anda lewat YouTube API (OAuth), lengkap dengan label konten AI.
7. **Autopilot**: berjalan sendiri tiap N jam, dengan batas jumlah video per hari.

Video yang dihasilkan adalah karya baru (naskah, suara, dan susunan sendiri, footage berlisensi),
**bukan** unduhan atau salinan video orang lain.

```
HP (APK AutoTube) ──► Server AutoTube (Docker) ──► Claude · YouTube Data API · Pexels · edge-tts
                                   └──► upload ke channel YouTube Anda
```

## 1. Siapkan kunci API

| Variabel | Dari mana | Biaya |
|---|---|---|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) → API Keys | ± Rp300–800 per naskah |
| `YOUTUBE_API_KEY` | Google Cloud Console → aktifkan **YouTube Data API v3** → Credentials → API key | gratis (kuota harian) |
| `YT_CLIENT_ID`, `YT_CLIENT_SECRET` | Credentials → **OAuth client ID** → tipe *Web application*. Redirect URI: `https://ALAMAT-SERVER/oauth/callback` | gratis |
| `PEXELS_API_KEY` | [pexels.com/api](https://www.pexels.com/api/) | gratis |
| `APP_TOKEN` | buat sendiri (kata sandi panjang untuk membuka aplikasi) | – |
| `PUBLIC_URL` | alamat https server Anda, mis. `https://autotube.domainanda.com` | – |

Di **OAuth consent screen**, tambahkan email Google Anda sebagai *Test user* (cukup untuk pemakaian pribadi).

> Catatan kuota: upload lewat API memakai ±1.600 unit dari kuota default 10.000 unit/hari, jadi
> maksimal sekitar 6 upload per hari. Batas default autopilot 3 video/hari.

## 2. Jalankan server online

Butuh VPS kecil (1–2 vCPU, RAM 2 GB) atau layanan yang mendukung Docker dengan **disk permanen**
(Railway, Render, Fly.io, dsb.).

```bash
git clone <repo ini> && cd MrUpink/autotube/server
cp .env.example .env      # isi semua kunci
docker compose up -d --build
```

Pasang HTTPS (mis. Caddy: `autotube.domainanda.com { reverse_proxy localhost:8080 }`).
Data (video, pengaturan, token YouTube) tersimpan di `autotube/server/data/`.

Tanpa Docker:

```bash
sudo apt install ffmpeg fonts-dejavu-core
pip install -r requirements.txt
set -a; source .env; set +a
uvicorn app.main:app --host 0.0.0.0 --port 8080 --proxy-headers --forwarded-allow-ips="*"
```

## 3. Pasang APK di HP

APK dibangun otomatis oleh GitHub Actions (workflow **Build AutoTube APK**). Buka tab
**Actions** → run terbaru → unduh artifact **AutoTube-apk**, lalu pasang di HP
(izinkan "instal dari sumber tidak dikenal").

Saat pertama dibuka:
1. Isi alamat server (tekan lama layar untuk menggantinya nanti).
2. Masukkan `APP_TOKEN`.
3. Tab **Pengaturan** → **Hubungkan YouTube** → login Google di browser.
4. Atur niche, format, suara, jadwal → **Simpan**.
5. Tab **Beranda** → nyalakan **Autopilot**, atau tekan **Buat video sekarang**.

## Tips agar channel aman & bisa dimonetisasi

- YouTube menolak monetisasi untuk konten yang **dibuat massal/berulang tanpa nilai tambah**.
  Gunakan niche yang jelas, jangan menaikkan batas harian terlalu tinggi, dan sesekali tonton hasilnya.
- Untuk awal, set **Upload otomatis = Tidak** atau **Privasi = Pribadi** agar Anda bisa mengecek beberapa video pertama.
- Biarkan **Label konten AI** menyala (narasi memakai suara sintetis).
- Footage Pexels bebas dipakai, tetapi jangan menambahkan musik atau klip dari sumber lain yang tidak berlisensi.

## Struktur

```
autotube/
├── server/                FastAPI + pipeline
│   ├── app/trends.py      riset tren (YouTube Data API)
│   ├── app/writer.py      naskah orisinal (Claude)
│   ├── app/media.py       suara, stok video, render ffmpeg
│   ├── app/uploader.py    OAuth + upload YouTube
│   ├── app/pipeline.py    alur job + autopilot
│   ├── app/main.py        API
│   └── app/static/        tampilan aplikasi
└── android/               APK (WebView ke server)
```
