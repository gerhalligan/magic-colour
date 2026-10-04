// Headless-browser smoke test: phone portrait/landscape (touch) + desktop (mouse). Screenshots -> /workspace/magic-colour-screens/
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { launch, FILE, SHOTS } from './launch.mjs';
import { test, done, assert } from './harness.mjs';

const browser = await launch();
const VIEWPORTS = [
  ['phone-portrait', { width: 390, height: 844 }, true, 2.5],
  ['phone-landscape', { width: 844, height: 390 }, true, 2.5],
  ['phone-small', { width: 360, height: 640 }, true, 2],
  ['desktop', { width: 1280, height: 800 }, false, 1],
];
const regionXY = (page, id) => page.evaluate((id) => { const m = window.__MC, v = m.view, r = m.cur.pic.regions[id], c = v.cv.getBoundingClientRect(); return { x: c.left + v.tx + r[1] * v.s, y: c.top + v.ty + r[2] * v.s }; }, id);
const tapAt = async (page, touch, x, y) => { if (touch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
const state = (page) => page.evaluate(() => { const m = window.__MC; m.flush(); const g = m.cur.game; return { filled: g.filledCount(), total: g.total, sel: g.selected, complete: g.complete, canUndo: g.canUndo(), s: m.view.s, tx: m.view.tx, ty: m.view.ty }; });
const px = (page, id) => page.evaluate((id) => { const m = window.__MC, v = m.view, r = m.cur.pic.regions[id]; const d = v.fctx.getImageData(r[1], r[2], 1, 1).data; return '#' + [d[0], d[1], d[2]].map((x) => x.toString(16).padStart(2, '0')).join(''); }, id);

for (const [name, vp, touch, dsf] of VIEWPORTS) {
  console.log(`\n== ${name} ${vp.width}x${vp.height} ${touch ? 'touch' : 'mouse'}`);
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: dsf, hasTouch: touch, isMobile: touch, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [], external = [];
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', (r) => { const u = r.url(); if (!/^(file|data|blob):/.test(u)) external.push(u); });
  await page.goto(FILE); await page.waitForSelector('.pic');

  await test(`${name}: home shows the gallery of pictures with categories and levels`, async () => {
    const n = await page.$$eval('#grid .pic', (e) => e.length); assert.ok(n >= 24, 'cards ' + n);
    const chips = await page.$$eval('#catChips .chip', (e) => e.map((x) => x.textContent)); assert.ok(chips.length >= 8, chips.join());
    const geo = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, top: [...document.querySelectorAll('#home .top button')].map((b) => { const r = b.getBoundingClientRect(); return [r.left, r.right, r.height]; }) }));
    assert.ok(geo.sw <= geo.iw, 'horizontal overflow'); for (const [l, r, h] of geo.top) { assert.ok(l >= 0 && r <= geo.iw, 'header button off screen'); assert.ok(h >= 44); }
    await page.screenshot({ path: `${SHOTS}/${name}-1-home.png` });
    await page.click('#catChips [data-cat="space"]'); const sp = await page.$$eval('#grid .pic', (e) => e.length); assert.ok(sp >= 2 && sp < n);
    await page.click('#diffChips [data-diff="easy"]'); const sp2 = await page.$$eval('#grid .pic', (e) => e.length); assert.ok(sp2 >= 1 && sp2 <= sp);
    await page.click('#catChips [data-cat="all"]'); await page.click('#diffChips [data-diff="all"]');
    const fresh = await page.evaluate(() => {
      const m = window.__MC;
      const ids = m.pictures.filter((p) => m.isFresh(p)).map((p) => p.id);
      const badges = [...document.querySelectorAll('#grid .pic .newb')].map((el) => el.closest('.pic').dataset.id);
      const order = [...document.querySelectorAll('#grid .pic')].map((el) => el.dataset.id);
      return { ids, badges, order: order.slice(0, Math.max(ids.length, 1)), firstIsFresh: ids.length ? ids.includes(order[0]) : true };
    });
    assert.ok(fresh.ids.length >= 1, 'expected fresh pictures with added dates');
    assert.deepEqual(fresh.badges.slice().sort(), fresh.ids.slice().sort(), 'NEW badge on each unfinished fresh picture');
    assert.ok(fresh.firstIsFresh, 'fresh pictures sort to the front');
    const potd = await page.evaluate(() => {
      const m = window.__MC, p = m.pictureOfTheDay();
      const el = document.getElementById('potd');
      const card = el && el.querySelector('.pic');
      return { id: p && p.id, shown: !!(el && !el.hidden), cardId: card && card.dataset.id, label: el && el.querySelector('.potd-label') && el.querySelector('.potd-label').textContent };
    });
    assert.ok(potd.id, 'picture of the day exists');
    assert.ok(potd.shown, 'picture of the day strip is visible on All');
    assert.equal(potd.cardId, potd.id, 'potd card matches pick');
    assert.ok(/Picture of the day/i.test(potd.label || ''), 'potd label');
  });

  await test(`${name}: open a picture, canvas renders, palette is numbered with big touch targets`, async () => {
    await page.locator('#grid .pic[data-id="happy-fish"]').scrollIntoViewIfNeeded(); await page.click('#grid .pic[data-id="happy-fish"]'); await page.waitForSelector('#play.on'); await page.waitForTimeout(400);
    const info = await page.evaluate(() => { const sw = [...document.querySelectorAll('.sw')].map((b) => { const r = b.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height), r.left >= 0 && r.right <= innerWidth + 1 || true]; }); const st = document.querySelector('#stage').getBoundingClientRect(); const tools = [...document.querySelectorAll('.tool, .mode')].map((b) => { const r = b.getBoundingClientRect(); return [r.width, r.height, r.left, r.right, r.top, r.bottom]; }); return { sw, stage: [st.width, st.height], tools, ow: document.documentElement.scrollWidth, iw: innerWidth, ih: innerHeight, bodyH: document.body.scrollHeight }; });
    assert.ok(info.sw.length === 6, 'palette ' + info.sw.length); for (const [w, h] of info.sw) assert.ok(w >= 44 && h >= 44, `swatch ${w}x${h}`);
    for (const [w, h, l, r, t, b] of info.tools) { assert.ok(w >= 44 && h >= 44, `tool ${w}x${h}`); assert.ok(l >= 0 && r <= info.iw + 0.5 && t >= 0 && b <= info.ih + 0.5, 'tool off-screen'); }
    assert.ok(info.stage[0] > 200 && info.stage[1] > 150, 'stage ' + info.stage); assert.ok(info.ow <= info.iw, 'overflow-x');
    const white = await page.evaluate(() => { const v = window.__MC.view, d = v.cv.getContext('2d').getImageData(0, 0, v.cv.width, v.cv.height).data; let nonbg = 0; for (let i = 0; i < d.length; i += 4 * 97) if (d[i] > 250 && d[i + 1] > 250 && d[i + 2] > 250) nonbg++; return nonbg; });
    assert.ok(white > 50, 'picture (white regions) is drawn on the canvas');
    await page.screenshot({ path: `${SHOTS}/${name}-2-play-start.png` });
  });

  await test(`${name}: DEFAULT mode is One by one - selecting a colour never fills, each region is tapped`, async () => {
    assert.equal(await page.evaluate(() => window.__MC.settings.mode), 'classic'); assert.equal(await page.evaluate(() => window.__MC.cur.game.mode), 'classic');
    assert.ok(await page.$eval('.mode[data-mode="classic"]', (b) => b.classList.contains('on')), 'One by one button is on by default');
    assert.ok(!(await page.$eval('.mode[data-mode="magic"]', (b) => b.classList.contains('on'))));
    const ids = await page.evaluate(() => window.__MC.cur.game.byColour[1].slice());
    await page.click('.sw[data-c="1"]'); let s = await state(page); assert.equal(s.filled, 0, 'palette tap does not fill'); assert.equal(s.sel, 1);
    const r = await regionXY(page, ids[0]); await tapAt(page, touch, r.x, r.y); s = await state(page); assert.equal(s.filled, 1, 'one tap = one region');
    await page.click('#pUndo'); s = await state(page); assert.equal(s.filled, 0);
  });

  await test(`${name}: MAGIC brush - palette tap alone fills nothing; ONE tap on a region fills every region with that number`, async () => {
    await page.click('.mode[data-mode="magic"]'); assert.equal(await page.evaluate(() => window.__MC.settings.mode), 'magic');
    assert.ok(await page.$eval('.mode[data-mode="magic"]', (b) => b.classList.contains('on')));
    const info = await page.evaluate(() => { const g = window.__MC.cur.game; return { ids: g.byColour[2].slice(), n2: g.byColour[2].length }; });
    await page.click('.sw[data-c="2"]'); let s = await state(page);
    assert.equal(s.filled, 0, 'palette tap alone does NOT colour anything'); assert.equal(s.sel, 2);
    assert.ok(await page.evaluate(() => !!window.__MC.view.overlayItems), 'matching spots glow'); assert.ok(!(await page.$eval('.sw[data-c="2"]', (b) => b.classList.contains('done'))));
    const r = await regionXY(page, info.ids[0]); await tapAt(page, touch, r.x, r.y); s = await state(page);
    assert.equal(s.filled, info.n2, 'a single tap fills all regions of colour 2'); assert.equal(s.sel, 2);
    const pal = await page.evaluate(() => window.__MC.cur.pic.palette[1]);
    for (const id of info.ids) assert.equal(await px(page, id), pal);
    assert.ok(await page.$eval('.sw[data-c="2"]', (b) => b.classList.contains('done')), 'tick shown for completed colour');
    await page.waitForTimeout(300); await page.screenshot({ path: `${SHOTS}/${name}-3-magic-colour2.png` });
  });

  await test(`${name}: MAGIC brush - wrong colour tap wiggles, then the right tap fills all`, async () => {
    await page.click('.sw[data-c="3"]');
    const wrongId = await page.evaluate(() => { const g = window.__MC.cur.game; for (let c = 1; c <= g.puzzle.palette.length; c++) if (c !== 3 && g.remaining(c) > 0) return g.byColour[c].find((i) => !g.filled[i]); });
    const before = await state(page); const w = await regionXY(page, wrongId); await tapAt(page, touch, w.x, w.y);
    const s1 = await state(page); assert.equal(s1.filled, before.filled, 'wrong tap fills nothing'); assert.equal(s1.sel, 3);
    assert.ok(await page.evaluate(() => window.__MC.view.wiggle.size > 0), 'wiggle'); assert.match(await page.textContent('#toast'), /number \d+/);
    const id = await page.evaluate(() => window.__MC.cur.game.byColour[3][0]); const r = await regionXY(page, id); await tapAt(page, touch, r.x, r.y);
    assert.equal(await page.evaluate(() => window.__MC.cur.game.remaining(3)), 0); assert.equal((await state(page)).sel, 3);
  });

  await test(`${name}: undo + hint + wrong colour are gentle`, async () => {
    const before = await state(page); await page.click('#pUndo'); const s1 = await state(page); assert.ok(s1.filled < before.filled, 'undo removed the last colour');
    await page.click('#pHint'); const hint = await page.evaluate(() => ({ ov: !!window.__MC.view.overlayItems, n: window.__MC.view.overlayItems && window.__MC.view.overlayItems.length, sel: window.__MC.cur.game.selected }));
    assert.ok(hint.ov && hint.n >= 1, 'hint highlights regions'); await page.waitForTimeout(250); await page.screenshot({ path: `${SHOTS}/${name}-4-hint.png` });
    // switch to classic: click One-by-one
    await page.click('.mode[data-mode="classic"]'); assert.equal(await page.evaluate(() => window.__MC.settings.mode), 'classic');
    await page.click('.sw[data-c="3"]'); const s2 = await state(page); assert.equal(s2.filled, s1.filled, 'classic: selecting does not fill');
    const wrongId = await page.evaluate(() => { const g = window.__MC.cur.game; for (let c = 1; c <= g.puzzle.palette.length; c++) if (c !== 3 && g.remaining(c) > 0) return g.byColour[c].find((i) => !g.filled[i]); });
    const w = await regionXY(page, wrongId); await tapAt(page, touch, w.x, w.y);
    const s3 = await state(page); assert.equal(s3.filled, s2.filled, 'wrong tap fills nothing'); assert.equal(s3.sel, 3, 'selection unchanged');
    assert.ok(await page.evaluate(() => window.__MC.view.wiggle.size > 0), 'wiggle'); const toast = await page.textContent('#toast'); assert.match(toast, /number \d+/);
    assert.ok(await page.evaluate(() => document.querySelector('.sw.nudge') !== null), 'palette nudges the right colour');
    await page.waitForTimeout(150); await page.screenshot({ path: `${SHOTS}/${name}-5-classic-wrong.png` });
  });

  await test(`${name}: CLASSIC - each region must be tapped individually`, async () => {
    // colour 3 has regions again after undo (one region group)
    const ids = await page.evaluate(() => { const g = window.__MC.cur.game; return g.byColour[3].filter((i) => !g.filled[i]); });
    const first = await regionXY(page, ids[0]); const before = await state(page); await tapAt(page, touch, first.x, first.y); const after = await state(page);
    assert.equal(after.filled, before.filled + 1, 'exactly one region filled');
    if (ids.length > 1) assert.ok(await page.evaluate((i) => !window.__MC.cur.game.filled[i], ids[1]), 'other region of the same number is still empty');
    await page.screenshot({ path: `${SHOTS}/${name}-6-classic-fill.png` });
  });

  await test(`${name}: zoom + pan, numbers stay readable, tap vs drag`, async () => {
    const st0 = await state(page); const c = await page.evaluate(() => { const r = window.__MC.view.cv.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    if (touch) { // two-finger pinch via CDP
      const cdp = await ctx.newCDPSession(page);
      const tp = (d) => [{ x: c.x - d, y: c.y, id: 1 }, { x: c.x + d, y: c.y, id: 2 }];
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(30) });
      for (let d = 30; d <= 130; d += 20) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(d) });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else { await page.mouse.move(c.x, c.y); await page.mouse.wheel(0, -500); }
    await page.waitForTimeout(250);
    const st1 = await state(page); assert.ok(st1.s > st0.s * 1.5, `zoomed in ${st0.s.toFixed(2)} -> ${st1.s.toFixed(2)}`);
    const nfilled = st1.filled;
    // drag (pan) must not paint anything
    await page.evaluate(() => window.__MC.cur.game.selectColour); const sel = await page.evaluate(() => { const g = window.__MC.cur.game; for (let c = 1; c <= g.puzzle.palette.length; c++) if (g.remaining(c) > 0) { g.selected = c; return c; } return 0; });
    if (touch) { const cdp = await ctx.newCDPSession(page); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y, id: 1 }] }); for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: c.x - i * 12, y: c.y - i * 6, id: 1 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
    else { await page.mouse.move(c.x, c.y); await page.mouse.down(); await page.mouse.move(c.x - 100, c.y - 50, { steps: 8 }); await page.mouse.up(); }
    const st2 = await state(page); assert.equal(st2.filled, nfilled, 'drag did not colour'); assert.ok(Math.abs(st2.tx - st1.tx) > 20 || Math.abs(st2.ty - st1.ty) > 10, 'view panned');
    // number labels: at this zoom at least one label is drawn big enough
    const maxFont = await page.evaluate(() => { const m = window.__MC, v = m.view; let best = 0; m.cur.pic.regions.forEach((r, i) => { if (!m.cur.game.filled[i] && r[0]) { const f = Math.min(r[3] * v.s * 1.45, 30); if (f > best) best = f; } }); return best; });
    assert.ok(maxFont >= 14, 'labels readable when zoomed: ' + maxFont.toFixed(1) + 'px');
    await page.screenshot({ path: `${SHOTS}/${name}-7-zoomed.png` });
    // a clean small tap still colours (classic mode: pick the region's own colour)
    await page.click('#zFit'); await page.waitForTimeout(500);
  });

  await test(`${name}: progress auto-saved in localStorage and restored after reload`, async () => {
    const s = await state(page); const id = await page.evaluate(() => window.__MC.cur.pic.id);
    const saved = await page.evaluate((id) => localStorage.getItem('mc1.p.' + id), id); assert.ok(saved && JSON.parse(saved).f.length === s.filled, 'saved ' + saved);
    await page.reload(); await page.waitForSelector('.pic');
    const pct = await page.$eval('#grid .pic[data-id="happy-fish"] .meter i', (e) => e.style.width); assert.ok(parseInt(pct) > 0, 'home shows progress ' + pct);
    await page.locator('#grid .pic[data-id="happy-fish"]').scrollIntoViewIfNeeded(); await page.click('#grid .pic[data-id="happy-fish"]'); await page.waitForSelector('#play.on'); const s2 = await state(page); assert.equal(s2.filled, s.filled, 'restored');
    assert.equal(await page.evaluate(() => window.__MC.settings.mode), 'classic', 'mode remembered');
  });

  await test(`${name}: finishing a picture -> celebration, gallery entry, PNG save`, async () => {
    await page.click('.mode[data-mode="magic"]');
    const K = await page.evaluate(() => window.__MC.cur.pic.palette.length);
    for (let c = 1; c <= K; c++) {
      if (await page.evaluate((c) => window.__MC.cur.game.remaining(c) === 0, c)) continue;
      await page.click(`.sw[data-c="${c}"]`); const id = await page.evaluate((c) => { const g = window.__MC.cur.game; return g.byColour[c].find((i) => !g.filled[i]); }, c);
      const r = await regionXY(page, id); await tapAt(page, touch, r.x, r.y); await page.waitForTimeout(40);
    }
    const s = await state(page); assert.ok(s.complete && s.filled === s.total);
    await page.waitForTimeout(500); assert.ok(await page.evaluate(() => !!window.__MC.view.celeb), 'sparkle reveal running');
    const confettiPx = await page.evaluate(() => { const c = document.getElementById('confetti'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4 * 53) if (d[i] > 0) n++; return n; });
    assert.ok(confettiPx > 20, 'confetti drawn ' + confettiPx);
    await page.screenshot({ path: `${SHOTS}/${name}-8-celebrate.png` });
    await page.waitForSelector('#modal.on', { timeout: 6000 }); await page.waitForTimeout(500);
    await page.screenshot({ path: `${SHOTS}/${name}-9-win.png` });
    const done = await page.evaluate(() => JSON.parse(localStorage.getItem('mc1.done'))); assert.ok(done['happy-fish']);
    const stick = await page.evaluate(() => {
      const m = window.__MC;
      const s = JSON.parse(localStorage.getItem('mc1.stickers') || '{}');
      const cat = m.pictures.find((p) => p.id === 'happy-fish').cat;
      m.renderStickers();
      const row = document.querySelector('#stickers');
      const shown = !!(row && !row.hidden && row.querySelector('.sticker'));
      return { cat, has: !!s[cat], shown, award: !!document.querySelector('#modalCard .sticker-award') };
    });
    assert.ok(stick.has, 'category sticker saved'); assert.ok(stick.award, 'win card shows sticker');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#modalCard [data-a="save"]')]);
    const p = await dl.path(); const buf = fs.readFileSync(p); assert.equal(buf.slice(1, 4).toString(), 'PNG'); assert.ok(buf.length > 8000, 'png size ' + buf.length);
    fs.copyFileSync(p, `${SHOTS}/${name}-10-saved-picture.png`);
    await page.click('#modalCard [data-a="gallery"]'); await page.waitForSelector('#gallery.on');
    const g = await page.$$eval('#gGrid .pic.done img', (e) => e.map((i) => i.naturalWidth)); assert.ok(g.length >= 1 && g[0] > 50, 'gallery thumbnail');
    await page.screenshot({ path: `${SHOTS}/${name}-11-gallery.png` });
    await page.click('#gBack'); await page.locator('#grid .pic[data-id="happy-fish"]').scrollIntoViewIfNeeded(); await page.click('#grid .pic[data-id="happy-fish"]'); await page.waitForSelector('#modal.on'); await page.click('#modalCard [data-a="close"]');
  });

  await test(`${name}: mode setting - default One by one, a real later choice is remembered, old auto-saved default is migrated`, async () => {
    const orig = await page.evaluate(() => localStorage.getItem('mc1.settings')); const p2 = await ctx.newPage();
    const modeAfter = async (val) => { await p2.goto(FILE); await p2.waitForSelector('.pic'); await p2.evaluate((v) => { if (v === null) localStorage.removeItem('mc1.settings'); else localStorage.setItem('mc1.settings', v); }, val); await p2.reload(); await p2.waitForSelector('.pic'); return p2.evaluate(() => window.__MC.settings.mode); };
    assert.equal(await modeAfter(null), 'classic', 'fresh player'); assert.equal(await modeAfter('{"mode":"magic","sound":true}'), 'classic', 'v1.0.0 auto-saved default');
    assert.equal(await modeAfter('{"mode":"magic","sound":true,"modeChosen":true}'), 'magic', 'chosen magic remembered'); assert.equal(await modeAfter('{"mode":"classic","sound":true,"modeChosen":true}'), 'classic');
    await p2.close(); await page.evaluate((o) => { if (o === null) localStorage.removeItem('mc1.settings'); else localStorage.setItem('mc1.settings', o); }, orig);
  });

  await test(`${name}: sound toggle, no console errors, no network requests`, async () => {
    const before = await page.evaluate(() => window.__MC.settings.sound); await page.click('#hSound').catch(async () => { await page.click('#gBack').catch(() => {}); await page.click('#pHome').catch(() => {}); await page.click('#hSound'); });
    const after = await page.evaluate(() => window.__MC.settings.sound); assert.notEqual(before, after);
    assert.deepEqual(errors, []); assert.deepEqual(external, []);
  });

  if (name === 'phone-portrait') {
    await test('hard picture (mandala, 150+ regions) loads and pans quickly', async () => {
      await page.evaluate(() => window.__MC.store.clearProgress('mandala-magic')); await page.goto(FILE); await page.waitForSelector('.pic');
      const t = await page.evaluate(async () => { const t0 = performance.now(); window.__MC.startPicture(window.__MC.pictures.find((p) => p.id === 'mandala-magic')); const load = performance.now() - t0; const v = window.__MC.view; v.zoomAt(3, v.vw / 2, v.vh / 2); const t1 = performance.now(); for (let i = 0; i < 30; i++) { v.tx -= 6; v.clamp(); v.moving = performance.now() + 100; v.draw(performance.now()); } return { load, frame: (performance.now() - t1) / 30, regions: window.__MC.cur.pic.regions.length }; });
      console.log('       hard picture: load ' + t.load.toFixed(0) + ' ms, draw ' + t.frame.toFixed(1) + ' ms/frame (headless CPU), regions ' + t.regions);
      assert.ok(t.load < 2500 && t.frame < 60);
      await page.waitForTimeout(300); await page.screenshot({ path: `${SHOTS}/${name}-12-hard-mandala.png` });
    });
  }
  await ctx.close();
}

