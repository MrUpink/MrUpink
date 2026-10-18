#!/usr/bin/env python3
"""Memeriksa rekaman suara dengan pengenal suara (faster-whisper, MIT) — mendeteksi klip yang
terpotong atau salah ucap dengan membandingkan transkrip dengan teks seharusnya.

  python check_clips.py <phrases.json> <audio_dir> <laporan.json>
"""
import difflib
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from voxcpm_record import letters_only, read_manifest, synth_text  # noqa: E402
from faster_whisper import WhisperModel  # noqa: E402

phrases_path, audio_dir, out_path = sys.argv[1:4]
items = json.load(open(phrases_path, encoding="utf-8"))
clips, _ = read_manifest(os.path.join(audio_dir, "manifest.js"))
model = WhisperModel("small", device="cpu", compute_type="int8")


report = []
for it in items:
    f = clips.get(it["key"])
    if not f:
        continue
    expected = synth_text(it)
    segs, _ = model.transcribe(os.path.join(audio_dir, f), language="id", beam_size=5,
                               initial_prompt="Pelajaran anak: huruf, angka, hewan, warna.")
    heard = " ".join(s.text.strip() for s in segs)
    a, b = letters_only(expected), letters_only(heard)
    ratio = difflib.SequenceMatcher(None, a, b).ratio() if a else 1.0
    report.append({"key": it["key"], "expected": expected, "heard": heard, "score": round(ratio, 2), "letters": len(a)})

report.sort(key=lambda r: r["score"])
json.dump(report, open(out_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
long = [r for r in report if r["letters"] >= 8]
bad = [r for r in long if r["score"] < 0.75]
print(f"Diperiksa {len(report)} klip ({len(long)} kalimat ≥8 huruf). Skor < 0.75: {len(bad)}")
for r in bad:
    print(f"  {r['score']:.2f}  harusnya: {r['expected']!r}  terdengar: {r['heard']!r}")
