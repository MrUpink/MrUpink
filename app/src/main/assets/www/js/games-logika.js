'use strict';
/* Permainan logika & pengetahuan. ctx.d = tingkat kesulitan 1–10. */

function shapeSvg(shape, color) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.innerHTML = `<g fill="${color}" stroke="rgba(0,0,0,.15)" stroke-width="3">${shape.svg}</g>`;
  return svg;
}

registerGame({
  id: 'warna', cat: 'logika', title: 'Kenal Warna', icon: '🌈', color: '#ff922b', minAge: 1, maxAge: 6,
  start(ctx) {
    const d = ctx.d;
    const pool = COLORS.slice(0, D(d, 3, 4, 5, 6, 7, 8, 9, 11, 11, 11));
    const next = makeBag(pool);
    const objs = COLOR_OBJECTS.filter((o) => pool.some((c) => c.n === o.c));
    const n = D(d, 2, 3, 3, 4, 4, 4, 6, 6, 6, 6);
    runRounds(ctx, {
      round(area, api) {
        if (d >= 4 && objs.length && Math.random() < (d >= 6 ? 0.6 : 0.35)) {
          const o = R.pick(objs);
          const ans = COLORS.find((c) => c.n === o.c);
          choiceRound(area, api, {
            prompt: h('div', null, h('div', { class: 'q-emoji' }, o.e), h('div', { class: 'q-text' }, `Apa warna ${o.n}?`)),
            say: `Apa warna ${o.n}?`,
            options: optionsWith(ans, pool, n, (c) => c.n),
            render: (c) => h('div', { class: 'swatch', style: { background: c.c } }),
            isCorrect: (c) => c === ans,
            sayCorrect: `${o.n} berwarna ${ans.n}`,
            cols: n > 4 ? 3 : 2,
          });
          return;
        }
        const ans = next();
        choiceRound(area, api, {
          prompt: h('div', { class: 'q-text' }, h('span', null, 'Mana warna '), h('b', null, ans.n.toUpperCase()), '?'),
          say: `Mana warna ${ans.n}?`,
          options: optionsWith(ans, pool, n, (c) => c.n),
          render: (c) => h('div', { class: 'swatch', style: { background: c.c } }),
          isCorrect: (c) => c === ans,
          sayCorrect: ans.n,
          cols: n === 4 ? 2 : n,
        });
      },
    });
  },
});

registerGame({
  id: 'bentuk', cat: 'logika', title: 'Kenal Bentuk', icon: '🔷', color: '#339af0', minAge: 2, maxAge: 7,
  start(ctx) {
    const d = ctx.d;
    const pool = SHAPES.slice(0, D(d, 3, 4, 4, 5, 6, 7, 8, 9, 10, 10));
    const next = makeBag(pool);
    const n = D(d, 2, 3, 3, 3, 4, 4, 4, 4, 6, 6);
    runRounds(ctx, {
      round(area, api) {
        const ans = next();
        // Tingkat tinggi: semua pilihan berwarna sama agar anak fokus pada bentuk
        const sameColor = d >= 6 ? R.pick(PALETTE) : null;
        choiceRound(area, api, {
          prompt: h('div', { class: 'q-text' }, h('span', null, 'Mana bentuk '), h('b', null, ans.n.toUpperCase()), '?'),
          say: `Mana bentuk ${ans.n}?`,
          options: optionsWith(ans, pool, n, (s) => s.n),
          render: (s) => shapeSvg(s, sameColor || R.pick(PALETTE)),
          isCorrect: (s) => s === ans,
          sayCorrect: ans.n,
          cols: n === 4 ? 2 : n,
        });
      },
    });
  },
});

