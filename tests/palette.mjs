// "Tidy palette" (1.16.0): on big pictures whose colours do not fit, finished colours tuck away small at the end,
// the picked colour (palette tap, next-colour auto-pick, hint, keyboard) always scrolls into view, and soft edge fades show more colours.
// + regression checks of what sits next to it: small palettes unchanged, palette alone never fills (Magic), undo, save/Continue,
// One by one taps, Brush defaults, finishing a picture, win card, gallery, no errors, no network.
// Headless Chromium at phone sizes. Screenshots -> /workspace/magic-colour-screens/palette-*.png
import { launch, FILE, SHOTS } from './launch.mjs';
import { test, done, assert } from './harness.mjs';

const browser = await launch();
const VIEWPORTS0 = [['390x844', { width: 390, height: 844 }, true, 2], ['360x640', { width: 360, height: 640 }, true, 2], ['640x360', { width: 640, height: 360 }, true, 2], ['desktop', { width: 1280, height: 800 }, false, 1]];
const VIEWPORTS = process.env.VP ? VIEWPORTS0.filter((v) => v[0] === process.env.VP) : VIEWPORTS0;
const st = (page) => page.evaluate(() => { const m = window.__MC; m.flush(); const g = m.cur.game; return { filled: g.filledCount(), sel: g.selected, mode: g.mode, complete: g.complete, undo: g.canUndo() }; });
const open = (page, id) => page.evaluate((id) => { const m = window.__MC; m.store.clearProgress(id); m.store.unmarkDone(id); m.startPicture(m.pictures.find((p) => p.id === id)); }, id).then(() => page.waitForTimeout(400));
const regionXY = (page, id) => page.evaluate((id) => { const m = window.__MC, v = m.view, r = m.cur.pic.regions[id], c = v.cv.getBoundingClientRect(); return { x: c.left + v.tx + r[1] * v.s, y: c.top + v.ty + r[2] * v.s }; }, id);
// is swatch c fully inside the visible palette box?
const visible = (page, c) => page.evaluate((c) => { const n = document.getElementById('palette').getBoundingClientRect(), b = document.querySelector(`.sw[data-c="${c}"]`).getBoundingClientRect(); return b.left >= n.left - 1 && b.right <= n.right + 1 && b.top >= n.top - 1 && b.bottom <= n.bottom + 1; }, c);
const pal = (page) => page.evaluate(() => { const n = document.getElementById('palette'); return { cls: n.className, gone: [...n.querySelectorAll('.sw.gone')].map((b) => +b.dataset.c), order: [...n.children].map((b) => ({ c: +b.dataset.c, x: b.getBoundingClientRect().left, y: b.getBoundingClientRect().top, w: b.getBoundingClientRect().width, gone: b.classList.contains('gone') })) }; });
// colour every spot of colour c through the real game path (select via palette click, fill via handle -> save/advance)
const finishColour = (page, c) => page.evaluate((c) => { const m = window.__MC, g = m.cur.game; g.selectColour(c); m.handle({ type: 'none' }); const ids = g.byColour[c].filter((i) => !g.filled[i]);
  m.settings.mode = 'magic'; g.setMode('magic'); const r = g.tapRegion(ids[0]); m.handle(r, {}); m.flush(); m.settings.mode = 'classic'; g.setMode('classic'); return r.type; }, c);

