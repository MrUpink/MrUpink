'use strict';
/* Navigasi, menu utama, hadiah, dan pengaturan. */

const CATEGORIES = [
  { id: 'huruf', title: 'Huruf & Membaca', icon: '📚' },
  { id: 'angka', title: 'Angka & Berhitung', icon: '🔢' },
  { id: 'motorik', title: 'Motorik & Kreasi', icon: '✋' },
  { id: 'logika', title: 'Logika & Pengetahuan', icon: '🧠' },
];
const AGE_LABEL = { 1: '1–3 th', 2: '4–6 th', 3: '7–10 th' };

const App = (() => {
  const $ = (id) => document.getElementById(id);
  let ctx = null;
  let current = null;

  function refreshStars() {
    $('home-stars').textContent = Store.get('stars');
    $('play-stars').textContent = Store.get('stars');
  }

  function addStars(n) {
    if (!n) return;
    Store.set('stars', Store.get('stars') + n);
    refreshStars();
    document.querySelectorAll('.star-count').forEach((s) => {
      s.classList.remove('bump'); void s.offsetWidth; s.classList.add('bump');
    });
  }

  function renderMenu() {
    const level = Store.get('age');
    document.querySelectorAll('#age-chips button').forEach((b) => b.classList.toggle('on', +b.dataset.age === level));
    const menu = $('menu');
    menu.innerHTML = '';
    CATEGORIES.forEach((cat) => {
      const games = GAMES.filter((g) => g.cat === cat.id)
        .sort((a, b) => (b.ages.includes(level) ? 1 : 0) - (a.ages.includes(level) ? 1 : 0));
      const cards = h('div', { class: 'cards' });
      games.forEach((g) => {
        const fits = g.ages.includes(level);
        cards.append(h('button', {
          class: 'card' + (fits ? '' : ' dim'),
          style: { background: g.color },
          onClick: () => { Sound.tap(); start(g); },
        },
        fits ? h('span', { class: 'c-badge' }, '⭐ Cocok') : null,
        h('span', { class: 'c-icon' }, g.icon),
        h('span', { class: 'c-title' }, g.title)));
      });
      menu.append(h('div', { class: 'section-title' }, cat.icon, ' ', cat.title), cards);
    });
  }

  function stop() {
    if (!ctx) return;
    ctx.dead = true;
    ctx.timers.forEach(clearTimeout);
    ctx.cleanups.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
    ctx = null;
    Voice.stop();
  }

  function start(game) {
    stop();
    current = game;
    $('reward').classList.add('hidden');
    $('home').classList.remove('active');
    $('play').classList.add('active');
    $('play-title').textContent = game.icon + ' ' + game.title;
    const stage = $('stage');
    stage.innerHTML = '';
    stage.scrollTop = 0;
    const c = {
      stage,
      level: Store.get('age'),
      dead: false,
      timers: [],
      cleanups: [],
      later(fn, ms) { const t = setTimeout(() => { if (!c.dead) fn(); }, ms); c.timers.push(t); return t; },
      onCleanup(fn) { c.cleanups.push(fn); },
      addStar: addStars,
      finish(stars, total) { if (!c.dead) showReward(stars, total); },
    };
    ctx = c;
    try {
      game.start(c);
    } catch (e) {
      console.error(e);
      stage.append(h('p', null, 'Ups, terjadi kesalahan.'));
    }
  }

  function showReward(stars, total) {
    Sound.win();
    confetti(80);
    $('reward-text').textContent = `Kamu menyelesaikan ${current.title}!`;
    $('reward-stars').textContent = '⭐'.repeat(Math.min(stars, 10)) + (stars > 10 ? ` +${stars - 10}` : '');
    $('reward').classList.remove('hidden');
    speak(`Hebat sekali! Kamu mendapat ${stars} bintang.`);
  }

  function goHome() {
    stop();
    $('reward').classList.add('hidden');
    $('play').classList.remove('active');
    $('home').classList.add('active');
    renderMenu();
  }

  function openSettings() {
    $('set-sound').checked = Store.get('sound');
    $('set-voice').checked = Store.get('voice');
    $('settings').classList.remove('hidden');
  }

  /* Dipanggil oleh tombol kembali Android. true = sudah ditangani. */
  window.handleBack = () => {
    if (!$('settings').classList.contains('hidden')) { $('settings').classList.add('hidden'); return true; }
    if ($('play').classList.contains('active')) { goHome(); return true; }
    return false;
  };

  function init() {
    refreshStars();
    renderMenu();
    $('age-chips').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      Sound.tap();
      Store.set('age', +b.dataset.age);
      renderMenu();
      speak(`Umur ${AGE_LABEL[+b.dataset.age].replace('–', ' sampai ').replace('th', 'tahun')}`);
    });
    $('btn-back').addEventListener('click', goHome);
    $('btn-menu').addEventListener('click', goHome);
    $('btn-again').addEventListener('click', () => start(current));
    $('btn-settings').addEventListener('click', openSettings);
    $('btn-close-settings').addEventListener('click', () => $('settings').classList.add('hidden'));
    $('set-sound').addEventListener('change', (e) => Store.set('sound', e.target.checked));
    $('set-voice').addEventListener('change', (e) => { Store.set('voice', e.target.checked); if (!e.target.checked) Voice.stop(); });
    $('btn-reset').addEventListener('click', () => {
      if (confirm('Hapus semua bintang?')) { Store.reset(); refreshStars(); }
    });
    // Buka kunci audio pada sentuhan pertama (kebijakan autoplay browser)
    document.addEventListener('pointerdown', () => Sound.unlock(), { once: true });
  }

  return { init };
})();

App.init();