registerGame({
  id: 'hewan', cat: 'logika', title: 'Kenal Hewan', icon: '🦁', color: '#fab005', minAge: 1, maxAge: 8,
  start(ctx) {
    const d = ctx.d;
    const pool = d <= 3 ? ANIMALS.filter((a) => a.s) : ANIMALS;
    const next = makeBag(pool);
    const n = D(d, 2, 3, 3, 4, 4, 4, 6, 6, 6, 6);
    const triviaChance = D(d, 0, 0, 0, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8);
    runRounds(ctx, {
      round(area, api) {
        if (Math.random() < triviaChance) {
          const t = R.pick(ANIMAL_TRIVIA);
          const ans = animal(R.pick(t.a));
          const wrongPool = LAND.filter((x) => !t.a.includes(x)).map(animal);
          choiceRound(area, api, {
            prompt: h('div', { class: 'q-text' }, '🤔 ' + t.q),
            say: t.q,
            options: optionsWith(ans, wrongPool, Math.max(3, Math.min(n, 4)), (a) => a.n),
            render: (a) => a.e,
            isCorrect: (a) => a === ans,
            sayCorrect: ans.n,
          });
          return;
        }
        const ans = next();
        // Anak kecil dibantu dengan suara hewannya
        const say = ans.s && d <= 3 ? `${ans.s}. Mana ${ans.n}?` : `Mana ${ans.n}?`;
        choiceRound(area, api, {
          prompt: h('div', { class: 'q-text' }, h('span', null, 'Mana '), h('b', null, ans.n.toUpperCase()), '?'),
          say,
          options: optionsWith(ans, pool, n, (a) => a.n),
          render: (a) => a.e,
          isCorrect: (a) => a === ans,
          sayCorrect: ans.s ? `${ans.n}, ${ans.s}` : ans.n,
          cols: n === 4 ? 2 : n,
        });
      },
    });
  },
});

registerGame({
  id: 'bayangan', cat: 'logika', title: 'Tebak Bayangan', icon: '👤', color: '#495057', minAge: 2, maxAge: 7,
  start(ctx) {
    const d = ctx.d;
    const next = makeBag(SHADOW_ITEMS);
    const n = D(d, 2, 3, 3, 4, 4, 4, 6, 6, 6, 6);
    runRounds(ctx, {
      round(area, api) {
        const ans = next();
        if (d >= 5 && Math.random() < 0.5) {
          choiceRound(area, api, {
            prompt: h('div', null, h('div', { class: 'q-text' }, 'Mana bayangan yang cocok?'), h('div', { class: 'q-emoji' }, ans)),
            say: 'Mana bayangan yang cocok?',
            options: optionsWith(ans, SHADOW_ITEMS, n),
            render: (x) => h('span', { class: 'silhouette' }, x),
            isCorrect: (x) => x === ans,
            cols: n === 4 ? 2 : n,
          });
          return;
        }
        choiceRound(area, api, {
          prompt: h('div', null, h('div', { class: 'q-text' }, 'Ini bayangan apa?'), h('div', { class: 'q-emoji silhouette' }, ans)),
          say: 'Ini bayangan apa?',
          options: optionsWith(ans, SHADOW_ITEMS, n),
          render: (x) => x,
          isCorrect: (x) => x === ans,
          cols: n === 4 ? 2 : n,
        });
      },
    });
  },
});

