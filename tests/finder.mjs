// Spot finder (1.12.0) + Grid line fade + regression checks of the neighbouring features (modes, palette rule, undo, brush,
// save/continue, keyboard, completion, offline). Headless Chromium, phone sizes. Screenshots -> /workspace/magic-colour-screens/finder-*.png
import { launch, FILE, SHOTS } from './launch.mjs';
import { test, done, assert } from './harness.mjs';

const browser = await launch();
const VIEWPORTS = [['390x844', { width: 390, height: 844 }, true, 2.5], ['360x640', { width: 360, height: 640 }, true, 2], ['desktop', { width: 1280, height: 800 }, false, 1]];

// layer check in the page: every striped texel belongs to an unfilled region of the selected colour, and every such region has stripes
const layerCheck = (page) => page.evaluate(() => {
  const m = window.__MC, v = m.view, g = m.cur.game, P = m.cur.pic; v.draw(performance.now());
  const d = v.hlCtx.getImageData(0, 0, v.hlW, v.hlH).data, sel = g.selected, seen = new Set(); let bad = 0, on = 0;
  for (let y = 0; y < v.hlH; y++) for (let x = 0; x < v.hlW; x++) {
    if (!d[(y * v.hlW + x) * 4 + 3]) continue; on++;
    const id = P.grid ? v.map[Math.floor((y + 0.5) * v.hlK) * P.w + Math.floor((x + 0.5) * v.hlK)] : v.map[y * P.w + x];
    if (P.regions[id][0] !== sel || g.filled[id]) bad++; else seen.add(id);
  }
  const want = sel > 0 ? g.byColour[sel].filter((i) => !g.filled[i]).length : 0;
  return { sel, on, bad, regions: seen.size, want, info: v.finderInfo() };
});
const st = (page) => page.evaluate(() => { const m = window.__MC; m.flush(); const g = m.cur.game; return { filled: g.filledCount(), total: g.total, sel: g.selected, mode: g.mode, complete: g.complete, canUndo: g.canUndo() }; });
const regionXY = (page, id) => page.evaluate((id) => { const m = window.__MC, v = m.view, r = m.cur.pic.regions[id], c = v.cv.getBoundingClientRect(); return { x: c.left + v.tx + r[1] * v.s, y: c.top + v.ty + r[2] * v.s }; }, id);
const biggestRegionOf = (page, c) => page.evaluate((c) => { const g = window.__MC.cur.game, R = g.puzzle.regions; return g.byColour[c].filter((i) => !g.filled[i]).sort((a, b) => R[b][3] - R[a][3])[0]; }, c);

