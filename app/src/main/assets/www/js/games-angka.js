'use strict';
/* Permainan angka & berhitung. ctx.d = tingkat kesulitan 1–10. */

function emojiRow(e, n, fadedFrom = Infinity) {
  return h('div', { class: 'q-row' }, Array.from({ length: n }, (_, i) => h('span', { class: i >= fadedFrom ? 'faded' : null }, e)));
}

registerGame({
  id: 'kenal-angka', cat: 'angka', title: 'Kenal Angka', icon: '🔢', color: '#69db7c', minAge: 1, maxAge: 6, levels: 0,
  start(ctx) {
    const max = ctx.age <= 3 ? 10 : 20;
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
  id: 'berhitung', cat: 'angka', title: 'Ayo Menghitung', icon: '🍎', color: '#ff6b6b', minAge: 1, maxAge: 7,
  start(ctx) {
    const d = ctx.d;
    const [min, max] = D(d, [1, 3], [1, 5], [2, 6], [3, 8], [1, 10], [5, 12], [8, 15], [10, 20], [12, 20], [15, 25]);
    const nOpt = D(d, 2, 3, 3, 3, 4, 4, 4, 4, 4, 4);
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
          options: numOptions(n, nOpt, Math.max(1, min - 2), max + 2),
          render: (x) => x,
          isCorrect: (x) => x === n,
          sayCorrect: `Ada ${n} ${obj.n}`,
          cols: nOpt === 4 ? 2 : nOpt,
        });
      },
    });
  },
});

registerGame({
  id: 'matematika', cat: 'angka', title: 'Matematika', icon: '➕', color: '#748ffc', minAge: 4, maxAge: 10,
  start(ctx) {
    const d = ctx.d;
    const words = { '+': 'tambah', '−': 'kurang', '×': 'kali', ':': 'bagi' };
    const add = (lim, minA = 1) => { const a = R.int(minA, lim - 1), b = R.int(1, lim - a); return { a, b, op: '+', ans: a + b }; };
    const sub = (lim) => { const a = R.int(2, lim), b = R.int(1, a - 1); return { a, b, op: '−', ans: a - b }; };
    const mul = (maxA) => { const a = R.int(2, maxA), b = R.int(1, 10); return { a, b, op: '×', ans: a * b }; };
    const div = (maxB) => { const b = R.int(2, maxB), ans = R.int(1, 10); return { a: b * ans, b, op: ':', ans }; };
    function make() {
      switch (d) {
        case 1: return add(5);
        case 2: return add(10);
        case 3: return sub(10);
        case 4: return R.pick([add, sub])(10);
        case 5: return R.pick([add, sub])(20);
        case 6: return R.pick([add, sub])(50);
        case 7: return Math.random() < 0.5 ? add(100, 10) : sub(100);
        case 8: return Math.random() < 0.6 ? mul(5) : div(5);
        case 9: return Math.random() < 0.6 ? mul(10) : div(10);
        default: {
          const q = R.pick([() => add(100, 10), () => sub(100), () => mul(10), () => div(10)])();
          if (Math.random() < 0.5) q.missing = true; // soal "? + 7 = 15"
          return q;
        }
      }
    }
    runRounds(ctx, {
      round(area, api) {
        const q = make();
        const obj = R.pick(COUNTABLES).e;
        const pics = d <= 4 && q.a <= 10
          ? (q.op === '+'
            ? h('div', { class: 'q-row' }, emojiRow(obj, q.a), h('b', null, ' + '), emojiRow(obj, q.b))
            : emojiRow(obj, q.a, q.a - q.b))
          : null;
        const ans = q.missing ? q.a : q.ans;
        const text = q.missing ? `? ${q.op} ${q.b} = ${q.ans}` : `${q.a} ${q.op} ${q.b} = ?`;
        const say = q.missing
          ? `Berapa ${words[q.op]} ${q.b}, sama dengan ${q.ans}?`
          : `${q.a} ${words[q.op]} ${q.b}, sama dengan berapa?`;
        choiceRound(area, api, {
          prompt: h('div', null, pics, h('div', { class: 'q-big' }, text)),
          say,
          options: numOptions(ans, D(d, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4), 0, Math.max(20, ans + 10)),
          render: (x) => x,
          isCorrect: (x) => x === ans,
          sayCorrect: `${q.a} ${words[q.op]} ${q.b}, sama dengan ${q.ans}`,
          cols: d <= 3 ? 3 : 2,
        });
      },
    });
  },
});

