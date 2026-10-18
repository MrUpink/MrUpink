'use strict';
/* Permainan motorik & kreativitas. ctx.d = tingkat kesulitan 1–10, ctx.age = umur anak. */

const FONT = '900 {S}px "Nunito", "Roboto", "Arial Black", sans-serif';

/* Kanvas seukuran elemen pembungkus, dengan devicePixelRatio. */
function fitCanvas(canvas, wrap) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = wrap.clientWidth, hgt = wrap.clientHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(hgt * dpr);
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { g, w, h: hgt };
}

function pointerPos(e, canvas) {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

/* Menebalkan karakter dengan jari. chars = daftar karakter untuk satu level. */
function tracingGame(ctx, chars, kind) {
  const age = ctx.age;
  let idx = 0, solved = false, good = 0;
  const SCALE = 4; // resolusi rendah untuk pengecekan
  const fill = h('div', { class: 'progress-fill' });
  const wrap = h('div', { class: 'canvas-wrap' });
  const guide = h('canvas');
  const draw = h('canvas');
  wrap.append(guide, draw);
  const msg = h('div', { class: 'trace-msg' });
  const tools = h('div', { class: 'toolbar' },
    h('button', { class: 'btn btn-yellow btn-small', onClick: () => setup() }, '🧽 Hapus'),
    h('button', { class: 'btn btn-blue btn-small', onClick: () => speak(sayChar(chars[idx])) }, '🔊 Dengar'),
    h('button', { class: 'btn btn-blue btn-small', onClick: () => advance() }, 'Lewati ▶'));
  ctx.stage.append(h('div', { class: 'progress' }, fill), tools, wrap, msg);

  const sayChar = (ch) => (kind === 'angka' ? ch : sayLetter(ch));
  const [needCov, needPrec] = age <= 3 ? [0.55, 0.3] : age <= 5 ? [0.65, 0.4] : age <= 7 ? [0.75, 0.5] : [0.8, 0.6];
  let dg, W, H, brush, maskPts = [], zone = null, low, lowG, color;

  function advance() {
    idx++;
    fill.style.width = (idx / chars.length) * 100 + '%';
    if (idx >= chars.length) { ctx.finish(starsFromRatio(good / chars.length)); return; }
    setup();
  }

  function setup() {
    if (ctx.dead || idx >= chars.length) return;
    solved = false;
    const ch = chars[idx];
    ({ w: W, h: H } = fitCanvas(guide, wrap));
    const gg = guide.getContext('2d');
    dg = fitCanvas(draw, wrap).g;
    const size = Math.min(W * (ch.length > 1 ? 0.5 : 0.85), H * 0.82);
    brush = Math.max(18, size * 0.11);
    const font = FONT.replace('{S}', Math.round(size));
    gg.clearRect(0, 0, W, H);
    gg.strokeStyle = '#e9ecef'; gg.lineWidth = 2; gg.setLineDash([10, 8]);
    [0.2, 0.5, 0.8].forEach((f) => { gg.beginPath(); gg.moveTo(0, H * f); gg.lineTo(W, H * f); gg.stroke(); });
    gg.setLineDash([]);
    gg.font = font; gg.textAlign = 'center'; gg.textBaseline = 'middle';
    gg.fillStyle = '#dee2e6';
    gg.fillText(ch, W / 2, H / 2);
    gg.lineWidth = 3; gg.strokeStyle = '#adb5bd'; gg.setLineDash([6, 6]);
    gg.strokeText(ch, W / 2, H / 2);
    gg.setLineDash([]);
    // Masker resolusi rendah untuk menilai hasil
    const lw = Math.ceil(W / SCALE), lh = Math.ceil(H / SCALE);
    const m = document.createElement('canvas');
    m.width = lw; m.height = lh;
    const mg = m.getContext('2d');
    mg.scale(1 / SCALE, 1 / SCALE);
    mg.font = font; mg.textAlign = 'center'; mg.textBaseline = 'middle';
    mg.fillText(ch, W / 2, H / 2);
    const md = mg.getImageData(0, 0, lw, lh).data;
    maskPts = [];
    for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) if (md[(y * lw + x) * 4 + 3] > 128) maskPts.push(y * lw + x);
    mg.lineWidth = brush * 1.2; mg.lineJoin = 'round';
    mg.strokeText(ch, W / 2, H / 2);
    const zd = mg.getImageData(0, 0, lw, lh).data;
    zone = new Uint8Array(lw * lh);
    for (let i = 0; i < zone.length; i++) zone[i] = zd[i * 4 + 3] > 40 ? 1 : 0;
    low = document.createElement('canvas');
    low.width = lw; low.height = lh;
    lowG = low.getContext('2d');
    lowG.scale(1 / SCALE, 1 / SCALE);
    msg.textContent = `Tebalkan ${kind === 'angka' ? 'angka' : 'huruf'} ${ch} dengan jarimu ✋`;
    speak(kind === 'angka' ? `Ayo tulis angka, ${ch}` : `Ayo tulis huruf ${ch === ch.toLowerCase() ? 'kecil' : ''}, ${sayLetter(ch)}`);
  }

  let last = null;
  function line(a, b) {
    for (const g of [dg, lowG]) {
      g.strokeStyle = color; g.lineWidth = brush; g.lineCap = g.lineJoin = 'round';
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
    }
  }
  draw.addEventListener('pointerdown', (e) => {
    if (solved) return;
    draw.setPointerCapture(e.pointerId);
    color = PALETTE[R.int(0, PALETTE.length - 1)];
    last = pointerPos(e, draw);
    line(last, { x: last.x + 0.1, y: last.y });
  });
  draw.addEventListener('pointermove', (e) => {
    if (!last) return;
    const p = pointerPos(e, draw);
    line(last, p);
    last = p;
  });
  const end = () => { if (last) { last = null; check(); } };
  draw.addEventListener('pointerup', end);
  draw.addEventListener('pointercancel', end);

  function check() {
    if (solved || !maskPts.length) return;
    const dd = lowG.getImageData(0, 0, low.width, low.height).data;
    let hit = 0;
    for (const i of maskPts) if (dd[i * 4 + 3] > 0) hit++;
    let inside = 0, total = 0;
    for (let i = 0; i < zone.length; i++) if (dd[i * 4 + 3] > 0) { total++; if (zone[i]) inside++; }
    const coverage = hit / maskPts.length;
    const precision = total ? inside / total : 0;
    if (coverage >= needCov && precision >= needPrec) {
      solved = true;
      good++;
      Sound.correct();
      confetti(30);
      floatStar(wrap);
      ctx.addStar(1);
      msg.textContent = '🎉 ' + R.pick(PRAISE);
      speak(`${sayChar(chars[idx])}. ${R.pick(PRAISE)}`);
      ctx.later(advance, 1800);
    } else if (precision < needPrec && total > 40) {
      msg.textContent = 'Ikuti garis abu-abu ya 🙂';
    } else {
      msg.textContent = `Terus! ${Math.round(Math.min(1, coverage / needCov) * 100)}% ✨`;
    }
  }

  requestAnimationFrame(setup);
  const onResize = () => setup();
  window.addEventListener('resize', onResize);
  ctx.onCleanup(() => window.removeEventListener('resize', onResize));
}

