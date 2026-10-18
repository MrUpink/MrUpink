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

# Preset target penonton. "global" = penonton berbahasa Inggris di negara tier-1 (RPM tertinggi).
AUDIENCES = {
    "global": {"language": "English", "lang_code": "en", "region": "US", "voice": "en-US-AndrewNeural",
               "voice_rate": "+0%", "timezone": "America/New_York", "publish_hours": "08,13,19",
               "niche": "business stories and how companies make money", "category_id": "27"},
    "local": {"language": "Bahasa Indonesia", "lang_code": "id", "region": "ID", "voice": "id-ID-ArdiNeural",
              "voice_rate": "+5%", "timezone": "Asia/Jakarta", "publish_hours": "07,12,19",
              "niche": "kisah bisnis dan merek terkenal", "category_id": "27"},
}

DEFAULT_SETTINGS = {
    "audience": "global",  # global | local
    **AUDIENCES["global"],
    "format": "short",  # format default untuk "Buat video sekarang": short (9:16) | long (16:9)
    "autopilot": False,
    "interval_hours": 6,
    # Campuran paling realistis untuk monetisasi: Shorts menarik subscriber,
    # video panjang mengumpulkan jam tayang dan RPM jauh lebih tinggi.
    "daily_shorts": 2,
    "daily_long": 1,
    # Project Google yang belum lolos audit YouTube API: upload via API terkunci privat.
    # Nyalakan setelah audit disetujui; sebelum itu upload manual dari HP (tombol Salin judul/deskripsi).
    "auto_upload": False,
    "privacy": "public",  # public | unlisted | private
    "ai_disclosure": True,  # tandai "konten sintetis" di YouTube
    # Upload sebagai terjadwal agar tayang di jam ramai zona waktu penonton (bukan jam render).
    "schedule_publish": True,
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


def apply_audience(audience: str) -> dict:
    """Ganti target penonton: bahasa, negara tren, suara, zona waktu, jam tayang, dan niche awal."""
    if audience not in AUDIENCES:
        raise ValueError("audience harus global atau local")
    return save_settings({"audience": audience, **AUDIENCES[audience]})


def load_youtube_token() -> dict | None:
    if _token_file.exists():
        return json.loads(_token_file.read_text())
    if os.environ.get("YT_REFRESH_TOKEN"):
        return {"refresh_token": os.environ["YT_REFRESH_TOKEN"]}
    return None


def save_youtube_token(token: dict) -> None:
    _token_file.write_text(json.dumps(token))