for (const [name, vp, touch, dsf] of VIEWPORTS) {
  console.log(`\n== finder ${name}`);
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: dsf, hasTouch: touch, isMobile: touch });
  const page = await ctx.newPage(); const errors = [], external = [];
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', (r) => { if (!/^(file|data|blob):/.test(r.url())) external.push(r.url()); });
  await page.goto(FILE); await page.waitForSelector('.pic');
  const tap = async (x, y) => { if (touch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); await page.waitForTimeout(60); };
  const tapRegion = async (id) => { const p = await regionXY(page, id); await tap(p.x, p.y); };
  const open = async (id) => { await page.evaluate((id) => { const m = window.__MC; m.store.clearProgress(id); m.startPicture(m.pictures.find((p) => p.id === id)); }, id); await page.waitForSelector('#play.on'); await page.waitForTimeout(350); };

  await test(`${name}: defaults hold (One by one, smallest brush) and nothing is striped before a colour is picked`, async () => {
    await open('happy-fish');
    const s = await st(page); assert.equal(s.mode, 'classic'); assert.equal(await page.evaluate(() => window.__MC.settings.brushSize), 0);
    const L = await layerCheck(page); assert.equal(L.sel, 0); assert.equal(L.on, 0); assert.equal(L.info.count, 0);
  });

  await test(`${name}: picking a colour stripes exactly its unfilled spots and fills nothing (One by one + Magic)`, async () => {
    for (const mode of ['classic', 'magic']) {
      await page.click(`.mode[data-mode="${mode}"]`); await open('happy-fish');
      await page.click('.sw[data-c="2"]'); const s = await st(page); assert.equal(s.filled, 0, 'palette alone never fills (' + mode + ')');
      const L = await layerCheck(page); assert.equal(L.sel, 2); assert.equal(L.bad, 0, 'stripes only on colour 2'); assert.equal(L.regions, L.want, 'every colour-2 spot striped'); assert.ok(L.on > 0); assert.equal(L.info.count, L.want);
      const px = await page.evaluate(() => { const m = window.__MC, v = m.view, g = m.cur.game, r = m.cur.pic.regions[g.byColour[2][0]]; return [...v.fctx.getImageData(r[1], r[2], 1, 1).data.slice(0, 3)]; });
      assert.deepEqual(px, [255, 255, 255], 'fill layer untouched by the finder');
    }
    await page.click('.mode[data-mode="classic"]');
  });

  await test(`${name}: One by one tap clears that spot's stripes, undo brings them back, switching colour moves the stripes`, async () => {
    await open('happy-fish'); await page.click('.sw[data-c="1"]');
    const before = await layerCheck(page); const id = await biggestRegionOf(page, 1); await tapRegion(id);
    let s = await st(page); assert.equal(s.filled, 1); let L = await layerCheck(page); assert.equal(L.bad, 0); assert.equal(L.regions, before.regions - 1); assert.equal(L.info.count, before.want - 1);
    await page.click('#pUndo'); s = await st(page); assert.equal(s.filled, 0); L = await layerCheck(page); assert.equal(L.regions, before.regions); assert.equal(L.bad, 0);
    await page.keyboard.press('3'); L = await layerCheck(page); assert.equal(L.sel, 3, 'keyboard number picks a colour'); assert.equal(L.bad, 0); assert.equal(L.regions, L.want);
    await page.screenshot({ path: `${SHOTS}/finder-${name}-1-select.png` });
  });

  await test(`${name}: Magic tap fills every spot of the number and the stripes disappear; Brush paints only that number`, async () => {
    await page.click('.mode[data-mode="magic"]'); await open('happy-fish'); await page.click('.sw[data-c="1"]');
    const id = await biggestRegionOf(page, 1); await tapRegion(id); await page.waitForTimeout(900);
    let L = await layerCheck(page); assert.equal(L.on, 0); assert.equal(L.info.count, 0); assert.ok(await page.evaluate(() => window.__MC.cur.game.colourDone(1)));
    await page.click('.mode[data-mode="brush"]'); await page.click('.sw[data-c="2"]'); const b0 = await layerCheck(page);
    const tid = await biggestRegionOf(page, 2), p = await regionXY(page, tid);
    if (touch) { const cdp = await ctx.newCDPSession(page); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x, y: p.y, id: 1 }] }); for (let k = 1; k <= 6; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x + k, y: p.y, id: 1 }] }); await page.waitForTimeout(16); } await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach(); }
    else { await page.mouse.move(p.x, p.y); await page.mouse.down(); for (let k = 1; k <= 6; k++) { await page.mouse.move(p.x + k, p.y); await page.waitForTimeout(16); } await page.mouse.up(); }
    await page.waitForTimeout(150);
    const cols = await page.evaluate(() => { const g = window.__MC.cur.game, R = g.puzzle.regions; const o = []; g.filled.forEach((f, i) => { if (f && R[i][0] > 0) o.push(R[i][0]); }); return [...new Set(o)]; });
    assert.ok(cols.every((c) => c === 1 || c === 2), 'brush painted only number 2'); L = await layerCheck(page); assert.ok(L.regions < b0.regions, 'brushed spot lost its stripes'); assert.equal(L.bad, 0);
    await page.click('.mode[data-mode="classic"]');
  });

  await test(`${name}: progress is saved and Continue restores the picture with the finder in step`, async () => {
    await open('happy-fish'); await page.click('.sw[data-c="1"]'); await tapRegion(await biggestRegionOf(page, 1));
    await page.evaluate(() => { const m = window.__MC; m.flush(); m.store.saveProgress(m.cur.pic.id, m.cur.game.save()); });
    await page.reload(); await page.waitForSelector('.pic'); await page.waitForSelector('#continue:not([hidden]) .cont'); await page.click('#continue .cont'); await page.waitForSelector('#play.on'); await page.waitForTimeout(400);
    const s = await st(page); assert.equal(s.filled, 1, 'restored'); assert.equal(s.sel, 1);
    const L = await layerCheck(page); assert.equal(L.bad, 0); assert.equal(L.regions, L.want);
    await page.click('#pHome'); await page.waitForSelector('#home.on');
  });

  await test(`${name}: finishing a picture celebrates, hides stripes and shows the win card; gallery lists it`, async () => {
    await open('happy-fish');
    const K = await page.evaluate(() => window.__MC.cur.pic.palette.length);
    for (let c = 1; c <= K; c++) { if (await page.evaluate((c) => window.__MC.cur.game.remaining(c) === 0, c)) continue; await page.click('.mode[data-mode="magic"]'); await page.click(`.sw[data-c="${c}"]`); await tapRegion(await biggestRegionOf(page, c)); await page.waitForTimeout(200); }
    await page.waitForTimeout(400); assert.ok((await st(page)).complete);
    assert.equal((await layerCheck(page)).on, 0);
    await page.waitForSelector('#modal.on', { timeout: 6000 }); await page.screenshot({ path: `${SHOTS}/finder-${name}-2-win.png` });
    await page.click('#modalCard [data-a="gallery"]'); await page.waitForSelector('#gallery.on'); assert.ok(await page.$('#gGrid .pic[data-id="happy-fish"]'));
    await page.click('#gBack'); await page.waitForSelector('#home.on'); await page.click('.mode[data-mode="classic"]').catch(() => {});
  });

  await test(`${name}: Epic grid: lines fade at full view (picture, not a dark mesh), come back when zoomed; small finder layer; squares stay grey`, async () => {
    await page.evaluate(() => { const m = window.__MC; m.settings.mode = 'classic'; }); await open('grid-candy-land');
    const a = await page.evaluate(() => { const v = window.__MC.view, P = window.__MC.cur.pic; return { alpha: v.gridLineAlpha(), hlW: v.hlW, hlH: v.hlH, gw: P.grid.w, gh: P.grid.h }; });
    assert.ok(a.alpha < 0.5, 'faint lines at fit: ' + a.alpha); assert.equal(a.hlW, a.gw * 4); assert.equal(a.hlH, a.gh * 4);
    const c = await page.evaluate(() => { const g = window.__MC.cur.game; let b = 1; for (let c = 1; c < g.byColour.length; c++) if (g.byColour[c].length > g.byColour[b].length) b = c; return b; });
    await page.click(`.sw[data-c="${c}"]`).catch(async () => { await page.evaluate((c) => document.querySelector(`.sw[data-c="${c}"]`).click(), c); });
    let L = await layerCheck(page); assert.equal(L.sel, c); assert.equal(L.bad, 0); assert.equal(L.regions, L.want); assert.equal((await st(page)).filled, 0);
    const grey = await page.evaluate((c) => { const m = window.__MC, r = m.cur.pic.regions[m.cur.game.byColour[c][0]]; return [...m.view.fctx.getImageData(r[1], r[2], 1, 1).data.slice(0, 3)]; }, c);
    assert.deepEqual(grey, [226, 227, 236]);
    await page.screenshot({ path: `${SHOTS}/finder-${name}-3-epic-fit.png` });
    for (let i = 0; i < 4; i++) await page.click('#zIn'); await page.waitForTimeout(500);
    assert.equal(await page.evaluate(() => window.__MC.view.gridLineAlpha()), 1, 'full lines when zoomed in');
    const s0 = await st(page); const id = await biggestRegionOf(page, c); const p = await regionXY(page, id);
    const vis = await page.evaluate(([x, y]) => { const r = window.__MC.view.cv.getBoundingClientRect(); return x > r.left + 60 && x < r.right - 60 && y > r.top + 40 && y < r.bottom - 40; }, [p.x, p.y]);
    if (vis) { await tap(p.x, p.y); const s1 = await st(page); assert.equal(s1.filled, s0.filled + 1); L = await layerCheck(page); assert.equal(L.bad, 0); assert.equal(L.info.count, L.want); }
    await page.screenshot({ path: `${SHOTS}/finder-${name}-4-epic-zoom.png` });
    await page.click('#zFit'); await page.waitForTimeout(450); assert.ok(await page.evaluate(() => window.__MC.view.gridLineAlpha()) < 0.5);
    await page.click('#pHome'); await page.waitForSelector('#home.on');
  });

  await test(`${name}: no errors, no network`, async () => { assert.deepEqual(errors, []); assert.deepEqual(external, []); });
  await ctx.close();
}
await browser.close();
done('finder');
