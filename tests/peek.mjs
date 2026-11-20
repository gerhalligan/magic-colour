// "Peek" (1.15.0): hold (or tap) the eye button to see the finished picture, lined up with the current zoom.
// + regression checks of what sits next to it: layout of the stage buttons, read-only (progress / gallery / undo / selection),
// One by one taps, Magic palette rule, Brush defaults, finishing, Continue, new picture, Epic grids, offline.
// Headless Chromium at phone sizes. Screenshots -> /workspace/magic-colour-screens/peek-*.png
import { launch, FILE, SHOTS } from './launch.mjs';
import { test, done, assert } from './harness.mjs';

const browser = await launch();
const VIEWPORTS0 = [['390x844', { width: 390, height: 844 }, true, 2], ['360x640', { width: 360, height: 640 }, true, 2], ['640x360', { width: 640, height: 360 }, true, 2], ['desktop', { width: 1280, height: 800 }, false, 1]];
const st = (page) => page.evaluate(() => { const m = window.__MC; m.flush(); const g = m.cur.game; return { filled: g.filledCount(), sel: g.selected, mode: g.mode, complete: g.complete, undo: g.canUndo() }; });
const regionXY = (page, id) => page.evaluate((id) => { const m = window.__MC, v = m.view, r = m.cur.pic.regions[id], c = v.cv.getBoundingClientRect(); return { x: c.left + v.tx + r[1] * v.s, y: c.top + v.ty + r[2] * v.s }; }, id);
// share of clearly coloured (non-grey) pixels on the play canvas, sampled
const colourful = (page) => page.evaluate(() => { const m = window.__MC; m.view.draw(performance.now()); const c = document.getElementById('cv'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0, col = 0; for (let i = 0; i < d.length; i += 4 * 17) { if (!d[i + 3]) continue; n++; const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]); if (mx - mn > 40) col++; } return col / Math.max(1, n); });
const open = (page, id) => page.evaluate((id) => { const m = window.__MC; m.store.clearProgress(id); m.store.unmarkDone(id); m.startPicture(m.pictures.find((p) => p.id === id)); }, id).then(() => page.waitForTimeout(350));
const overlap = (a, b) => a && b && a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
const box = async (page, sel) => { const e = await page.$(sel); if (!e) return null; const b = await e.boundingBox(); return b && b.width ? b : null; };

