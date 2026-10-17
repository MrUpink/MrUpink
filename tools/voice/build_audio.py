#!/usr/bin/env python3
"""Merekam klip suara natural Bahasa Indonesia untuk aplikasi (dijalankan saat build, butuh internet).

Masukan : phrases.json dari tools/voice/phrases.js  ->  [{"key": ..., "text": ...}]
Keluaran: <out>/<hash>.mp3 dan <out>/manifest.js (window.AUDIO_CLIPS = {key: file})

Klip yang sudah ada dilewati, sehingga build berikutnya hanya merekam kalimat baru.
Bila sebagian klip gagal direkam, aplikasi memakai suara HP untuk kalimat tersebut.
"""
import argparse
import asyncio
import hashlib
import json
import os
import sys

import edge_tts


def clip_name(key: str, voice: str, rate: str, pitch: str) -> str:
    return hashlib.sha1(f"{voice}|{rate}|{pitch}|{key}".encode("utf-8")).hexdigest()[:16] + ".mp3"


async def synth(item, out_dir, args, sem, results):
    name = clip_name(item["key"], args.voice, args.rate, args.pitch)
    path = os.path.join(out_dir, name)
    if os.path.exists(path) and os.path.getsize(path) > 0:
        results[item["key"]] = name
        return
    async with sem:
        for attempt in range(4):
            try:
                tmp = path + ".tmp"
                await edge_tts.Communicate(item["text"], args.voice, rate=args.rate, pitch=args.pitch).save(tmp)
                if os.path.getsize(tmp) == 0:
                    raise RuntimeError("audio kosong")
                os.replace(tmp, path)
                results[item["key"]] = name
                return
            except Exception as e:  # noqa: BLE001 - coba lagi untuk galat jaringan apa pun
                if attempt == 3:
                    print(f"GAGAL: {item['key']!r}: {e}", file=sys.stderr)
                else:
                    await asyncio.sleep(2 ** attempt)


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("phrases")
    ap.add_argument("out_dir")
    ap.add_argument("--voice", default="id-ID-GadisNeural")
    ap.add_argument("--rate", default="-8%")
    ap.add_argument("--pitch", default="+4Hz")
    ap.add_argument("--jobs", type=int, default=8)
    args = ap.parse_args()

    with open(args.phrases, encoding="utf-8") as f:
        items = json.load(f)
    os.makedirs(args.out_dir, exist_ok=True)
    sem = asyncio.Semaphore(args.jobs)
    results = {}
    await asyncio.gather(*(synth(it, args.out_dir, args, sem, results) for it in items))

    # Hapus klip lama yang tidak dipakai lagi
    used = set(results.values())
    for fn in os.listdir(args.out_dir):
        if fn.endswith(".mp3") and fn not in used:
            os.remove(os.path.join(args.out_dir, fn))

    with open(os.path.join(args.out_dir, "manifest.js"), "w", encoding="utf-8") as f:
        f.write("/* Dibuat otomatis oleh tools/voice/build_audio.py */\n")
        f.write("window.AUDIO_CLIPS = " + json.dumps(results, ensure_ascii=False, sort_keys=True) + ";\n")
    print(f"{len(results)}/{len(items)} klip suara siap")


asyncio.run(main())
