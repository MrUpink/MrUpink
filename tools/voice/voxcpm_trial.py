#!/usr/bin/env python3
"""Uji coba suara VoxCPM2 (Apache-2.0, boleh komersial, jalan offline tanpa akun).

Untuk setiap kandidat suara (A, B, C):
1. Membuat "suara guru" lewat voice design (deskripsi teks) dengan seed tetap, memakai kalimat
   referensi yang ekspresif agar gaya ceria & intonasi naik-turun ikut ditiru.
2. Memakai suara itu sebagai referensi (voice cloning + continuation) untuk contoh kalimat aplikasi.
3. Memperlambat tempo (atempo) tanpa mengubah tinggi nada.
Hasil: <out>/<kandidat>-*.mp3 dan waktu pembuatan per klip.
"""
import os
import subprocess
import sys
import time

import soundfile as sf
import torch
from voxcpm import VoxCPM

OUT = sys.argv[1] if len(sys.argv) > 1 else "voxcpm-trial"
TEMPO = 0.88  # < 1 = lebih lambat
os.makedirs(OUT, exist_ok=True)

CANDIDATES = {
    "A": ("(A very cheerful, bright young Indonesian woman with a big smile in her voice, lively and "
          "expressive intonation that rises and falls, speaking slowly and clearly to small children, "
          "like a fun kindergarten teacher telling a story)", 11),
    "B": ("(An energetic, playful and warm young Indonesian female voice, enthusiastic and full of joy, "
          "very expressive melodic intonation, slow clear pace, like a children's TV show host)", 23),
    "C": ("(A gentle, sweet and cheerful Indonesian woman, soft but lively, warm expressive storytelling "
          "voice with natural pauses, speaking slowly and patiently to young kids)", 37),
}
REF_TEXT = "Halo, adik-adik! Wah, hari ini kita akan belajar sambil bermain. Seru sekali, ya! Ayo, kita mulai!"
SAMPLES = [
    "Halo! Ayo kita belajar bersama.",
    "Mana huruf kecil, bé?",
    "Kucing.",
    "Ada berapa apel?",
    "Hebat sekali! Kamu dapat tiga bintang.",
    "Selamat! Kamu lulus ujian!",
]


def save(wav, sr, name, tempo=TEMPO):
    wav_path = os.path.join(OUT, name + ".wav")
    sf.write(wav_path, wav, sr)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", wav_path, "-filter:a", f"atempo={tempo}",
                    "-ac", "1", "-b:a", "64k", os.path.join(OUT, name + ".mp3")], check=True)
    return wav_path


t0 = time.time()
model = VoxCPM.from_pretrained("openbmb/VoxCPM2", load_denoiser=False, optimize=False, device="cpu")
sr = model.tts_model.sample_rate
print(f"Model dimuat dalam {time.time() - t0:.0f} dtk, sample rate {sr}", flush=True)

total, count = 0.0, 0
for cand, (design, seed) in CANDIDATES.items():
    torch.manual_seed(seed)
    ref = model.generate(text=design + REF_TEXT, cfg_value=2.5, inference_timesteps=12)
    # Referensi disimpan tanpa diperlambat (dipakai untuk cloning), versi lambatnya untuk didengar
    ref_path = os.path.join(OUT, f"{cand}-ref.wav")
    sf.write(ref_path, ref, sr)
    save(ref, sr, f"{cand}-00-referensi")
    for i, text in enumerate(SAMPLES, 1):
        torch.manual_seed(seed)
        t = time.time()
        wav = model.generate(text=text, prompt_wav_path=ref_path, prompt_text=REF_TEXT,
                             reference_wav_path=ref_path, cfg_value=2.5, inference_timesteps=12)
        dt = time.time() - t
        total += dt
        count += 1
        save(wav, sr, f"{cand}-{i:02d}-" + "".join(c if c.isalnum() else "_" for c in text)[:36])
        print(f"[{cand}] {dt:5.1f} dtk  {len(wav) / sr:4.1f} dtk audio  {text}", flush=True)

avg = total / count
print(f"Rata-rata {avg:.1f} dtk/klip → perkiraan 634 klip: {avg * 634 / 60:.0f} menit")
