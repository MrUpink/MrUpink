# Aset Pihak Ketiga & Lisensi

Semua aset di bawah ini **boleh dipakai untuk aplikasi komersial / berbayar**.
Pemberitahuan lisensi juga ditampilkan di aplikasi: ⚙️ Pengaturan → 📜 Lisensi & Atribusi.

| Aset | Lokasi di APK | Pemilik | Lisensi | Syarat |
|---|---|---|---|---|
| Microsoft Fluent Emoji 3D (194 ikon + ikon aplikasi) | `www/img/emoji/`, `res/mipmap-*/ic_launcher_foreground.webp` | © Microsoft Corporation (dikemas oleh LobeHub, paket npm `@lobehub/fluent-emoji-3d`) | MIT | Sertakan teks lisensi MIT (sudah ada di layar Lisensi) |
| Font Fredoka (500/600/700) | `www/fonts/` | © The Fredoka Project Authors | SIL Open Font License 1.1 | Sertakan `OFL.txt` (sudah ada); font tidak boleh dijual terpisah |
| Efek suara | dibuat oleh kode (Web Audio) | — | — | Tidak ada berkas pihak ketiga |
| Suara pemandu | `www/audio/` (dibuat saat build) | lihat di bawah | lihat di bawah | lihat di bawah |

## Suara pemandu

Rekaman dibuat oleh `tools/voice/build_audio.py` saat build:

- **Untuk rilis berbayar: pakai Azure Speech (resmi).** Buat resource *Speech* di
  <https://portal.azure.com> (paket gratis **F0** cukup: 500.000 karakter/bulan, aplikasi ini
  ±6.000 karakter). Lalu di GitHub: *Settings → Secrets and variables → Actions* tambahkan
  `AZURE_SPEECH_KEY` dan `AZURE_SPEECH_REGION` (mis. `southeastasia`). Build berikutnya otomatis
  merekam ulang semua suara lewat Azure dengan suara yang sama (`id-ID-GadisNeural`).
  Hasil suara dari layanan Azure boleh dipakai di aplikasi komersial sesuai ketentuan Microsoft
  Azure (Microsoft Product Terms / Azure AI Speech).
- **Tanpa secret**, build memakai `edge-tts` (layanan *Read Aloud* Edge, gratis tapi **tidak resmi**)
  — hanya untuk uji coba / pengembangan, **jangan untuk rilis berbayar**.

Log build menampilkan `Mesin suara: azure` atau `Mesin suara: edge`.

## Teks lisensi

### MIT License (Microsoft Fluent Emoji, LobeHub fluent-emoji)

Copyright (c) Microsoft Corporation. Copyright (c) 2023 LobeHub.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
associated documentation files (the "Software"), to deal in the Software without restriction,
including without limitation the rights to use, copy, modify, merge, publish, distribute,
sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or
substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES
OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

### SIL Open Font License 1.1 (Fredoka)

Teks lengkap: [`app/src/main/assets/www/fonts/OFL.txt`](app/src/main/assets/www/fonts/OFL.txt).
