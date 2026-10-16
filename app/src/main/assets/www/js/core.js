'use strict';
/* Inti: penyimpanan, suara, pemandu suara, utilitas, dan kerangka ronde permainan. */

const Store = (() => {
  const KEY = 'pintarceria.v1';
  const defaults = { stars: 0, age: 1, sound: true, voice: true };
  let data = Object.assign({}, defaults);
  try { Object.assign(data, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* abaikan */ }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* abaikan */ } }
  return {
    get: (k) => data[k],
    set(k, v) { data[k] = v; save(); },
    reset() { data.stars = 0; save(); },
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

const Voice = (() => {
  let voice = null;
  function pickVoice() {
    const vs = window.speechSynthesis ? speechSynthesis.getVoices() : [];
    voice = vs.find((v) => /^(id|in)([-_]|$)/i.test(v.lang)) || null;
  }
  if (window.speechSynthesis) {
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  }
  function speak(text) {
    if (!Store.get('voice') || !text) return;
    text = String(text);
    if (window.AndroidTTS) {
      try { window.AndroidTTS.speak(text); return; } catch (e) { /* jatuh ke Web Speech */ }
    }
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'id-ID';
    if (voice) u.voice = voice;
    u.rate = 0.9;
    u.pitch = 1.15;
    speechSynthesis.speak(u);
  }
  function stop() {
    if (window.AndroidTTS) { try { window.AndroidTTS.stop(); } catch (e) { /* abaikan */ } }
    else if (window.speechSynthesis) speechSynthesis.cancel();
  }
  return { speak, stop };
})();
const speak = Voice.speak;

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
    }
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
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

const PRAISE = ['Hebat!', 'Pintar!', 'Bagus sekali!', 'Luar biasa!', 'Keren!', 'Mantap!', 'Betul sekali!'];
const RETRY = ['Coba lagi ya', 'Ayo coba lagi', 'Hampir benar, coba lagi'];
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

/* ---------- Kerangka ronde ----------
 * ctx    : konteks dari App (stage, level, later, addStar, finish, dead)
 * total  : jumlah ronde
 * round  : function(area, api) — menggambar satu soal.
 *          api.correct(node, sayText) & api.wrong(node, silent)
 */
function runRounds(ctx, { total = 10, round }) {
  const stage = ctx.stage;
  stage.innerHTML = '';
  const fill = h('div', { class: 'progress-fill' });
  const area = h('div', { class: 'round' });
  stage.append(h('div', { class: 'progress' }, fill), area);
  let i = 0;
  let stars = 0;

  function next() {
    if (ctx.dead) return;
    fill.style.width = (i / total) * 100 + '%';
    if (i >= total) { ctx.finish(stars, total); return; }
    area.innerHTML = '';
    area.classList.remove('enter');
    void area.offsetWidth;
    area.classList.add('enter');
    let done = false;
    const api = {
      index: i,
      correct(node, sayText) {
        if (done) return;
        done = true;
        i++;
        stars++;
        fill.style.width = (i / total) * 100 + '%';
        if (node) node.classList.add('good');
        if (api.onDone) api.onDone();
        Sound.correct();
        floatStar(node);
        ctx.addStar(1);
        speak((sayText ? sayText + '. ' : '') + R.pick(PRAISE));
        ctx.later(next, sayText ? 1900 : 1300);
      },
      wrong(node, silent) {
        if (done) return;
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

/* ---------- Registrasi permainan ---------- */
const GAMES = [];
function registerGame(g) { GAMES.push(g); }
