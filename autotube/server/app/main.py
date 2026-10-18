"""Server AutoTube: API + tampilan web yang dibuka oleh aplikasi Android."""
import hmac
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import config, pipeline, trends, uploader

app = FastAPI(title="AutoTube")
STATIC = Path(__file__).parent / "static"
_oauth_states: set[str] = set()


def _check(token: str) -> None:
    if not config.APP_TOKEN:
        raise HTTPException(500, "APP_TOKEN belum diisi di server")
    if not hmac.compare_digest(token, config.APP_TOKEN):
        raise HTTPException(401, "Token salah")


def auth(x_app_token: str = Header("")) -> None:
    _check(x_app_token)


def auth_query(token: str = Query("")) -> None:
    _check(token)


@app.on_event("startup")
def _startup() -> None:
    pipeline.start_autopilot()


@app.get("/", response_class=HTMLResponse)
def index() -> str:
    return (STATIC / "index.html").read_text(encoding="utf-8")


app.mount("/static", StaticFiles(directory=STATIC), name="static")


@app.get("/api/status", dependencies=[Depends(auth)])
def status() -> dict:
    yt_linked = config.load_youtube_token() is not None
    return {
        "keys": {"anthropic": bool(config.ANTHROPIC_API_KEY), "youtube_data": bool(config.YOUTUBE_API_KEY),
                 "pexels": bool(config.PEXELS_API_KEY),
                 "youtube_oauth": bool(config.YT_CLIENT_ID and config.YT_CLIENT_SECRET and config.PUBLIC_URL)},
        "channel": uploader.channel_info() if yt_linked else None,
        "youtube_linked": yt_linked,
        "autopilot": pipeline.autopilot_state(),
    }


@app.get("/api/settings", dependencies=[Depends(auth)])
def get_settings() -> dict:
    return config.load_settings()


@app.put("/api/settings", dependencies=[Depends(auth)])
def put_settings(changes: dict) -> dict:
    return config.save_settings(changes)


@app.get("/api/trends", dependencies=[Depends(auth)])
def get_trends(mode: str = "niche", q: str = "") -> list[dict]:
    s = config.load_settings()
    try:
        if mode == "trending":
            return trends.trending(s["region"], s["category_id"])
        return trends.rising(q or s["niche"], s["region"])
    except RuntimeError as e:
        raise HTTPException(400, str(e))


class NewJob(BaseModel):
    topic: str = ""


@app.post("/api/jobs", dependencies=[Depends(auth)])
def new_job(body: NewJob) -> dict:
    return pipeline.create(body.topic.strip())


@app.get("/api/jobs", dependencies=[Depends(auth)])
def jobs() -> list[dict]:
    return pipeline.list_jobs()


@app.get("/api/jobs/{job_id}", dependencies=[Depends(auth)])
def job(job_id: str) -> dict:
    j = pipeline.get(job_id)
    if not j:
        raise HTTPException(404)
    return j


@app.post("/api/jobs/{job_id}/upload", dependencies=[Depends(auth)])
def upload_job(job_id: str) -> dict:
    j = pipeline.get(job_id)
    if not j or not j.get("video"):
        raise HTTPException(400, "Video belum selesai")
    return pipeline.upload(job_id)


@app.delete("/api/jobs/{job_id}", dependencies=[Depends(auth)])
def delete_job(job_id: str) -> dict:
    pipeline.delete(job_id)
    return {"ok": True}


@app.get("/media/{job_id}/video.mp4", dependencies=[Depends(auth_query)])
def video(job_id: str) -> FileResponse:
    path = (config.JOBS_DIR / job_id / "video.mp4").resolve()
    if config.JOBS_DIR not in path.parents or not path.exists():
        raise HTTPException(404)
    return FileResponse(path, media_type="video/mp4", filename=f"{job_id}.mp4")


@app.get("/oauth/start", dependencies=[Depends(auth_query)])
def oauth_start() -> RedirectResponse:
    url, state = uploader.auth_url()
    _oauth_states.add(state)
    return RedirectResponse(url)


@app.get("/oauth/callback", response_class=HTMLResponse)
def oauth_callback(request: Request, state: str = "") -> str:
    if state not in _oauth_states:
        raise HTTPException(400, "Sesi login tidak valid, ulangi dari aplikasi")
    _oauth_states.discard(state)
    url = str(request.url)
    if config.PUBLIC_URL.startswith("https://"):
        url = url.replace("http://", "https://", 1)  # di belakang reverse proxy
    uploader.finish_auth(state, url)
    return "<h2>Channel YouTube terhubung ✅</h2><p>Kembali ke aplikasi AutoTube.</p><a href='/'>Buka aplikasi</a>"