registerGame({
  id: 'menulis-huruf', cat: 'huruf', title: 'Menulis Huruf', icon: '✏️', color: '#339af0', minAge: 3, maxAge: 8,
  levelNames: ['A – F', 'G – M', 'N – S', 'T – Z', 'a – z'],
  start(ctx) {
    const sets = ['ABCDEF', 'GHIJKLM', 'NOPQRS', 'TUVWXYZ'];
    const chars = ctx.level <= 4 ? sets[ctx.level - 1].split('') : R.sample('abcdefghijklmnopqrstuvwxyz'.split(''), 8);
    tracingGame(ctx, chars, 'huruf');
  },
});

registerGame({
  id: 'menulis-angka', cat: 'angka', title: 'Menulis Angka', icon: '✍️', color: '#22b8cf', minAge: 3, maxAge: 7,
  levels: 3, levelNames: ['0 – 4', '5 – 9', '10 – 20'],
  start(ctx) {
    const chars = ctx.level === 1 ? '01234'.split('') : ctx.level === 2 ? '56789'.split('')
      : R.sample(Array.from({ length: 11 }, (_, i) => String(10 + i)), 5);
    tracingGame(ctx, chars, 'angka');
  },
});

registerGame({
  id: 'menggambar', cat: 'motorik', title: 'Menggambar', icon: '🎨', color: '#da77f2', minAge: 1, maxAge: 10, levels: 0,
  start(ctx) {
    const colors = ['#e03131', '#fd7e14', '#fcc419', '#2f9e44', '#1c7ed6', '#7048e8', '#f783ac', '#8b5a2b', '#212529'];
    const stamps = ['⭐', '❤️', '🌸', '🐱', '🐶', '🦋', '🌈', '☀️', '🚗', '🎈'];
    let color = colors[0], size = 14, tool = 'pen', stamp = stamps[0];
    const wrap = h('div', { class: 'canvas-wrap' });
    const canvas = h('canvas');
    wrap.append(canvas);
    const colorRow = h('div', { class: 'toolbar' });
    colors.forEach((c) => {
      const b = h('button', { class: 'color-dot' + (c === color ? ' on' : ''), style: { background: c }, 'aria-label': c });
      b.addEventListener('click', () => {
        colorRow.querySelectorAll('.color-dot').forEach((x) => x.classList.remove('on'));
        b.classList.add('on'); color = c; tool = 'pen'; mark();
      });
      colorRow.append(b);
    });
    const toolRow = h('div', { class: 'toolbar' });
    const toolBtns = {};
    function mark() { Object.entries(toolBtns).forEach(([k, b]) => b.classList.toggle('on', k === tool || k === 'size' + size)); }
    [['size8', '•', 8], ['size14', '●', 14], ['size28', '⬤', 28]].forEach(([k, l, s]) => {
      toolBtns[k] = h('button', { class: 'chip', onClick: () => { size = s; if (tool !== 'pen') tool = 'pen'; mark(); } }, l);
      toolRow.append(toolBtns[k]);
    });
    toolBtns.eraser = h('button', { class: 'chip', onClick: () => { tool = 'eraser'; mark(); } }, '🧽');
    toolBtns.stamp = h('button', { class: 'chip', onClick: () => { tool = 'stamp'; stamp = R.pick(stamps); toolBtns.stamp.textContent = stamp; mark(); } }, stamp);
    toolRow.append(toolBtns.eraser, toolBtns.stamp,
      h('button', { class: 'chip', onClick: () => { clear(); Sound.pop(); } }, '🗑️'));
    ctx.stage.append(colorRow, toolRow, wrap);

    let g, W, H;
    function clear() { g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); }
    function setup() {
      let old = null;
      try { old = g ? canvas.toDataURL() : null; } catch (e) { /* kanvas berisi gambar stempel (tainted) */ }
      ({ g, w: W, h: H } = fitCanvas(canvas, wrap));
      clear();
      if (old) { const img = new Image(); img.onload = () => g.drawImage(img, 0, 0, W, H); img.src = old; }
    }
    let last = null;
    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId);
      const p = pointerPos(e, canvas);
      if (tool === 'stamp') {
        const img = Emoji.image(stamp);
        const s = size * 4;
        if (img && img.complete && img.naturalWidth) g.drawImage(img, p.x - s / 2, p.y - s / 2, s, s);
        else { g.font = `${s}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(stamp, p.x, p.y); }
        Sound.pop();
        return;
      }
      last = p;
      stroke(p, { x: p.x + 0.1, y: p.y });
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!last) return;
      const p = pointerPos(e, canvas);
      stroke(last, p);
      last = p;
    });
    const end = () => { last = null; };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    function stroke(a, b) {
      g.strokeStyle = tool === 'eraser' ? '#fff' : color;
      g.lineWidth = tool === 'eraser' ? size * 2.5 : size;
      g.lineCap = g.lineJoin = 'round';
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
    }
    mark();
    requestAnimationFrame(setup);
    const onResize = () => setup();
    window.addEventListener('resize', onResize);
    ctx.onCleanup(() => window.removeEventListener('resize', onResize));
    speak('Ayo menggambar! Pilih warna kesukaanmu.');
  },
});

registerGame({
  id: 'balon', cat: 'motorik', title: 'Pecah Balon', icon: '🎈', color: '#ff8787', minAge: 1, maxAge: 10,
  start(ctx) {
    const d = ctx.d;
    const GOAL = D(d, 8, 10, 10, 10, 10, 10, 10, 12, 12, 15);
    // Jenis target per tingkat: semua balon → warna → huruf → angka → penjumlahan → campuran
    const mode = D(d, 'any', 'any', 'color', 'color', 'letter', 'number', 'add', 'add', 'addsub', 'mul');
    const speedMin = D(d, 35, 45, 45, 55, 55, 60, 60, 75, 85, 95);
    const interval = D(d, 1.5, 1.3, 1.3, 1.2, 1.1, 1.0, 1.0, 0.9, 0.8, 0.7);
    const BCOLORS = COLORS.filter((c) => ['merah', 'kuning', 'biru', 'hijau', 'ungu', 'oranye'].includes(c.n));
    const hud = h('div', { class: 'hud' });
    const sky = h('div', { class: 'sky' });
    ctx.stage.append(hud, sky);
    let popped = 0, misses = 0, target = null, label = '';
    const balloons = [];

    function newTarget() {
      let sayText;
      if (mode === 'any') { target = null; label = ''; sayText = 'Pecahkan balonnya!'; }
      else if (mode === 'color') { target = R.pick(BCOLORS).n; label = `balon ${target}`; sayText = `Pecahkan balon warna, ${target}`; }
      else if (mode === 'letter') { target = R.pick(LETTERS).l; label = `huruf ${target}`; sayText = `Pecahkan balon huruf, ${sayLetter(target)}`; }
      else if (mode === 'number') { target = String(R.int(1, 10)); label = `angka ${target}`; sayText = `Pecahkan balon angka, ${target}`; }
      else {
        let a, b, op;
        if (mode === 'add') { a = R.int(1, d >= 8 ? 9 : 5); b = R.int(1, d >= 8 ? 9 : 5); op = '+'; }
        else if (mode === 'addsub') { op = R.pick(['+', '−']); a = R.int(5, 15); b = R.int(1, op === '+' ? 9 : a - 1); }
        else { op = '×'; a = R.int(2, 5); b = R.int(1, 5); }
        const ans = op === '+' ? a + b : op === '−' ? a - b : a * b;
        target = String(ans);
        label = `${a} ${op} ${b}`;
        sayText = `Pecahkan balon jawaban, ${a}, ${op === '+' ? 'tambah' : op === '−' ? 'kurang' : 'kali'}, ${b}`;
      }
      updateHud();
      speak(sayText);
    }
    function updateHud() {
      hud.textContent = (mode === 'any' ? '🎈 Pecahkan balon!' : `🎯 Cari: ${label}`) + `   ${popped}/${GOAL}`;
    }
    function decoy() {
      if (mode === 'letter') return R.pick(LETTERS).l;
      if (mode === 'number') return String(R.int(1, 10));
      const t = +target;
      return String(Math.max(0, t + R.pick([-3, -2, -1, 1, 2, 3])));
    }
    function spawn() {
      if (ctx.dead) return;
      const W = sky.clientWidth, H = sky.clientHeight;
      const isTarget = mode === 'any' || Math.random() < 0.4;
      let text = '', bg = R.pick(BCOLORS).c, key = '';
      if (mode === 'any') text = R.pick(['', '', R.pick(OBJECTS)]);
      else if (mode === 'color') { const c = isTarget ? BCOLORS.find((x) => x.n === target) : R.pick(BCOLORS); bg = c.c; key = c.n; }
      else { text = isTarget ? target : decoy(); key = text; }
      const b = h('div', { class: 'balloon', style: { background: bg } }, text);
      const o = { el: b, x: R.int(4, Math.max(5, W - 84)), y: H + 10, v: speedMin + Math.random() * 40, sway: Math.random() * 6 };
      b.style.transform = `translate(${o.x}px, ${o.y}px)`;
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (popped >= GOAL) return;
        const ok = mode === 'any' || key === target;
        if (!ok) { misses++; Sound.wrong(); shake(b); return; }
        Sound.pop();
        const burst = h('div', { class: 'burst', style: { left: o.x + 39 + 'px', top: o.y + 47 + 'px' } }, '💥');
        sky.append(burst);
        setTimeout(() => burst.remove(), 500);
        remove(o);
        popped++;
        ctx.addStar(1);
        if (popped >= GOAL) {
          updateHud();
          ctx.later(() => ctx.finish(starsFromRatio(GOAL / (GOAL + misses))), 500);
          return;
        }
        if (mode === 'any') updateHud();
        else if (['add', 'addsub', 'mul'].includes(mode) || popped % 3 === 0) newTarget();
        else updateHud();
      });
      sky.append(b);
      balloons.push(o);
    }
    function remove(o) {
      const i = balloons.indexOf(o);
      if (i >= 0) balloons.splice(i, 1);
      o.el.remove();
    }
    let lastT = performance.now(), spawnAcc = 0;
    function frame(t) {
      if (ctx.dead) return;
      const dt = Math.min(0.05, (t - lastT) / 1000);
      lastT = t;
      spawnAcc += dt;
      if (spawnAcc >= interval && popped < GOAL) { spawnAcc = 0; spawn(); }
      for (const o of balloons.slice()) {
        o.y -= o.v * dt;
        const sx = Math.sin(t / 600 + o.sway) * 8;
        o.el.style.transform = `translate(${o.x + sx}px, ${o.y}px)`;
        if (o.y < -150) remove(o);
      }
      requestAnimationFrame(frame);
    }
    newTarget();
    spawn();
    requestAnimationFrame(frame);
  },
});

registerGame({
  id: 'sentuh', cat: 'motorik', title: 'Sentuh & Dengar', icon: '👆', color: '#ffd43b', minAge: 1, maxAge: 3, levels: 0,
  start(ctx) {
    const area = h('div', { class: 'touch-area' }, h('div', { class: 'touch-hint' }, 'Sentuh di mana saja! 👆'));
    ctx.stage.append(area);
    const notes = [262, 294, 330, 392, 440, 523, 587, 659];
    let lastSpeak = 0;
    area.addEventListener('pointerdown', (e) => {
      const r = area.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const a = R.pick(ANIMALS);
      Sound.note(notes[Math.min(notes.length - 1, Math.floor((1 - y / r.height) * notes.length))]);
      const s = h('div', { class: 'spawn', style: { left: x + 'px', top: y + 'px' } }, a.e);
      const rp = h('div', { class: 'ripple', style: { left: x + 'px', top: y + 'px', borderColor: R.pick(PALETTE) } });
      area.append(rp, s);
      setTimeout(() => { s.remove(); rp.remove(); }, 1800);
      const now = Date.now();
      if (now - lastSpeak > 1400) { lastSpeak = now; speak(a.s ? `${a.n}, ${a.s}` : a.n); }
    });
    speak('Sentuh layarnya!');
  },
});

const PIANO_KEYS = [
  { f: 262, n: 'do', e: '🐱' }, { f: 294, n: 're', e: '🐶' }, { f: 330, n: 'mi', e: '🐸' }, { f: 349, n: 'fa', e: '🐤' },
  { f: 392, n: 'sol', e: '🐰' }, { f: 440, n: 'la', e: '🐻' }, { f: 494, n: 'si', e: '🦁' }, { f: 523, n: 'do', e: '🐵' },
];
const PIANO_COLORS = ['#ff6b6b', '#ffa94d', '#fcc419', '#51cf66', '#20c997', '#4dabf7', '#748ffc', '#da77f2'];

function pianoKeys(count, onPress) {
  const piano = h('div', { class: 'piano', style: { gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` } });
  const els = PIANO_KEYS.slice(0, count).map((k, i) => {
    const b = h('button', { class: 'key', style: { background: PIANO_COLORS[i] } }, h('span', { class: 'k-emoji' }, k.e), k.n);
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); onPress(i); });
    piano.append(b);
    return b;
  });
  const flash = (i, dur = 300) => {
    els[i].classList.add('lit');
    Sound.note(PIANO_KEYS[i].f);
    setTimeout(() => els[i].classList.remove('lit'), dur);
  };
  return { piano, flash };
}

