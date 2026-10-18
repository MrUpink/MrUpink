"""Suara (edge-tts), stok video bebas lisensi (Pexels) dan perakitan video (ffmpeg)."""
import asyncio
import random
import re
import subprocess
from pathlib import Path

import edge_tts
import httpx

from . import config

SIZES = {"short": (1080, 1920), "long": (1920, 1080)}


def run(cmd: list[str]) -> str:
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode != 0:
        raise RuntimeError(f"{cmd[0]} gagal: {p.stderr[-800:]}")
    return p.stdout


def duration(path: Path) -> float:
    return float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                      "-of", "default=nw=1:nk=1", str(path)]).strip())


# ---------- Suara ----------

def synthesize(text: str, out: Path, voice: str, rate: str) -> float:
    asyncio.run(edge_tts.Communicate(text, voice, rate=rate).save(str(out)))
    return duration(out)


# ---------- Stok video ----------

def find_footage(query: str, fmt: str, used: set[int], out: Path) -> Path | None:
    """Unduh satu klip Pexels (lisensi bebas pakai komersial). None bila tidak ditemukan."""
    if not config.PEXELS_API_KEY:
        return None
    orientation = "portrait" if fmt == "short" else "landscape"
    w, h = SIZES[fmt]
    for q in (query, " ".join(query.split()[:2])):
        r = httpx.get("https://api.pexels.com/videos/search",
                      params={"query": q, "orientation": orientation, "per_page": 15},
                      headers={"Authorization": config.PEXELS_API_KEY}, timeout=30)
        r.raise_for_status()
        videos = [v for v in r.json().get("videos", []) if v["id"] not in used]
        if not videos:
            continue
        video = random.choice(videos[:5])
        files = [f for f in video["video_files"] if f.get("width") and f.get("file_type") == "video/mp4"]
        # file terkecil yang masih ≥ resolusi target, kalau tidak ada ambil yang terbesar
        big = [f for f in files if min(f["width"], f["height"]) >= min(w, h)]
        best = min(big, key=lambda f: f["width"]) if big else max(files, key=lambda f: f["width"])
        with httpx.stream("GET", best["link"], timeout=120, follow_redirects=True) as resp:
            resp.raise_for_status()
            with out.open("wb") as fh:
                for chunk in resp.iter_bytes():
                    fh.write(chunk)
        used.add(video["id"])
        return out
    return None


# ---------- Perakitan ----------

def _ass_time(t: float) -> str:
    h, rem = divmod(t, 3600)
    m, s = divmod(rem, 60)
    return f"{int(h)}:{int(m):02d}:{s:05.2f}"


def _clean(text: str) -> str:
    return re.sub(r"[{}\\\n]", " ", text).strip()


def write_subtitles(scenes: list[dict], fmt: str, out: Path) -> None:
    """Subtitle gaya Shorts: potongan 3-5 kata, waktu dibagi proporsional dengan panjang teks."""
    w, h = SIZES[fmt]
    size = 78 if fmt == "short" else 58
    margin = int(h * (0.28 if fmt == "short" else 0.08))
    lines = [
        "[Script Info]", "ScriptType: v4.00+", f"PlayResX: {w}", f"PlayResY: {h}", "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, "
        "Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, "
        "MarginL, MarginR, MarginV, Encoding",
        f"Style: Sub,DejaVu Sans,{size},&H00FFFFFF,&H00FFFFFF,&H00000000,&H64000000,1,0,0,0,100,100,0,0,1,5,2,2,60,60,{margin},1",
        f"Style: Cap,DejaVu Sans,{int(size * 0.8)},&H0000E5FF,&H00FFFFFF,&H00000000,&H64000000,1,0,0,0,100,100,0,0,1,5,2,8,60,60,{int(h * 0.1)},1",
        "", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]
    t = 0.0
    for sc in scenes:
        dur = sc["duration"]
        if sc.get("caption"):
            lines.append(f"Dialogue: 0,{_ass_time(t)},{_ass_time(t + dur)},Cap,,0,0,0,,{_clean(sc['caption']).upper()}")
        words = _clean(sc["narration"]).split()
        chunks = [" ".join(words[i:i + 4]) for i in range(0, len(words), 4)] or [""]
        total = sum(len(c) for c in chunks) or 1
        speech = dur - sc["pad"]
        ct = t
        for c in chunks:
            cd = speech * len(c) / total
            lines.append(f"Dialogue: 0,{_ass_time(ct)},{_ass_time(ct + cd)},Sub,,0,0,0,,{c}")
            ct += cd
        t += dur
    out.write_text("\n".join(lines), encoding="utf-8")


def render_scene(clip: Path | None, audio: Path, dur: float, fmt: str, out: Path) -> None:
    w, h = SIZES[fmt]
    if clip:
        video_in = ["-stream_loop", "-1", "-i", str(clip)]
        vf = f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},setsar=1,fps=30"
    else:  # latar gradasi bila stok video tidak ditemukan
        video_in = ["-f", "lavfi", "-i", f"gradients=s={w}x{h}:speed=0.02:r=30"]
        vf = "setsar=1,format=yuv420p"
    run(["ffmpeg", "-y", *video_in, "-i", str(audio), "-map", "0:v", "-map", "1:a",
         "-vf", vf + ",format=yuv420p", "-af", "apad", "-t", f"{dur:.3f}",
         "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-r", "30",
         "-c:a", "aac", "-b:a", "160k", "-ar", "44100", "-ac", "2", str(out)])


def assemble(scene_files: list[Path], subs: Path, out: Path) -> None:
    listing = out.with_suffix(".txt")
    listing.write_text("".join(f"file '{p.resolve()}'\n" for p in scene_files))
    joined = out.with_name("joined.mp4")
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(listing), "-c", "copy", str(joined)])
    run(["ffmpeg", "-y", "-i", str(joined), "-vf", f"ass={subs.resolve()}",
         "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-c:a", "copy",
         "-movflags", "+faststart", str(out)])
    joined.unlink(missing_ok=True)