for (const [name, vp, touch, dsf] of VIEWPORTS) {
  console.log(`\n== palette ${name}`);
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: dsf, hasTouch: touch, isMobile: touch });
  const page = await ctx.newPage(); const errors = [], external = [];
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', (r) => { if (!/^(file|data|blob):/.test(r.url())) external.push(r.url()); });
  await page.goto(FILE); await page.waitForSelector('.pic');
  const tap = async (x, y) => { if (touch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); await page.waitForTimeout(60); };

  await test(`${name}: defaults hold (One by one, smallest brush); a small palette that fits is left as it was (no tuck, no fades, number order)`, async () => {
    await open(page, 'happy-fish');
    const d = await page.evaluate(() => ({ mode: window.__MC.settings.mode, brush: window.__MC.settings.brushSize })); assert.deepEqual(d, { mode: 'classic', brush: 0 });
    let p = await pal(page); assert.ok(!/tuck|more-/.test(p.cls), 'no tuck / fade on a palette that fits: ' + p.cls);
    assert.equal(await finishColour(page, 1), 'fill'); await page.waitForTimeout(1200);
    p = await pal(page); const xs = p.order.filter((o) => Math.abs(o.y - p.order[0].y) < 4).map((o) => o.x);
    assert.ok(xs.every((x, i) => !i || x > xs[i - 1]), 'swatches stay in number order');
    for (const o of p.order) assert.ok(o.w >= 44, 'swatch ' + o.c + ' is ' + o.w + ' px');
  });

  await test(`${name}: fix - every colour of a picture with up to 10 colours is on screen without scrolling (easy 6-colour pictures used to hide colour 6 on phones)`, async () => {
    if (vp.width < vp.height || vp.width >= 900) {
      const ids = await page.evaluate(() => { const by = {}; for (const p of window.__MC.pictures) if (p.palette.length <= 10 && !by[p.palette.length]) by[p.palette.length] = p.id; return Object.values(by); });
      assert.ok(ids.length >= 6, 'sampled ' + ids.length + ' palette sizes');
      for (const id of ids) {
        await open(page, id);
        const f = await page.evaluate(() => { const n = document.getElementById('palette'); return { K: n.children.length, over: n.scrollWidth > n.clientWidth + 2 || n.scrollHeight > n.clientHeight + 2, cls: n.className }; });
        assert.ok(!f.over && !/tuck|more-/.test(f.cls), id + ' (' + f.K + ' colours) fits: ' + JSON.stringify(f));
        for (let c = 1; c <= f.K; c++) assert.ok(await visible(page, c), id + ': colour ' + c + ' on screen');
        const w = await page.$$eval('#palette .sw', (a) => a.map((b) => b.getBoundingClientRect().width)); assert.ok(w.every((x) => x >= 44), 'touch targets ' + w);
      }
    }
  });

  await test(`${name}: big palette (Epic grid, 24 colours): tucks, shows a fade towards more colours, a far colour scrolls fully into view when picked; palette alone never fills (Magic)`, async () => {
    await open(page, 'grid-candy-land');
    let p = await pal(page);
    if (vp.width >= 900) { assert.ok(!/tuck|more-/.test(p.cls), 'desktop: all 24 colours fit, nothing tucked: ' + p.cls); for (let c = 1; c <= 24; c++) assert.ok(await visible(page, c)); return; }
    assert.ok(/tuck/.test(p.cls), 'tuck on: ' + p.cls); assert.ok(/more-b/.test(p.cls), 'fade shows there are more colours: ' + p.cls);
    await page.click('.mode[data-mode="magic"]'); await page.waitForTimeout(100);
    for (const c of [20, 24, 2]) {
      await page.click(`.sw[data-c="${c}"]`); await page.waitForTimeout(700);
      const s = await st(page); assert.equal(s.filled, 0, 'Magic: picking colour ' + c + ' alone fills nothing'); assert.equal(s.sel, c);
      assert.ok(await visible(page, c), 'picked colour ' + c + ' fully visible');
    }
    await page.keyboard.press('Escape');
    await page.click('.mode[data-mode="classic"]');
    await page.evaluate(() => { const m = window.__MC; m.settings.modeChosen = false; m.settings.mode = 'classic'; m.store.saveSettings(m.settings); });
    await page.screenshot({ path: `${SHOTS}/palette-${name}-1-epic.png` });
  });

  await test(`${name}: finishing a colour: it keeps its place for a moment (tick), then tucks away small at the end; the next colour is auto-picked and visible; undo brings it back`, async () => {
    await open(page, 'grid-candy-land');
    assert.equal(await finishColour(page, 1), 'fill');
    const big = vp.width < 900;
    let p = await pal(page); assert.deepEqual(p.gone, [], 'not tucked straight away');
    assert.ok(await page.evaluate(() => document.querySelector('.sw[data-c="1"]').classList.contains('done')), 'tick shown');
    await page.waitForTimeout(1300);
    p = await pal(page); assert.deepEqual(p.gone, [1], 'tucked away after a moment');
    const g1 = p.order.find((o) => o.c === 1), rest = p.order.filter((o) => o.c !== 1);
    if (big) assert.ok(g1.w >= 43 && g1.w < Math.min(...rest.map((o) => o.w)), 'tucked swatch smaller but still a 44 px target (' + g1.w + ')');
    const horizontal = vp.width > vp.height;
    if (big) assert.ok(rest.every((o) => horizontal ? o.y < g1.y - 12 || Math.abs(o.y - g1.y) < 12 && o.x < g1.x : o.x < g1.x), 'tucked swatch sits after the unfinished ones');
    const s = await st(page); assert.equal(s.sel, 2, 'next colour auto-picked'); assert.ok(await visible(page, 2), 'next colour visible');
    await page.screenshot({ path: `${SHOTS}/palette-${name}-2-tucked.png` });
    await page.click('#pUndo'); await page.waitForTimeout(150);
    p = await pal(page); assert.deepEqual(p.gone, [], 'undo: back in its place'); assert.equal((await st(page)).filled, 0, 'undo undid the fill');
    assert.ok(await visible(page, 1) || (await st(page)).sel !== 1, 'undo: selected colour visible');
    // keyboard digits still mean the colour number, whatever the order
    await finishColour(page, 1); await page.waitForTimeout(1200);
    if (!touch) { await page.keyboard.press('5'); assert.equal((await st(page)).sel, 5, 'key 5 picks colour 5'); assert.ok(await visible(page, 5)); }
  });

  await test(`${name}: hint picks a colour and it is visible; read-only palette work (scrolling) never changes saved progress; Continue reopens with finished colours already tucked`, async () => {
    await open(page, 'grid-candy-land');
    await finishColour(page, 3); await finishColour(page, 1); await page.waitForTimeout(1200);
    const ls0 = await page.evaluate(() => JSON.stringify(Object.entries(localStorage).filter(([k]) => !/settings/.test(k)).sort()));
    await page.evaluate(() => { const n = document.getElementById('palette'); n.scrollLeft = n.scrollWidth; n.scrollTop = n.scrollHeight; }); await page.waitForTimeout(100);
    if (vp.width < 900) assert.ok(/more-a/.test((await pal(page)).cls), 'fade at the start after scrolling to the end');
    const ls1 = await page.evaluate(() => JSON.stringify(Object.entries(localStorage).filter(([k]) => !/settings/.test(k)).sort()));
    assert.equal(ls1, ls0, 'palette scrolling does not touch progress');
    await page.click('#pHint'); await page.waitForTimeout(800);
    const s = await st(page); assert.ok(s.sel > 0); assert.ok(await visible(page, s.sel), 'hint colour ' + s.sel + ' visible'); assert.equal(s.filled > 0, true);
    const filled = s.filled;
    await page.click('#pHome'); await page.waitForSelector('#home.on');
    await page.waitForSelector('#continue:not([hidden]) .cont'); await page.click('#continue .cont'); await page.waitForSelector('#play.on'); await page.waitForTimeout(400);
    assert.equal((await st(page)).filled, filled, 'progress restored by Continue');
    const p = await pal(page); assert.deepEqual(p.gone.sort((a, b) => a - b), [1, 3], 'finished colours tucked right away on Continue');
    await page.screenshot({ path: `${SHOTS}/palette-${name}-3-continue.png` });
  });

  await test(`${name}: One by one real tap colours one spot; finishing a picture shows the win card; gallery lists it; no errors; no network`, async () => {
    await open(page, 'kitty-cat');
    const pick = await page.evaluate(() => { const m = window.__MC, g = m.cur.game, R = g.puzzle.regions, v = m.view, c = v.cv.getBoundingClientRect();
      const ids = R.map((r, i) => i).filter((i) => R[i][0] > 0).sort((a, b) => R[b][3] - R[a][3]);
      for (const i of ids) { const x = c.left + v.tx + R[i][1] * v.s, y = c.top + v.ty + R[i][2] * v.s; if (document.elementFromPoint(x, y) === v.cv) return { id: i, c: R[i][0] }; } return null; });
    await page.click(`.sw[data-c="${pick.c}"]`); assert.equal((await st(page)).filled, 0, 'palette alone never fills');
    const q = await regionXY(page, pick.id); await tap(q.x, q.y); assert.equal((await st(page)).filled, 1, 'One by one: one spot');
    await open(page, 'happy-fish');
    const last = await page.evaluate(() => { const m = window.__MC, g = m.cur.game, R = m.cur.pic.regions; let keep = -1;
      for (let c = 1; c <= m.cur.pic.palette.length; c++) for (const id of g.byColour[c]) { if (keep < 0) { keep = id; continue; } g.selectColour(c); g.tapRegion(id); }
      m.view.paintAll(); m.store.saveProgress(m.cur.pic.id, g.save()); g.selectColour(R[keep][0]); m.handle({ type: 'none' }); return keep; });
    const p = await regionXY(page, last); await tap(p.x, p.y);
    await page.waitForSelector('#modal.on', { timeout: 6000 }); assert.ok((await st(page)).complete);
    assert.ok(await page.$('#modalCard [data-a="watch"]'), 'Watch still on the win card');
    await page.click('#modalCard [data-a="gallery"]'); await page.waitForSelector('#gallery.on'); assert.ok(await page.$('#gGrid .pic[data-id="happy-fish"]'), 'in the gallery');
    await page.click('#gBack'); await page.waitForSelector('#home.on');
    assert.deepEqual(errors, []); assert.deepEqual(external, []);
  });
  await ctx.close();
}
await browser.close();
done('palette');
