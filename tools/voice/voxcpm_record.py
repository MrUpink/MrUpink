#!/usr/bin/env python3
"""Merekam suara pemandu aplikasi dengan VoxCPM2 (Apache-2.0) memakai "Suara A".

Suara A = suara wanita dari uji coba pertama (voice design, seed 7), referensinya disimpan di
tools/voice/voice-ref-a.wav. Setiap kalimat dibuat dengan voice cloning + continuation dari referensi itu
(uji perbandingan: logat Indonesia jauh lebih terjaga dibanding kloning murni; tanda baca dipertahankan
agar jeda & intonasi alami). Bunyi sisa di awal (mis. "dan"/"dat") dibuang: potongan pendek sebelum jeda
di awal rekaman, dan kata tambahan sebelum kata pertama menurut stempel waktu Whisper. Lalu
diperlambat ke 85% dan jeda hening di awal/akhir dipotong. Hasilnya didengar ulang
oleh pengenal suara (faster-whisper); bila transkripnya tidak cocok dengan teks, kalimat direkam
ulang dengan seed lain (maks. 6 kali) dan rekaman terbaik yang dipakai.

Pemakaian:
  python voxcpm_record.py plan  <phrases.json> <manifest.js> <out.json> <shards>
      → daftar kalimat yang belum direkam (plus kunci di tools/voice/redo.json, untuk rekam ulang),
        dibagi menjadi <shards> kelompok
  python voxcpm_record.py record <plan.json> <shard> <out_dir>
      → merekam satu kelompok ke <out_dir>/*.mp3 + <out_dir>/clips-<shard>.json
  python voxcpm_record.py merge <audio_dir> <clips_dir>
      → menggabungkan clips-*.json ke <audio_dir>/manifest.js
"""
import glob
import hashlib
import json
import os
import re
import subprocess
import sys
import time

VOICE_ID = "voxcpm2-a3"
REF_WAV = os.path.join(os.path.dirname(__file__), "voice-ref-a.wav")
REF_TEXT = "Halo adik-adik! Ayo kita belajar membaca dan berhitung bersama hari ini."
SEED = 7
TEMPO = 0.85
TRIES = 8            # percobaan maksimal per kalimat
GOOD_SCORE = 0.85    # kemiripan transkrip (Whisper) dengan teks agar rekaman diterima
MIN_ASR_LETTERS = 4  # huruf/suku kata tunggal tidak diperiksa (pengenal suara tidak andal untuk itu)
REDO = os.path.join(os.path.dirname(__file__), "redo.json")

SATUAN = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"]


