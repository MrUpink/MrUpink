'use strict';
/* Navigasi gaya Duolingo:
 * Umur → Beranda (misi harian, streak, kategori) → Jalur belajar (unit: pelajaran + ujian) → Bermain. */

const CATEGORIES = [
  { id: 'huruf', title: 'Belajar Huruf & Membaca', short: 'Huruf & Membaca', icon: '🔤', color: '#ff8787' },
  { id: 'angka', title: 'Belajar Angka & Berhitung', short: 'Angka & Berhitung', icon: '🔢', color: '#51cf66' },
  { id: 'motorik', title: 'Motorik & Kreasi', short: 'Motorik & Kreasi', icon: '🎨', color: '#cc5de8' },
  { id: 'logika', title: 'Logika & Pengetahuan', short: 'Logika', icon: '🧠', color: '#339af0' },
];
const AGE_EMOJI = ['', '👶', '🧸', '🐣', '🧒', '🎈', '🎒', '📚', '🚲', '🔭', '🏆'];
/* Tingkat kesulitan dasar per umur (skala 1–10). Unit menambah tingkat ini. */
const AGE_BASE = { 1: 1, 2: 1, 3: 2, 4: 3, 5: 4, 6: 4, 7: 5, 8: 6, 9: 6, 10: 6 };
/* Permainan berbentuk soal yang bisa diambil untuk ujian. */
const QUIZ_GAMES = new Set(['cari-huruf', 'huruf-awal', 'susun-huruf', 'susun-suku', 'baca-kata', 'berhitung', 'matematika',
  'banyak-sedikit', 'urutan-angka', 'jam', 'warna', 'bentuk', 'hewan', 'bayangan', 'pola']);
const UNIT_NAMES = ['Mudah', 'Sedang', 'Menantang', 'Sulit', 'Juara'];
const UNIT_COLORS = ['#51cf66', '#339af0', '#f59f00', '#e64980', '#7950f2'];
const ZIGZAG = [0, 1, 2, 1, 0, -1, -2, -1];

const QUEST_TYPES = {
  lessons: { icon: '📘', text: (n) => `Selesaikan ${n} pelajaran`, targets: [2, 3] },
  stars: { icon: '⭐', text: (n) => `Kumpulkan ${n} bintang`, targets: [15, 20, 30] },
  perfect: { icon: '🏅', text: () => 'Dapat 3 bintang di satu pelajaran', targets: [1] },
  combo: { icon: '🎯', text: (n) => `Jawab ${n} soal benar berturut-turut`, targets: [4, 6] },
  cats: { icon: '🧭', text: (n) => `Belajar di ${n} kategori berbeda`, targets: [2] },
};
const CHEST_REWARD = 20;

