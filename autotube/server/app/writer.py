"""Membuat rencana video orisinal (judul, naskah, scene) dengan Claude dari sinyal tren."""
import json

import anthropic

from . import config

PLAN_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["topic", "angle", "title", "description", "tags", "scenes"],
    "properties": {
        "topic": {"type": "string"},
        "angle": {"type": "string", "description": "Sudut pandang unik yang membedakan video ini"},
        "title": {"type": "string"},
        "description": {"type": "string"},
        "tags": {"type": "array", "items": {"type": "string"}},
        "scenes": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["narration", "caption", "footage_query"],
                "properties": {
                    "narration": {"type": "string"},
                    "caption": {"type": "string", "description": "Teks singkat di layar (maks 6 kata)"},
                    "footage_query": {"type": "string", "description": "2-4 kata Bahasa Inggris untuk mencari stok video"},
                },
            },
        },
    },
}

SYSTEM = """Kamu adalah penulis naskah YouTube faceless yang membuat konten ORISINAL.
Data tren hanya dipakai sebagai sinyal topik apa yang sedang diminati penonton.
Aturan:
- Jangan menyalin judul, kalimat, atau struktur video lain. Buat sudut pandang sendiri yang memberi nilai tambah (penjelasan, konteks, data, tips).
- Fakta harus akurat dan tidak menyesatkan. Jika tidak yakin, jangan sebut angka spesifik.
- Judul menarik tetapi jujur terhadap isi (tanpa clickbait palsu), maksimal 70 karakter.
- Hook kuat di scene pertama (pertanyaan/fakta mengejutkan dalam 3 detik pertama).
- Akhiri dengan ajakan berinteraksi yang natural (komentar/subscribe).
- Hindari topik politik sensitif, SARA, kesehatan berisiko, atau tokoh nyata yang bisa merugikan.
- footage_query harus mendeskripsikan visual umum yang mudah ditemukan di stok video gratis."""


def _ask(system: str, prompt: str, schema: dict) -> dict:
    """Satu panggilan Claude dengan keluaran JSON sesuai schema."""
    if not config.ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY belum diisi")
    client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)
    response = client.beta.messages.create(
        model=config.CLAUDE_MODEL,
        max_tokens=16000,
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        output_config={"effort": "medium", "format": {"type": "json_schema", "schema": schema}},
        system=system,
        messages=[{"role": "user", "content": prompt}],
    )
    if response.stop_reason == "refusal":
        raise RuntimeError("Claude menolak permintaan ini, coba topik lain")
    if response.stop_reason == "max_tokens":
        raise RuntimeError("Jawaban Claude terpotong (max_tokens)")
    return json.loads(next(b.text for b in response.content if b.type == "text"))


def _format_rules(fmt: str) -> str:
    if fmt == "long":
        return "Format video panjang 16:9, durasi 3-6 menit: 12-20 scene, narasi tiap scene 2-4 kalimat."
    return "Format YouTube Shorts 9:16, durasi 35-55 detik: 6-9 scene, narasi tiap scene 1-2 kalimat pendek."


def make_plan(settings: dict, fmt: str, trend_items: list[dict], recent_topics: list[str], topic_hint: str = "") -> dict:
    signals = "\n".join(
        f"- {t['title']} ({t['views_per_hour']} views/jam; tag: {', '.join(t['tags'][:5])})" for t in trend_items
    ) or "(tidak ada data tren, pilih topik evergreen yang populer)"
    prompt = f"""Niche channel: {settings['niche']}
Bahasa narasi: {settings['language']}
{_format_rules(fmt)}

Sinyal tren saat ini (judul video lain + kecepatan views):
{signals}

Topik yang SUDAH pernah dibuat (jangan diulang):
{chr(10).join('- ' + t for t in recent_topics) or '(belum ada)'}

{('Topik yang diminta pemilik channel: ' + topic_hint) if topic_hint else 'Pilih satu topik yang paling berpotensi viral dan cocok dengan niche.'}

Buat rencana satu video orisinal. Deskripsi 2-3 paragraf + 3-5 hashtag. Tags 8-15 kata kunci."""

    plan = _ask(SYSTEM, prompt, PLAN_SCHEMA)
    if not plan["scenes"]:
        raise RuntimeError("Naskah kosong")
    return plan


NICHE_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["niches"],
    "properties": {
        "niches": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["name", "category_id", "why", "audience", "rpm", "competition", "risk", "sample_titles"],
                "properties": {
                    "name": {"type": "string", "description": "Nama niche yang spesifik, dipakai sebagai kata kunci riset"},
                    "category_id": {"type": "string", "enum": ["27", "28", "22", "24", "26", "15", "19", "17"]},
                    "why": {"type": "string"},
                    "audience": {"type": "string"},
                    "rpm": {"type": "string", "enum": ["rendah", "sedang", "tinggi"]},
                    "competition": {"type": "string", "enum": ["rendah", "sedang", "tinggi"]},
                    "risk": {"type": "string"},
                    "sample_titles": {"type": "array", "items": {"type": "string"}},
                },
            },
        },
    },
}

NICHE_SYSTEM = """Kamu konsultan strategi channel YouTube faceless. Rekomendasikan niche yang realistis untuk channel
yang dibuat otomatis dengan narasi suara AI + stok video gratis (Pexels) + subtitle, tanpa wajah dan tanpa rekaman sendiri.
Kriteria: visual mudah diwakili stok video umum, topik evergreen dengan banyak ide, cocok untuk Shorts DAN video panjang,
potensi RPM, dan tingkat persaingan. Hindari niche yang berisiko melanggar kebijakan YouTube (nasihat medis/keuangan
yang menyesatkan, berita politik, konten anak, reupload/kompilasi). Jujur soal risiko tiap niche."""


def recommend_niches(settings: dict, trend_items: list[dict]) -> list[dict]:
    signals = "\n".join(f"- {t['title']} ({t['views_per_hour']} views/jam)" for t in trend_items[:25]) or "(tidak ada data)"
    prompt = f"""Negara penonton: {settings['region']}, bahasa narasi: {settings['language']}.
Niche channel saat ini: {settings['niche']}

Video trending saat ini di negara tersebut:
{signals}

Rekomendasikan 6 niche, urutkan dari yang paling berpeluang dimonetisasi dan menguntungkan.
Tiap niche: 3 contoh judul video orisinal (bukan salinan judul di atas)."""
    return _ask(NICHE_SYSTEM, prompt, NICHE_SCHEMA)["niches"]
