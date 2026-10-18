"""Daftar niche faceless yang cocok untuk AutoTube + rekomendasi AI dari tren terbaru."""
import json
from datetime import datetime, timezone

from . import config, trends, writer

# Kurasi untuk penonton Indonesia: visual mudah diwakili stok video, evergreen, cocok Shorts + video panjang.
# rpm/competition adalah perkiraan kualitatif, bukan angka pasti.
CURATED = [
    {"name": "teknologi, AI dan tips HP", "category_id": "28", "rpm": "tinggi", "competition": "tinggi", "recommended": True,
     "why": "Penonton dan pengiklan teknologi bernilai tinggi; topik baru muncul setiap minggu.",
     "audience": "18–35 tahun, pengguna HP & pekerja kantoran",
     "risk": "Info cepat usang; pastikan fitur/harga yang disebut benar.",
     "sample_titles": ["5 Fitur Tersembunyi HP Android yang Jarang Dipakai", "Cara Kerja AI Menjelaskan Gambar", "Kenapa Baterai HP Cepat Rusak?"]},
    {"name": "keuangan pribadi dan tips hemat", "category_id": "27", "rpm": "tinggi", "competition": "sedang", "recommended": True,
     "why": "RPM termasuk tertinggi di YouTube; topik praktis yang banyak dicari.",
     "audience": "20–40 tahun, karyawan & keluarga muda",
     "risk": "Jangan memberi saran investasi spesifik atau janji untung; fokus edukasi umum.",
     "sample_titles": ["Aturan 50/30/20 untuk Gaji UMR", "Kenapa Uang Cepat Habis di Akhir Bulan", "Dana Darurat: Berapa yang Ideal?"]},
    {"name": "kisah bisnis dan merek terkenal", "category_id": "27", "rpm": "tinggi", "competition": "sedang", "recommended": True,
     "why": "Cerita naik-turun perusahaan memancing rasa penasaran dan durasi tonton panjang.",
     "audience": "18–45 tahun, peminat bisnis & UMKM",
     "risk": "Gunakan fakta publik; hindari tuduhan terhadap orang/perusahaan nyata.",
     "sample_titles": ["Bagaimana Merek Kecil Mengalahkan Raksasa", "Strategi Harga yang Membuat Kita Belanja Lebih", "Kenapa Startup Besar Bisa Bangkrut"]},
    {"name": "fakta sains dan alam semesta", "category_id": "28", "rpm": "sedang", "competition": "sedang", "recommended": False,
     "why": "Evergreen, ide tidak ada habisnya, stok video luar angkasa & alam sangat banyak.",
     "audience": "Semua umur 13+",
     "risk": "Pastikan fakta akurat; hindari teori konspirasi.",
     "sample_titles": ["Apa Jadinya Jika Bulan Menghilang?", "Kenapa Laut Asin tapi Sungai Tawar", "Seberapa Besar Matahari Sebenarnya"]},
    {"name": "sejarah dan misteri dunia", "category_id": "27", "rpm": "sedang", "competition": "sedang", "recommended": False,
     "why": "Cerita kuat untuk video panjang (jam tayang tinggi); cocok narasi suara.",
     "audience": "18–45 tahun",
     "risk": "Stok video sejarah terbatas; visual sering generik.",
     "sample_titles": ["Kota yang Hilang dalam Semalam", "Kenapa Piramida Dibangun di Gurun", "Penemuan Kebetulan yang Mengubah Dunia"]},
    {"name": "psikologi dan pengembangan diri", "category_id": "27", "rpm": "sedang", "competition": "tinggi", "recommended": False,
     "why": "Mudah relatable, banyak dibagikan; cocok Shorts.",
     "audience": "17–35 tahun",
     "risk": "Jangan mendiagnosis kondisi mental; persaingan ketat.",
     "sample_titles": ["Kenapa Kita Suka Menunda Pekerjaan", "Efek Kecil yang Membuat Orang Lebih Percaya", "Tanda Kamu Terlalu Keras pada Diri Sendiri"]},
    {"name": "geografi dan fakta negara-negara", "category_id": "27", "rpm": "sedang", "competition": "rendah", "recommended": False,
     "why": "Persaingan bahasa Indonesia masih rendah; stok video kota & alam melimpah.",
     "audience": "15–40 tahun, suka traveling",
     "risk": "Perbarui data (populasi, harga) secara berkala.",
     "sample_titles": ["Negara Terkecil di Dunia Hidup dari Apa?", "Kenapa Jepang Jarang Ada Tempat Sampah", "Kota dengan Biaya Hidup Paling Mahal"]},
    {"name": "fakta unik hewan", "category_id": "15", "rpm": "rendah", "competition": "sedang", "recommended": False,
     "why": "Views Shorts tinggi dan stok video hewan sangat banyak.",
     "audience": "Semua umur",
     "risk": "RPM rendah; mudah dianggap konten anak — tetap set 'bukan untuk anak' dengan gaya dewasa.",
     "sample_titles": ["Hewan yang Bisa Hidup Tanpa Air Bertahun-tahun", "Kenapa Kucing Suka Kotak", "Gurita Punya Tiga Jantung?"]},
]

_cache = config.DATA_DIR / "niche_ai.json"


def cached_ai() -> dict | None:
    return json.loads(_cache.read_text()) if _cache.exists() else None


def ai_recommend() -> dict:
    settings = config.load_settings()
    try:
        signals = trends.trending(settings["region"])
    except Exception:
        signals = []
    result = {"created": datetime.now(timezone.utc).isoformat(timespec="seconds"),
              "niches": writer.recommend_niches(settings, signals)}
    _cache.write_text(json.dumps(result, ensure_ascii=False, indent=2))
    return result
