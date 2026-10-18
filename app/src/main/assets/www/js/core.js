'use strict';
/* Inti: penyimpanan, suara, pemandu suara, utilitas, dan kerangka ronde permainan. */

const Store = (() => {
  const KEY = 'pintarceria.v1';
  const defaults = {
    stars: 0, age: 0, sound: true, voice: true, natural: true, voiceName: '', rate: 0.95,
    paths: {}, streak: { count: 0, last: '' }, daily: null,
  };
  let data = Object.assign({}, defaults);
  try { Object.assign(data, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* abaikan */ }
  if (typeof data.age !== 'number' || data.age > 10) data.age = 0; // format lama (1–3) → minta pilih ulang
  if (!data.paths || typeof data.paths !== 'object') data.paths = {};
  delete data.progress; // format level lama, diganti jalur belajar
  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* abaikan */ } }
  return {
    get: (k) => data[k],
    set(k, v) { data[k] = v; save(); },
    save,
    reset() { data.stars = 0; data.paths = {}; data.streak = { count: 0, last: '' }; data.daily = null; save(); },
    /* Progres jalur belajar per umur & kategori: { pos: node aktif, stars: {node: bintang} } */
    path(cat) {
      const k = data.age + ':' + cat;
      if (!data.paths[k]) data.paths[k] = { pos: 0, stars: {} };
      return data.paths[k];
    },
  };
})();

/* Bus peristiwa sederhana (dipakai misi harian). */
const Bus = (() => {
  const subs = {};
  return {
    on(ev, fn) { (subs[ev] = subs[ev] || []).push(fn); },
    emit(ev, data) { (subs[ev] || []).forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } }); },
  };
})();

const Sound = (() => {
  let ctx = null;
  function ac() {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, start = 0, dur = 0.15, type = 'sine', vol = 0.2, freqEnd) {
    if (!Store.get('sound')) return;
    const c = ac();
    if (!c) return;
    const t = c.currentTime + start;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  return {
    tap() { tone(660, 0, 0.08, 'triangle', 0.15); },
    correct() { [523, 659, 784].forEach((f, i) => tone(f, i * 0.09, 0.2, 'triangle', 0.2)); },
    wrong() { tone(240, 0, 0.18, 'square', 0.06, 180); },
    pop() { tone(900, 0, 0.12, 'square', 0.08, 180); },
    win() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.28, 'triangle', 0.2)); },
    note(f, dur = 0.45) { tone(f, 0, dur, 'triangle', 0.25); },
    unlock() { ac(); },
  };
})();

/* ---------- Pemandu suara ----------
 * 1. Suara natural rekaman: klip audio yang dibuat saat build (tools/voice) dan disimpan di
 *    dalam APK (www/audio), sehingga tetap jalan offline. Kalimat dipecah per koma/titik
 *    menjadi potongan; angka disusun dari klip angka.
 * 2. Cadangan: mesin TTS HP (Android: window.AndroidTTS, browser: Web Speech) bila ada
 *    potongan kalimat yang tidak punya rekaman.
 */

/* Memecah kalimat menjadi potongan ucapan (dipakai juga oleh tools/voice/phrases.js). */
function speechChunks(text) {
  return String(text).split(/[,.!?;:]+/).map((s) => s.trim()).filter(Boolean);
}
function speechKey(chunk) {
  return chunk.toLowerCase().replace(/\s+/g, ' ').trim();
}
/* Kunci rekaman kalimat utuh (dengan intonasi & jeda tanda baca yang alami). */
function sentenceKey(text) {
  const parts = speechChunks(text);
  return parts.length > 1 ? parts.map(speechKey).join(' / ') : null;
}
/* Angka 0–999 → kunci klip: 0–100 utuh, ratusan + sisa (345 → "300", "45"). */
function numberKeys(n) {
  if (n <= 100) return [String(n)];
  if (n >= 1000) return null;
  const keys = [String(Math.floor(n / 100) * 100)];
  if (n % 100) keys.push(String(n % 100));
  return keys;
}