const App = (() => {
  const $ = (id) => document.getElementById(id);
  let ctx = null;
  let category = null;
  let replay = null; // fungsi untuk mengulang permainan terakhir

  const age = () => Store.get('age');
  const gamesFor = (cat, a) => GAMES.filter((g) => g.cat === cat && a >= g.minAge && a <= g.maxAge);

  function difficulty(g, lvl, a) {
    const extra = g.levels > 1 ? Math.round(((lvl - 1) * 4) / (g.levels - 1)) : 0;
    return Math.max(1, Math.min(10, AGE_BASE[a] + extra));
  }

  /* ---------- Tanggal, streak, misi harian ---------- */
  function dayStr(offset = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function streakNow() {
    const s = Store.get('streak');
    return s.last === dayStr() || s.last === dayStr(-1) ? s.count : 0;
  }
  /* Dicatat setiap selesai pelajaran/ujian. Mengembalikan true bila streak bertambah hari ini. */
  function markActivity() {
    const s = Store.get('streak');
    if (s.last === dayStr()) return false;
    s.count = s.last === dayStr(-1) ? s.count + 1 : 1;
    s.last = dayStr();
    Store.set('streak', s);
    return true;
  }

  function daily() {
    let d = Store.get('daily');
    if (!d || d.date !== dayStr()) {
      // Pilih 3 misi secara acak tapi tetap sama sepanjang hari
      let seed = [...dayStr()].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
      const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
      const types = Object.keys(QUEST_TYPES).map((t) => [rnd(), t]).sort((x, y) => x[0] - y[0]).slice(0, 3).map((x) => x[1]);
      d = {
        date: dayStr(),
        quests: types.map((t) => {
          const tg = QUEST_TYPES[t].targets;
          return { type: t, target: tg[Math.floor(rnd() * tg.length)], progress: 0 };
        }),
        cats: [], combo: 0, chest: false,
      };
      Store.set('daily', d);
    }
    return d;
  }
  function questProgress(type, value, absolute) {
    const d = daily();
    d.quests.forEach((q) => {
      if (q.type !== type || q.progress >= q.target) return;
      q.progress = Math.min(q.target, absolute ? Math.max(q.progress, value) : q.progress + value);
      if (q.progress >= q.target) {
        toast(`✅ Misi selesai: ${QUEST_TYPES[q.type].text(q.target)}`);
        Sound.correct();
      }
    });
    Store.set('daily', d);
  }
  Bus.on('answer', ({ first }) => {
    const d = daily();
    d.combo = first ? d.combo + 1 : 0;
    Store.set('daily', d);
    questProgress('combo', d.combo, true);
  });
  Bus.on('lesson', ({ stars, cat }) => {
    questProgress('lessons', 1);
    if (stars >= 3) questProgress('perfect', 1);
    const d = daily();
    if (!d.cats.includes(cat)) d.cats.push(cat);
    Store.set('daily', d);
    questProgress('cats', d.cats.length, true);
  });

  function toast(text) {
    const t = $('toast');
    t.textContent = text;
    t.classList.remove('hidden', 'show');
    void t.offsetWidth;
    t.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.add('hidden'), 2600);
  }

  /* ---------- Bintang ---------- */
  function refreshStars() {
    document.querySelectorAll('.stars-total').forEach((b) => { b.textContent = Store.get('stars'); });
  }
  function addStars(n) {
    if (!n) return;
    Store.set('stars', Store.get('stars') + n);
    refreshStars();
    questProgress('stars', n);
    document.querySelectorAll('.screen.active .star-count').forEach((s) => {
      s.classList.remove('bump'); void s.offsetWidth; s.classList.add('bump');
    });
  }

  function show(id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
    Music.setMode(id === 'screen-play' ? 'learn' : 'menu');
    if (id !== 'screen-play') Voice.stop();
  }
  const current = () => document.querySelector('.screen.active').id;

  /* ---------- 1. Umur ---------- */
  function renderAges() {
    const grid = $('age-grid');
    grid.innerHTML = '';
    for (let a = 1; a <= 10; a++) {
      grid.append(h('button', {
        class: 'age-btn' + (a === age() ? ' on' : ''),
        style: { background: PALETTE[(a - 1) % PALETTE.length] },
        onClick: () => {
          Sound.tap();
          Store.set('age', a);
          openHome();
        },
      }, h('span', { class: 'age-emoji' }, AGE_EMOJI[a]), h('span', { class: 'age-num' }, a), h('span', { class: 'age-unit' }, 'tahun')));
    }
    show('screen-age');
  }

  /* ---------- 2. Beranda ---------- */
  function openHome() {
    category = null;
    const a = age();
    $('age-pill').textContent = `${AGE_EMOJI[a]} ${a} tahun ✏️`;
    $('streak-count').textContent = streakNow();
    $('streak-pill').classList.toggle('on', Store.get('streak').last === dayStr());
    // Misi harian
    const d = daily();
    $('quest-date').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
    const list = $('quest-list');
    list.innerHTML = '';
    d.quests.forEach((q) => {
      const done = q.progress >= q.target;
      list.append(h('div', { class: 'quest' + (done ? ' done' : '') },
        h('span', { class: 'q-icon' }, done ? '✅' : QUEST_TYPES[q.type].icon),
        h('div', { class: 'q-body' },
          h('div', { class: 'q-title' }, QUEST_TYPES[q.type].text(q.target)),
          h('div', { class: 'q-bar' }, h('div', { class: 'q-fill', style: { width: (q.progress / q.target) * 100 + '%' } })),
        ),
        h('span', { class: 'q-num' }, `${q.progress}/${q.target}`)));
    });
    const allDone = d.quests.every((q) => q.progress >= q.target);
    $('btn-chest').classList.toggle('hidden', !allDone || d.chest);
    if (allDone && d.chest) list.append(h('div', { class: 'quest-done' }, '🎉 Semua misi hari ini selesai! Datang lagi besok ya.'));
    // Kategori
    const grid = $('cat-grid');
    grid.innerHTML = '';
    CATEGORIES.forEach((c) => {
      if (!gamesFor(c.id, a).length) return;
      const nodes = buildPath(c.id);
      const pos = Store.path(c.id).pos;
      const unit = nodes.length ? nodes[Math.min(pos, nodes.length - 1)].unit : 0;
      const pct = nodes.length ? Math.round((Math.min(pos, nodes.length) / nodes.length) * 100) : 0;
      grid.append(h('button', {
        class: 'cat-card', style: { background: c.color },
        onClick: () => { Sound.tap(); openPath(c); },
      },
      h('span', { class: 'cat-icon' }, c.icon),
      h('span', { class: 'cat-title' }, c.title),
      h('span', { class: 'cat-count' }, !nodes.length ? 'Main bebas' : pos >= nodes.length ? '🏆 Selesai!' : `Unit ${unit} · ${pct}%`),
      nodes.length ? h('div', { class: 'cat-bar' }, h('div', { style: { width: pct + '%' } })) : null));
    });
    show('screen-home');
  }

  /* ---------- 3. Jalur belajar ---------- */
  function buildPath(cat) {
    const games = gamesFor(cat, age()).filter((g) => g.levels > 0);
    if (!games.length) return [];
    const units = Math.max(...games.map((g) => g.levels));
    const nodes = [];
    for (let u = 1; u <= units; u++) {
      const ug = games.filter((g) => g.levels >= u);
      ug.forEach((g) => nodes.push({ type: 'lesson', unit: u, game: g, level: u }));
      const quiz = ug.filter((g) => QUIZ_GAMES.has(g.id));
      if (quiz.length) nodes.push({ type: 'exam', unit: u, games: quiz });
    }
    return nodes;
  }

  function openPath(c) {
    category = c;
    const nodes = buildPath(c.id);
    const p = Store.path(c.id);
    $('path-title').textContent = c.icon + ' ' + c.short;
    const root = $('path');
    root.innerHTML = '';

    const explore = gamesFor(c.id, age()).filter((g) => g.levels === 0);
    if (explore.length) {
      root.append(h('div', { class: 'explore' },
        h('div', { class: 'explore-title' }, '🧸 Pojok Jelajah — main bebas'),
        h('div', { class: 'explore-row' }, explore.map((g) => h('button', {
          class: 'explore-btn', style: { background: g.color },
          onClick: () => { Sound.tap(); playGame(g, 0, null); },
        }, h('span', null, g.icon), g.title)))));
    }

    let unitBox = null;
    let currentEl = null;
    nodes.forEach((n, i) => {
      if (!unitBox || unitBox.dataset.unit !== String(n.unit)) {
        const lastIdx = nodes.map((x) => x.unit).lastIndexOf(n.unit);
        const passed = p.pos > lastIdx;
        unitBox = h('div', { class: 'unit', 'data-unit': n.unit });
        unitBox.append(h('div', { class: 'unit-banner', style: { background: UNIT_COLORS[(n.unit - 1) % 5] } },
          h('div', null, h('b', null, `Unit ${n.unit} · ${UNIT_NAMES[(n.unit - 1) % 5]}`),
            h('div', { class: 'unit-sub' }, passed ? '✅ Lulus! Hebat!' : 'Selesaikan pelajaran, lalu ikuti ujiannya')),
          h('span', { class: 'unit-icon' }, passed ? '🏅' : '📗')));
        root.append(unitBox);
      }
      const state = i < p.pos ? 'done' : i === p.pos ? 'current' : 'locked';
      const stars = p.stars[i] || 0;
      const k = ZIGZAG[i % ZIGZAG.length];
      const btn = h('button', {
        class: `node ${n.type} ${state}`,
        style: { '--c': n.type === 'exam' ? '#fab005' : n.game.color },
      },
      h('span', { class: 'node-icon' }, state === 'locked' ? '🔒' : n.type === 'exam' ? '🏆' : n.game.icon),
      state === 'current' ? h('span', { class: 'node-start' }, n.type === 'exam' ? 'UJIAN' : 'MULAI') : null);
      btn.addEventListener('click', () => {
        if (state === 'locked') { Sound.wrong(); shake(btn); toast('🔒 Selesaikan pelajaran sebelumnya dulu ya.'); return; }
        Sound.tap();
        if (n.type === 'exam') startExam(nodes, i);
        else playGame(n.game, n.level, i);
      });
      const wrap = h('div', { class: 'node-wrap' + (state === 'current' ? ' is-current' : ''), style: { '--x': k * 56 + 'px' } }, btn,
        h('div', { class: 'node-label' }, n.type === 'exam' ? `Ujian Unit ${n.unit}` : n.game.title),
        state === 'done' ? h('div', { class: 'node-stars' }, '★'.repeat(stars) + '☆'.repeat(3 - stars)) : null);
      unitBox.append(wrap);
      if (state === 'current') currentEl = wrap;
    });
    if (nodes.length && p.pos >= nodes.length) {
      root.append(h('div', { class: 'path-end' }, '🏆 Semua unit selesai! Kamu juara!'));
    }
    show('screen-path');
    requestAnimationFrame(() => {
      const sc = $('path-scroll');
      sc.scrollTop = currentEl ? currentEl.offsetTop - sc.clientHeight / 2 + 60 : 0;
    });
  }

  /* ---------- 4. Bermain ---------- */
  function stop() {
    if (!ctx) return;
    ctx.dead = true;
    ctx.timers.forEach(clearTimeout);
    ctx.cleanups.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
    ctx = null;
    Voice.stop();
  }

  function newCtx(extra) {
    const stage = $('stage');
    stage.innerHTML = '';
    stage.scrollTop = 0;
    const c = Object.assign({
      stage,
      age: age(),
      dead: false,
      timers: [],
      cleanups: [],
      later(fn, ms) { const t = setTimeout(() => { if (!c.dead) fn(); }, ms); c.timers.push(t); return t; },
      onCleanup(fn) { c.cleanups.push(fn); },
      addStar: addStars,
    }, extra);
    return c;
  }

  /* nodeIndex: indeks pelajaran di jalur, atau null untuk main bebas (Pojok Jelajah). */
  function playGame(g, lvl, nodeIndex) {
    stop();
    $('reward').classList.add('hidden');
    $('play-title').textContent = g.icon + ' ' + g.title;
    show('screen-play');
    replay = () => playGame(g, lvl, nodeIndex);
    const c = newCtx({
      level: lvl,
      d: difficulty(g, lvl || 1, age()),
      finish(stars) { if (!c.dead) lessonDone(g, nodeIndex, stars); },
    });
    ctx = c;
    try {
      g.start(c);
    } catch (e) {
      console.error(e);
      c.stage.append(h('p', null, 'Ups, terjadi kesalahan.'));
    }
  }

  function lessonDone(g, nodeIndex, stars) {
    stars = Math.max(1, Math.min(3, stars || 1));
    let unlocked = false;
    if (nodeIndex != null) {
      const p = Store.path(category.id);
      p.stars[nodeIndex] = Math.max(p.stars[nodeIndex] || 0, stars);
      if (nodeIndex === p.pos) { p.pos++; unlocked = true; }
      Store.save();
    }
    const streakUp = markActivity();
    Bus.emit('lesson', { stars, cat: g.cat });
    const title = stars === 3 ? 'Sempurna!' : stars === 2 ? 'Hebat sekali!' : 'Bagus!';
    showResult({
      icon: stars === 3 ? '🏆' : '🎉',
      title,
      stars,
      text: [unlocked ? 'Pelajaran berikutnya terbuka!' : '', streakUp ? `🔥 Streak ${streakNow()} hari!` : ''].filter(Boolean).join(' '),
      say: `${title} Kamu dapat ${stars} bintang.${streakUp ? ' Hebat! Kamu sudah belajar hari ini.' : ''}`,
      actions: [
        ['▶ Lanjut', 'btn-green', () => backToMenu()],
        ['🔁 Ulangi', 'btn-yellow', () => replay()],
      ],
    });
  }

  /* ---------- Ujian unit: soal campuran dari pelajaran di unit, dengan 3 nyawa ---------- */
  function startExam(nodes, nodeIndex) {
    stop();
    const node = nodes[nodeIndex];
    $('reward').classList.add('hidden');
    $('play-title').textContent = `🏆 Ujian Unit ${node.unit}`;
    show('screen-play');
    replay = () => startExam(nodes, nodeIndex);
    const a = age();
    const ex = newCtx({ level: node.unit });
    ctx = ex;
    // Ambil pembuat soal dari setiap permainan kuis di unit ini (lihat runRounds → ctx.capture)
    const rounds = [];
    node.games.forEach((g) => {
      const cap = {
        stage: document.createElement('div'), age: a, level: node.unit, d: difficulty(g, node.unit, a), dead: false,
        later() {}, onCleanup() {}, addStar() {}, finish() {}, capture: (fn) => rounds.push(fn),
      };
      try { g.start(cap); } catch (e) { console.error(e); }
    });
    const total = a <= 3 ? 6 : a <= 6 ? 8 : 10;
    const queue = R.shuffle(Array.from({ length: total }, (_, k) => rounds[k % rounds.length]));
    let hearts = 3, i = 0;

    const heartsEl = h('div', { class: 'hearts' });
    const fill = h('div', { class: 'progress-fill' });
    const area = h('div', { class: 'round' });
    ex.stage.append(h('div', { class: 'exam-head' }, heartsEl, h('div', { class: 'progress exam-progress' }, fill)), area);
    const drawHearts = () => { heartsEl.textContent = '❤️'.repeat(hearts) + '🤍'.repeat(3 - hearts); };
    drawHearts();
    speak('Ujian dimulai! Kamu punya tiga nyawa. Semangat!');

    function next() {
      if (ex.dead) return;
      fill.style.width = (i / total) * 100 + '%';
      if (i >= total) { examDone(true, hearts, nodeIndex); return; }
      area.innerHTML = '';
      area.classList.remove('enter'); void area.offsetWidth; area.classList.add('enter');
      let done = false, lost = false;
      const api = {
        index: i,
        correct(nodeEl, sayText) {
          if (done) return;
          done = true;
          i++;
          fill.style.width = (i / total) * 100 + '%';
          if (nodeEl) nodeEl.classList.add('good');
          if (api.onDone) api.onDone();
          Sound.correct();
          floatStar(nodeEl);
          addStars(1);
          Bus.emit('answer', { first: !lost });
          speak((sayText ? sayText + '. ' : '') + R.pick(PRAISE));
          ex.later(next, sayText ? 1900 : 1300);
        },
        wrong(nodeEl) {
          if (done) return;
          Sound.wrong();
          if (nodeEl) shake(nodeEl);
          if (lost) return; // satu soal paling banyak mengurangi satu nyawa
          lost = true;
          hearts--;
          drawHearts();
          heartsEl.classList.remove('bump'); void heartsEl.offsetWidth; heartsEl.classList.add('bump');
          Bus.emit('answer', { first: false });
          if (hearts <= 0) { done = true; ex.later(() => examDone(false, 0, nodeIndex), 700); }
          else speak(R.pick(RETRY));
        },
      };
      queue[i](area, api);
    }
    ex.later(next, 300);
  }

  function examDone(passed, hearts, nodeIndex) {
    if (passed) {
      const p = Store.path(category.id);
      p.stars[nodeIndex] = Math.max(p.stars[nodeIndex] || 0, hearts);
      if (nodeIndex === p.pos) p.pos++;
      Store.save();
      const streakUp = markActivity();
      Bus.emit('lesson', { stars: hearts, cat: category.id });
      showResult({
        icon: '🎓', title: 'Lulus Ujian!', stars: hearts,
        text: `Unit berikutnya terbuka!${streakUp ? ` 🔥 Streak ${streakNow()} hari!` : ''}`,
        say: 'Selamat! Kamu lulus ujian!',
        actions: [['▶ Lanjut', 'btn-green', () => backToMenu()]],
      });
    } else {
      showResult({
        icon: '💔', title: 'Nyawa Habis', stars: 0,
        text: 'Tidak apa-apa! Ulangi pelajaran di unit ini, lalu coba ujian lagi.',
        say: 'Yah, nyawanya habis. Ayo belajar lagi lalu coba ujian lagi!',
        actions: [['🔁 Coba Lagi', 'btn-green', () => replay()], ['⬅️ Kembali', 'btn-blue', () => backToMenu()]],
      });
    }
  }

  /* ---------- Hasil ---------- */
  function showResult({ icon, title, stars, text, say, actions }) {
    if (stars) { Sound.win(); confetti(80); } else Sound.wrong();
    $('reward-icon').textContent = icon;
    $('reward-title').textContent = title;
    const rs = $('reward-stars');
    rs.innerHTML = '';
    if (stars) for (let k = 0; k < 3; k++) rs.append(h('span', { class: k < stars ? 'rs on' : 'rs' }, '★'));
    $('reward-text').textContent = text;
    const act = $('reward-actions');
    act.innerHTML = '';
    actions.forEach(([label, cls, fn]) => act.append(h('button', { class: 'btn ' + cls, onClick: () => { Sound.tap(); fn(); } }, label)));
    $('reward').classList.remove('hidden');
    speak(say);
  }

  function backToMenu() {
    stop();
    $('reward').classList.add('hidden');
    if (category) openPath(category); else openHome();
  }

  function back() {
    if (!$('settings').classList.contains('hidden')) { $('settings').classList.add('hidden'); return true; }
    const s = current();
    if (s === 'screen-play') { backToMenu(); return true; }
    if (s === 'screen-path') { openHome(); return true; }
    if (s === 'screen-home') { renderAges(); return true; }
    return false;
  }
  /* Dipanggil oleh tombol kembali Android. true = sudah ditangani. */
  window.handleBack = back;

  /* ---------- Pengaturan ---------- */
  const TEST_TEXT = () => `Halo! Ayo kita belajar bersama. ${sayLetter('C')}, ${saySyllable('ca')}, ${saySyllable('ci')}. Cabai.`;

  function openSettings() {
    $('set-sound').checked = Store.get('sound');
    $('set-music').checked = Store.get('music');
    $('set-music-vol').value = Store.get('musicVol');
    $('set-voice').checked = Store.get('voice');
    $('set-natural').checked = Store.get('natural');
    $('natural-hint').textContent = Voice.hasNatural()
      ? 'Suara manusia yang sudah direkam di dalam aplikasi. Tetap jalan tanpa internet.'
      : 'Rekaman suara belum ada di versi ini, sementara memakai suara HP.';
    $('set-rate').value = Store.get('rate');
    const sel = $('set-voice-name');
    const voices = Voice.list();
    const cur = Voice.current();
    sel.innerHTML = '';
    voices.forEach((v) => sel.append(h('option', { value: v.name, selected: v.name === cur }, v.label || v.name)));
    sel.disabled = !voices.length;
    $('voice-hint').textContent = voices.length
      ? 'Dipakai bila ada kalimat yang belum punya rekaman.'
      : 'Suara Bahasa Indonesia belum terpasang di HP ini. Tekan "Unduh Suara HP".';
    $('btn-tts-settings').classList.toggle('hidden', !window.AndroidTTS);
    $('settings').classList.remove('hidden');
  }

  function init() {
    Voice.init();
    refreshStars();
    document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => { Sound.tap(); back(); }));
    document.querySelectorAll('.btn-settings').forEach((b) => b.addEventListener('click', openSettings));
    $('age-pill').addEventListener('click', () => { Sound.tap(); renderAges(); });
    $('btn-chest').addEventListener('click', () => {
      const d = daily();
      if (d.chest) return;
      d.chest = true;
      Store.set('daily', d);
      addStars(CHEST_REWARD);
      Sound.win();
      confetti(120);
      toast(`🎁 +${CHEST_REWARD} ⭐ hadiah misi harian!`);
      openHome();
    });
    $('btn-close-settings').addEventListener('click', () => $('settings').classList.add('hidden'));
    $('set-sound').addEventListener('change', (e) => Store.set('sound', e.target.checked));
    $('set-music').addEventListener('change', (e) => { Store.set('music', e.target.checked); Music.apply(); });
    $('set-music-vol').addEventListener('input', (e) => { Store.set('musicVol', parseFloat(e.target.value)); Music.apply(); });
    $('set-voice').addEventListener('change', (e) => { Store.set('voice', e.target.checked); if (!e.target.checked) Voice.stop(); });
    $('set-natural').addEventListener('change', (e) => { Store.set('natural', e.target.checked); speak(TEST_TEXT()); });
    $('set-voice-name').addEventListener('change', (e) => { Voice.choose(e.target.value); speak('Halo! Ayo kita belajar bersama.'); });
    $('set-rate').addEventListener('change', (e) => { Store.set('rate', parseFloat(e.target.value)); Voice.applyRate(); speak('Halo! Ayo kita belajar bersama.'); });
    $('btn-test-voice').addEventListener('click', () => speak(TEST_TEXT()));
    $('btn-tts-settings').addEventListener('click', () => { try { window.AndroidTTS.openSettings(); } catch (e) { /* abaikan */ } });
    $('btn-reset').addEventListener('click', () => {
      if (confirm('Hapus semua bintang, streak, dan progres belajar?')) {
        Store.reset();
        refreshStars();
        $('settings').classList.add('hidden');
        renderAges();
      }
    });
    // Buka kunci audio pada sentuhan pertama (kebijakan autoplay browser)
    document.addEventListener('pointerdown', () => { Sound.unlock(); Music.apply(); }, { once: true });
    renderAges();
    Music.apply();
  }

  return { init, stop };
})();

App.init();
