'use strict';
/* Permainan huruf & membaca.
 * ctx.d = tingkat kesulitan 1–10 (gabungan umur anak + level yang dipilih). */

function firstHighlighted(word) {
  return h('span', null, h('b', { class: 'first' }, word.charAt(0)), word.slice(1));
}

registerGame({
  id: 'kenal-huruf', cat: 'huruf', title: 'Kenal Huruf', icon: '🔤', color: '#ff8787', minAge: 1, maxAge: 6, levels: 0,
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
      // Huruf hanya dibaca satu kali, lalu contoh katanya.
      speak(`${sayLetter(L.l)}. ${L.w}.`);
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
  id: 'suku-kata', cat: 'huruf', title: 'Belajar Suku Kata', icon: '🗣️', color: '#f783ac', minAge: 4, maxAge: 8, levels: 0,
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
          onClick: () => { Sound.tap(); speak(saySyllable(s)); },
        }, s));
      });
      const examples = WORDS.filter((w) => w.syl[0].length === 2 && w.syl[0][0] === c).slice(0, 3);
      sample.innerHTML = '';
      sample.append(h('div', { class: 'q-text' }, examples.length ? 'Contoh kata:' : 'Ketuk suku kata untuk mendengar'));
      if (examples.length) {
        sample.append(h('div', { class: 'q-row' }, examples.map((w) =>
          h('button', { class: 'chip', onClick: () => speak(w.name) }, w.e + ' ' + w.syl.join('-')))));
      }
      speak(syls.map(saySyllable).join(', '));
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

const CONFUSABLE = [['b', 'd', 'p', 'q'], ['m', 'n', 'u', 'w'], ['E', 'F', 'P', 'B'], ['O', 'Q', 'C', 'G'], ['i', 'j', 'l', 't'], ['M', 'N', 'W', 'V']];

registerGame({
  id: 'cari-huruf', cat: 'huruf', title: 'Cari Huruf', icon: '🔍', color: '#ffa94d', minAge: 2, maxAge: 7,
  start(ctx) {
    const d = ctx.d;
    const poolSize = D(d, 5, 8, 12, 16, 20, 26, 26, 26, 26, 26);
    const pool = LETTERS.slice(0, poolSize).map((x) => x.l);
    const next = makeBag(pool);
    const nOpt = D(d, 2, 3, 3, 4, 4, 4, 6, 6, 6, 6);
    runRounds(ctx, {
      round(area, api) {
        let ans = next();
        let opts;
        let lower = d >= 5 && Math.random() < (d >= 7 ? 0.7 : 0.4);
        if (d >= 8 && Math.random() < 0.5) {
          // Huruf yang mirip bentuknya
          const grp = R.pick(CONFUSABLE);
          ans = R.pick(grp);
          lower = ans === ans.toLowerCase();
          opts = R.shuffle(grp);
        } else {
          opts = optionsWith(ans, pool, nOpt).map((x) => (lower ? x.toLowerCase() : x));
          if (lower) ans = ans.toLowerCase();
        }
        const match = d <= 2;
        const say = match ? `Cari huruf ${sayLetter(ans)}` : `Mana huruf ${lower ? 'kecil ' : ''}${sayLetter(ans)}?`;
        const prompt = match
          ? h('div', null, h('div', { class: 'q-text' }, 'Cari huruf yang sama:'), h('div', { class: 'q-big' }, ans))
          : h('div', null, h('div', { class: 'q-text' }, lower ? 'Dengarkan, lalu cari huruf kecilnya!' : 'Dengarkan, lalu cari hurufnya!'), h('div', { class: 'q-big' }, '👂'));
        choiceRound(area, api, {
          prompt, say, options: opts,
          render: (x) => x,
          isCorrect: (x) => x === ans,
          sayCorrect: sayLetter(ans),
          cols: opts.length === 2 ? 2 : opts.length === 4 ? 2 : 3,
        });
      },
    });
  },
});