const Voice = (() => {
  const clips = () => window.AUDIO_CLIPS || {};
  let webVoices = [];
  let webVoice = null;
  let audio = null;
  let seq = 0;

  function scoreWeb(v) {
    let s = 0;
    if (/natural|neural|online|premium|enhanced|wavenet/i.test(v.name)) s += 10;
    if (/google/i.test(v.name)) s += 5;
    return s;
  }
  function loadWeb() {
    const vs = window.speechSynthesis ? speechSynthesis.getVoices() : [];
    webVoices = vs.filter((v) => /^(id|in)([-_]|$)/i.test(v.lang)).sort((a, b) => scoreWeb(b) - scoreWeb(a));
    const saved = Store.get('voiceName');
    webVoice = webVoices.find((v) => v.name === saved) || webVoices[0] || null;
  }
  if (!window.AndroidTTS && window.speechSynthesis) {
    loadWeb();
    speechSynthesis.onvoiceschanged = loadWeb;
  }

  /* Daftar file klip untuk kalimat, atau null bila ada potongan tanpa rekaman. */
  function resolve(text) {
    const map = clips();
    // 1) Kalimat utuh direkam sekaligus → intonasi paling alami
    const whole = sentenceKey(text);
    if (whole && map[whole]) return [map[whole]];
    // 2) Disusun dari potongan (untuk kalimat berisi angka acak)
    const files = [];
    for (const chunk of speechChunks(text)) {
      const keys = /^\d+$/.test(chunk) ? numberKeys(+chunk) : [speechKey(chunk)];
      if (!keys) return null;
      for (const k of keys) {
        if (!map[k]) return null;
        files.push(map[k]);
      }
    }
    return files.length ? files : null;
  }

  function stopClips() {
    seq++;
    if (audio) { audio.pause(); audio = null; }
  }
  function stopDevice() {
    if (window.AndroidTTS) { try { window.AndroidTTS.stop(); } catch (e) { /* abaikan */ } }
    else if (window.speechSynthesis) speechSynthesis.cancel();
  }

  function playClips(files, fallbackText) {
    const my = seq;
    let i = 0;
    const next = () => {
      if (my !== seq || i >= files.length) return;
      const a = new Audio('audio/' + files[i++]);
      a.playbackRate = Math.max(0.6, Math.min(1.4, Store.get('rate') / 0.95));
      audio = a;
      a.onended = () => setTimeout(next, 70);
      a.play().catch(() => { if (my === seq && i === 1) deviceSpeak(fallbackText); });
    };
    next();
  }

  function deviceSpeak(text) {
    if (window.AndroidTTS) {
      try { window.AndroidTTS.speak(text); return; } catch (e) { /* jatuh ke Web Speech */ }
    }
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'id-ID';
    if (webVoice) u.voice = webVoice;
    u.rate = Store.get('rate');
    u.pitch = 1.05;
    speechSynthesis.speak(u);
  }

  function speak(text) {
    if (!Store.get('voice') || !text) return;
    text = String(text);
    stopClips();
    stopDevice();
    const files = Store.get('natural') ? resolve(text) : null;
    if (files) playClips(files, text);
    else deviceSpeak(text);
  }
  function stop() { stopClips(); stopDevice(); }

  function list() {
    if (window.AndroidTTS) {
      try { return JSON.parse(window.AndroidTTS.voices() || '[]'); } catch (e) { return []; }
    }
    return webVoices.map((v) => ({ name: v.name, label: v.name }));
  }
  function current() {
    if (window.AndroidTTS) { try { return window.AndroidTTS.currentVoice(); } catch (e) { return ''; } }
    return webVoice ? webVoice.name : '';
  }
  function choose(name) {
    Store.set('voiceName', name);
    if (window.AndroidTTS) { try { window.AndroidTTS.setVoice(name); } catch (e) { /* abaikan */ } }
    else webVoice = webVoices.find((v) => v.name === name) || webVoice;
  }
  function applyRate() {
    if (window.AndroidTTS) { try { window.AndroidTTS.setRate(Store.get('rate')); } catch (e) { /* abaikan */ } }
  }
  function init() {
    if (window.AndroidTTS) {
      const saved = Store.get('voiceName');
      if (saved) { try { window.AndroidTTS.setVoice(saved); } catch (e) { /* abaikan */ } }
      applyRate();
    }
  }
  const hasNatural = () => Object.keys(clips()).length > 0;
  return { speak, stop, list, current, choose, applyRate, init, resolve, hasNatural };
})();
const speak = Voice.speak;

