'use strict';
/* Permainan angka & berhitung. */

function emojiRow(e, n, fadedFrom = Infinity) {
  return h('div', { class: 'q-row' }, Array.from({ length: n }, (_, i) => h('span', { class: i >= fadedFrom ? 'faded' : null }, e)));
}

registerGame({
  id: 'kenal-angka', cat: 'angka', title: 'Kenal Angka', icon: '🔢', color: '#69db7c', ages: [1, 2],
  start(ctx) {
    const max = ctx.level === 1 ? 10 : 20;
    const show = h('div', { class: 'letter-show' });
    const grid = h('div', { class: 'letter-grid' });
    function display(n) {
      const obj = R.pick(COUNTABLES);
      show.innerHTML = '';
      show.append(
        h('div', { class: 'ls-letter' }, n),
        h('div', { class: 'ls-pic' }, obj.e),
        h('div', { class: 'ls-objs' }, Array.from({ length: n }, () => h('span', null, obj.e))),
      );
      show.classList.remove('pop');
      void show.offsetWidth;
      show.classList.add('pop');
      if (n === 0) speak('Nol. Tidak ada apa-apa.');
      else if (n <= 10) speak(Array.from({ length: n }, (_, i) => i + 1).join(', ') + `. Ada ${n} ${obj.n}.`);
      else speak(`${n}. Ada ${n} ${obj.n}.`);
    }
    for (let n = 0; n <= max; n++) {
      grid.append(h('button', {
        class: 'tile', style: { background: PALETTE[n % PALETTE.length] },
        onClick: () => { Sound.tap(); display(n); },
      }, n));
    }
    ctx.stage.append(show, grid);
    display(1);
  },
});

registerGame({
  id: 'berhitung', cat: 'angka', title: 'Ayo Berhitung', icon: '🍎', color: '#ff6b6b', ages: [1, 2],
  start(ctx) {
    const lv = ctx.level;
    const [min, max] = [[1, 5], [1, 10], [6, 20]][lv - 1];
    runRounds(ctx, {
      round(area, api) {
        const n = R.int(min, max);
        const obj = R.pick(COUNTABLES);
        let counted = 0;
        const objs = Array.from({ length: n }, () => {
          const s = h('span', null, obj.e);
          s.addEventListener('click', () => {
            if (s.classList.contains('counted')) return;
            counted++;
            s.dataset.n = counted;
            s.classList.add('counted');
            Sound.tap();
            speak(String(counted));
          });
          return s;
        });
        choiceRound(area, api, {
          prompt: h('div', null, h('div', { class: 'q-text' }, `Ada berapa ${obj.n}? (ketuk untuk menghitung)`), h('div', { class: 'count-area' }, objs)),
          say: `Ada berapa ${obj.n}?`,
          options: numOptions(n, lv === 1 ? 3 : 4, Math.max(1, min - 2), max + 2),
          render: (x) => x,
          isCorrect: (x) => x === n,
          sayCorrect: `Ada ${n} ${obj.n}`,
          cols: lv === 1 ? 3 : 2,
        });
      },
    });
  },
});

