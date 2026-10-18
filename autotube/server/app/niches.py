"""Daftar niche faceless yang cocok untuk AutoTube + rekomendasi AI dari tren terbaru."""
import json
from datetime import datetime, timezone

from . import config, trends, writer

# Kurasi niche faceless: visual mudah diwakili stok video, evergreen, cocok Shorts + video panjang.
# rpm/competition adalah perkiraan kualitatif relatif terhadap pasarnya, bukan angka pasti.
# Penonton tier-1 berbahasa Inggris (AS, Inggris, Kanada, Australia). Nama niche dalam bahasa Inggris
# karena dipakai sebagai kata kunci riset tren di YouTube.
GLOBAL = [
    {"name": "business stories and how companies make money", "category_id": "27", "rpm": "tinggi", "competition": "sedang", "recommended": True,
     "why": "RPM tinggi dan persaingan lebih longgar dibanding keuangan murni; cerita perusahaan cocok untuk video panjang dengan jam tayang tinggi.",
     "audience": "Pria & wanita 18–45 tahun di AS/UK, peminat bisnis",
     "risk": "Pakai fakta publik; hindari tuduhan terhadap perusahaan atau orang nyata.",
     "sample_titles": ["How a Tiny Brand Outsold the Giants", "The Pricing Trick Every Supermarket Uses", "Why Some Billion-Dollar Startups Collapse"]},
    {"name": "personal finance and money psychology", "category_id": "27", "rpm": "tinggi", "competition": "tinggi", "recommended": True,
     "why": "Salah satu RPM tertinggi di YouTube; topik praktis yang dicari setiap hari.",
     "audience": "22–45 tahun, karyawan & keluarga muda di AS/UK/CA/AU",
     "risk": "Persaingan sangat ketat; jangan memberi saran investasi spesifik atau janji untung.",
     "sample_titles": ["Why Your Paycheck Disappears So Fast", "The 50/30/20 Rule Explained in 60 Seconds", "Habits That Quietly Keep People Broke"]},
    {"name": "AI tools and technology explained", "category_id": "28", "rpm": "tinggi", "competition": "tinggi", "recommended": True,
     "why": "Pengiklan teknologi membayar mahal; topik baru muncul setiap minggu.",
     "audience": "18–40 tahun, pekerja & pelajar",
     "risk": "Info cepat usang; pastikan fitur/harga yang disebut benar.",
     "sample_titles": ["How AI Actually Reads an Image", "5 Hidden Phone Features Nobody Uses", "Why Batteries Die Faster in Winter"]},
    {"name": "why expensive things cost so much", "category_id": "27", "rpm": "tinggi", "competition": "sedang", "recommended": False,
     "why": "Rasa penasaran tinggi, cocok Shorts dan video panjang; visual barang mewah banyak di stok video.",
     "audience": "18–45 tahun",
     "risk": "Harga harus akurat; hindari promosi merek terselubung.",
     "sample_titles": ["Why Saffron Costs More Than Gold", "Why Swiss Watches Are So Expensive", "The Real Cost of a Private Island"]},
    {"name": "space and science explained", "category_id": "28", "rpm": "sedang", "competition": "tinggi", "recommended": False,
     "why": "Evergreen, ide tidak habis, stok video luar angkasa sangat banyak.",
     "audience": "Semua umur 13+",
     "risk": "Banyak channel besar; perlu sudut pandang unik. Hindari teori konspirasi.",
     "sample_titles": ["What If the Moon Disappeared Tonight?", "How Big Is the Sun, Really?", "Why the Ocean Is Salty but Rivers Aren't"]},
    {"name": "history mysteries and ancient civilizations", "category_id": "27", "rpm": "sedang", "competition": "tinggi", "recommended": False,
     "why": "Video panjang dengan durasi tonton tinggi; cocok untuk narasi suara.",
     "audience": "18–55 tahun, mayoritas pria",
     "risk": "Stok video sejarah terbatas; visual sering generik.",
     "sample_titles": ["The City That Vanished Overnight", "Why the Pyramids Were Built in the Desert", "Accidental Discoveries That Changed History"]},
    {"name": "geography and how countries work", "category_id": "27", "rpm": "sedang", "competition": "sedang", "recommended": False,
     "why": "Persaingan menengah; stok video kota & alam melimpah.",
     "audience": "15–40 tahun",
     "risk": "Perbarui data (populasi, harga) secara berkala; hindari isu politik.",
     "sample_titles": ["How the World's Smallest Country Makes Money", "Why Japan Has So Few Trash Cans", "The Most Expensive Cities to Live In"]},
    {"name": "psychology and human behavior", "category_id": "27", "rpm": "sedang", "competition": "tinggi", "recommended": False,
     "why": "Relatable dan sering dibagikan; cocok Shorts.",
     "audience": "17–35 tahun",
     "risk": "Jangan mendiagnosis kondisi mental; persaingan sangat ketat.",
     "sample_titles": ["Why We Procrastinate (It's Not Laziness)", "Small Tricks That Make People Trust You", "Signs You're Too Hard on Yourself"]},
]

# Penonton Indonesia.
LOCAL = [
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

CURATED = {"global": GLOBAL, "local": LOCAL}

_cache = config.DATA_DIR / "niche_ai.json"


def cached_ai(audience: str) -> dict | None:
    if not _cache.exists():
        return None
    data = json.loads(_cache.read_text())
    return data if data.get("audience", "local") == audience else None


def ai_recommend() -> dict:
    settings = config.load_settings()
    try:
        signals = trends.trending(settings["region"])
    except Exception:
        signals = []
    result = {"created": datetime.now(timezone.utc).isoformat(timespec="seconds"), "audience": settings["audience"],
              "niches": writer.recommend_niches(settings, signals)}
    _cache.write_text(json.dumps(result, ensure_ascii=False, indent=2))
    return result