registerGame({
  id: 'piano', cat: 'motorik', title: 'Piano Hewan', icon: '🎹', color: '#9775fa', minAge: 1, maxAge: 10, levels: 0,
  start(ctx) {
    const { piano, flash } = pianoKeys(8, (i) => flash(i, 180));
    ctx.stage.append(h('div', { class: 'hud' }, '🎵 Mainkan musikmu!'), piano);
  },
});

registerGame({
  id: 'ingat-nada', cat: 'logika', title: 'Ingat Nada', icon: '🧠', color: '#7950f2', minAge: 3, maxAge: 10,
  start(ctx) {
    const d = ctx.d;
    const count = D(d, 3, 4, 4, 5, 6, 6, 7, 8, 8, 8);
    const goal = D(d, 2, 3, 3, 4, 4, 5, 5, 6, 7, 8);
    const speed = D(d, 800, 750, 700, 650, 650, 600, 550, 500, 450, 400);
    const info = h('div', { class: 'hud' });
    const { piano, flash } = pianoKeys(count, press);
    ctx.stage.append(info, piano);
    let seq = [R.int(0, count - 1)], step = 0, listening = false, token = 0, mistakes = 0;

    function press(i) {
      if (!listening) return;
      flash(i, 180);
      if (i === seq[step]) {
        step++;
        if (step < seq.length) return;
        listening = false;
        ctx.addStar(1);
        floatStar(info);
        if (seq.length >= goal) { ctx.later(() => ctx.finish(mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1), 600); return; }
        info.textContent = '✅ ' + R.pick(PRAISE);
        ctx.later(() => { seq.push(R.int(0, count - 1)); playSeq(); }, 900);
      } else {
        listening = false;
        mistakes++;
        Sound.wrong();
        info.textContent = '🙂 Dengarkan lagi ya...';
        ctx.later(playSeq, 1000);
      }
    }
    function playSeq() {
      const my = ++token;
      step = 0;
      info.textContent = `👀 Perhatikan... (${seq.length} nada)`;
      seq.forEach((k, j) => ctx.later(() => { if (my === token) flash(k, speed * 0.6); }, 600 + j * speed));
      ctx.later(() => { if (my === token) { listening = true; info.textContent = '👉 Giliranmu! Ulangi nadanya'; } }, 600 + seq.length * speed);
    }
    speak('Dengarkan nadanya, lalu ulangi ya!');
    ctx.later(playSeq, 1500);
  },
});