registerGame({
  id: 'banyak-sedikit', cat: 'angka', title: 'Banyak & Sedikit', icon: '⚖️', color: '#38d9a9', minAge: 2, maxAge: 7,
  start(ctx) {
    const d = ctx.d;
    runRounds(ctx, {
      round(area, api) {
        const more = d <= 2 || Math.random() < 0.5;
        if (d >= 6) {
          const [lo, hi, count] = D(d, null, null, null, null, null, [1, 20, 2], [10, 99, 3], [10, 99, 3], [100, 999, 3], [100, 999, 4]);
          const nums = [];
          while (nums.length < count) { const x = R.int(lo, hi); if (!nums.includes(x)) nums.push(x); }
          const ans = more ? Math.max(...nums) : Math.min(...nums);
          choiceRound(area, api, {
            prompt: h('div', { class: 'q-text' }, more ? 'Mana angka yang paling BESAR?' : 'Mana angka yang paling KECIL?'),
            say: more ? 'Mana angka yang paling besar?' : 'Mana angka yang paling kecil?',
            options: nums, cols: count === 4 ? 2 : count, render: (x) => x, isCorrect: (x) => x === ans, sayCorrect: String(ans),
          });
          return;
        }
        const max = D(d, 3, 5, 6, 8, 10, 10, 10, 10, 10, 10);
        const a = R.int(1, max);
        let b = R.int(1, max);
        while (b === a || (d <= 2 && Math.abs(a - b) < 2)) b = R.int(1, max);
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
  id: 'urutan-angka', cat: 'angka', title: 'Angka Hilang', icon: '🔎', color: '#20c997', minAge: 4, maxAge: 10,
  start(ctx) {
    const d = ctx.d;
    runRounds(ctx, {
      round(area, api) {
        const step = R.pick(D(d, [1], [1], [1], [1, -1], [2], [2, 5], [2, 5, 10, -2], [3, 4, 5, -5], [3, 4, 6, 25, -3], [4, 6, 7, 9, -4]));
        const len = D(d, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6);
        const maxStart = D(d, 6, 15, 15, 20, 20, 30, 50, 50, 100, 100);
        const start = step > 0 ? R.int(1, maxStart) : R.int(Math.abs(step) * len, Math.abs(step) * len + maxStart);
        const seq = Array.from({ length: len }, (_, i) => start + i * step);
        const miss = R.int(d <= 2 ? len - 1 : 0, len - 1);
        const ans = seq[miss];
        const boxes = seq.map((n, i) => h('div', { class: 'seq-box' + (i === miss ? ' missing' : '') }, i === miss ? '?' : n));
        choiceRound(area, api, {
          prompt: h('div', null, h('div', { class: 'q-text' }, 'Angka berapa yang hilang?'), h('div', { class: 'seq' }, boxes)),
          say: 'Angka berapa yang hilang?',
          options: numOptions(ans, d <= 3 ? 3 : 4, 0, 1000),
          render: (x) => x,
          isCorrect: (x) => x === ans,
          sayCorrect: seq.join(', '),
          cols: d <= 3 ? 3 : 2,
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
  if (mm === 15) return `jam ${hh} lewat seperempat`;
  if (mm === 45) return `jam ${hh % 12 + 1} kurang seperempat`;
  return `jam ${hh} lewat ${mm} menit`;
}

registerGame({
  id: 'jam', cat: 'angka', title: 'Membaca Jam', icon: '⏰', color: '#ffa94d', minAge: 6, maxAge: 10,
  start(ctx) {
    const d = ctx.d;
    const minutes = D(d, [0], [0], [0], [0], [0, 30], [0, 30], [0, 15, 30, 45], [0, 15, 30, 45],
      [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55], Array.from({ length: 60 }, (_, i) => i));
    const fmt = (t) => `${String(t.h).padStart(2, '0')}.${String(t.m).padStart(2, '0')}`;
    runRounds(ctx, {
      round(area, api) {
        const ans = { h: R.int(1, 12), m: R.pick(minutes) };
        const pool = [];
        for (let i = 0; i < 20; i++) pool.push({ h: R.int(1, 12), m: R.pick(minutes) });
        if (d >= 7) pool.push({ h: ans.h % 12 + 1, m: ans.m }, { h: Math.round(ans.m / 5) || 12, m: (ans.h * 5) % 60 });
        choiceRound(area, api, {
          prompt: h('div', null, h('div', { class: 'q-text' }, 'Jam berapa sekarang?'), clockSvg(ans.h, ans.m)),
          say: 'Jam berapa sekarang?',
          options: optionsWith(ans, pool, d <= 4 ? 3 : 4, fmt), cols: 2, choiceClass: 'small-text',
          render: fmt,
          isCorrect: (x) => fmt(x) === fmt(ans),
          sayCorrect: timeWords(ans.h, ans.m),
        });
      },
    });
  },
});