registerGame({
  id: 'matematika', cat: 'angka', title: 'Tambah & Kurang', icon: '➕', color: '#748ffc', ages: [2, 3],
  start(ctx) {
    const lv = ctx.level;
    const words = { '+': 'tambah', '−': 'kurang', '×': 'kali', ':': 'bagi' };
    function make() {
      if (lv === 1) { const a = R.int(1, 3), b = R.int(1, 2); return { a, b, op: '+', ans: a + b }; }
      if (lv === 2) {
        if (Math.random() < 0.5) { const a = R.int(1, 9), b = R.int(1, 10 - a); return { a, b, op: '+', ans: a + b }; }
        const a = R.int(2, 10), b = R.int(1, a - 1); return { a, b, op: '−', ans: a - b };
      }
      const op = R.pick(['+', '−', '×', ':']);
      if (op === '+') { const a = R.int(10, 80), b = R.int(5, 99 - a); return { a, b, op, ans: a + b }; }
      if (op === '−') { const a = R.int(20, 99), b = R.int(5, a - 5); return { a, b, op, ans: a - b }; }
      if (op === '×') { const a = R.int(2, 10), b = R.int(1, 10); return { a, b, op, ans: a * b }; }
      const b = R.int(2, 10), ans = R.int(1, 10); return { a: b * ans, b, op, ans };
    }
    runRounds(ctx, {
      round(area, api) {
        const q = make();
        const obj = R.pick(COUNTABLES).e;
        const pics = lv === 1 || (lv === 2 && q.a <= 10)
          ? (q.op === '+'
            ? h('div', { class: 'q-row' }, emojiRow(obj, q.a), h('b', null, ' + '), emojiRow(obj, q.b))
            : emojiRow(obj, q.a, q.a - q.b))
          : null;
        choiceRound(area, api, {
          prompt: h('div', null, pics, h('div', { class: 'q-big' }, `${q.a} ${q.op} ${q.b} = ?`)),
          say: `${q.a} ${words[q.op]} ${q.b}, sama dengan berapa?`,
          options: numOptions(q.ans, lv === 1 ? 3 : 4, 0, lv === 3 ? 100 : 20),
          render: (x) => x,
          isCorrect: (x) => x === q.ans,
          sayCorrect: `${q.a} ${words[q.op]} ${q.b} sama dengan ${q.ans}`,
          cols: lv === 1 ? 3 : 2,
        });
      },
    });
  },
});

registerGame({
  id: 'banyak-sedikit', cat: 'angka', title: 'Banyak & Sedikit', icon: '⚖️', color: '#38d9a9', ages: [1, 2],
  start(ctx) {
    const lv = ctx.level;
    runRounds(ctx, {
      round(area, api) {
        const more = lv === 1 || Math.random() < 0.5;
        if (lv === 3) {
          const nums = R.sample(Array.from({ length: 90 }, (_, i) => i + 10), 3);
          const ans = more ? Math.max(...nums) : Math.min(...nums);
          choiceRound(area, api, {
            prompt: h('div', { class: 'q-text' }, more ? 'Mana angka yang paling BESAR?' : 'Mana angka yang paling KECIL?'),
            say: more ? 'Mana angka yang paling besar?' : 'Mana angka yang paling kecil?',
            options: nums, cols: 3, render: (x) => x, isCorrect: (x) => x === ans, sayCorrect: String(ans),
          });
          return;
        }
        const max = lv === 1 ? 5 : 10;
        const a = R.int(1, max);
        let b = R.int(1, max);
        while (b === a) b = R.int(1, max);
        const obj = R.pick(COUNTABLES);
        const ans = more ? Math.max(a, b) : Math.min(a, b);
        choiceRound(area, api, {
          prompt: h('div', { class: 'q-text' }, more ? `Mana ${obj.n} yang lebih BANYAK?` : `Mana ${obj.n} yang lebih SEDIKIT?`),
          say: more ? `Mana ${obj.n} yang lebih banyak?` : `Mana ${obj.n} yang lebih sedikit?`,
          options: [a, b], cols: 2,
          render: (x) => h('div', { class: 'grp' }, obj.e.repeat(x)),
          isCorrect: (x) => x === ans,
          sayCorrect: `Ada ${ans} ${obj.n}`,
        });
      },
    });
  },
});

registerGame({
  id: 'urutan-angka', cat: 'angka', title: 'Angka Hilang', icon: '🔍', color: '#20c997', ages: [2, 3],
  start(ctx) {
    const lv = ctx.level;
    runRounds(ctx, {
      round(area, api) {
        let step = 1, len = 4, start;
        if (lv === 1) start = R.int(1, 7);
        else if (lv === 2) { len = 5; start = R.int(1, 16); if (Math.random() < 0.3) { step = -1; start = R.int(6, 20); } }
        else { len = 5; step = R.pick([2, 3, 5, 10, -2]); start = step > 0 ? R.int(1, 20) : R.int(20, 40); }
        const seq = Array.from({ length: len }, (_, i) => start + i * step);
        const miss = R.int(lv === 1 ? 1 : 0, len - 1);
        const ans = seq[miss];
        const boxes = seq.map((n, i) => h('div', { class: 'seq-box' + (i === miss ? ' missing' : '') }, i === miss ? '?' : n));
        choiceRound(area, api, {
          prompt: h('div', null, h('div', { class: 'q-text' }, 'Angka berapa yang hilang?'), h('div', { class: 'seq' }, boxes)),
          say: 'Angka berapa yang hilang?',
          options: numOptions(ans, lv === 1 ? 3 : 4, 0, 100),
          render: (x) => x,
          isCorrect: (x) => x === ans,
          sayCorrect: seq.join(', '),
          cols: lv === 1 ? 3 : 2,
        });
        api.onDone = () => { boxes[miss].textContent = ans; };
      },
    });
  },
});