def terbilang(n: int) -> str:
    """Angka → kata Bahasa Indonesia (0–999.999)."""
    if n < 12:
        return SATUAN[n]
    if n < 20:
        return terbilang(n - 10) + " belas"
    if n < 100:
        return (terbilang(n // 10) + " puluh" + (" " + terbilang(n % 10) if n % 10 else "")).strip()
    if n < 200:
        return "seratus" + (" " + terbilang(n - 100) if n > 100 else "")
    if n < 1000:
        return terbilang(n // 100) + " ratus" + (" " + terbilang(n % 100) if n % 100 else "")
    if n < 2000:
        return "seribu" + (" " + terbilang(n - 1000) if n > 1000 else "")
    return terbilang(n // 1000) + " ribu" + (" " + terbilang(n % 1000) if n % 1000 else "")


def synth_text(item) -> str:
    """Teks yang diucapkan model: angka ditulis sebagai kata, huruf tunggal memakai nama hurufnya."""
    text, key = item["text"], item["key"]
    if re.fullmatch(r"[A-Z]\.", text):  # nama huruf: kunci sudah berupa ejaan Indonesia (mis. "cé")
        return key + "."
    return re.sub(r"\d+", lambda m: terbilang(int(m.group())), text)


def letters_only(s: str) -> str:
    s = re.sub(r"\d+", lambda m: terbilang(int(m.group())), s.lower())
    return re.sub(r"[^a-z]", "", s.replace("é", "e").replace("è", "e"))


def asr_check(asr, path, expected):
    """Periksa rekaman dengan Whisper.

    Mengembalikan (lolos, skor, keterangan):
      - skor   : kemiripan transkrip (dipaksa Bahasa Indonesia) dengan teks seharusnya (0–1)
      - bahasa : bahasa yang terdeteksi tanpa dipaksa harus 'id' (bukan Melayu/Inggris) untuk kalimat ≥8 huruf
      - awalan : tidak boleh ada bunyi tambahan di awal (mis. "dan", "dat") sebelum kata pertama
    """
    import difflib

    a = letters_only(expected)
    segs, _ = asr.transcribe(path, language="id", beam_size=5, word_timestamps=True)
    words = [w for seg in segs for w in (seg.words or [])]
    heard = letters_only(" ".join(w.word for w in words))
    score = difflib.SequenceMatcher(None, a, heard).ratio() if a else 1.0
    notes = []
    # Kata tambahan sebelum kata pertama → titik potong (detik) agar bisa dibuang
    cut = None
    first = letters_only(expected.split()[0])[:3] if expected.split() else ""
    for idx, w in enumerate(words[:4]):
        if first and letters_only(w.word).startswith(first):
            if idx > 0:
                cut = max(0.0, w.start - 0.06)
            break
    head = a[:4]
    pos = heard.find(head) if head else 0
    if pos >= 2:
        notes.append(f"awalan '{heard[:pos]}'")
    if len(a) >= 8:
        _, info = asr.transcribe(path, beam_size=1)  # deteksi bahasa bebas
        lang = info.language
        probs = dict(info.all_language_probs or [])
        if lang != "id" and probs.get("id", 0) < 0.3:
            notes.append(f"bahasa {lang} {probs.get(lang, 0):.2f}")
    ok = score >= GOOD_SCORE and not notes
    return ok, score, ", ".join(notes), cut


def trim_lead_blip(wav, sr):
    """Buang bunyi pendek (< 0,15 dtk) di awal yang diikuti jeda — sisa referensi seperti "dan"/"dat"."""
    import numpy as np

    hop = int(sr * 0.01)
    n = len(wav) // hop
    if n < 10:
        return wav
    rms = np.sqrt(np.mean(wav[: n * hop].reshape(n, hop) ** 2, axis=1))
    voiced = rms > max(rms.max() * 0.06, 1e-4)
    idx = np.flatnonzero(voiced)
    if not len(idx):
        return wav
    start = idx[0]
    end = start
    while end < n and voiced[end]:
        end += 1
    gap = end
    while gap < n and not voiced[gap]:
        gap += 1
    rest = voiced[gap:].sum()
    if (end - start) < 15 and (gap - end) >= 10 and rest >= 20:
        return wav[max(0, gap - 3) * hop:]
    return wav


def clip_name(key: str) -> str:
    return hashlib.sha1(f"{VOICE_ID}|{key}".encode("utf-8")).hexdigest()[:16] + ".mp3"


def read_manifest(path):
    if not os.path.exists(path):
        return {}, None
    src = open(path, encoding="utf-8").read()
    m = re.search(r"window\.AUDIO_CLIPS\s*=\s*(\{.*?\});", src, re.S)
    v = re.search(r'window\.AUDIO_SOURCE\s*=\s*"([^"]*)"', src)
    return (json.loads(m.group(1)) if m else {}), (v.group(1) if v else None)


def cmd_plan(phrases_path, manifest_path, out_path, shards):
    items = json.load(open(phrases_path, encoding="utf-8"))
    have, source = read_manifest(manifest_path)
    audio_dir = os.path.dirname(manifest_path)
    if source != VOICE_ID:
        have = {}
    redo = set(json.load(open(REDO, encoding="utf-8"))) if os.path.exists(REDO) else set()
    todo = [it for it in items
            if it["key"] in redo or have.get(it["key"]) != clip_name(it["key"])
            or not os.path.exists(os.path.join(audio_dir, clip_name(it["key"])))]
    n = max(1, min(int(shards), len(todo))) if todo else 0
    groups = [todo[i::n] for i in range(n)] if n else []
    json.dump({"groups": groups}, open(out_path, "w", encoding="utf-8"), ensure_ascii=False)
    print(json.dumps({"count": len(todo), "shards": list(range(n))}))


def cmd_record(plan_path, shard, out_dir):
    import soundfile as sf
    import torch
    from faster_whisper import WhisperModel
    from voxcpm import VoxCPM

    group = json.load(open(plan_path, encoding="utf-8"))["groups"][int(shard)]
    os.makedirs(out_dir, exist_ok=True)
    t0 = time.time()
    model = VoxCPM.from_pretrained("openbmb/VoxCPM2", load_denoiser=False, optimize=False, device="cpu")
    asr = WhisperModel("small", device="cpu", compute_type="int8")
    sr = model.tts_model.sample_rate
    print(f"Model siap ({time.time() - t0:.0f} dtk). Merekam {len(group)} kalimat.", flush=True)
    filt = (f"atempo={TEMPO},"
            "silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
            "silenceremove=start_periods=1:start_threshold=-45dB,areverse")
    done = {}
    for i, it in enumerate(group, 1):
        text = synth_text(it)
        name = clip_name(it["key"])
        check = len(letters_only(text)) >= MIN_ASR_LETTERS
        t = time.time()
        best = None  # (lolos, skor, path, keterangan)
        try:
            # Rekam, dengarkan ulang dengan Whisper, ulangi dengan seed lain bila tidak lolos.
            for k in range(TRIES if check else 1):
                torch.manual_seed(SEED + k)
                wav = model.generate(text=text, reference_wav_path=REF_WAV, prompt_wav_path=REF_WAV,
                                     prompt_text=REF_TEXT, cfg_value=2.0, inference_timesteps=10,
                                     max_len=40 + 4 * len(text))  # batas aman agar tidak "kebablasan"
                wav = trim_lead_blip(wav, sr)
                raw = os.path.join(out_dir, f"{name}.{k}.wav")
                mp3 = os.path.join(out_dir, f"{name}.{k}.mp3")
                sf.write(raw, wav, sr)
                subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", raw, "-af", filt, "-ar", "24000",
                                "-ac", "1", "-b:a", "48k", mp3], check=True)
                os.remove(raw)
                ok, score, note, cut = asr_check(asr, mp3, text) if check else (True, 1.0, "", None)
                if cut:  # buang kata tambahan di awal, lalu periksa lagi
                    cutmp3 = mp3[:-4] + ".cut.mp3"
                    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", f"{cut:.2f}", "-i", mp3,
                                    "-b:a", "48k", cutmp3], check=True)
                    os.replace(cutmp3, mp3)
                    ok, score, note, _ = asr_check(asr, mp3, text)
                if best is None or (ok, score) > (best[0], best[1]):
                    if best:
                        os.remove(best[2])
                    best = (ok, score, mp3, note)
                else:
                    os.remove(mp3)
                if ok:
                    break
            os.replace(best[2], os.path.join(out_dir, name))
            done[it["key"]] = name
            flag = "" if best[0] else f"  ⚠ terbaik belum lolos ({best[3]})"
            print(f"[{i}/{len(group)}] {time.time() - t:5.0f} dtk  skor {best[1]:.2f}  {text}{flag}", flush=True)
        except Exception as e:  # noqa: BLE001 - satu kalimat gagal tidak menghentikan yang lain
            print(f"[{i}/{len(group)}] GAGAL {text!r}: {e}", flush=True)
    json.dump(done, open(os.path.join(out_dir, f"clips-{shard}.json"), "w", encoding="utf-8"), ensure_ascii=False)


