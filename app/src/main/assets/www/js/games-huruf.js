'use strict';
/* Permainan huruf & membaca. */

function firstHighlighted(word) {
  return h('span', null, h('b', { class: 'first' }, word.charAt(0)), word.slice(1));
}

registerGame({
  id: 'kenal-huruf', cat: 'huruf', title: 'Kenal Huruf', icon: '🔤', color: '#ff8787', ages: [1, 2],
  start(ctx) {
    const show = h('div', { class: 'letter-show' });
    const grid = h('div', { class: 'letter-grid' });
    function display(L) {
      show.innerHTML = '';
      show.append(
        h('div', { class: 'ls-letter' }, L.l + L.l.toLowerCase()),
        h('div', { class: 'ls-pic' }, L.e),
        h('div', { class: 'ls-word' }, firstHighlighted(L.w)),
      );
      show.classList.remove('pop');
      void show.offsetWidth;
      show.classList.add('pop');
      speak(`${L.l}. ${L.l}, untuk ${L.w}`);
    }
    LETTERS.forEach((L, i) => {
      grid.append(h('button', {
        class: 'tile', style: { background: PALETTE[i % PALETTE.length] },
        onClick: () => { Sound.tap(); display(L); },
      }, L.l));
    });
    ctx.stage.append(show, grid);
    display(LETTERS[0]);
  },
});

registerGame({
  id: 'suku-kata', cat: 'huruf', title: 'Belajar Suku Kata', icon: '🗣️', color: '#f783ac', ages: [2, 3],
  start(ctx) {
    const consonants = 'BCDFGHJKLMNPRSTWY'.split('');
    const vowels = ['A', 'I', 'U', 'E', 'O'];
    const chips = h('div', { class: 'chip-row' });
    const grid = h('div', { class: 'syl-grid' });
    const sample = h('div', { class: 'prompt no-say' });
    function choose(c, btn) {
      chips.querySelectorAll('.chip').forEach((x) => x.classList.remove('on'));
      btn.classList.add('on');
      grid.innerHTML = '';
      const syls = vowels.map((v) => c + v);
      syls.forEach((s, i) => {
        grid.append(h('button', {
          class: 'tile', style: { background: PALETTE[(i * 2) % PALETTE.length] },
          onClick: () => { Sound.tap(); speak(s.toLowerCase()); },
        }, s));
      });
      const examples = WORDS.filter((w) => w.syl[0].length === 2 && w.syl[0][0] === c).slice(0, 3);
      sample.innerHTML = '';
      sample.append(h('div', { class: 'q-text' }, examples.length ? 'Contoh kata:' : 'Ketuk suku kata untuk mendengar'));
      if (examples.length) {
        sample.append(h('div', { class: 'q-row' }, examples.map((w) =>
          h('button', { class: 'chip', onClick: () => speak(w.name) }, w.e + ' ' + w.syl.join('-')))));
      }
      speak(syls.map((s) => s.toLowerCase()).join(', '));
    }
    consonants.forEach((c) => {
      const b = h('button', { class: 'chip' }, c);
      b.addEventListener('click', () => choose(c, b));
      chips.append(b);
    });
    ctx.stage.append(chips, grid, h('div', { style: { height: '14px' } }), sample);
    choose('B', chips.firstChild);
  },
});

registerGame({
  id: 'cari-huruf', cat: 'huruf', title: 'Cari Huruf', icon: '🔍', color: '#ffa94d', ages: [1, 2],
  start(ctx) {
    const lv = ctx.level;
    const pool = LETTERS.map((x) => x.l);
    const next = makeBag(pool);
    runRounds(ctx, {
      round(area, api) {
        const ans = next();
        const lower = lv === 3 && Math.random() < 0.6;
        const disp = (x) => (lower ? x.toLowerCase() : x);
        const say = lv === 1 ? `Cari huruf ${ans}` : `Mana huruf ${lower ? 'kecil ' : ''}${ans}?`;
        const prompt = lv === 1
          ? h('div', null, h('div', { class: 'q-text' }, 'Cari huruf yang sama:'), h('div', { class: 'q-big' }, ans))
          : h('div', null, h('div', { class: 'q-text' }, lower ? 'Dengarkan, lalu cari huruf kecilnya!' : 'Dengarkan, lalu cari hurufnya!'), h('div', { class: 'q-big' }, '👂'));
        choiceRound(area, api, {
          prompt, say,
          options: optionsWith(ans, pool, [3, 4, 6][lv - 1]),
          render: (x) => disp(x),
          isCorrect: (x) => x === ans,
          sayCorrect: ans,
        });
      },
    });
  },
});

