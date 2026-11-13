// "Watch it colour" replay (1.14.0) + regression checks of the neighbouring features it sits next to:
// win card, gallery viewer, Colour it again, Continue/progress (replay is read-only), defaults, palette rule, stale toast, offline.
// Headless Chromium at phone sizes. Screenshots -> /workspace/magic-colour-screens/replay-*.png
import { launch, FILE, SHOTS } from './launch.mjs';
import { test, done, assert } from './harness.mjs';

const browser = await launch();
const VIEWPORTS = [['390x844', { width: 390, height: 844 }, true, 2], ['360x640', { width: 360, height: 640 }, true, 2], ['desktop', { width: 1280, height: 800 }, false, 1]];
const st = (page) => page.evaluate(() => { const m = window.__MC; m.flush(); const g = m.cur.game; return { filled: g.filledCount(), total: g.total, sel: g.selected, mode: g.mode, complete: g.complete }; });
const regionXY = (page, id) => page.evaluate((id) => { const m = window.__MC, v = m.view, r = m.cur.pic.regions[id], c = v.cv.getBoundingClientRect(); return { x: c.left + v.tx + r[1] * v.s, y: c.top + v.ty + r[2] * v.s }; }, id);
// pixel fingerprint of the modal preview canvas (sampled)
const prevPx = (page) => page.evaluate(() => { const c = document.querySelector('#modalCard .pv canvas'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 0, col = 0; for (let i = 0; i < d.length; i += 4 * 31) { h = (h * 31 + d[i] + d[i + 1] * 3 + d[i + 2] * 7) >>> 0; if (Math.abs(d[i] - d[i + 1]) > 30 || Math.abs(d[i + 1] - d[i + 2]) > 30) col++; } return { h, col, w: c.width }; });

for (const [name, vp, touch, dsf] of VIEWPORTS) {
  console.log(`\n== replay ${name}`);
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: dsf, hasTouch: touch, isMobile: touch });
  const page = await ctx.newPage(); const errors = [], external = [];
  page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', (r) => { if (!/^(file|data|blob):/.test(r.url())) external.push(r.url()); });
  await page.goto(FILE); await page.waitForSelector('.pic');
  const tap = async (x, y) => { if (touch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); await page.waitForTimeout(60); };

  await test(`${name}: replay order covers every coloured spot once, by colour; last frame = the finished picture (Shapes + Epic Grid)`, async () => {
    for (const id of ['happy-fish', 'unicorn-window', 'grid-candy-land']) {
      const r = await page.evaluate(async (id) => {
        const m = window.__MC, P = m.pictures.find((p) => p.id === id); if (!P) return { missing: id };
        // use the in-app viewer to build the replay, then seek to the end and compare with the static preview
        m.store.markDone(id); m.openViewer(P);
        const wrap = document.querySelector('#modalCard .pv'), still = wrap.querySelector('canvas');
        const sd = still.getContext('2d').getImageData(0, 0, still.width, still.height).data.slice();
        document.querySelector('#modalCard [data-a="watch"]').click();
        const rp = m.replay; const order = rp.order, R = P.regions;
        const seen = new Set(order); let sorted = true; for (let i = 1; i < order.length; i++) if (R[order[i]][0] < R[order[i - 1]][0]) sorted = false;
        const coloured = R.filter((x) => x[0] > 0).length;
        rp.seek(0.5); const cv = wrap.querySelector('canvas'); const mid = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        let midDiff = 0; for (let i = 0; i < sd.length; i += 4) if (Math.abs(sd[i] - mid[i]) + Math.abs(sd[i + 1] - mid[i + 1]) + Math.abs(sd[i + 2] - mid[i + 2]) > 30) midDiff++;
        rp.seek(1); const end = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        let diff = 0; for (let i = 0; i < sd.length; i += 4) if (Math.abs(sd[i] - end[i]) + Math.abs(sd[i + 1] - end[i + 1]) + Math.abs(sd[i + 2] - end[i + 2]) > 60) diff++;
        const out = { n: order.length, unique: seen.size, coloured, sorted, sameSize: cv.width === still.width && cv.height === still.height, endDiff: diff / (sd.length / 4), midDiff: midDiff / (sd.length / 4), dur: rp.duration };
        m.store.unmarkDone(id); document.querySelector('#modalCard [data-a="close"]').click(); return out;
      }, id);
      assert.ok(!r.missing, 'picture exists ' + id);
      assert.equal(r.n, r.coloured, id + ': every coloured spot'); assert.equal(r.unique, r.n, id + ': each once'); assert.ok(r.sorted, id + ': colour by colour');
      assert.ok(r.sameSize, id + ': same size as the preview'); assert.ok(r.endDiff < 0.01, id + ': last frame matches the finished picture (' + r.endDiff + ')');
      assert.ok(r.midDiff > 0.02, id + ': halfway frame is only partly coloured (' + r.midDiff + ')'); assert.ok(r.dur >= 3000 && r.dur <= 7000, 'duration ' + r.dur);
    }
    assert.equal(await page.evaluate(() => document.getElementById('modal').classList.contains('on')), false);
  });

  await test(`${name}: defaults hold (One by one, smallest brush); palette alone never fills; a new picture does not show the old picture's toast`, async () => {
    await page.evaluate(() => { const m = window.__MC; m.store.clearProgress('happy-fish'); m.startPicture(m.pictures.find((p) => p.id === 'happy-fish')); }); await page.waitForSelector('#play.on'); await page.waitForTimeout(300);
    let s = await st(page); assert.equal(s.mode, 'classic'); assert.equal(await page.evaluate(() => window.__MC.settings.brushSize), 0);
    await page.click('.sw[data-c="2"]'); s = await st(page); assert.equal(s.filled, 0, 'palette alone never fills'); assert.equal(s.sel, 2);
    assert.ok(await page.evaluate(() => document.getElementById('toast').classList.contains('on')), 'select toast showing');
    await page.evaluate(() => { const m = window.__MC; m.startPicture(m.pictures.find((p) => p.id === 'kitty-cat')); }); await page.waitForTimeout(100);
    const t = await page.evaluate(() => ({ on: document.getElementById('toast').classList.contains('on'), txt: document.getElementById('toast').textContent }));
    assert.ok(!(t.on && /numbered 2/.test(t.txt)), 'stale "numbered 2" toast cleared on the new picture: ' + JSON.stringify(t));
    await page.click('#pHome'); await page.waitForSelector('#home.on');
  });

  await test(`${name}: finish a picture -> win card has Watch; replay plays, is read-only, ends on the finished picture; Save/Gallery still work`, async () => {
    await page.evaluate(() => { const m = window.__MC; m.store.clearProgress('happy-fish'); m.store.unmarkDone('happy-fish'); m.startPicture(m.pictures.find((p) => p.id === 'happy-fish')); }); await page.waitForSelector('#play.on'); await page.waitForTimeout(350);
    // colour everything except one spot through the game, then finish with a real tap (One by one)
    const last = await page.evaluate(() => { const m = window.__MC, g = m.cur.game, R = m.cur.pic.regions; let keep = -1;
      for (let c = 1; c <= m.cur.pic.palette.length; c++) for (const id of g.byColour[c]) { if (keep < 0) { keep = id; continue; } g.selectColour(c); g.tapRegion(id); }
      m.view.paintAll(); m.store.saveProgress(m.cur.pic.id, g.save()); g.selectColour(R[keep][0]); return keep; });
    const p = await regionXY(page, last); await tap(p.x, p.y);
    await page.waitForSelector('#modal.on', { timeout: 6000 }); await page.waitForTimeout(300);
    assert.ok((await st(page)).complete);
    const before = await page.evaluate(() => ({ prog: localStorage.getItem('mc1.p.happy-fish'), done: localStorage.getItem('mc1.done') }));
    const btn = await page.$('#modalCard .pv [data-a="watch"]'); assert.ok(btn, 'Watch button on the win card');
    const bb = await btn.boundingBox(), cb = await (await page.$('#modalCard .pv canvas')).boundingBox();
    assert.ok(bb.width >= 44 && bb.height >= 44, 'touch target'); assert.ok(bb.x >= cb.x && bb.y >= cb.y && bb.x + bb.width <= cb.x + cb.width + 1 && bb.y + bb.height <= cb.y + cb.height + 1, 'button sits on the picture');
    const save = await (await page.$('#modalCard [data-a="save"]')).boundingBox(); assert.ok(save.y + save.height <= vp.height + 1, 'Save button still on screen');
    const finalPx = await prevPx(page);
    await page.click('#modalCard [data-a="watch"]'); await page.waitForTimeout(500);
    assert.ok(await page.evaluate(() => !!window.__MC.replay && window.__MC.replay.playing), 'replay playing');
    assert.ok(await page.$eval('#modalCard .pv', (e) => e.classList.contains('playing')), 'Watch hidden while playing');
    const early = await prevPx(page); assert.notEqual(early.h, finalPx.h, 'early frame differs from the finished picture');
    await page.screenshot({ path: `${SHOTS}/replay-${name}-1-playing.png` });
    const dur = await page.evaluate(() => window.__MC.replay.duration); await page.waitForTimeout(dur + 400);
    assert.equal(await page.evaluate(() => window.__MC.replay), null, 'replay ended');
    assert.ok(!(await page.$eval('#modalCard .pv', (e) => e.classList.contains('playing'))), 'Watch back after the end');
    const endPx = await prevPx(page); assert.ok(Math.abs(endPx.col - finalPx.col) <= Math.max(3, finalPx.col * 0.02), 'ends on the finished picture');
    const after = await page.evaluate(() => ({ prog: localStorage.getItem('mc1.p.happy-fish'), done: localStorage.getItem('mc1.done') }));
    assert.deepEqual(after, before, 'replay never changes progress or the gallery');
    await page.screenshot({ path: `${SHOTS}/replay-${name}-2-ended.png` });
    await page.click('#modalCard [data-a="gallery"]'); await page.waitForSelector('#gallery.on'); assert.ok(await page.$('#gGrid .pic[data-id="happy-fish"]'), 'gallery lists it');
  });

  await test(`${name}: gallery viewer: Watch plays; closing mid-replay stops it; Colour it again still starts fresh`, async () => {
    await page.click('#gGrid .pic[data-id="happy-fish"]'); await page.waitForSelector('#modal.on');
    assert.ok(await page.$('#modalCard .pv [data-a="watch"]'), 'Watch in the gallery viewer');
    await page.click('#modalCard [data-a="watch"]'); await page.waitForTimeout(300); assert.ok(await page.evaluate(() => window.__MC.replay && window.__MC.replay.playing));
    await page.screenshot({ path: `${SHOTS}/replay-${name}-3-gallery.png` });
    await page.click('#modalCard [data-a="close"]'); await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => window.__MC.replay), null, 'stopped on close'); assert.ok(!(await page.evaluate(() => document.getElementById('modal').classList.contains('on'))));
    await page.click('#gGrid .pic[data-id="happy-fish"]'); await page.waitForSelector('#modal.on'); await page.click('#modalCard [data-a="watch"]'); await page.waitForTimeout(200);
    await page.click('#modalCard [data-a="again"]'); await page.waitForSelector('#play.on'); await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => window.__MC.replay), null, 'stopped when colouring again');
    const s = await st(page); assert.equal(s.filled, 0, 'Colour it again starts fresh'); assert.equal(s.mode, 'classic');
    await page.click('#pHome'); await page.waitForSelector('#home.on');
  });

  await test(`${name}: Continue still works after a replay; no errors; no network requests`, async () => {
    await page.evaluate(() => { const m = window.__MC; m.store.clearProgress('kitty-cat'); m.startPicture(m.pictures.find((p) => p.id === 'kitty-cat')); }); await page.waitForSelector('#play.on'); await page.waitForTimeout(300);
    // a spot whose number label is not under the zoom buttons
    const pick = await page.evaluate(() => { const m = window.__MC, g = m.cur.game, R = g.puzzle.regions, v = m.view, c = v.cv.getBoundingClientRect();
      const ids = R.map((r, i) => i).filter((i) => R[i][0] > 0).sort((a, b) => R[b][3] - R[a][3]);
      for (const i of ids) { const x = c.left + v.tx + R[i][1] * v.s, y = c.top + v.ty + R[i][2] * v.s; if (document.elementFromPoint(x, y) === v.cv) return { id: i, c: R[i][0] }; } return null; });
    assert.ok(pick, 'found a tappable spot'); await page.click(`.sw[data-c="${pick.c}"]`); const id = pick.id;
    const p = await regionXY(page, id); await tap(p.x, p.y); assert.equal((await st(page)).filled, 1);
    await page.click('#pHome'); await page.waitForSelector('#continue:not([hidden]) .cont'); await page.click('#continue .cont'); await page.waitForSelector('#play.on'); await page.waitForTimeout(300);
    const s = await st(page); assert.equal(s.filled, 1, 'progress restored'); await page.click('#pHome'); await page.waitForSelector('#home.on');
    assert.deepEqual(errors, []); assert.deepEqual(external, []);
  });
  await ctx.close();
}
await browser.close();
done('replay');
