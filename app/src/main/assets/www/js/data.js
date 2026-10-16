'use strict';
/* Data materi belajar (Bahasa Indonesia). */

const LETTERS = [
  { l: 'A', w: 'Apel', e: '🍎' }, { l: 'B', w: 'Bola', e: '⚽' }, { l: 'C', w: 'Cabai', e: '🌶️' },
  { l: 'D', w: 'Domba', e: '🐑' }, { l: 'E', w: 'Elang', e: '🦅' }, { l: 'F', w: 'Foto', e: '📷' },
  { l: 'G', w: 'Gajah', e: '🐘' }, { l: 'H', w: 'Harimau', e: '🐯' }, { l: 'I', w: 'Ikan', e: '🐟' },
  { l: 'J', w: 'Jeruk', e: '🍊' }, { l: 'K', w: 'Kucing', e: '🐱' }, { l: 'L', w: 'Lebah', e: '🐝' },
  { l: 'M', w: 'Mobil', e: '🚗' }, { l: 'N', w: 'Nanas', e: '🍍' }, { l: 'O', w: 'Ombak', e: '🌊' },
  { l: 'P', w: 'Pisang', e: '🍌' }, { l: 'Q', w: 'Quran', e: '📖' }, { l: 'R', w: 'Rumah', e: '🏠' },
  { l: 'S', w: 'Sapi', e: '🐄' }, { l: 'T', w: 'Topi', e: '🎩' }, { l: 'U', w: 'Ular', e: '🐍' },
  { l: 'V', w: 'Vas', e: '🏺' }, { l: 'W', w: 'Wortel', e: '🥕' }, { l: 'X', w: 'Xilofon', e: '🎶' },
  { l: 'Y', w: 'Yoyo', e: '🪀' }, { l: 'Z', w: 'Zebra', e: '🦓' },
];

/* Kata dengan pemenggalan suku kata (dipisah "-") dan gambarnya. */
const WORDS = [
  'BO-LA|⚽', 'SA-PI|🐄', 'I-KAN|🐟', 'TO-PI|🎩', 'KU-DA|🐴', 'BU-KU|📖', 'MA-TA|👁️', 'RO-TI|🍞',
  'SU-SU|🥛', 'KA-KI|🦶', 'MA-DU|🍯', 'A-YAM|🐔', 'U-LAR|🐍', 'A-PEL|🍎', 'KE-JU|🧀', 'GI-GI|🦷',
  'BA-JU|👕', 'DA-UN|🍃', 'BU-LAN|🌙', 'LAM-PU|💡', 'MO-BIL|🚗', 'RU-MAH|🏠', 'GA-JAH|🐘', 'JE-RUK|🍊',
  'KA-PAL|🚢', 'JA-MUR|🍄', 'BE-BEK|🦆', 'TO-MAT|🍅', 'NA-NAS|🍍', 'LE-BAH|🐝', 'SE-MUT|🐜', 'PO-HON|🌳',
  'GI-TAR|🎸', 'KUN-CI|🔑', 'KA-TAK|🐸', 'RU-BAH|🦊', 'BU-NGA|🌸', 'SE-PA-TU|👟', 'KU-CING|🐱',
  'PI-SANG|🍌', 'KE-RE-TA|🚆', 'SE-PE-DA|🚲', 'JA-GUNG|🌽', 'PA-YUNG|☂️', 'GU-NUNG|⛰️', 'BU-RUNG|🐦',
  'KE-LIN-CI|🐰', 'HA-RI-MAU|🐯', 'PE-SA-WAT|✈️', 'BIN-TANG|⭐', 'MA-TA-HA-RI|☀️', 'SE-MANG-KA|🍉',
  'ANG-GUR|🍇', 'PE-LA-NGI|🌈', 'JE-RA-PAH|🦒', 'PING-GU-IN|🐧', 'STRO-BE-RI|🍓', 'BRO-KO-LI|🥦',
  'KA-ME-RA|📷', 'TE-LE-PON|☎️', 'KE-PI-TING|🦀', 'KE-LA-PA|🥥', 'BO-NE-KA|🪆', 'KU-RA-KU-RA|🐢',
].map((s) => {
  const [syl, e] = s.split('|');
  const parts = syl.split('-');
  const w = parts.join('');
  return { w, e, syl: parts, name: w.charAt(0) + w.slice(1).toLowerCase() };
});

