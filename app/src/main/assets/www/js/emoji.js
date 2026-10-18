'use strict';
/* Mengganti emoji teks di seluruh halaman dengan gambar Microsoft Fluent Emoji 3D (img/emoji, MIT),
 * agar tampilannya sama dan modern di semua HP. Emoji tanpa gambar tetap ditampilkan sebagai teks.
 * Berjalan otomatis untuk elemen yang dibuat belakangan (MutationObserver). */
const Emoji = (() => {
  const FILES = window.EMOJI_FILES || {};
  const RE = /\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}️?|[\u{1F3FB}-\u{1F3FF}])*/gu;
  const SKIP = new Set(['SCRIPT', 'STYLE', 'OPTION', 'SELECT', 'TEXTAREA', 'INPUT', 'TITLE']);
  const src = (e) => (FILES[e] ? 'img/emoji/' + FILES[e] + '.webp' : null);

  function img(e) {
    const i = document.createElement('img');
    i.className = 'emo';
    i.src = src(e);
    i.alt = e;
    i.draggable = false;
    return i;
  }

  function replaceText(node) {
    const text = node.nodeValue;
    RE.lastIndex = 0;
    if (!RE.test(text)) return;
    RE.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let last = 0, m, changed = false;
    while ((m = RE.exec(text))) {
      if (!FILES[m[0]]) continue;
      if (m.index > last) frag.append(text.slice(last, m.index));
      frag.append(img(m[0]));
      last = m.index + m[0].length;
      changed = true;
    }
    if (!changed) return;
    if (last < text.length) frag.append(text.slice(last));
    node.replaceWith(frag);
  }

  function scan(root) {
    if (root.nodeType === 3) {
      if (root.parentNode && !SKIP.has(root.parentNode.nodeName)) replaceText(root);
      return;
    }
    if (root.nodeType !== 1 || SKIP.has(root.nodeName) || root.namespaceURI === 'http://www.w3.org/2000/svg') return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (SKIP.has(n.parentNode.nodeName) || n.parentNode.closest('svg') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(replaceText);
  }

  /* Gambar emoji untuk kanvas (stempel menggambar); null bila tidak ada. */
  const cache = {};
  function image(e) {
    if (!src(e)) return null;
    if (!cache[e]) { cache[e] = new Image(); cache[e].src = src(e); }
    return cache[e];
  }

  scan(document.body);
  new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'characterData') scan(m.target);
      else m.addedNodes.forEach(scan);
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true });

  return { image, src };
})();