registerGame({
  id: 'huruf-awal', cat: 'huruf', title: 'Huruf Awal', icon: '🅰️', color: '#ff922b', minAge: 4, maxAge: 8,
  start(ctx) {
    const d = ctx.d;
    const items = LETTERS.filter((L) => !'QX'.includes(L.l)).map((L) => ({ w: L.w.toUpperCase(), e: L.e, name: L.w }))
      .concat(WORDS.map((w) => ({ w: w.w, e: w.e, name: w.name })));
    const next = makeBag(items);
    const pool = LETTERS.map((x) => x.l);
    runRounds(ctx, {
      round(area, api) {
        const it = next();
        const ans = it.w[0];
        // d rendah: kata ditampilkan dengan huruf awal disorot; sedang: huruf awal disembunyikan; tinggi: hanya gambar.
        const word = d <= 3 ? firstHighlighted(it.w) : d <= 7 ? h('span', null, h('b', { class: 'first' }, '_'), it.w.slice(1)) : null;
        choiceRound(area, api, {
          prompt: h('div', null, h('div', { class: 'q-emoji' }, it.e), word ? h('div', { class: 'q-word' }, word) : null),
          say: `${it.name}. ${it.name}, dimulai dengan huruf apa?`,
          options: optionsWith(ans, pool, D(d, 3, 3, 4, 4, 4, 4, 6, 6, 6, 6)),
          render: (x) => x,
          isCorrect: (x) => x === ans,
          sayCorrect: `${sayLetter(ans)}, ${it.name}`,
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
        speak(speakUnit(u));
        slotEls[pos].textContent = u;
        slotEls[pos].classList.add('filled');
        b.classList.add('used');
        pos++;
        if (pos === units.length) api.correct(prompt, item.name);
      } else {
        api.wrong(b, true);
      }
    });
    tiles.append(b);
  });
  area.append(prompt, tiles);
  speak(`Ayo susun kata, ${item.name}.`);
}

registerGame({
  id: 'susun-huruf', cat: 'huruf', title: 'Susun Huruf', icon: '🧩', color: '#fab005', minAge: 5, maxAge: 10,
  start(ctx) {
    const d = ctx.d;
    const [mn, mx] = D(d, [3, 4], [3, 4], [4, 4], [4, 5], [5, 5], [5, 6], [6, 6], [6, 7], [7, 9], [7, 10]);
    const next = makeBag(wordsByLen(mn, mx));
    const hint = d <= 4;
    const extra = D(d, 0, 0, 0, 0, 0, 1, 1, 2, 2, 3);
    runRounds(ctx, {
      round(area, api) {
        const item = next();
        const letters = item.w.split('');
        const distract = R.sample(LETTERS.map((x) => x.l).filter((l) => !letters.includes(l)), extra);
        buildWordRound(area, api, item, letters, distract, hint, sayLetter);
      },
    });
  },
});

registerGame({
  id: 'susun-suku', cat: 'huruf', title: 'Susun Suku Kata', icon: '🧱', color: '#e599f7', minAge: 4, maxAge: 9,
  start(ctx) {
    const d = ctx.d;
    const [mn, mx] = D(d, [3, 4], [3, 4], [4, 5], [4, 6], [5, 6], [5, 7], [6, 8], [6, 9], [7, 10], [7, 10]);
    const list = wordsByLen(mn, mx).filter((w) => w.syl.length >= 2);
    const next = makeBag(list);
    const allSyl = [...new Set(WORDS.flatMap((w) => w.syl))];
    const extra = D(d, 0, 0, 0, 1, 1, 1, 2, 2, 3, 3);
    runRounds(ctx, {
      round(area, api) {
        const item = next();
        const distract = R.sample(allSyl.filter((s) => !item.syl.includes(s)), extra);
        buildWordRound(area, api, item, item.syl, distract, d <= 2, saySyllable);
      },
    });
  },
});

registerGame({
  id: 'baca-kata', cat: 'huruf', title: 'Ayo Membaca', icon: '📖', color: '#4dabf7', minAge: 5, maxAge: 10,
  start(ctx) {
    const d = ctx.d;
    const [mn, mx] = D(d, [3, 4], [3, 4], [4, 5], [4, 6], [5, 6], [5, 7], [6, 10], [6, 10], [6, 10], [6, 10]);
    const list = wordsByLen(mn, mx);
    const next = makeBag(list);
    const nextSentence = makeBag(SENTENCES);
    const n = D(d, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4);
    runRounds(ctx, {
      round(area, api) {
        if (d >= 8 && Math.random() < (d >= 9 ? 0.8 : 0.5)) {
          // Membaca kalimat
          const s = nextSentence();
          choiceRound(area, api, {
            prompt: h('div', null, h('div', { class: 'q-text' }, 'Baca kalimat ini, lalu pilih gambarnya:'), h('div', { class: 'q-sentence' }, s.t)),
            helpSay: s.t,
            options: optionsWith(s, SENTENCES, 4, (x) => x.e), cols: 2,
            render: (x) => h('div', { class: 'grp' }, x.e),
            isCorrect: (x) => x === s,
            sayCorrect: s.t,
          });
          return;
        }
        const item = next();
        const options = optionsWith(item, list, n, (x) => x.e);
        if (d >= 6 && Math.random() < 0.5) {
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
        const easy = d <= 3;
        choiceRound(area, api, {
          prompt: h('div', null, h('div', { class: 'q-text' }, 'Baca kata ini, lalu pilih gambarnya:'), h('div', { class: 'q-word' }, easy ? item.syl.join('-') : item.w)),
          say: easy ? item.name : null,
          helpSay: easy ? null : item.name,
          options, cols: n === 4 ? 2 : 3,
          render: (x) => x.e,
          isCorrect: (x) => x === item,
          sayCorrect: item.name,
        });
      },
    });
  },
});