const VIEWPORTS = process.env.VP ? VIEWPORTS0.filter((v) => v[0] === process.env.VP) : VIEWPORTS0;
for (const [name, vp, touch, dsf] of VIEWPORTS) {
  console.log(`\n== peek ${name}`);
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: dsf, hasTouch: touch, isMobile: touch });
  const page = await ctx.newPage(); const errors = [], external = [];
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', (r) => { if (!/^(file|data|blob):/.test(r.url())) external.push(r.url()); });
  await page.goto(FILE); await page.waitForSelector('.pic');
  const cdp = touch ? await ctx.newCDPSession(page) : null;
  const tap = async (x, y) => { if (touch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); await page.waitForTimeout(60); };
  // press and hold the Peek button with a real finger (CDP touch) or mouse
  const holdPeek = async () => { const b = await box(page, '#pPeek'), x = b.x + b.width / 2, y = b.y + b.height / 2;
    if (touch) await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] }); else { await page.mouse.move(x, y); await page.mouse.down(); } await page.waitForTimeout(600); };
  const releasePeek = async () => { if (touch) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); else await page.mouse.up(); await page.waitForTimeout(80); };

  await test(`${name}: Peek button is on the stage, 44 px, and does not cover the other stage buttons (also in Brush mode)`, async () => {
    await open(page, 'unicorn-window');
    const pk = await box(page, '#pPeek'), stage = await box(page, '#stage');
    assert.ok(pk, 'Peek visible'); assert.ok(pk.width >= 44 && pk.height >= 44, 'touch target ' + JSON.stringify(pk));
    assert.ok(pk.x >= stage.x && pk.y >= stage.y && pk.x + pk.width <= stage.x + stage.width + 1 && pk.y + pk.height <= stage.y + stage.height + 1, 'inside the stage');
    for (const sel of ['#pSound', '#zIn', '#zOut', '#zFit', '.pbar']) assert.ok(!overlap(pk, await box(page, sel)), 'no overlap with ' + sel);
    await page.click('.mode[data-mode="brush"]'); await page.waitForTimeout(150);
    assert.ok(!overlap(await box(page, '#pPeek'), await box(page, '#brushbar')), 'no overlap with the brush sizes');
    assert.equal(await page.evaluate(() => window.__MC.settings.brushSize), 0, 'Brush default stays the smallest');
    await page.click('.mode[data-mode="classic"]'); await page.waitForTimeout(100);
    await page.evaluate(() => { const m = window.__MC; m.settings.modeChosen = false; m.settings.mode = 'classic'; m.store.saveSettings(m.settings); });
  });

  await test(`${name}: holding Peek shows the finished picture; letting go hides it; read-only (progress, gallery, undo, selection unchanged)`, async () => {
    await open(page, 'unicorn-window');
    // colour one spot first so there is progress + an undo step to protect
    const pick = await page.evaluate(() => { const m = window.__MC, g = m.cur.game, R = g.puzzle.regions, v = m.view, c = v.cv.getBoundingClientRect();
      const ids = R.map((r, i) => i).filter((i) => R[i][0] > 0).sort((a, b) => R[b][3] - R[a][3]);
      for (const i of ids) { const x = c.left + v.tx + R[i][1] * v.s, y = c.top + v.ty + R[i][2] * v.s; if (document.elementFromPoint(x, y) === v.cv) return { id: i, c: R[i][0] }; } return null; });
    await page.click(`.sw[data-c="${pick.c}"]`); const p = await regionXY(page, pick.id); await tap(p.x, p.y);
    const s0 = await st(page); assert.equal(s0.filled, 1); assert.ok(s0.undo);
    const ls0 = await page.evaluate(() => JSON.stringify(Object.entries(localStorage).filter(([k]) => !/settings/.test(k)).sort()));
    const before = await colourful(page);
    await holdPeek();
    assert.ok(await page.evaluate(() => window.__MC.peeking), 'peeking while held');
    assert.ok(await page.$eval('#pPeek', (e) => e.classList.contains('on')), 'button lit');
    const during = await colourful(page);
    assert.ok(during > before + 0.25, `finished colours show (${before.toFixed(3)} -> ${during.toFixed(3)})`);
    await page.screenshot({ path: `${SHOTS}/peek-${name}-1-hold.png` });
    await releasePeek();
    assert.equal(await page.evaluate(() => window.__MC.peeking), false, 'hidden on release after a hold');
    const after = await colourful(page); assert.ok(Math.abs(after - before) < 0.02, `back to the real colouring (${before} vs ${after})`);
    const s1 = await st(page); assert.deepEqual(s1, s0, 'game state unchanged');
    const ls1 = await page.evaluate(() => JSON.stringify(Object.entries(localStorage).filter(([k]) => !/settings/.test(k)).sort()));
    assert.equal(ls1, ls0, 'progress / gallery / stickers unchanged');
    await page.click('#pUndo'); assert.equal((await st(page)).filled, 0, 'undo still undoes the real fill');
  });

  await test(`${name}: a quick tap peeks for about 2 s; touching the picture ends the peek and the tap still colours (One by one)`, async () => {
    await open(page, 'kitty-cat');
    const b = await box(page, '#pPeek'); await tap(b.x + b.width / 2, b.y + b.height / 2);
    assert.ok(await page.evaluate(() => window.__MC.peeking), 'peeking after a tap');
    await page.waitForTimeout(2300); assert.equal(await page.evaluate(() => window.__MC.peeking), false, 'ends by itself');
    const pick = await page.evaluate(() => { const m = window.__MC, g = m.cur.game, R = g.puzzle.regions, v = m.view, c = v.cv.getBoundingClientRect();
      const ids = R.map((r, i) => i).filter((i) => R[i][0] > 0).sort((a, b) => R[b][3] - R[a][3]);
      for (const i of ids) { const x = c.left + v.tx + R[i][1] * v.s, y = c.top + v.ty + R[i][2] * v.s; if (document.elementFromPoint(x, y) === v.cv) return { id: i, c: R[i][0] }; } return null; });
    await page.click(`.sw[data-c="${pick.c}"]`); assert.equal((await st(page)).filled, 0, 'palette alone never fills');
    await tap(b.x + b.width / 2, b.y + b.height / 2); assert.ok(await page.evaluate(() => window.__MC.peeking));
    const p = await regionXY(page, pick.id); await tap(p.x, p.y);
    assert.equal(await page.evaluate(() => window.__MC.peeking), false, 'touching the picture ends the peek');
    const s = await st(page); assert.equal(s.filled, 1, 'the tap coloured the spot'); assert.equal(s.mode, 'classic', 'default mode One by one');
  });

  await test(`${name}: Magic still needs a tap after peeking; Epic grid peek uses one picture-sized layer; new picture resets it`, async () => {
    await open(page, 'grid-candy-land');
    await page.click('.mode[data-mode="magic"]'); await page.waitForTimeout(100);
    const before = await colourful(page); await holdPeek();
    const info = await page.evaluate(() => { const v = window.__MC.view; return { w: v.peekCv.width, h: v.peekCv.height, pw: v.puzzle.w, ph: v.puzzle.h }; });
    assert.equal(info.w, info.pw); assert.equal(info.h, info.ph);
    const during = await colourful(page); assert.ok(during > before + 0.3, `Epic peek shows colours (${before.toFixed(3)} -> ${during.toFixed(3)})`);
    await page.screenshot({ path: `${SHOTS}/peek-${name}-2-epic.png` });
    await releasePeek();
    await page.click('.sw[data-c="3"]'); assert.equal((await st(page)).filled, 0, 'Magic: picking a colour alone never fills');
    await page.click('.mode[data-mode="classic"]');
    await page.evaluate(() => { const m = window.__MC; m.settings.modeChosen = false; m.settings.mode = 'classic'; m.store.saveSettings(m.settings); m.startPeek(); });
    await open(page, 'happy-fish');
    assert.deepEqual(await page.evaluate(() => ({ p: window.__MC.peeking, cv: window.__MC.view.peekCv, on: document.getElementById('pPeek').classList.contains('on') })), { p: false, cv: null, on: false }, 'new picture starts without a peek');
  });

  await test(`${name}: finishing a picture ends the peek; win card, gallery and Continue still work; no errors; no network`, async () => {
    await open(page, 'happy-fish');
    const last = await page.evaluate(() => { const m = window.__MC, g = m.cur.game, R = m.cur.pic.regions; let keep = -1;
      for (let c = 1; c <= m.cur.pic.palette.length; c++) for (const id of g.byColour[c]) { if (keep < 0) { keep = id; continue; } g.selectColour(c); g.tapRegion(id); }
      m.view.paintAll(); m.store.saveProgress(m.cur.pic.id, g.save()); g.selectColour(R[keep][0]); return keep; });
    await page.evaluate(() => window.__MC.startPeek()); assert.ok(await page.evaluate(() => window.__MC.peeking));
    const p = await regionXY(page, last); await tap(p.x, p.y);
    await page.waitForSelector('#modal.on', { timeout: 6000 });
    assert.ok((await st(page)).complete); assert.equal(await page.evaluate(() => window.__MC.peeking), false, 'no peek after finishing');
    await page.evaluate(() => window.__MC.startPeek()); assert.equal(await page.evaluate(() => window.__MC.peeking), false, 'cannot peek a finished picture');
    assert.ok(await page.$('#modalCard [data-a="watch"]'), 'Watch still on the win card');
    await page.click('#modalCard [data-a="gallery"]'); await page.waitForSelector('#gallery.on'); assert.ok(await page.$('#gGrid .pic[data-id="happy-fish"]'), 'in the gallery');
    await page.click('#gBack'); await page.waitForSelector('#home.on');
    // Continue on an unfinished picture after peeking
    await open(page, 'kitty-cat');
    const pick = await page.evaluate(() => { const m = window.__MC, g = m.cur.game, R = g.puzzle.regions, v = m.view, c = v.cv.getBoundingClientRect();
      const ids = R.map((r, i) => i).filter((i) => R[i][0] > 0).sort((a, b) => R[b][3] - R[a][3]);
      for (const i of ids) { const x = c.left + v.tx + R[i][1] * v.s, y = c.top + v.ty + R[i][2] * v.s; if (document.elementFromPoint(x, y) === v.cv) return { id: i, c: R[i][0] }; } return null; });
    await page.click(`.sw[data-c="${pick.c}"]`); const q = await regionXY(page, pick.id); await tap(q.x, q.y);
    await page.evaluate(() => window.__MC.startPeek()); await page.click('#pHome');
    await page.waitForSelector('#home.on'); assert.equal(await page.evaluate(() => window.__MC.peeking), false, 'home ends the peek');
    await page.waitForSelector('#continue:not([hidden]) .cont'); await page.click('#continue .cont'); await page.waitForSelector('#play.on'); await page.waitForTimeout(300);
    assert.equal((await st(page)).filled, 1, 'progress restored by Continue');
    await page.screenshot({ path: `${SHOTS}/peek-${name}-3-continue.png` });
    await page.click('#pHome'); await page.waitForSelector('#home.on');
    assert.deepEqual(errors, []); assert.deepEqual(external, []);
  });
  await ctx.close();
}
await browser.close();
done('peek');