function wordsForLevel(level) {
  if (level === 1) return WORDS.filter((x) => x.w.length <= 4);
  if (level === 2) return WORDS.filter((x) => x.w.length >= 4 && x.w.length <= 6);
  return WORDS.filter((x) => x.w.length >= 5);
}

const COLORS = [
  { n: 'merah', c: '#e03131' }, { n: 'kuning', c: '#fcc419' }, { n: 'biru', c: '#1c7ed6' },
  { n: 'hijau', c: '#2f9e44' }, { n: 'oranye', c: '#fd7e14' }, { n: 'ungu', c: '#7048e8' },
  { n: 'merah muda', c: '#f783ac' }, { n: 'coklat', c: '#8b5a2b' }, { n: 'hitam', c: '#212529' },
  { n: 'putih', c: '#ffffff' }, { n: 'abu-abu', c: '#adb5bd' },
];

const COLOR_OBJECTS = [
  { e: '🍌', n: 'pisang', c: 'kuning' }, { e: '🍅', n: 'tomat', c: 'merah' }, { e: '🍓', n: 'stroberi', c: 'merah' },
  { e: '🥦', n: 'brokoli', c: 'hijau' }, { e: '🐸', n: 'katak', c: 'hijau' }, { e: '🍆', n: 'terong', c: 'ungu' },
  { e: '🍇', n: 'anggur', c: 'ungu' }, { e: '🥕', n: 'wortel', c: 'oranye' }, { e: '🍊', n: 'jeruk', c: 'oranye' },
  { e: '🐘', n: 'gajah', c: 'abu-abu' }, { e: '☁️', n: 'awan', c: 'putih' }, { e: '🍫', n: 'cokelat', c: 'coklat' },
  { e: '🐳', n: 'paus', c: 'biru' }, { e: '🌽', n: 'jagung', c: 'kuning' }, { e: '🐷', n: 'babi', c: 'merah muda' },
];

function polygon(n, r = 42, cx = 50, cy = 52, rot = -90, inner) {
  const pts = [];
  const steps = inner ? n * 2 : n;
  for (let i = 0; i < steps; i++) {
    const rr = inner && i % 2 ? inner : r;
    const a = ((rot + (360 / steps) * i) * Math.PI) / 180;
    pts.push((cx + rr * Math.cos(a)).toFixed(1) + ',' + (cy + rr * Math.sin(a)).toFixed(1));
  }
  return `<polygon points="${pts.join(' ')}"/>`;
}

const SHAPES = [
  { n: 'lingkaran', svg: '<circle cx="50" cy="50" r="42"/>' },
  { n: 'persegi', svg: '<rect x="12" y="12" width="76" height="76" rx="4"/>' },
  { n: 'segitiga', svg: '<polygon points="50,8 93,88 7,88"/>' },
  { n: 'bintang', svg: polygon(5, 46, 50, 54, -90, 19) },
  { n: 'persegi panjang', svg: '<rect x="4" y="26" width="92" height="48" rx="4"/>' },
  { n: 'hati', svg: '<path d="M50 90 C12 62 2 38 22 20 C36 8 50 18 50 30 C50 18 64 8 78 20 C98 38 88 62 50 90Z"/>' },
  { n: 'oval', svg: '<ellipse cx="50" cy="50" rx="46" ry="30"/>' },
  { n: 'belah ketupat', svg: '<polygon points="50,4 90,50 50,96 10,50"/>' },
  { n: 'segi lima', svg: polygon(5, 46, 50, 54) },
  { n: 'segi enam', svg: polygon(6, 46, 50, 50, 0) },
];

