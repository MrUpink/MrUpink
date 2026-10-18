"""Login Google (OAuth) dan upload ke channel YouTube milik Anda sendiri lewat YouTube Data API."""
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

from . import config

SCOPES = ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.readonly"]
TOKEN_URI = "https://oauth2.googleapis.com/token"


def _client_config() -> dict:
    if not (config.YT_CLIENT_ID and config.YT_CLIENT_SECRET):
        raise RuntimeError("YT_CLIENT_ID / YT_CLIENT_SECRET belum diisi")
    return {"web": {"client_id": config.YT_CLIENT_ID, "client_secret": config.YT_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth", "token_uri": TOKEN_URI}}


def _flow(state: str | None = None) -> Flow:
    flow = Flow.from_client_config(_client_config(), scopes=SCOPES, state=state)
    flow.redirect_uri = f"{config.PUBLIC_URL}/oauth/callback"
    return flow


def auth_url() -> tuple[str, str]:
    url, state = _flow().authorization_url(access_type="offline", prompt="consent", include_granted_scopes="true")
    return url, state


def finish_auth(state: str, full_url: str) -> None:
    flow = _flow(state)
    flow.fetch_token(authorization_response=full_url)
    config.save_youtube_token({"refresh_token": flow.credentials.refresh_token})


def _youtube():
    token = config.load_youtube_token()
    if not token:
        raise RuntimeError("Channel YouTube belum dihubungkan (menu Pengaturan → Hubungkan YouTube)")
    creds = Credentials(None, refresh_token=token["refresh_token"], token_uri=TOKEN_URI,
                        client_id=config.YT_CLIENT_ID, client_secret=config.YT_CLIENT_SECRET, scopes=SCOPES)
    creds.refresh(Request())
    return build("youtube", "v3", credentials=creds, cache_discovery=False)


def channel_info() -> dict | None:
    try:
        items = _youtube().channels().list(part="snippet,statistics", mine=True).execute().get("items", [])
    except Exception:
        return None
    if not items:
        return None
    return {"title": items[0]["snippet"]["title"], "subscribers": items[0]["statistics"].get("subscriberCount")}


def upload(video_path: str, plan: dict, settings: dict) -> str:
    title, description = plan["title"][:100], plan["description"]
    if settings["format"] == "short" and "#shorts" not in (title + description).lower():
        description += "\n\n#Shorts"
    body = {
        "snippet": {"title": title, "description": description[:5000], "tags": plan["tags"][:15],
                    "categoryId": settings["category_id"] or "27"},  # 27 = Education
        "status": {"privacyStatus": settings["privacy"], "selfDeclaredMadeForKids": False,
                   "containsSyntheticMedia": bool(settings["ai_disclosure"])},
    }
    request = _youtube().videos().insert(
        part="snippet,status", body=body,
        media_body=MediaFileUpload(video_path, mimetype="video/mp4", chunksize=8 * 1024 * 1024, resumable=True))
    response = None
    while response is None:
        _, response = request.next_chunk()
    return response["id"]
