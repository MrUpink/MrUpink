'use strict';
/* Navigasi: Umur → Kategori → Permainan → Level → Bermain. */

const CATEGORIES = [
  { id: 'huruf', title: 'Belajar Huruf & Membaca', short: 'Huruf', icon: '🔤', color: '#ff8787' },
  { id: 'angka', title: 'Belajar Angka & Berhitung', short: 'Angka', icon: '🔢', color: '#51cf66' },
  { id: 'motorik', title: 'Motorik & Kreasi', short: 'Motorik', icon: '🎨', color: '#cc5de8' },
  { id: 'logika', title: 'Logika & Pengetahuan', short: 'Logika', icon: '🧠', color: '#339af0' },
];
const AGE_EMOJI = ['', '👶', '🧸', '🐣', '🧒', '🎈', '🎒', '📚', '🚲', '🔭', '🏆'];
/* Tingkat kesulitan dasar per umur (skala 1–10). Level menambah tingkat ini. */
const AGE_BASE = { 1: 1, 2: 1, 3: 2, 4: 3, 5: 4, 6: 4, 7: 5, 8: 6, 9: 6, 10: 6 };

const App = (() => {
  const $ = (id) => document.getElementById(id);
  let ctx = null;
  let game = null;
  let level = 1;
  let category = null;

  const gamesFor = (cat, age) => GAMES.filter((g) => g.cat === cat && age >= g.minAge && age <= g.maxAge);

  function difficulty(g, lvl, age) {
    const extra = g.levels > 1 ? Math.round(((lvl - 1) * 4) / (g.levels - 1)) : 0;
    return Math.max(1, Math.min(10, AGE_BASE[age] + extra));
  }

  function refreshStars() {
    document.querySelectorAll('.stars-total').forEach((b) => { b.textContent = Store.get('stars'); });
  }

  function addStars(n) {
    if (!n) return;
    Store.set('stars', Store.get('stars') + n);
    refreshStars();
    document.querySelectorAll('.screen.active .star-count').forEach((s) => {
      s.classList.remove('bump'); void s.offsetWidth; s.classList.add('bump');
    });
  }

  function show(id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
    const sc = document.querySelector('#' + id + ' .scroll');
    if (sc) sc.scrollTop = 0;
  }
  const current = () => document.querySelector('.screen.active').id;

  /* ---------- 1. Umur ---------- */
  function renderAges() {
    const grid = $('age-grid');
    grid.innerHTML = '';
    for (let a = 1; a <= 10; a++) {
      grid.append(h('button', {
        class: 'age-btn' + (a === Store.get('age') ? ' on' : ''),
        style: { background: PALETTE[(a - 1) % PALETTE.length] },
        onClick: () => chooseAge(a),
      }, h('span', { class: 'age-emoji' }, AGE_EMOJI[a]), h('span', { class: 'age-num' }, a), h('span', { class: 'age-unit' }, 'tahun')));
    }
  }
  function chooseAge(a) {
    Sound.tap();
    Store.set('age', a);
    speak(`Umur ${a} tahun. Ayo pilih mau belajar apa!`);
    openCategories();
  }

  /* ---------- 2. Kategori ---------- */
  function openCategories() {
    const age = Store.get('age');
    $('age-pill').textContent = `${AGE_EMOJI[age]} Umur ${age} tahun ✏️`;
    const grid = $('cat-grid');
    grid.innerHTML = '';
    CATEGORIES.forEach((c) => {
      const count = gamesFor(c.id, age).length;
      if (!count) return;
      grid.append(h('button', {
        class: 'cat-card', style: { background: c.color },
        onClick: () => { Sound.tap(); speak(c.title); openGames(c); },
      }, h('span', { class: 'cat-icon' }, c.icon), h('span', { class: 'cat-title' }, c.title), h('span', { class: 'cat-count' }, `${count} permainan`)));
    });
    show('screen-cat');
  }

  /* ---------- 3. Permainan ---------- */
  function openGames(c) {
    category = c;
    const age = Store.get('age');
    $('games-title').textContent = c.icon + ' ' + c.short;
    const grid = $('games-grid');
    grid.innerHTML = '';
    gamesFor(c.id, age).forEach((g) => {
      const p = Store.progress(g.id);
      const stars = Object.values(p.best).reduce((a, b) => a + b, 0);
      grid.append(h('button', {
        class: 'card', style: { background: g.color },
        onClick: () => { Sound.tap(); g.levels ? openLevels(g) : start(g, 0); },
      },
      g.levels ? h('span', { class: 'c-badge' }, `⭐ ${stars}/${g.levels * 3}`) : h('span', { class: 'c-badge' }, 'Jelajah'),
      h('span', { class: 'c-icon' }, g.icon),
      h('span', { class: 'c-title' }, g.title)));
    });
    show('screen-games');
  }

  /* ---------- 4. Level ---------- */
  function openLevels(g) {
    game = g;
    const age = Store.get('age');
    const p = Store.progress(g.id);
    $('level-title').textContent = g.icon + ' ' + g.title;
    $('level-sub').textContent = `Untuk umur ${age} tahun. Selesaikan satu level untuk membuka level berikutnya.`;
    const grid = $('level-grid');
    grid.innerHTML = '';
    for (let l = 1; l <= g.levels; l++) {
      const locked = l > p.unlocked;
      const best = p.best[l] || 0;
      const name = g.levelNames ? g.levelNames[l - 1] : ['Mudah', 'Sedang', 'Menantang', 'Sulit', 'Juara'][Math.round(((l - 1) * 4) / Math.max(1, g.levels - 1))];
      grid.append(h('button', {
        class: 'level-btn' + (locked ? ' locked' : ''),
        onClick: () => {
          if (locked) { Sound.wrong(); speak(`Selesaikan level ${l - 1} dulu ya.`); return; }
          Sound.tap(); start(g, l);
        },
      },
      h('span', { class: 'lv-num' }, locked ? '🔒' : l),
      h('span', { class: 'lv-name' }, `Level ${l} · ${name}`),
      h('span', { class: 'lv-stars' }, '★'.repeat(best) + '☆'.repeat(3 - best))));
    }
    show('screen-level');
  }

  /* ---------- 5. Bermain ---------- */
  function stop() {
    if (!ctx) return;
    ctx.dead = true;
    ctx.timers.forEach(clearTimeout);
    ctx.cleanups.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
    ctx = null;
    Voice.stop();
  }

  function start(g, lvl) {
    stop();
    game = g;
    level = lvl;
    const age = Store.get('age');
    $('reward').classList.add('hidden');
    $('play-title').textContent = g.icon + ' ' + g.title + (lvl ? ` · Lv ${lvl}` : '');
    const stage = $('stage');
    stage.innerHTML = '';
    stage.scrollTop = 0;
    show('screen-play');
    const c = {
      stage,
      age,
      level: lvl,
      d: difficulty(g, lvl || 1, age),
      dead: false,
      timers: [],
      cleanups: [],
      later(fn, ms) { const t = setTimeout(() => { if (!c.dead) fn(); }, ms); c.timers.push(t); return t; },
      onCleanup(fn) { c.cleanups.push(fn); },
      addStar: addStars,
      finish(stars) { if (!c.dead) showReward(stars); },
    };
    ctx = c;
    try {
      g.start(c);
    } catch (e) {
      console.error(e);
      stage.append(h('p', null, 'Ups, terjadi kesalahan.'));
    }
  }

  function showReward(stars) {
    stars = Math.max(1, Math.min(3, stars || 1));
    const p = Store.progress(game.id);
    p.best[level] = Math.max(p.best[level] || 0, stars);
    const hasNext = level < game.levels;
    if (hasNext) p.unlocked = Math.max(p.unlocked, level + 1);
    Store.saveProgress();
    Sound.win();
    confetti(80);
    $('reward-title').textContent = stars === 3 ? 'Sempurna!' : stars === 2 ? 'Hebat Sekali!' : 'Bagus!';
    $('reward-stars').innerHTML = '';
    for (let i = 0; i < 3; i++) $('reward-stars').append(h('span', { class: i < stars ? 'rs on' : 'rs' }, '★'));
    $('reward-text').textContent = hasNext ? `Level ${level + 1} sudah terbuka!` : 'Kamu sudah menyelesaikan semua level! 🎉';
    $('btn-next').classList.toggle('hidden', !hasNext);
    $('reward').classList.remove('hidden');
    speak(`${stars === 3 ? 'Sempurna!' : 'Hebat!'} Kamu dapat ${stars} bintang.${hasNext ? ' Level berikutnya sudah terbuka.' : ''}`);
  }

  function back() {
    if (!$('settings').classList.contains('hidden')) { $('settings').classList.add('hidden'); return true; }
    const s = current();
    if (s === 'screen-play') {
      stop();
      $('reward').classList.add('hidden');
      if (game.levels) openLevels(game); else openGames(category);
      return true;
    }
    if (s === 'screen-level') { openGames(category); return true; }
    if (s === 'screen-games') { openCategories(); return true; }
    if (s === 'screen-cat') { renderAges(); show('screen-age'); return true; }
    return false;
  }
  /* Dipanggil oleh tombol kembali Android. true = sudah ditangani. */
  window.handleBack = back;

  /* ---------- Pengaturan ---------- */
  function openSettings() {
    $('set-sound').checked = Store.get('sound');
    $('set-voice').checked = Store.get('voice');
    $('set-rate').value = Store.get('rate');
    const sel = $('set-voice-name');
    const voices = Voice.list();
    const cur = Voice.current();
    sel.innerHTML = '';
    voices.forEach((v) => sel.append(h('option', { value: v.name, selected: v.name === cur }, v.label || v.name)));
    sel.disabled = !voices.length;
    $('voice-hint').textContent = voices.length
      ? 'Coba beberapa suara dengan tombol Tes Suara, lalu pilih yang paling enak didengar.'
      : 'Suara Bahasa Indonesia belum terpasang di HP ini. Tekan "Unduh Suara" lalu pasang data suara Bahasa Indonesia.';
    $('btn-tts-settings').classList.toggle('hidden', !window.AndroidTTS);
    $('settings').classList.remove('hidden');
  }

  function init() {
    Voice.init();
    refreshStars();
    renderAges();
    document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => { Sound.tap(); back(); }));
    document.querySelectorAll('.btn-settings').forEach((b) => b.addEventListener('click', openSettings));
    $('age-pill').addEventListener('click', () => { renderAges(); show('screen-age'); });
    $('btn-menu').addEventListener('click', () => { stop(); $('reward').classList.add('hidden'); openGames(category); });
    $('btn-again').addEventListener('click', () => start(game, level));
    $('btn-next').addEventListener('click', () => start(game, level + 1));
    $('btn-close-settings').addEventListener('click', () => $('settings').classList.add('hidden'));
    $('set-sound').addEventListener('change', (e) => Store.set('sound', e.target.checked));
    $('set-voice').addEventListener('change', (e) => { Store.set('voice', e.target.checked); if (!e.target.checked) Voice.stop(); });
    $('set-voice-name').addEventListener('change', (e) => { Voice.choose(e.target.value); speak('Halo! Ayo kita belajar bersama.'); });
    $('set-rate').addEventListener('change', (e) => { Store.set('rate', parseFloat(e.target.value)); Voice.applyRate(); speak('Halo! Ayo kita belajar bersama.'); });
    $('btn-test-voice').addEventListener('click', () => speak(`Halo! Ayo kita belajar bersama. ${sayLetter('C')}, ${saySyllable('ca')}, ${saySyllable('ci')}. Cabai.`));
    $('btn-tts-settings').addEventListener('click', () => { try { window.AndroidTTS.openSettings(); } catch (e) { /* abaikan */ } });
    $('btn-reset').addEventListener('click', () => {
      if (confirm('Hapus semua bintang dan progres level?')) { Store.reset(); refreshStars(); }
    });
    // Buka kunci audio pada sentuhan pertama (kebijakan autoplay browser)
    document.addEventListener('pointerdown', () => Sound.unlock(), { once: true });
  }

  return { init };
})();

App.init();
