#!/usr/bin/env python3
"""Membandingkan mode perekaman VoxCPM2 secara otomatis (tanpa perlu didengar):
  - lama : voice cloning + continuation (prompt_wav + prompt_text)
  - baru : voice cloning murni (reference_wav saja)
Setiap rekaman dinilai Whisper: kecocokan kata, bahasa (Indonesia vs Melayu/Inggris), dan bunyi
tambahan di awal (mis. "dan"). Hasil MP3 mode baru diunggah untuk didengar.
  python voxcpm_compare.py <phrases.json> <out_dir> [jumlah]
"""
import json
import os
import random
import subprocess
import sys
import time

import soundfile as sf
import torch
from faster_whisper import WhisperModel
from voxcpm import VoxCPM

sys.path.insert(0, os.path.dirname(__file__))
from voxcpm_record import REF_TEXT, REF_WAV, SEED, TEMPO, asr_check, letters_only, synth_text  # noqa: E402

phrases_path, out_dir = sys.argv[1], sys.argv[2]
n = int(sys.argv[3]) if len(sys.argv) > 3 else 40
items = [it for it in json.load(open(phrases_path, encoding="utf-8")) if len(letters_only(synth_text(it))) >= 4]
random.seed(1)
sample = random.sample(items, n)
os.makedirs(out_dir, exist_ok=True)
model = VoxCPM.from_pretrained("openbmb/VoxCPM2", load_denoiser=False, optimize=False, device="cpu")
asr = WhisperModel("small", device="cpu", compute_type="int8")
sr = model.tts_model.sample_rate
filt = (f"atempo={TEMPO},silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
        "silenceremove=start_periods=1:start_threshold=-45dB,areverse")
stats = {m: {"lolos": 0, "awalan": 0, "bahasa": 0, "skor": 0.0} for m in ("lama", "baru")}
for i, it in enumerate(sample, 1):
    text = synth_text(it)
    for mode in ("lama", "baru"):
        torch.manual_seed(SEED)
        kw = dict(prompt_wav_path=REF_WAV, prompt_text=REF_TEXT) if mode == "lama" else {}
        wav = model.generate(text=text, reference_wav_path=REF_WAV, cfg_value=2.0, inference_timesteps=10,
                             max_len=40 + 4 * len(text), **kw)
        raw = os.path.join(out_dir, "tmp.wav")
        mp3 = os.path.join(out_dir, f"{mode}-{i:02d}-" + "".join(c if c.isalnum() else "_" for c in text)[:30] + ".mp3")
        sf.write(raw, wav, sr)
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", raw, "-af", filt, "-ac", "1", "-b:a", "48k", mp3],
                       check=True)
        ok, score, note = asr_check(asr, mp3, text)
        st = stats[mode]
        st["lolos"] += ok
        st["awalan"] += "awalan" in note
        st["bahasa"] += "bahasa" in note
        st["skor"] += score
        print(f"[{i:02d}] {mode:4s} {'OK ' if ok else 'X  '} skor {score:.2f} {note:28s} {text}", flush=True)
        if mode == "lama":
            os.remove(mp3)
os.remove(os.path.join(out_dir, "tmp.wav"))
print("\nRINGKASAN (dari", n, "kalimat)")
for mode, st in stats.items():
    print(f"  {mode}: lolos {st['lolos']}/{n}, ada awalan {st['awalan']}, bahasa bukan Indonesia {st['bahasa']}, "
          f"rata-rata skor {st['skor'] / n:.2f}")
