# Aset Pihak Ketiga & Lisensi

Semua aset di bawah ini **boleh dipakai untuk aplikasi komersial / berbayar**.
Pemberitahuan lisensi juga ditampilkan di aplikasi: ⚙️ Pengaturan → 📜 Lisensi & Atribusi.

| Aset | Lokasi di APK | Pemilik | Lisensi | Syarat |
|---|---|---|---|---|
| Microsoft Fluent Emoji 3D (194 ikon + ikon aplikasi) | `www/img/emoji/`, `res/mipmap-*/ic_launcher_foreground.webp` | © Microsoft Corporation (dikemas oleh LobeHub, paket npm `@lobehub/fluent-emoji-3d`) | MIT | Sertakan teks lisensi MIT (sudah ada di layar Lisensi) |
| Font Fredoka (500/600/700) | `www/fonts/` | © The Fredoka Project Authors | SIL Open Font License 1.1 | Sertakan `OFL.txt` (sudah ada); font tidak boleh dijual terpisah |
| Efek suara | dibuat oleh kode (Web Audio) | — | — | Tidak ada berkas pihak ketiga |
| Musik latar "Ceria" (`audio/music/ceria.ogg`) | komposisi asli, disintesis oleh `tools/music/compose.py` | — | Milik pengembang | Tanpa sampel/melodi pihak ketiga |
| Suara pemandu (rekaman) | `www/audio/` | dibuat dengan model VoxCPM2 © OpenBMB | Apache-2.0 | Sertakan pemberitahuan lisensi (ada di layar Lisensi) |

## Suara pemandu

Semua kalimat pemandu direkam dengan **VoxCPM2** (OpenBMB) — kode & bobot model berlisensi
**Apache-2.0**, boleh dipakai komersial, tanpa akun atau biaya. Suara "Suara A" dibuat dengan fitur
*voice design* VoxCPM2 (bukan tiruan suara orang sungguhan), lalu dipakai sebagai referensi untuk
semua kalimat. Rekaman disimpan di APK (`www/audio/`), sehingga aplikasi tetap jalan offline.

- Perekaman: workflow GitHub **Rekam Suara (VoxCPM2 - Suara A)** → `tools/voice/voxcpm_record.py`
- Referensi suara: `tools/voice/voice-ref-a.wav`
- Hanya kalimat baru yang direkam ulang ketika `tools/voice/phrases.js` berubah.

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
