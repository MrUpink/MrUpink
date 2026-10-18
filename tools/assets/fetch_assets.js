#!/usr/bin/env node
/* Mengambil aset pihak ketiga berlisensi bebas-komersial dan menyalin yang dipakai ke www/:
 *  - Microsoft Fluent Emoji 3D (MIT) via paket npm @lobehub/fluent-emoji-3d → www/img/emoji/*.webp
 *    Hanya emoji yang muncul di kode aplikasi yang disalin; peta emoji → file ditulis ke www/js/emoji-map.js
 *  - Font Fredoka (SIL OFL 1.1) via @fontsource/fredoka → www/fonts/
 * Jalankan ulang setelah menambah emoji baru di kode: node tools/assets/fetch_assets.js
 * Lisensi dicatat di THIRD_PARTY_NOTICES.md dan www/licenses.html. */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '../..');
const WWW = path.join(ROOT, 'app/src/main/assets/www');
const PKGS = { emoji: '@lobehub/fluent-emoji-3d@1.1.0', font: '@fontsource/fredoka@5.3.0' };
const EMOJI_RE = /\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}️?|[\u{1F3FB}-\u{1F3FF}])*/gu;

function unpack(spec) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pc-asset-'));
  const tgz = execFileSync('npm', ['pack', spec, '--silent'], { cwd: dir }).toString().trim().split('\n').pop();
  execFileSync('tar', ['xzf', tgz], { cwd: dir });
  return path.join(dir, 'package');
}
const hex = (s) => [...s].map((c) => c.codePointAt(0).toString(16)).join('-');

/* ---- Emoji ---- */
const sources = [path.join(WWW, 'index.html'), ...fs.readdirSync(path.join(WWW, 'js'))
  .filter((f) => f.endsWith('.js') && f !== 'emoji-map.js').map((f) => path.join(WWW, 'js', f))];
const used = new Set();
for (const f of sources) for (const m of fs.readFileSync(f, 'utf8').matchAll(EMOJI_RE)) used.add(m[0]);

const emojiPkg = unpack(PKGS.emoji);
const outDir = path.join(WWW, 'img/emoji');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
const map = {};
const missing = [];
for (const e of [...used].sort()) {
  const candidates = [hex(e), hex(e.replace(/️/g, '')), hex(e.replace(/️/g, '')) + '-fe0f'];
  const name = candidates.find((c) => fs.existsSync(path.join(emojiPkg, 'assets', c + '.webp')));
  if (!name) { missing.push(e); continue; }
  fs.copyFileSync(path.join(emojiPkg, 'assets', name + '.webp'), path.join(outDir, name + '.webp'));
  map[e] = name;
}
fs.writeFileSync(path.join(WWW, 'js/emoji-map.js'),
  '/* Dibuat otomatis oleh tools/assets/fetch_assets.js — emoji → file di img/emoji/ (Microsoft Fluent Emoji 3D, MIT) */\n' +
  'window.EMOJI_FILES = ' + JSON.stringify(map) + ';\n');

/* ---- Font ---- */
const fontPkg = unpack(PKGS.font);
const fontDir = path.join(WWW, 'fonts');
fs.mkdirSync(fontDir, { recursive: true });
for (const w of [500, 600, 700]) {
  fs.copyFileSync(path.join(fontPkg, 'files', `fredoka-latin-${w}-normal.woff2`), path.join(fontDir, `fredoka-${w}.woff2`));
}
fs.copyFileSync(path.join(fontPkg, 'LICENSE'), path.join(fontDir, 'OFL.txt'));

const size = fs.readdirSync(outDir).reduce((a, f) => a + fs.statSync(path.join(outDir, f)).size, 0);
console.log(`Emoji: ${Object.keys(map).length} disalin (${(size / 1024).toFixed(0)} KB)` +
  (missing.length ? `, tanpa gambar (tetap teks): ${missing.join(' ')}` : ''));
console.log('Font Fredoka 500/600/700 disalin.');
