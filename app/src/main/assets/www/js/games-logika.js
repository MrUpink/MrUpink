'use strict';
/* Permainan logika & pengetahuan. */

function shapeSvg(shape, color) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.innerHTML = `<g fill="${color}" stroke="rgba(0,0,0,.15)" stroke-width="3">${shape.svg}</g>`;
  return svg;
}

registerGame({
  id: 'warna', cat: 'logika', title: 'Kenal Warna', icon: '🌈', color: '#ff922b', ages: [1, 2],
  start(ctx) {
    const lv = ctx.level;
    const pool = COLORS.slice(0, [4, 7, 11][lv - 1]);
    const next = makeBag(pool);
    const objs = COLOR_OBJECTS.filter((o) => pool.some((c) => c.n === o.c));
    runRounds(ctx, {
      round(area, api) {
        const n = [3, 4, 6][lv - 1];
        if (lv > 1 && Math.random() < 0.45) {
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
          cols: n > 4 ? 3 : n === 3 ? 3 : 2,
        });
      },
    });
  },
});

registerGame({
  id: 'bentuk', cat: 'logika', title: 'Kenal Bentuk', icon: '🔷', color: '#339af0', ages: [1, 2],
  start(ctx) {
    const lv = ctx.level;
    const pool = SHAPES.slice(0, [4, 7, 10][lv - 1]);
    const next = makeBag(pool);
    runRounds(ctx, {
      round(area, api) {
        const ans = next();
        const n = [3, 4, 4][lv - 1];
        choiceRound(area, api, {
          prompt: h('div', { class: 'q-text' }, h('span', null, 'Mana bentuk '), h('b', null, ans.n.toUpperCase()), '?'),
          say: `Mana bentuk ${ans.n}?`,
          options: optionsWith(ans, pool, n, (s) => s.n),
          render: (s) => shapeSvg(s, R.pick(PALETTE)),
          isCorrect: (s) => s === ans,
          sayCorrect: ans.n,
          cols: n === 3 ? 3 : 2,
        });
      },
    });
  },
});

registerGame({
  id: 'hewan', cat: 'logika', title: 'Kenal Hewan', icon: '🦁', color: '#fab005', ages: [1, 2, 3],
  start(ctx) {
    const lv = ctx.level;
    const pool = lv === 1 ? ANIMALS.filter((a) => a.s) : ANIMALS;
    const next = makeBag(pool);
    runRounds(ctx, {
      round(area, api) {
        if (lv >= 2 && Math.random() < (lv === 3 ? 0.6 : 0.3)) {
          const t = R.pick(ANIMAL_TRIVIA);
          const ans = animal(R.pick(t.a));
          const wrongPool = LAND.filter((n) => !t.a.includes(n)).map(animal);
          choiceRound(area, api, {
            prompt: h('div', { class: 'q-text' }, '🤔 ' + t.q),
            say: t.q,
            options: optionsWith(ans, wrongPool, 4, (a) => a.n),
            render: (a) => a.e,
            isCorrect: (a) => a === ans,
            sayCorrect: ans.n,
          });
          return;
        }
        const ans = next();
        const say = ans.s && lv === 1 ? `${ans.s}. Mana ${ans.n}?` : `Mana ${ans.n}?`;
        choiceRound(area, api, {
          prompt: h('div', { class: 'q-text' }, h('span', null, 'Mana '), h('b', null, ans.n.toUpperCase()), '?'),
          say,
          options: optionsWith(ans, pool, [3, 4, 6][lv - 1], (a) => a.n),
          render: (a) => a.e,
          isCorrect: (a) => a === ans,
          sayCorrect: ans.s ? `${ans.n}, ${ans.s}` : ans.n,
        });
      },
    });
  },
});

registerGame({
  id: 'bayangan', cat: 'logika', title: 'Tebak Bayangan', icon: '👤', color: '#495057', ages: [1, 2],
  start(ctx) {
    const lv = ctx.level;
    const next = makeBag(SHADOW_ITEMS);
    runRounds(ctx, {
      round(area, api) {
        const ans = next();
        const n = [3, 4, 6][lv - 1];
        const showShadowOptions = lv === 3 && Math.random() < 0.5;
        if (showShadowOptions) {
          choiceRound(area, api, {
            prompt: h('div', null, h('div', { class: 'q-text' }, 'Mana bayangan yang cocok?'), h('div', { class: 'q-emoji' }, ans)),
            say: 'Mana bayangan yang cocok?',
            options: optionsWith(ans, SHADOW_ITEMS, n),
            render: (x) => h('span', { class: 'silhouette' }, x),
            isCorrect: (x) => x === ans,
          });
          return;
        }
        choiceRound(area, api, {
          prompt: h('div', null, h('div', { class: 'q-text' }, 'Ini bayangan apa?'), h('div', { class: 'q-emoji silhouette' }, ans)),
          say: 'Ini bayangan apa?',
          options: optionsWith(ans, SHADOW_ITEMS, n),
          render: (x) => x,
          isCorrect: (x) => x === ans,
        });
      },
    });
  },
});

registerGame({
  id: 'memori', cat: 'logika', title: 'Kartu Memori', icon: '🃏', color: '#845ef7', ages: [1, 2, 3],
  start(ctx) {
    const lv = ctx.level;
    const pairs = [3, 6, 8][lv - 1];
    const cols = [3, 4, 4][lv - 1];
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
            if (found === pairs) ctx.later(() => ctx.finish(pairs, pairs), 600);
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
  id: 'pola', cat: 'logika', title: 'Lanjutkan Pola', icon: '🔁', color: '#12b886', ages: [2, 3],
  start(ctx) {
    const lv = ctx.level;
    const templates = [['AB'], ['AB', 'AAB', 'ABC', 'ABB'], ['ABC', 'AABB', 'ABCD', 'ABBC', 'AAB', 'ABAC']][lv - 1];
    const symbolSets = [
      ['🍎', '🍌', '🍇', '🍊', '🍓', '🍉'], ['🐱', '🐶', '🐰', '🐸', '🐵', '🐼'],
      ['🔴', '🟡', '🔵', '🟢', '🟣', '🟠'], ['⭐', '🌙', '☀️', '☁️', '⚡', '❄️'], ['🚗', '🚲', '✈️', '🚀', '⛵', '🚂'],
    ];
    runRounds(ctx, {
      round(area, api) {
        const tpl = R.pick(templates);
        const set = R.pick(symbolSets);
        const letters = [...new Set(tpl)];
        const syms = R.sample(set, letters.length);
        const map = Object.fromEntries(letters.map((l, i) => [l, syms[i]]));
        const len = Math.max(tpl.length * 2 + 1, [5, 7, 8][lv - 1]);
        const seq = Array.from({ length: len }, (_, i) => map[tpl[i % tpl.length]]);
        const ans = seq[len - 1];
        const n = [2, 3, 4][lv - 1];
        const options = optionsWith(ans, syms.concat(set), n);
        const boxes = seq.map((s, i) => h('div', { class: 'seq-box' + (i === len - 1 ? ' missing' : '') }, i === len - 1 ? '?' : s));
        choiceRound(area, api, {
          prompt: h('div', null, h('div', { class: 'q-text' }, 'Apa selanjutnya?'), h('div', { class: 'seq' }, boxes)),
          say: 'Apa gambar selanjutnya?',
          options, cols: n,
          render: (x) => x,
          isCorrect: (x) => x === ans,
        });
        api.onDone = () => { boxes[len - 1].textContent = ans; };
      },
    });
  },
});