/* ---------- Pelafalan ----------
 * Mesin TTS sering salah membaca huruf/suku kata yang berdiri sendiri (mis. "ca" dibaca "ka"),
 * karena dianggap singkatan atau kata asing. Tabel di bawah memberi ejaan yang dibaca benar.
 */
const LETTER_SAY = {
  A: 'a', B: 'bé', C: 'cé', D: 'dé', E: 'é', F: 'ef', G: 'gé', H: 'ha', I: 'i', J: 'jé', K: 'ka', L: 'el', M: 'em',
  N: 'en', O: 'o', P: 'pé', Q: 'ki', R: 'er', S: 'es', T: 'té', U: 'u', V: 'vé', W: 'wé', X: 'eks', Y: 'yé', Z: 'zet',
};
/* Nama huruf untuk diucapkan (satu kali saja, besar/kecil sama bunyinya). */
function sayLetter(ch) { return LETTER_SAY[String(ch).toUpperCase()] || ch; }

/* Suku kata terbuka (berakhir vokal) diberi "h" lembut agar dibaca sebagai suku kata
 * Indonesia: "ca" → "cah" (bukan "ka"), "bi" → "bih". */
function saySyllable(s) {
  s = String(s).toLowerCase();
  return /[aiueo]$/.test(s) && s.length <= 3 ? s + 'h' : s;
}

/* ---------- Utilitas ---------- */
function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style' && typeof v === 'object') {
      for (const [sk, sv] of Object.entries(v)) {
        if (sk.startsWith('--')) e.style.setProperty(sk, sv);
        else e.style[sk] = sv;
      }
    } else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') e.innerHTML = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) {
    if (c == null || c === false) continue;
    e.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return e;
}

const R = {
  int: (a, b) => a + Math.floor(Math.random() * (b - a + 1)),
  pick: (a) => a[Math.floor(Math.random() * a.length)],
  shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },
  sample: (a, n) => R.shuffle(a).slice(0, n),
};

/* Nilai bertingkat menurut tingkat kesulitan d (1–10):
 * D(d, a, b, c) → a untuk d 1–3, b untuk d 4–6, c untuk d 7–10 (dibagi rata). */
function D(d, ...vals) {
  const i = Math.min(vals.length - 1, Math.floor(((Math.max(1, Math.min(10, d)) - 1) * vals.length) / 10));
  return vals[i];
}

/* Mengambil item acak tanpa mengulang sampai semua sudah keluar. */
function makeBag(items) {
  let bag = [];
  let last = null;
  return () => {
    if (!bag.length) {
      bag = R.shuffle(items);
      if (bag.length > 1 && bag[bag.length - 1] === last) bag.unshift(bag.pop());
    }
    last = bag.pop();
    return last;
  };
}

/* Pilihan jawaban: jawaban + (n-1) pengecoh unik dari pool. */
function optionsWith(answer, pool, n, key = (x) => x) {
  const seen = new Set([key(answer)]);
  const others = [];
  for (const p of R.shuffle(pool)) {
    const k = key(p);
    if (seen.has(k)) continue;
    seen.add(k);
    others.push(p);
    if (others.length >= n - 1) break;
  }
  return R.shuffle([answer, ...others]);
}

/* Pilihan angka di sekitar jawaban, terurut naik. */
function numOptions(ans, n, min = 0, max = 100) {
  const set = new Set([ans]);
  let guard = 0;
  while (set.size < n && guard++ < 200) {
    const spread = Math.max(3, Math.round(Math.abs(ans) * 0.2));
    const c = ans + R.int(-spread, spread);
    if (c >= min && c <= max) set.add(c);
  }
  for (let c = min; set.size < n && c <= max; c++) set.add(c);
  return [...set].sort((a, b) => a - b);
}

const PRAISE = ['Hebat!', 'Pintar sekali!', 'Wah, bagus!', 'Luar biasa!', 'Keren!', 'Betul, mantap!', 'Kamu hebat!'];
const RETRY = ['Hmm, coba lagi ya.', 'Belum tepat, ayo coba lagi.', 'Hampir! Coba sekali lagi.'];
const PALETTE = ['#ff6b6b', '#ffa94d', '#fcc419', '#51cf66', '#20c997', '#4dabf7', '#748ffc', '#da77f2', '#f783ac'];

function shake(node) {
  node.classList.remove('shake');
  void node.offsetWidth;
  node.classList.add('shake');
}

