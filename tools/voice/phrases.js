#!/usr/bin/env node
/* Mendaftar semua potongan kalimat yang diucapkan aplikasi, untuk direkam oleh build_audio.py.
 * Keluaran (stdout): JSON [{ key, text }]
 *   key  = kunci klip (sama dengan speechKey() di js/core.js)
 *   text = teks yang dikirim ke mesin suara saat merekam
 * Kalimat dipecah per koma/titik (speechChunks) sehingga bagian yang berulang cukup direkam sekali.
 * Cek cakupan: tools/voice/coverage.js menjalankan aplikasi dan melaporkan kalimat yang belum terdaftar. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const WWW = path.join(__dirname, '../../app/src/main/assets/www');
const sandbox = { console, navigator: {}, localStorage: { getItem: () => null, setItem() {} } };
sandbox.window = sandbox;
vm.createContext(sandbox);
for (const f of ['js/core.js', 'js/data.js']) vm.runInContext(fs.readFileSync(path.join(WWW, f), 'utf8'), sandbox, { filename: f });
const {
  speechChunks, speechKey, sayLetter, saySyllable, PRAISE, RETRY, LETTERS, WORDS, SENTENCES, COLORS, COLOR_OBJECTS,
  SHAPES, ANIMALS, ANIMAL_TRIVIA, COUNTABLES,
} = vm.runInContext(`({ speechChunks, speechKey, sayLetter, saySyllable, PRAISE, RETRY, LETTERS, WORDS, SENTENCES,
  COLORS, COLOR_OBJECTS, SHAPES, ANIMALS, ANIMAL_TRIVIA, COUNTABLES })`, sandbox);

const out = new Map(); // key -> text
function addChunk(key, text) { if (key && !out.has(key)) out.set(key, text); }
/* Tambah kalimat lengkap: dipecah sama persis seperti saat diputar. */
function say(sentence) {
  const s = String(sentence);
  const re = /([^,.!?;:]+)([,.!?;:]*)/g;
  let m;
  while ((m = re.exec(s))) {
    const chunk = m[1].trim();
    if (!chunk || /^\d+$/.test(chunk)) continue; // angka direkam terpisah
    const end = m[2].includes('?') ? '?' : m[2].includes('!') ? '!' : '.';
    addChunk(speechKey(chunk), chunk + end);
  }
}

/* ---- Angka: 0–100 utuh + ratusan ---- */
for (let n = 0; n <= 100; n++) addChunk(String(n), String(n));
for (let n = 200; n <= 900; n += 100) addChunk(String(n), String(n));

/* ---- Nama huruf (direkam dari huruf kapitalnya agar dibaca sebagai nama huruf) ---- */
for (const L of LETTERS) addChunk(speechKey(sayLetter(L.l)), L.l + '.');

/* ---- Suku kata ---- */
const syl = new Set();
for (const c of 'BCDFGHJKLMNPRSTWY') for (const v of 'AIUEO') syl.add(c + v);
for (const w of WORDS) w.syl.forEach((s) => syl.add(s));
for (const s of syl) addChunk(speechKey(saySyllable(s)), saySyllable(s) + '.');

/* ---- Umum ---- */
PRAISE.forEach(say);
RETRY.forEach(say);

/* ---- Huruf & membaca ---- */
for (const L of LETTERS) {
  say(`${L.w}.`);
  say(`Cari huruf, ${sayLetter(L.l)}`);
  say(`Mana huruf , ${sayLetter(L.l)}?`);
  say(`Mana huruf kecil, ${sayLetter(L.l)}?`);
  say(`Ayo tulis huruf, ${sayLetter(L.l)}`);
  say(`Ayo tulis huruf kecil, ${sayLetter(L.l)}`);
  say(`Pecahkan balon huruf, ${sayLetter(L.l)}`);
}
const names = LETTERS.map((L) => L.w).concat(WORDS.map((w) => w.name));
for (const n of names) {
  say(`${n}. ${n}, dimulai dengan huruf apa?`);
  say(`Ayo susun kata, ${n}.`);
}
SENTENCES.forEach((s) => say(s.t));
say('Contoh kata');

/* ---- Angka & berhitung ---- */
say('Nol. Tidak ada apa-apa.');
for (const o of COUNTABLES) {
  say(`Ada, ${o.n}.`);
  say(`Ada berapa ${o.n}?`);
  say(`Mana ${o.n} yang lebih banyak?`);
  say(`Mana ${o.n} yang lebih sedikit?`);
}
['tambah', 'kurang', 'kali', 'bagi'].forEach((op) => say(`Berapa, ${op}, sama dengan berapa?`));
say('sama dengan');
say('Mana angka yang paling besar?');
say('Mana angka yang paling kecil?');
say('Angka berapa yang hilang?');
say('Jam berapa sekarang?');
say('jam, jam setengah, lewat seperempat, kurang seperempat, lewat, menit');
say('Ayo tulis angka');
say('Pecahkan balon angka');
say('Pecahkan balon jawaban');

/* ---- Motorik ---- */
say('Ayo menggambar! Pilih warna kesukaanmu.');
say('Pecahkan balonnya!');
say('Sentuh layarnya!');
say('Dengarkan nadanya, lalu ulangi ya!');
for (const c of COLORS) {
  say(`Pecahkan balon warna, ${c.n}`);
  say(`Mana warna ${c.n}?`);
  say(c.n);
}

/* ---- Logika & pengetahuan ---- */
for (const o of COLOR_OBJECTS) {
  say(`Apa warna ${o.n}?`);
  say(`${o.n} berwarna ${o.c}`);
}
for (const s of SHAPES) { say(`Mana bentuk ${s.n}?`); say(s.n); }
for (const a of ANIMALS) {
  say(`Mana ${a.n}?`);
  say(a.n);
  if (a.s) say(`${a.s}.`);
}
ANIMAL_TRIVIA.forEach((t) => say(t.q));
say('Mana bayangan yang cocok?');
say('Ini bayangan apa?');
say('Cari pasangan kartu yang sama!');
say('Apa gambar selanjutnya?');
say('Gambar apa yang hilang?');

/* ---- Menu, hasil, ujian, misi ---- */
for (let a = 1; a <= 10; a++) say(`Umur ${a} tahun. Ayo belajar!`);
['Belajar Huruf & Membaca', 'Belajar Angka & Berhitung', 'Motorik & Kreasi', 'Logika & Pengetahuan'].forEach(say);
say('Selesaikan pelajaran sebelumnya dulu ya.');
for (const t of ['Sempurna!', 'Hebat sekali!', 'Bagus!']) for (let s = 1; s <= 3; s++) say(`${t} Kamu dapat ${s} bintang.`);
say('Hebat! Kamu sudah belajar hari ini.');
say('Ujian dimulai! Kamu punya tiga nyawa. Semangat!');
say('Selamat! Kamu lulus ujian!');
say('Yah, nyawanya habis. Ayo belajar lagi lalu coba ujian lagi!');
say('Hore! Kamu dapat dua puluh bintang hadiah!');
say('Halo! Ayo kita belajar bersama.');
say('Cabai.');

const list = [...out].map(([key, text]) => ({ key, text }));
process.stdout.write(JSON.stringify(list, null, 1) + '\n');
