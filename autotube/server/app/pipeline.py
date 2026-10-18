"""Alur otomatis: riset tren → naskah → suara → stok video → render → upload, plus autopilot terjadwal."""
import json
import shutil
import threading
import time
import traceback
import uuid
from datetime import datetime, timezone
from pathlib import Path

from . import config, media, trends, uploader, writer

_jobs_lock = threading.Lock()
_render_lock = threading.Lock()  # satu video dirender dalam satu waktu


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _job_file(job_id: str) -> Path:
    return config.JOBS_DIR / job_id / "job.json"


def save(job: dict) -> None:
    with _jobs_lock:
        _job_file(job["id"]).write_text(json.dumps(job, indent=2, ensure_ascii=False))


def get(job_id: str) -> dict | None:
    f = _job_file(job_id)
    return json.loads(f.read_text()) if f.exists() else None


def list_jobs() -> list[dict]:
    jobs = [json.loads(f.read_text()) for f in config.JOBS_DIR.glob("*/job.json")]
    return sorted(jobs, key=lambda j: j["created"], reverse=True)


def delete(job_id: str) -> None:
    shutil.rmtree(config.JOBS_DIR / job_id, ignore_errors=True)


def _step(job: dict, status: str, msg: str) -> None:
    job["status"] = status
    job["log"].append(f"{datetime.now().strftime('%H:%M:%S')} {msg}")
    save(job)


def create(topic_hint: str = "", source: str = "manual") -> dict:
    job_id = datetime.now().strftime("%Y%m%d-%H%M%S-") + uuid.uuid4().hex[:4]
    (config.JOBS_DIR / job_id).mkdir(parents=True)
    job = {"id": job_id, "created": _now(), "source": source, "topic_hint": topic_hint,
           "status": "queued", "log": [], "plan": None, "video": None, "youtube_id": None, "error": None}
    save(job)
    threading.Thread(target=_run, args=(job_id,), daemon=True).start()
    return job


def _run(job_id: str) -> None:
    job = get(job_id)
    settings = config.load_settings()
    work = config.JOBS_DIR / job_id
    try:
        with _render_lock:
            _step(job, "researching", "Riset tren…")
            try:
                signals = trends.research(settings)
            except RuntimeError as e:
                signals = []
                job["log"].append(f"Tren dilewati: {e}")
            recent = [j["plan"]["topic"] for j in list_jobs() if j.get("plan")][:30]

            _step(job, "writing", f"Menulis naskah orisinal dari {len(signals)} sinyal tren…")
            plan = writer.make_plan(settings, signals, recent, job["topic_hint"])
            job["plan"] = plan
            _step(job, "voicing", f"Judul: {plan['title']} — membuat suara…")

            scenes, used = [], set()
            for i, sc in enumerate(plan["scenes"]):
                audio = work / f"a{i}.mp3"
                speech = media.synthesize(sc["narration"], audio, settings["voice"], settings["voice_rate"])
                pad = 0.35
                scenes.append({**sc, "audio": audio, "duration": speech + pad, "pad": pad})

            _step(job, "footage", "Mencari stok video bebas lisensi…")
            for i, sc in enumerate(scenes):
                sc["clip"] = media.find_footage(sc["footage_query"], settings["format"], used, work / f"c{i}.mp4")

            _step(job, "rendering", "Merender video…")
            parts = []
            for i, sc in enumerate(scenes):
                part = work / f"s{i}.mp4"
                media.render_scene(sc["clip"], sc["audio"], sc["duration"], settings["format"], part)
                parts.append(part)
            subs = work / "subs.ass"
            media.write_subtitles(scenes, settings["format"], subs)
            final = work / "video.mp4"
            media.assemble(parts, subs, final)
            for p in work.iterdir():  # buang file sementara, simpan video & job.json
                if p.name not in ("video.mp4", "job.json"):
                    p.unlink()
            job["video"] = final.name
            job["duration"] = round(media.duration(final), 1)
            _step(job, "rendered", f"Video selesai ({job['duration']} detik)")

        if settings["auto_upload"]:
            upload(job_id)
    except Exception as e:
        job["error"] = str(e)
        job["log"].append(traceback.format_exc(limit=2))
        _step(job, "failed", f"Gagal: {e}")


def upload(job_id: str) -> dict:
    job = get(job_id)
    settings = config.load_settings()
    _step(job, "uploading", "Upload ke YouTube…")
    try:
        job["youtube_id"] = uploader.upload(str(config.JOBS_DIR / job_id / job["video"]), job["plan"], settings)
        _step(job, "uploaded", f"Terupload: https://youtu.be/{job['youtube_id']} ({settings['privacy']})")
    except Exception as e:
        job["error"] = str(e)
        _step(job, "rendered", f"Upload gagal: {e}")
    return job


# ---------- Autopilot ----------

def autopilot_state() -> dict:
    s = config.load_settings()
    auto = [j for j in list_jobs() if j["source"] == "autopilot"]
    today = datetime.now(timezone.utc).date().isoformat()
    made_today = sum(1 for j in auto if j["created"].startswith(today) and j["status"] != "failed")
    last = datetime.fromisoformat(auto[0]["created"]).timestamp() if auto else 0
    next_run = last + s["interval_hours"] * 3600
    busy = any(j["status"] not in ("rendered", "uploaded", "failed") for j in list_jobs())
    return {"enabled": s["autopilot"], "made_today": made_today, "daily_limit": s["daily_limit"],
            "next_run": datetime.fromtimestamp(max(next_run, time.time()), timezone.utc).isoformat(timespec="seconds"),
            "due": s["autopilot"] and not busy and made_today < s["daily_limit"] and time.time() >= next_run}


def _autopilot_loop() -> None:
    while True:
        try:
            if autopilot_state()["due"]:
                create(source="autopilot")
        except Exception:
            traceback.print_exc()
        time.sleep(60)


def start_autopilot() -> None:
    # Job yang terputus karena server restart ditandai gagal agar tidak menggantung.
    for j in list_jobs():
        if j["status"] not in ("rendered", "uploaded", "failed"):
            j["status"], j["error"] = "failed", "Server restart saat proses berjalan"
            save(j)
    threading.Thread(target=_autopilot_loop, daemon=True).start()