registerGame({
  id: 'huruf-awal', cat: 'huruf', title: 'Huruf Awal', icon: '🅰️', color: '#ff922b', ages: [2, 3],
  start(ctx) {
    const lv = ctx.level;
    const items = LETTERS.filter((L) => !'QX'.includes(L.l)).map((L) => ({ w: L.w.toUpperCase(), e: L.e, name: L.w }))
      .concat(WORDS.map((w) => ({ w: w.w, e: w.e, name: w.name })));
    const next = makeBag(items);
    const pool = LETTERS.map((x) => x.l);
    runRounds(ctx, {
      round(area, api) {
        const it = next();
        const ans = it.w[0];
        const word = lv === 1 ? firstHighlighted(it.w) : h('span', null, h('b', { class: 'first' }, '_'), it.w.slice(1));
        choiceRound(area, api, {
          prompt: h('div', null, h('div', { class: 'q-emoji' }, it.e), lv < 3 || Math.random() < 0.5 ? h('div', { class: 'q-word' }, word) : null),
          say: `${it.name}. ${it.name} dimulai dengan huruf apa?`,
          options: optionsWith(ans, pool, [3, 4, 4][lv - 1]),
          render: (x) => x,
          isCorrect: (x) => x === ans,
          sayCorrect: `${ans}, ${it.name}`,
        });
      },
    });
  },
});

/* Susun huruf / suku kata menjadi kata. */
function buildWordRound(area, api, item, units, distractors, hint, speakUnit) {
  const slotEls = units.map((u) => h('div', { class: 'slot' }, hint ? u : ''));
  const prompt = h('div', { class: 'prompt' },
    h('div', { class: 'q-emoji' }, item.e),
    h('div', { class: 'slots' }, slotEls),
    h('button', { class: 'btn-say', onClick: () => speak(item.name) }, '🔊'));
  const tiles = h('div', { class: 'tiles' });
  let pos = 0;
  R.shuffle(units.concat(distractors)).forEach((u) => {
    const b = h('button', { class: 'tile-btn' }, u);
    b.addEventListener('click', () => {
      if (b.classList.contains('used') || pos >= units.length) return;
      if (u === units[pos]) {
        Sound.tap();
        speak(speakUnit ? speakUnit(u) : u.toLowerCase());
        slotEls[pos].textContent = u;
        slotEls[pos].classList.add('filled');
        b.classList.add('used');
        pos++;
        if (pos === units.length) api.correct(prompt, units.length > 1 ? `${units.join(' ').toLowerCase()}. ${item.name}` : item.name);
      } else {
        api.wrong(b, true);
      }
    });
    tiles.append(b);
  });
  area.append(prompt, tiles);
  speak(`Susun kata ${item.name}`);
}

registerGame({
  id: 'susun-huruf', cat: 'huruf', title: 'Susun Huruf', icon: '🧩', color: '#fab005', ages: [2, 3],
  start(ctx) {
    const lv = ctx.level;
    const next = makeBag(wordsForLevel(lv));
    runRounds(ctx, {
      round(area, api) {
        const item = next();
        const letters = item.w.split('');
        const extra = lv === 3 ? R.sample(LETTERS.map((x) => x.l).filter((l) => !letters.includes(l)), 2) : [];
        buildWordRound(area, api, item, letters, extra, lv < 3, (u) => u);
      },
    });
  },
});

registerGame({
  id: 'susun-suku', cat: 'huruf', title: 'Susun Suku Kata', icon: '🧱', color: '#e599f7', ages: [2, 3],
  start(ctx) {
    const lv = ctx.level;
    const next = makeBag(wordsForLevel(lv).filter((w) => w.syl.length >= 2));
    const allSyl = [...new Set(WORDS.flatMap((w) => w.syl))];
    runRounds(ctx, {
      round(area, api) {
        const item = next();
        const extra = lv >= 2 ? R.sample(allSyl.filter((s) => !item.syl.includes(s)), lv === 3 ? 3 : 1) : [];
        buildWordRound(area, api, item, item.syl, extra, lv === 1);
      },
    });
  },
});

registerGame({
  id: 'baca-kata', cat: 'huruf', title: 'Ayo Membaca', icon: '📖', color: '#4dabf7', ages: [2, 3],
  start(ctx) {
    const lv = ctx.level;
    const list = wordsForLevel(lv);
    const next = makeBag(list);
    runRounds(ctx, {
      round(area, api) {
        const item = next();
        const n = lv === 1 ? 3 : 4;
        const options = optionsWith(item, list, n, (x) => x.e);
        if (lv === 3 && Math.random() < 0.5) {
          // Lihat gambar, pilih tulisan yang benar
          choiceRound(area, api, {
            prompt: h('div', null, h('div', { class: 'q-text' }, 'Tulisan mana yang benar?'), h('div', { class: 'q-emoji' }, item.e)),
            options, cols: 2, choiceClass: 'small-text',
            render: (x) => x.w,
            isCorrect: (x) => x === item,
            sayCorrect: item.name,
          });
          return;
        }
        choiceRound(area, api, {
          prompt: h('div', null, h('div', { class: 'q-text' }, 'Baca kata ini, lalu pilih gambarnya:'), h('div', { class: 'q-word' }, lv === 1 ? item.syl.join('-') : item.w)),
          say: lv === 1 ? item.name : null,
          helpSay: lv === 1 ? null : item.name,
          options, cols: n === 4 ? 2 : 3,
          render: (x) => x.e,
          isCorrect: (x) => x === item,
          sayCorrect: item.name,
        });
      },
    });
  },
});
