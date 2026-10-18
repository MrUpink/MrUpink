"""Riset tren lewat YouTube Data API resmi: hanya membaca metadata (judul, views), tidak mengunduh video."""
from datetime import datetime, timedelta, timezone

import httpx

from . import config

API = "https://www.googleapis.com/youtube/v3"


def _get(path: str, **params) -> dict:
    if not config.YOUTUBE_API_KEY:
        raise RuntimeError("YOUTUBE_API_KEY belum diisi")
    params["key"] = config.YOUTUBE_API_KEY
    r = httpx.get(f"{API}/{path}", params=params, timeout=30)
    r.raise_for_status()
    return r.json()


def _summarize(items: list[dict]) -> list[dict]:
    now = datetime.now(timezone.utc)
    out = []
    for it in items:
        sn, st = it["snippet"], it.get("statistics", {})
        published = datetime.fromisoformat(sn["publishedAt"].replace("Z", "+00:00"))
        hours = max((now - published).total_seconds() / 3600, 1)
        views = int(st.get("viewCount", 0))
        out.append({
            "id": it["id"],
            "title": sn["title"],
            "channel": sn["channelTitle"],
            "published": sn["publishedAt"],
            "views": views,
            "likes": int(st.get("likeCount", 0)),
            "comments": int(st.get("commentCount", 0)),
            "views_per_hour": round(views / hours),
            "tags": sn.get("tags", [])[:10],
            "thumbnail": sn["thumbnails"].get("medium", {}).get("url"),
        })
    return sorted(out, key=lambda v: v["views_per_hour"], reverse=True)


def trending(region: str, category_id: str = "", limit: int = 25) -> list[dict]:
    params = dict(part="snippet,statistics", chart="mostPopular", regionCode=region, maxResults=limit)
    if category_id:
        params["videoCategoryId"] = category_id
    return _summarize(_get("videos", **params).get("items", []))


def rising(query: str, region: str, hours: int = 72, limit: int = 25) -> list[dict]:
    """Video baru (≤ `hours` jam) di niche tertentu, diurutkan berdasarkan kecepatan naiknya views."""
    after = (datetime.now(timezone.utc) - timedelta(hours=hours)).strftime("%Y-%m-%dT%H:%M:%SZ")
    found = _get("search", part="id", q=query, type="video", order="viewCount",
                 publishedAfter=after, regionCode=region, maxResults=limit)
    ids = [i["id"]["videoId"] for i in found.get("items", [])]
    if not ids:
        return []
    return _summarize(_get("videos", part="snippet,statistics", id=",".join(ids)).get("items", []))


def research(settings: dict, limit: int = 15) -> list[dict]:
    """Gabungan tren niche + trending umum, tanpa duplikat."""
    seen, out = set(), []
    for fetch in (lambda: rising(settings["niche"], settings["region"]),
                  lambda: trending(settings["region"], settings["category_id"])):
        try:
            for v in fetch():
                if v["id"] not in seen:
                    seen.add(v["id"])
                    out.append(v)
        except httpx.HTTPError:
            continue
    return sorted(out, key=lambda v: v["views_per_hour"], reverse=True)[:limit]
