"""Konfigurasi: kunci API dari environment, pengaturan yang bisa diubah dari aplikasi di settings.json."""
import json
import os
import threading
from pathlib import Path

DATA_DIR = Path(os.environ.get("DATA_DIR", "data")).resolve()
DATA_DIR.mkdir(parents=True, exist_ok=True)
JOBS_DIR = DATA_DIR / "jobs"
JOBS_DIR.mkdir(exist_ok=True)

# Kata sandi untuk membuka aplikasi. Wajib diisi saat server online.
APP_TOKEN = os.environ.get("APP_TOKEN", "")
PUBLIC_URL = os.environ.get("PUBLIC_URL", "").rstrip("/")

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL = os.environ.get("CLAUDE_MODEL", "claude-sonnet-5-5")
YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY", "")
PEXELS_API_KEY = os.environ.get("PEXELS_API_KEY", "")
YT_CLIENT_ID = os.environ.get("YT_CLIENT_ID", "")
YT_CLIENT_SECRET = os.environ.get("YT_CLIENT_SECRET", "")

DEFAULT_SETTINGS = {
    "niche": "fakta unik dan pengetahuan umum",
    "language": "Bahasa Indonesia",
    "region": "ID",
    "category_id": "",  # kosong = semua kategori
    "format": "short",  # short (9:16, <60 dtk) | long (16:9, 3-6 menit)
    "voice": "id-ID-ArdiNeural",
    "voice_rate": "+5%",
    "autopilot": False,
    "interval_hours": 6,
    "daily_limit": 3,
    "auto_upload": True,
    "privacy": "public",  # public | unlisted | private
    "ai_disclosure": True,  # tandai "konten sintetis" di YouTube
}

_lock = threading.Lock()
_settings_file = DATA_DIR / "settings.json"
_token_file = DATA_DIR / "youtube_token.json"


def load_settings() -> dict:
    with _lock:
        s = dict(DEFAULT_SETTINGS)
        if _settings_file.exists():
            s.update(json.loads(_settings_file.read_text()))
        return s


def save_settings(changes: dict) -> dict:
    s = load_settings()
    for k, v in changes.items():
        if k in DEFAULT_SETTINGS:
            s[k] = type(DEFAULT_SETTINGS[k])(v) if DEFAULT_SETTINGS[k] is not None else v
    with _lock:
        _settings_file.write_text(json.dumps(s, indent=2, ensure_ascii=False))
    return s


def load_youtube_token() -> dict | None:
    if _token_file.exists():
        return json.loads(_token_file.read_text())
    if os.environ.get("YT_REFRESH_TOKEN"):
        return {"refresh_token": os.environ["YT_REFRESH_TOKEN"]}
    return None


def save_youtube_token(token: dict) -> None:
    _token_file.write_text(json.dumps(token))