function confetti(count = 40) {
  const layer = document.getElementById('confetti-layer');
  for (let i = 0; i < count; i++) {
    const c = h('div', {
      class: 'confetti',
      style: {
        left: Math.random() * 100 + 'vw',
        background: R.pick(PALETTE),
        animationDuration: 1.2 + Math.random() * 1.4 + 's',
        animationDelay: Math.random() * 0.3 + 's',
      },
    });
    layer.append(c);
    setTimeout(() => c.remove(), 3200);
  }
}

function floatStar(node) {
  const layer = document.getElementById('confetti-layer');
  const r = node ? node.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
  const s = h('div', { class: 'float-star', style: { left: r.left + r.width / 2 - 22 + 'px', top: r.top + r.height / 2 - 22 + 'px' } }, '⭐');
  layer.append(s);
  setTimeout(() => s.remove(), 1100);
}

/* Bintang level (1–3) dari rasio jawaban benar pada percobaan pertama. */
function starsFromRatio(r) { return r >= 0.9 ? 3 : r >= 0.6 ? 2 : 1; }

/* ---------- Kerangka ronde ----------
 * ctx    : konteks dari App (stage, d, later, addStar, finish, dead)
 * total  : jumlah ronde
 * round  : function(area, api) — menggambar satu soal.
 *          api.correct(node, sayText) & api.wrong(node, silent)
 */
function runRounds(ctx, { total = 10, round }) {
  if (ctx.capture) { ctx.capture(round); return; } // dipakai Ujian untuk mengambil soal
  const stage = ctx.stage;
  stage.innerHTML = '';
  const fill = h('div', { class: 'progress-fill' });
  const area = h('div', { class: 'round' });
  stage.append(h('div', { class: 'progress' }, fill), area);
  let i = 0;
  let firstTry = 0;

  function next() {
    if (ctx.dead) return;
    fill.style.width = (i / total) * 100 + '%';
    if (i >= total) { ctx.finish(starsFromRatio(firstTry / total)); return; }
    area.innerHTML = '';
    area.classList.remove('enter');
    void area.offsetWidth;
    area.classList.add('enter');
    let done = false;
    let missed = false;
    const api = {
      index: i,
      correct(node, sayText) {
        if (done) return;
        done = true;
        i++;
        if (!missed) firstTry++;
        Bus.emit('answer', { first: !missed });
        fill.style.width = (i / total) * 100 + '%';
        if (node) node.classList.add('good');
        if (api.onDone) api.onDone();
        Sound.correct();
        floatStar(node);
        ctx.addStar(1);
        speak((sayText ? sayText + '. ' : '') + R.pick(PRAISE));
        ctx.later(next, sayText ? 2000 : 1400);
      },
      wrong(node, silent) {
        if (done) return;
        if (!missed) Bus.emit('answer', { first: false });
        missed = true;
        Sound.wrong();
        if (node) shake(node);
        if (!silent) speak(R.pick(RETRY));
      },
    };
    round(area, api);
  }
  next();
}

/* Soal pilihan ganda generik. */
function choiceRound(area, api, opt) {
  const { prompt, say, helpSay, options, render, isCorrect, sayCorrect, cols, choiceClass } = opt;
  const sayText = say || helpSay;
  const box = h('div', { class: 'prompt' + (sayText ? '' : ' no-say') }, prompt);
  if (sayText) box.append(h('button', { class: 'btn-say', 'aria-label': 'Dengarkan', onClick: () => speak(sayText) }, '🔊'));
  const grid = h('div', { class: 'choices', style: { '--cols': cols || (options.length > 4 ? 3 : 2) } });
  options.forEach((o) => {
    const b = h('button', { class: 'choice' + (choiceClass ? ' ' + choiceClass : '') }, render(o));
    b.addEventListener('click', () => (isCorrect(o) ? api.correct(b, sayCorrect) : api.wrong(b)));
    grid.append(b);
  });
  area.append(box, grid);
  if (say) speak(say);
}

/* ---------- Registrasi permainan ----------
 * { id, cat, title, icon, color, minAge, maxAge, levels (0 = mode jelajah), start(ctx) }
 */
const GAMES = [];
function registerGame(g) { GAMES.push(Object.assign({ levels: 5 }, g)); }
