#!/usr/bin/env python3
"""Merekam klip suara natural Bahasa Indonesia untuk aplikasi (dijalankan saat build, butuh internet).

Masukan : phrases.json dari tools/voice/phrases.js  ->  [{"key": ..., "text": ...}]
Keluaran: <out>/<hash>.mp3 dan <out>/manifest.js (window.AUDIO_CLIPS = {key: file})

Mesin suara:
  * Azure Speech (resmi, boleh untuk aplikasi berbayar) — dipakai bila variabel lingkungan
    AZURE_SPEECH_KEY dan AZURE_SPEECH_REGION diisi (paket gratis F0 sudah cukup).
  * edge-tts (gratis, tidak resmi) — cadangan untuk build pengembangan saja.

Klip yang sudah ada dilewati, sehingga build berikutnya hanya merekam kalimat baru.
Bila sebagian klip gagal direkam, aplikasi memakai suara HP untuk kalimat tersebut.
"""
import argparse
import asyncio
import hashlib
import json
import os
import sys

import aiohttp
from xml.sax.saxutils import escape

AZURE_KEY = os.environ.get("AZURE_SPEECH_KEY", "").strip()
AZURE_REGION = os.environ.get("AZURE_SPEECH_REGION", "").strip()
BACKEND = "azure" if AZURE_KEY and AZURE_REGION else "edge"


def clip_name(key: str, voice: str, rate: str, pitch: str) -> str:
    return hashlib.sha1(f"{BACKEND}|{voice}|{rate}|{pitch}|{key}".encode("utf-8")).hexdigest()[:16] + ".mp3"


class RateLimited(Exception):
    def __init__(self, wait):
        super().__init__(f"rate limited, tunggu {wait}s")
        self.wait = wait


async def save_azure(session, text, voice, rate, pitch, path):
    ssml = (
        "<speak version='1.0' xml:lang='id-ID'>"
        f"<voice name='{voice}'><prosody rate='{rate}' pitch='{pitch}'>{escape(text)}</prosody></voice></speak>"
    )
    url = f"https://{AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/v1"
    headers = {
        "Ocp-Apim-Subscription-Key": AZURE_KEY,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        "User-Agent": "pintar-ceria-build",
    }
    async with session.post(url, data=ssml.encode("utf-8"), headers=headers) as r:
        if r.status == 429:  # batas paket gratis (±20 permintaan/menit)
            raise RateLimited(float(r.headers.get("Retry-After", "15")))
        if r.status != 200:
            raise RuntimeError(f"HTTP {r.status}: {(await r.text())[:200]}")
        with open(path, "wb") as f:
            f.write(await r.read())


async def save_edge(text, voice, rate, pitch, path):
    import edge_tts  # hanya untuk build pengembangan

    await edge_tts.Communicate(text, voice, rate=rate, pitch=pitch).save(path)


async def synth(item, out_dir, args, sem, results, session):
    name = clip_name(item["key"], args.voice, args.rate, args.pitch)
    path = os.path.join(out_dir, name)
    if os.path.exists(path) and os.path.getsize(path) > 0:
        results[item["key"]] = name
        return
    attempts = 4
    async with sem:
        attempt = 0
        while attempt < attempts:
            try:
                tmp = path + ".tmp"
                if BACKEND == "azure":
                    await save_azure(session, item["text"], args.voice, args.rate, args.pitch, tmp)
                else:
                    await save_edge(item["text"], args.voice, args.rate, args.pitch, tmp)
                if os.path.getsize(tmp) == 0:
                    raise RuntimeError("audio kosong")
                os.replace(tmp, path)
                results[item["key"]] = name
                return
            except RateLimited as e:  # tidak dihitung sebagai percobaan gagal
                await asyncio.sleep(e.wait + 1)
            except Exception as e:  # noqa: BLE001 - coba lagi untuk galat jaringan apa pun
                attempt += 1
                if attempt == attempts:
                    print(f"GAGAL: {item['key']!r}: {e}", file=sys.stderr)
                else:
                    await asyncio.sleep(min(30, 2 ** attempt))


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
    print(f"Mesin suara: {BACKEND}" + ("" if BACKEND == "azure" else
          " (PERINGATAN: tidak resmi, isi secret AZURE_SPEECH_KEY & AZURE_SPEECH_REGION sebelum rilis berbayar)"))
    sem = asyncio.Semaphore(args.jobs if BACKEND == "edge" else min(args.jobs, 4))
    results = {}
    async with aiohttp.ClientSession() as session:
        await asyncio.gather(*(synth(it, args.out_dir, args, sem, results, session) for it in items))

    # Hapus klip lama yang tidak dipakai lagi
    used = set(results.values())
    for fn in os.listdir(args.out_dir):
        if fn.endswith(".mp3") and fn not in used:
            os.remove(os.path.join(args.out_dir, fn))

    with open(os.path.join(args.out_dir, "manifest.js"), "w", encoding="utf-8") as f:
        f.write("/* Dibuat otomatis oleh tools/voice/build_audio.py */\n")
        f.write(f"window.AUDIO_SOURCE = {json.dumps(BACKEND)};\n")
        f.write("window.AUDIO_CLIPS = " + json.dumps(results, ensure_ascii=False, sort_keys=True) + ";\n")
    print(f"{len(results)}/{len(items)} klip suara siap")


asyncio.run(main())
