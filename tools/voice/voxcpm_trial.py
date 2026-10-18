#!/usr/bin/env python3
"""Uji coba suara VoxCPM2 (Apache-2.0, boleh komersial, jalan offline tanpa akun).

1. Membuat satu "suara guru" lewat voice design (deskripsi teks) dengan seed tetap.
2. Memakai suara itu sebagai referensi (voice cloning) untuk contoh kalimat aplikasi,
   agar semua klip terdengar dari orang yang sama.
Hasil: <out>/*.mp3 dan waktu pembuatan per klip (untuk memperkirakan lama build penuh).
"""
import os
import subprocess
import sys
import time

import soundfile as sf
import torch
from voxcpm import VoxCPM

OUT = sys.argv[1] if len(sys.argv) > 1 else "voxcpm-trial"
os.makedirs(OUT, exist_ok=True)

DESIGN = "(A warm, cheerful young Indonesian woman, speaking clear standard Indonesian slowly and friendly, like a kindergarten teacher)"
REF_TEXT = "Halo adik-adik! Ayo kita belajar membaca dan berhitung bersama hari ini."
SAMPLES = [
    "Halo! Ayo kita belajar bersama.",
    "Mana huruf kecil, bé?",
    "Cé.",
    "cah.",
    "Kucing.",
    "Ada berapa apel?",
    "Enam puluh lima.",
    "Hebat sekali! Kamu dapat tiga bintang.",
    "Selamat! Kamu lulus ujian!",
    "Kelinci makan wortel.",
]


def save(wav, sr, name):
    wav_path = os.path.join(OUT, name + ".wav")
    sf.write(wav_path, wav, sr)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", wav_path, "-ac", "1", "-b:a", "64k",
                    os.path.join(OUT, name + ".mp3")], check=True)
    return wav_path


t0 = time.time()
model = VoxCPM.from_pretrained("openbmb/VoxCPM2", load_denoiser=False, optimize=False, device="cpu")
sr = model.tts_model.sample_rate
print(f"Model dimuat dalam {time.time() - t0:.0f} dtk, sample rate {sr}", flush=True)

torch.manual_seed(7)
t = time.time()
ref = model.generate(text=DESIGN + REF_TEXT, cfg_value=2.0, inference_timesteps=10)
ref_path = save(ref, sr, "00-suara-referensi")
print(f"referensi: {time.time() - t:.0f} dtk", flush=True)

total = 0.0
for i, text in enumerate(SAMPLES, 1):
    torch.manual_seed(7)
    t = time.time()
    wav = model.generate(text=text, prompt_wav_path=ref_path, prompt_text=REF_TEXT,
                         reference_wav_path=ref_path, cfg_value=2.0, inference_timesteps=10)
    dt = time.time() - t
    total += dt
    save(wav, sr, f"{i:02d}-" + "".join(c if c.isalnum() else "_" for c in text)[:40])
    print(f"{dt:5.1f} dtk  {len(wav) / sr:4.1f} dtk audio  {text}", flush=True)

avg = total / len(SAMPLES)
print(f"Rata-rata {avg:.1f} dtk/klip → perkiraan 634 klip: {avg * 634 / 60:.0f} menit")