function clockSvg(hh, mm) {
  const ns = 'http://www.w3.org/2000/svg';
  const marks = Array.from({ length: 12 }, (_, i) => {
    const a = ((i + 1) * 30 - 90) * Math.PI / 180;
    return `<text x="${(100 + 72 * Math.cos(a)).toFixed(1)}" y="${(100 + 72 * Math.sin(a) + 8).toFixed(1)}" text-anchor="middle" font-size="22" font-weight="900" fill="#2b2d42">${i + 1}</text>`;
  }).join('');
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const a = (i * 6 - 90) * Math.PI / 180, r1 = i % 5 ? 88 : 84;
    return `<line x1="${(100 + r1 * Math.cos(a)).toFixed(1)}" y1="${(100 + r1 * Math.sin(a)).toFixed(1)}" x2="${(100 + 92 * Math.cos(a)).toFixed(1)}" y2="${(100 + 92 * Math.sin(a)).toFixed(1)}" stroke="#868e96" stroke-width="${i % 5 ? 1 : 3}"/>`;
  }).join('');
  const ha = ((hh % 12) + mm / 60) * 30, ma = mm * 6;
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 200 200');
  svg.setAttribute('class', 'clock');
  svg.innerHTML = `<circle cx="100" cy="100" r="96" fill="#fff" stroke="#ff922b" stroke-width="8"/>${ticks}${marks}
    <line x1="100" y1="100" x2="100" y2="52" stroke="#e03131" stroke-width="8" stroke-linecap="round" transform="rotate(${ha} 100 100)"/>
    <line x1="100" y1="100" x2="100" y2="26" stroke="#1c7ed6" stroke-width="5" stroke-linecap="round" transform="rotate(${ma} 100 100)"/>
    <circle cx="100" cy="100" r="7" fill="#2b2d42"/>`;
  return svg;
}

function timeWords(hh, mm) {
  if (mm === 0) return `jam ${hh}`;
  if (mm === 30) return `jam setengah ${hh % 12 + 1}`;
  return `jam ${hh} lewat ${mm} menit`;
}

registerGame({
  id: 'jam', cat: 'angka', title: 'Membaca Jam', icon: '⏰', color: '#ffa94d', ages: [3],
  start(ctx) {
    const lv = ctx.level;
    const minutes = [[0], [0, 30], [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]][lv - 1];
    const fmt = (t) => `${String(t.h).padStart(2, '0')}.${String(t.m).padStart(2, '0')}`;
    runRounds(ctx, {
      round(area, api) {
        const ans = { h: R.int(1, 12), m: R.pick(minutes) };
        const pool = [];
        for (let i = 0; i < 20; i++) pool.push({ h: R.int(1, 12), m: R.pick(minutes) });
        if (lv === 3) pool.push({ h: ans.h, m: (ans.m + 15) % 60 }, { h: ans.m / 5 || 12, m: ans.h * 5 % 60 });
        choiceRound(area, api, {
          prompt: h('div', null, h('div', { class: 'q-text' }, 'Jam berapa sekarang?'), clockSvg(ans.h, ans.m)),
          say: 'Jam berapa sekarang?',
          options: optionsWith(ans, pool, lv === 1 ? 3 : 4, fmt), cols: 2, choiceClass: 'small-text',
          render: fmt,
          isCorrect: (x) => fmt(x) === fmt(ans),
          sayCorrect: timeWords(ans.h, ans.m),
        });
      },
    });
  },
});