def cmd_merge(audio_dir, clips_dir):
    manifest_path = os.path.join(audio_dir, "manifest.js")
    have, source = read_manifest(manifest_path)
    if source != VOICE_ID:
        have = {}
    for f in glob.glob(os.path.join(clips_dir, "**", "clips-*.json"), recursive=True):
        have.update(json.load(open(f, encoding="utf-8")))
    have = {k: v for k, v in have.items() if os.path.exists(os.path.join(audio_dir, v))}
    used = set(have.values())
    for f in os.listdir(audio_dir):  # hapus rekaman lama yang tidak dipakai
        if f.endswith(".mp3") and f not in used:
            os.remove(os.path.join(audio_dir, f))
    with open(manifest_path, "w", encoding="utf-8") as f:
        f.write("/* Dibuat otomatis oleh tools/voice/voxcpm_record.py — suara VoxCPM2 \"Suara A\" (Apache-2.0) */\n")
        f.write(f"window.AUDIO_SOURCE = {json.dumps(VOICE_ID)};\n")
        f.write("window.AUDIO_CLIPS = " + json.dumps(have, ensure_ascii=False, sort_keys=True) + ";\n")
    print(f"{len(have)} klip di manifest")


if __name__ == "__main__":
    cmd, *rest = sys.argv[1:]
    {"plan": cmd_plan, "record": cmd_record, "merge": cmd_merge}[cmd](*rest)
