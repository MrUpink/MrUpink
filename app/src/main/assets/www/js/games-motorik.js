'use strict';
/* Permainan motorik & kreativitas. */

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

registerGame({
  id: 'menulis', cat: 'motorik', title: 'Ayo Menulis', icon: '✏️', color: '#4dabf7', ages: [2, 3],
  start(ctx) {
    const lv = ctx.level;
    const sets = {
      huruf: LETTERS.map((x) => x.l),
      kecil: LETTERS.map((x) => x.l.toLowerCase()),
      angka: '0123456789'.split(''),
    };
    let mode = 'huruf', idx = 0, solved = false;
    const SCALE = 4; // resolusi rendah untuk pengecekan
    const wrap = h('div', { class: 'canvas-wrap' });
    const guide = h('canvas');
    const draw = h('canvas');
    wrap.append(guide, draw);
    const msg = h('div', { class: 'trace-msg' }, 'Tebalkan huruf dengan jarimu ✋');
    const modeRow = h('div', { class: 'chip-row' });
    [['huruf', 'A B C'], ['kecil', 'a b c'], ['angka', '1 2 3']].forEach(([m, label]) => {
      const b = h('button', { class: 'chip' + (m === mode ? ' on' : '') }, label);
      b.addEventListener('click', () => {
        modeRow.querySelectorAll('.chip').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
        mode = m; idx = 0; setup();
      });
      modeRow.append(b);
    });
    const tools = h('div', { class: 'toolbar' },
      h('button', { class: 'btn btn-blue btn-small', onClick: () => { idx = (idx + sets[mode].length - 1) % sets[mode].length; setup(); } }, '◀'),
      h('button', { class: 'btn btn-yellow btn-small', onClick: () => setup() }, '🧽 Hapus'),
      h('button', { class: 'btn btn-blue btn-small', onClick: () => speak(sets[mode][idx]) }, '🔊'),
      h('button', { class: 'btn btn-blue btn-small', onClick: () => { idx = (idx + 1) % sets[mode].length; setup(); } }, '▶'));
    ctx.stage.append(modeRow, tools, wrap, msg);

    let dg, W, H, brush, maskPts = [], zone = null, low, lowG, color;

    function setup() {
      solved = false;
      const ch = sets[mode][idx];
      ({ w: W, h: H } = fitCanvas(guide, wrap));
      const gg = guide.getContext('2d');
      dg = fitCanvas(draw, wrap).g;
      const size = Math.min(W * 0.85, H * 0.82);
      brush = Math.max(18, size * 0.11);
      const font = FONT.replace('{S}', Math.round(size));
      // Garis bantu
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
      // Masker resolusi rendah
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
      lowG.lineCap = lowG.lineJoin = 'round';
      msg.textContent = mode === 'angka' ? `Tebalkan angka ${ch} ✋` : `Tebalkan huruf ${ch} ✋`;
      speak(mode === 'angka' ? `Ayo tulis angka ${ch}` : `Ayo tulis huruf ${mode === 'kecil' ? 'kecil ' : ''}${ch}`);
    }

    let last = null;
    function line(a, b) {
      for (const [g, lwid] of [[dg, brush], [lowG, brush]]) {
        g.strokeStyle = color; g.lineWidth = lwid; g.lineCap = g.lineJoin = 'round';
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
      const d = lowG.getImageData(0, 0, low.width, low.height).data;
      let hit = 0;
      for (const i of maskPts) if (d[i * 4 + 3] > 0) hit++;
      let inside = 0, total = 0;
      for (let i = 0; i < zone.length; i++) if (d[i * 4 + 3] > 0) { total++; if (zone[i]) inside++; }
      const coverage = hit / maskPts.length;
      const precision = total ? inside / total : 0;
      const [needCov, needPrec] = lv === 1 ? [0.6, 0.35] : lv === 2 ? [0.72, 0.5] : [0.8, 0.6];
      if (coverage >= needCov && precision >= needPrec) {
        solved = true;
        Sound.correct();
        confetti(30);
        floatStar(wrap);
        ctx.addStar(1);
        msg.textContent = '🎉 ' + R.pick(PRAISE);
        speak(`${sets[mode][idx]}. ${R.pick(PRAISE)}`);
        ctx.later(() => { idx = (idx + 1) % sets[mode].length; setup(); }, 1800);
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
  },
});

registerGame({
  id: 'menggambar', cat: 'motorik', title: 'Menggambar', icon: '🎨', color: '#da77f2', ages: [1, 2, 3],
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
    [['size8', '•', () => { size = 8; }], ['size14', '●', () => { size = 14; }], ['size28', '⬤', () => { size = 28; }]].forEach(([k, l, fn]) => {
      toolBtns[k] = h('button', { class: 'chip', onClick: () => { fn(); if (tool === 'eraser' || tool === 'stamp') tool = 'pen'; mark(); } }, l);
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
      // simpan gambar lama agar tidak hilang saat ukuran berubah
      const old = g ? canvas.toDataURL() : null;
      ({ g, w: W, h: H } = fitCanvas(canvas, wrap));
      clear();
      if (old) { const img = new Image(); img.onload = () => g.drawImage(img, 0, 0, W, H); img.src = old; }
    }
    let last = null;
    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId);
      const p = pointerPos(e, canvas);
      if (tool === 'stamp') {
        g.font = `${size * 4}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(stamp, p.x, p.y);
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
  id: 'balon', cat: 'motorik', title: 'Pecah Balon', icon: '🎈', color: '#ff8787', ages: [1, 2, 3],
  start(ctx) {
    const lv = ctx.level;
    const GOAL = 10;
    const hud = h('div', { class: 'hud' });
    const sky = h('div', { class: 'sky' });
    ctx.stage.append(hud, sky);
    let popped = 0, target = null, label = '', sayText = '';
    const balloons = [];
    const colors = ['#ff6b6b', '#ffa94d', '#fcc419', '#51cf66', '#4dabf7', '#9775fa', '#f783ac'];

    function newTarget() {
      if (lv === 1) { target = null; label = ''; sayText = 'Pecahkan balonnya!'; }
      else if (lv === 2) { target = R.pick(LETTERS).l; label = `huruf ${target}`; sayText = `Pecahkan balon huruf ${target}`; }
      else { const a = R.int(1, 9), b = R.int(1, 9); target = String(a + b); label = `${a} + ${b}`; sayText = `Pecahkan balon jawaban ${a} tambah ${b}`; }
      updateHud();
      speak(sayText);
    }
    function updateHud() {
      hud.textContent = (lv === 1 ? '🎈 Pecahkan balon!' : `🎯 Cari: ${label}`) + `   ${popped}/${GOAL}`;
    }
    function randomLabel() {
      if (lv === 1) return R.pick(['', '', R.pick(OBJECTS)]);
      if (Math.random() < 0.4) return target;
      if (lv === 2) return R.pick(LETTERS).l;
      return String(R.int(2, 18));
    }
    function spawn() {
      if (ctx.dead) return;
      const W = sky.clientWidth, H = sky.clientHeight;
      const b = h('div', { class: 'balloon', style: { background: R.pick(colors) } }, randomLabel());
      const o = { el: b, x: R.int(4, Math.max(5, W - 84)), y: H + 10, v: (lv === 1 ? 45 : 60) + Math.random() * (lv === 3 ? 70 : 45), sway: Math.random() * 6 };
      b.style.transform = `translate(${o.x}px, ${o.y}px)`;
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const ok = lv === 1 || b.textContent === target;
        if (!ok) { Sound.wrong(); shake(b); return; }
        Sound.pop();
        const burst = h('div', { class: 'burst', style: { left: o.x + 39 + 'px', top: o.y + 47 + 'px' } }, '💥');
        sky.append(burst);
        setTimeout(() => burst.remove(), 500);
        remove(o);
        popped++;
        ctx.addStar(1);
        if (popped >= GOAL) {
          updateHud();
          ctx.later(() => ctx.finish(GOAL, GOAL), 500);
          return;
        }
        if (lv === 3 || (lv === 2 && popped % 3 === 0)) newTarget(); else updateHud();
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
    const interval = lv === 1 ? 1.3 : 1.0;
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
  id: 'sentuh', cat: 'motorik', title: 'Sentuh & Dengar', icon: '👆', color: '#ffd43b', ages: [1],
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

registerGame({
  id: 'piano', cat: 'motorik', title: 'Piano & Ingat Nada', icon: '🎹', color: '#9775fa', ages: [1, 2, 3],
  start(ctx) {
    const lv = ctx.level;
    const keys = [
      { f: 262, n: 'do', e: '🐱' }, { f: 294, n: 're', e: '🐶' }, { f: 330, n: 'mi', e: '🐸' }, { f: 349, n: 'fa', e: '🐤' },
      { f: 392, n: 'sol', e: '🐰' }, { f: 440, n: 'la', e: '🐻' }, { f: 494, n: 'si', e: '🦁' }, { f: 523, n: 'do', e: '🐵' },
    ];
    const colors = ['#ff6b6b', '#ffa94d', '#fcc419', '#51cf66', '#20c997', '#4dabf7', '#748ffc', '#da77f2'];
    let mode = 'bebas';
    const modeRow = h('div', { class: 'chip-row' });
    const info = h('div', { class: 'hud' }, '🎵 Mainkan musikmu!');
    const piano = h('div', { class: 'piano', style: { gridTemplateColumns: 'repeat(8, minmax(0, 1fr))' } });
    const keyEls = keys.map((k, i) => {
      const b = h('button', { class: 'key', style: { background: colors[i] } }, h('span', { class: 'k-emoji' }, k.e), k.n);
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); press(i); });
      piano.append(b);
      return b;
    });
    [['bebas', '🎵 Bebas'], ['ikuti', '🧠 Ingat Nada']].forEach(([m, l]) => {
      const b = h('button', { class: 'chip' + (m === mode ? ' on' : '') }, l);
      b.addEventListener('click', () => {
        modeRow.querySelectorAll('.chip').forEach((x) => x.classList.remove('on'));
        b.classList.add('on'); mode = m; reset();
      });
      modeRow.append(b);
    });
    ctx.stage.append(modeRow, info, piano);

    const activeCount = [4, 6, 8][lv - 1];
    const goal = [3, 5, 7][lv - 1];
    let seq = [], step = 0, listening = false, token = 0;

    function flash(i, dur = 300) {
      keyEls[i].classList.add('lit');
      Sound.note(keys[i].f);
      setTimeout(() => keyEls[i].classList.remove('lit'), dur);
    }
    function press(i) {
      if (mode === 'bebas') { flash(i, 180); return; }
      if (!listening || keyEls[i].classList.contains('off')) return;
      flash(i, 180);
      if (i === seq[step]) {
        step++;
        if (step === seq.length) {
          listening = false;
          ctx.addStar(1);
          floatStar(info);
          if (seq.length >= goal) { ctx.later(() => ctx.finish(goal, goal), 600); return; }
          info.textContent = '✅ ' + R.pick(PRAISE);
          ctx.later(() => { seq.push(R.int(0, activeCount - 1)); playSeq(); }, 900);
        }
      } else {
        listening = false;
        Sound.wrong();
        info.textContent = '🙂 Dengarkan lagi ya...';
        ctx.later(playSeq, 1000);
      }
    }
    function playSeq() {
      const my = ++token;
      step = 0;
      info.textContent = `👀 Perhatikan... (${seq.length} nada)`;
      seq.forEach((k, j) => ctx.later(() => { if (my === token) flash(k, 400); }, 600 + j * 650));
      ctx.later(() => { if (my === token) { listening = true; info.textContent = '👉 Giliranmu! Ulangi nadanya'; } }, 600 + seq.length * 650);
    }
    function reset() {
      token++;
      listening = false;
      keyEls.forEach((k, i) => k.classList.toggle('off', mode === 'ikuti' && i >= activeCount));
      if (mode === 'bebas') { info.textContent = '🎵 Mainkan musikmu!'; return; }
      seq = [R.int(0, activeCount - 1)];
      speak('Dengarkan nadanya, lalu ulangi ya!');
      ctx.later(playSeq, 1200);
    }
    reset();
  },
});
