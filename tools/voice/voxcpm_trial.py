#!/usr/bin/env python3
"""Uji coba suara VoxCPM2 (Apache-2.0) — "Suara A" (suara wanita dari uji coba pertama).

Referensi: 00-suara-referensi.mp3 dari uji coba pertama (voice design, seed 7). Setiap contoh kalimat
dibuat dengan pengaturan yang sama seperti uji coba pertama, lalu disimpan dalam beberapa kecepatan
agar bisa dipilih yang paling enak didengar anak.
  python voxcpm_trial.py <out_dir> <ref.mp3>
"""
import os
import subprocess
import sys

import soundfile as sf
import torch
from voxcpm import VoxCPM

OUT, REF_MP3 = sys.argv[1], sys.argv[2]
REF_TEXT = "Halo adik-adik! Ayo kita belajar membaca dan berhitung bersama hari ini."
SPEEDS = {"A-asli": 1.0, "B-90persen": 0.9, "C-85persen": 0.85}
SAMPLES = [
    "Halo! Ayo kita belajar bersama.",
    "Mana huruf kecil, bé?",
    "Kucing.",
    "Ada berapa apel?",
    "Hebat sekali! Kamu dapat tiga bintang.",
    "Selamat! Kamu lulus ujian!",
]
os.makedirs(OUT, exist_ok=True)
ref_wav = os.path.join(OUT, "ref.wav")
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", REF_MP3, "-ac", "1", ref_wav], check=True)

model = VoxCPM.from_pretrained("openbmb/VoxCPM2", load_denoiser=False, optimize=False, device="cpu")
sr = model.tts_model.sample_rate
for i, text in enumerate(SAMPLES, 1):
    torch.manual_seed(7)
    wav = model.generate(text=text, prompt_wav_path=ref_wav, prompt_text=REF_TEXT,
                         reference_wav_path=ref_wav, cfg_value=2.0, inference_timesteps=10)
    raw = os.path.join(OUT, "tmp.wav")
    sf.write(raw, wav, sr)
    slug = "".join(c if c.isalnum() else "_" for c in text)[:32]
    for label, speed in SPEEDS.items():
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", raw, "-filter:a", f"atempo={speed}",
                        "-ac", "1", "-b:a", "64k", os.path.join(OUT, f"{label}-{i:02d}-{slug}.mp3")], check=True)
    print(f"[{i}/{len(SAMPLES)}] {text}", flush=True)
os.remove(raw)