const ANIMALS = [
  { n: 'Kucing', e: '🐱', s: 'meong, meong' }, { n: 'Anjing', e: '🐶', s: 'guk, guk' },
  { n: 'Sapi', e: '🐄', s: 'mooo' }, { n: 'Ayam', e: '🐔', s: 'kukuruyuk' },
  { n: 'Bebek', e: '🦆', s: 'kwek, kwek' }, { n: 'Kambing', e: '🐐', s: 'mbeeek' },
  { n: 'Kuda', e: '🐴', s: 'hiiihiii' }, { n: 'Singa', e: '🦁', s: 'aummm' },
  { n: 'Katak', e: '🐸', s: 'kwok, kwok' }, { n: 'Burung', e: '🐦', s: 'cuit, cuit' },
  { n: 'Monyet', e: '🐒', s: 'uuk aak' }, { n: 'Lebah', e: '🐝', s: 'bzzzz' },
  { n: 'Ular', e: '🐍', s: 'sssss' }, { n: 'Tikus', e: '🐭', s: 'cit, cit' },
  { n: 'Domba', e: '🐑', s: 'mbeee' }, { n: 'Burung Hantu', e: '🦉', s: 'kuk, kuk' },
  { n: 'Gajah', e: '🐘' }, { n: 'Ikan', e: '🐟' }, { n: 'Kelinci', e: '🐰' }, { n: 'Jerapah', e: '🦒' },
  { n: 'Zebra', e: '🦓' }, { n: 'Kura-kura', e: '🐢' }, { n: 'Paus', e: '🐋' }, { n: 'Lumba-lumba', e: '🐬' },
  { n: 'Gurita', e: '🐙' }, { n: 'Kupu-kupu', e: '🦋' }, { n: 'Harimau', e: '🐯' }, { n: 'Penguin', e: '🐧' },
  { n: 'Panda', e: '🐼' }, { n: 'Beruang', e: '🐻' }, { n: 'Unta', e: '🐫' }, { n: 'Kepiting', e: '🦀' },
];
const animal = (n) => ANIMALS.find((a) => a.n === n);

const LAND = ['Kucing', 'Anjing', 'Sapi', 'Kambing', 'Kuda', 'Singa', 'Gajah', 'Jerapah', 'Zebra', 'Harimau', 'Kelinci', 'Tikus', 'Domba', 'Monyet', 'Panda', 'Beruang', 'Unta'];
const ANIMAL_TRIVIA = [
  { q: 'Hewan mana yang hidup di air?', a: ['Ikan', 'Paus', 'Lumba-lumba', 'Gurita'] },
  { q: 'Hewan mana yang bisa terbang?', a: ['Burung', 'Lebah', 'Kupu-kupu', 'Burung Hantu'] },
  { q: 'Hewan mana yang punya belalai?', a: ['Gajah'] },
  { q: 'Hewan mana yang lehernya panjang?', a: ['Jerapah'] },
  { q: 'Hewan mana yang memberi kita susu?', a: ['Sapi'] },
  { q: 'Hewan mana yang membuat madu?', a: ['Lebah'] },
  { q: 'Hewan mana yang berkokok di pagi hari?', a: ['Ayam'] },
  { q: 'Hewan mana yang punya punuk di punggungnya?', a: ['Unta'] },
  { q: 'Hewan mana yang tubuhnya bergaris hitam putih?', a: ['Zebra'] },
  { q: 'Hewan mana yang membawa rumah di punggungnya?', a: ['Kura-kura'] },
  { q: 'Hewan mana yang suka makan wortel?', a: ['Kelinci'] },
  { q: 'Hewan mana yang suka makan bambu?', a: ['Panda'] },
  { q: 'Hewan mana yang punya delapan kaki dan hidup di laut?', a: ['Gurita'] },
];

const COUNTABLES = [
  { e: '🍎', n: 'apel' }, { e: '🐟', n: 'ikan' }, { e: '⭐', n: 'bintang' }, { e: '🚗', n: 'mobil' },
  { e: '🎈', n: 'balon' }, { e: '🐤', n: 'anak ayam' }, { e: '🍪', n: 'kue' }, { e: '🌸', n: 'bunga' },
  { e: '⚽', n: 'bola' }, { e: '🦋', n: 'kupu-kupu' }, { e: '🍓', n: 'stroberi' }, { e: '🐞', n: 'kepik' },
];

const OBJECTS = ['🍎', '🍌', '🍇', '🍓', '🍉', '🍒', '🥕', '🌽', '🚗', '🚲', '✈️', '🚀', '⚽', '🏀', '🎈', '🎁', '⭐', '🌙', '☀️', '🌈', '🐱', '🐶', '🐰', '🐻', '🐸', '🐵', '🦁', '🐘', '🦒', '🐢', '🐟', '🦋', '🐞', '🌸', '🌻', '🍄', '🏠', '⏰', '🔑', '✏️'];

const SHADOW_ITEMS = ['🐘', '🦒', '🐢', '🐇', '🦋', '🐟', '🐌', '🦀', '🐓', '🦆', '🐈', '🐕', '🐄', '🐎', '🦁', '🐪', '✈️', '🚲', '🚗', '🚂', '🏠', '🌳', '🍎', '🍌', '🍐', '☂️', '⏰', '🎸', '🔑', '✂️', '🚀', '⛵', '🦕', '🐿️', '🦔'];