registerGame({
  id: 'memori', cat: 'logika', title: 'Kartu Memori', icon: '🃏', color: '#845ef7', minAge: 2, maxAge: 10,
  start(ctx) {
    const d = ctx.d;
    const pairs = D(d, 2, 3, 4, 5, 6, 6, 8, 8, 10, 12);
    const cols = pairs <= 3 ? pairs : pairs <= 6 ? 4 : pairs <= 8 ? 4 : 5;
    const items = R.sample(ANIMALS, pairs);
    const cards = R.shuffle(items.concat(items));
    const hud = h('div', { class: 'hud' });
    const grid = h('div', { class: 'mem-grid', style: { gridTemplateColumns: `repeat(${cols}, 1fr)` } });
    ctx.stage.append(hud, grid);
    let open = [], found = 0, moves = 0, busy = false;
    const update = () => { hud.textContent = `🃏 Pasangan: ${found}/${pairs}   👆 ${moves}`; };
    cards.forEach((a) => {
      const c = h('button', { class: 'mem-card' },
        h('div', { class: 'mem-inner' }, h('div', { class: 'mem-face mem-back' }, '?'), h('div', { class: 'mem-face mem-front' }, a.e)));
      c.addEventListener('click', () => {
        if (busy || c.classList.contains('open')) return;
        c.classList.add('open');
        Sound.tap();
        speak(a.n);
        open.push({ c, a });
        if (open.length < 2) return;
        moves++;
        const [x, y] = open;
        open = [];
        if (x.a === y.a) {
          found++;
          ctx.addStar(1);
          ctx.later(() => {
            x.c.classList.add('done'); y.c.classList.add('done');
            Sound.correct(); floatStar(y.c);
            update();
            if (found === pairs) {
              const stars = moves <= pairs * 1.6 ? 3 : moves <= pairs * 2.4 ? 2 : 1;
              ctx.later(() => ctx.finish(stars), 600);
            }
          }, 300);
        } else {
          busy = true;
          ctx.later(() => { x.c.classList.remove('open'); y.c.classList.remove('open'); busy = false; update(); }, 900);
        }
        update();
      });
      grid.append(c);
    });
    update();
    speak('Cari pasangan kartu yang sama!');
  },
});

registerGame({
  id: 'pola', cat: 'logika', title: 'Lanjutkan Pola', icon: '🔁', color: '#12b886', minAge: 3, maxAge: 10,
  start(ctx) {
    const d = ctx.d;
    const templates = D(d, ['AB'], ['AB'], ['AB', 'AAB'], ['AB', 'AAB', 'ABB'], ['AAB', 'ABB', 'ABC'],
      ['ABC', 'AABB', 'ABB'], ['ABC', 'AABB', 'ABCD', 'ABBC'], ['ABCD', 'ABBC', 'AABC', 'ABAC'],
      ['ABCD', 'AABBC', 'ABCBA', 'ABAC'], ['ABCDE', 'AABBC', 'ABCBA', 'ABACD']);
    const symbolSets = [
      ['🍎', '🍌', '🍇', '🍊', '🍓', '🍉'], ['🐱', '🐶', '🐰', '🐸', '🐵', '🐼'],
      ['🔴', '🟡', '🔵', '🟢', '🟣', '🟠'], ['⭐', '🌙', '☀️', '☁️', '⚡', '❄️'], ['🚗', '🚲', '✈️', '🚀', '⛵', '🚂'],
    ];
    const n = D(d, 2, 2, 3, 3, 3, 4, 4, 4, 4, 4);
    runRounds(ctx, {
      round(area, api) {
        const tpl = R.pick(templates);
        const set = R.pick(symbolSets);
        const letters = [...new Set(tpl)];
        const syms = R.sample(set, letters.length);
        const map = Object.fromEntries(letters.map((l, i) => [l, syms[i]]));
        const len = Math.max(tpl.length + 2, D(d, 5, 5, 6, 6, 7, 7, 8, 8, 9, 10));
        const seq = Array.from({ length: len }, (_, i) => map[tpl[i % tpl.length]]);
        // Tingkat tinggi: yang hilang bisa di tengah, bukan hanya di akhir
        const miss = d >= 7 && Math.random() < 0.5 ? R.int(tpl.length, len - 1) : len - 1;
        const ans = seq[miss];
        const options = optionsWith(ans, syms.concat(set), n);
        const boxes = seq.map((s, i) => h('div', { class: 'seq-box' + (i === miss ? ' missing' : '') }, i === miss ? '?' : s));
        choiceRound(area, api, {
          prompt: h('div', null, h('div', { class: 'q-text' }, miss === len - 1 ? 'Apa selanjutnya?' : 'Apa yang hilang?'), h('div', { class: 'seq' }, boxes)),
          say: miss === len - 1 ? 'Apa gambar selanjutnya?' : 'Gambar apa yang hilang?',
          options, cols: n,
          render: (x) => x,
          isCorrect: (x) => x === ans,
        });
        api.onDone = () => { boxes[miss].textContent = ans; };
      },
    });
  },
});
