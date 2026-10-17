#!/usr/bin/env node
/* Alat pengembang: menjalankan seluruh aplikasi (semua umur, jalur, ujian, pojok jelajah) di Chromium
 * dengan daftar klip dari phrases.js, lalu melaporkan kalimat yang belum punya rekaman
 * dan galat JavaScript. Pemakaian: AGES=1,5,10 node tools/voice/coverage.js   (butuh paket playwright) */
'use strict';
const { execFileSync } = require('child_process');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const ROOT = path.join(__dirname, '../..');
const phrases = JSON.parse(execFileSync('node', [path.join(__dirname, 'phrases.js')]));
const clips = Object.fromEntries(phrases.map((p) => [p.key, 'x.mp3']));

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 400, height: 820 }, hasTouch: true });
  const errors = new Set();
  const missing = new Set();
  page.on('pageerror', (e) => errors.add(e.message));
  await page.exposeFunction('reportMissing', (t) => missing.add(t));
  await page.addInitScript((c) => {
    window.AUDIO_CLIPS = c;
    window.Audio = class { constructor() { this.onended = null; } play() { setTimeout(() => this.onended && this.onended(), 5); return Promise.resolve(); } pause() {} };
    window.speechSynthesis = { speak: (u) => window.reportMissing(u.text), cancel() {}, getVoices: () => [] };
    window.SpeechSynthesisUtterance = function (t) { this.text = t; };
    window.confirm = () => true;
  }, clips);
  await page.route('**/audio/manifest.js', (r) => r.fulfill({ body: '', contentType: 'text/javascript' }));
  await page.goto('file://' + path.join(ROOT, 'app/src/main/assets/www/index.html'));

  const active = () => page.evaluate(() => document.querySelector('.screen.active').id);
  const back = () => page.evaluate(() => window.handleBack());
  async function poke(n = 10) {
    for (let k = 0; k < n; k++) {
      const ch = page.locator('#stage .choice, #stage .tile-btn:not(.used), #stage .mem-card:not(.open), #stage .tile, #stage .key, #stage .balloon, #stage .count-area span, #stage .chip');
      const cnt = await ch.count();
      if (!cnt) break;
      try { await ch.nth(Math.floor(Math.random() * cnt)).click({ timeout: 300, force: true }); } catch (e) { /* elemen hilang */ }
      await page.waitForTimeout(60);
    }
    const cv = page.locator('#stage canvas').last();
    if (await cv.count()) {
      const b = await cv.boundingBox();
      await page.mouse.move(b.x + b.width * 0.3, b.y + b.height * 0.3);
      await page.mouse.down();
      for (let t = 0; t < 10; t++) await page.mouse.move(b.x + b.width * (0.3 + t * 0.04), b.y + b.height * (0.3 + t * 0.04));
      await page.mouse.up();
    }
  }

  const ages = (process.env.AGES || '1,2,3,4,5,6,7,8,9,10').split(',').map(Number);
  for (const age of ages) {
    console.error('umur', age);
    while ((await active()) !== 'screen-age') await back();
    await page.locator('.age-btn').nth(age - 1).click();
    const cats = await page.locator('.cat-card').count();
    for (let ci = 0; ci < cats; ci++) {
      await page.locator('.cat-card').nth(ci).click();
      // buka seluruh jalur agar semua node bisa dicoba
      await page.evaluate(() => { Object.values(Store.get('paths')).forEach((p) => { p.pos = 999; }); });
      await back();
      await page.locator('.cat-card').nth(ci).click();
      const nodes = await page.locator('#path .node').count();
      for (let i = 0; i < nodes; i++) {
        await page.locator('#path .node').nth(i).click();
        await page.waitForTimeout(350);
        await poke(age % 2 ? 8 : 5);
        await page.evaluate(() => { const t = document.querySelector('#reward-actions .btn'); if (t) t.click(); });
        if ((await active()) === 'screen-play') await back();
      }
      const ex = await page.locator('.explore-btn').count();
      for (let i = 0; i < ex; i++) {
        await page.locator('.explore-btn').nth(i).click();
        await page.waitForTimeout(300);
        await poke(6);
        await back();
      }
      await back();
    }
  }
  // Pengaturan & hadiah
  await page.evaluate(() => { document.querySelector('#btn-test-voice').click(); });
  console.log(`Klip terdaftar: ${phrases.length}`);
  console.log(missing.size ? 'BELUM ADA REKAMAN:\n  ' + [...missing].join('\n  ') : 'Semua kalimat punya rekaman.');
  console.log(errors.size ? 'GALAT JS:\n  ' + [...errors].join('\n  ') : 'Tidak ada galat JS.');
  await browser.close();
  process.exit(errors.size ? 1 : 0);
})();