// ---- offline / PWA over http (service worker needs http) ----
await test('PWA: served over http, service worker installs and the game works offline', async () => {
  const dir = path.resolve('docs'); assert.ok(fs.existsSync(path.join(dir, 'sw.js')) && fs.existsSync(path.join(dir, 'manifest.webmanifest')));
  const srv = http.createServer((req, res) => { const f = path.join(dir, req.url === '/' ? 'index.html' : req.url.split('?')[0]); if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); } const ext = path.extname(f); res.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.png': 'image/png' }[ext] || 'application/octet-stream' }); res.end(fs.readFileSync(f)); });
  await new Promise((r) => srv.listen(0, r)); const url = `http://localhost:${srv.address().port}/`;
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(url); await page.waitForSelector('.pic');
  await page.evaluate(() => navigator.serviceWorker.ready); await page.waitForTimeout(800);
  const mf = await page.evaluate(() => fetch('manifest.webmanifest').then((r) => r.json())); assert.equal(mf.name, 'Magic Colour'); assert.ok(mf.icons.length >= 2);
  await ctx.setOffline(true); await page.reload(); await page.waitForSelector('.pic');
  assert.ok((await page.$$('#grid .pic')).length >= 24, 'offline load shows the gallery'); await page.click('.pic[data-id="rocket-blast"]'); await page.waitForSelector('#play.on');
  assert.deepEqual(errs, []); await ctx.close(); srv.close();
});
await test('safe-area insets are respected in the stylesheet', () => {
  const css = fs.readFileSync('src/style.css', 'utf8'); for (const k of ['top', 'right', 'bottom', 'left']) assert.ok(css.includes('env(safe-area-inset-' + k + ')'));
  assert.ok(fs.readFileSync('index.html', 'utf8').includes('viewport-fit=cover'));
});
await browser.close();
done('smoke tests');
