// Validates every shipped puzzle and plays each one to completion in both modes.
import fs from 'node:fs';
import path from 'node:path';
import { loadPictures } from '../tools/lib/load-pictures.mjs';
import { test, done, assert } from './harness.mjs';
import { validatePuzzle } from '../tools/lib/validate.mjs';
import { mapOf } from '../src/codec.js';
import { createGame, MODE_MAGIC, MODE_CLASSIC, MODE_BRUSH } from '../src/game.js';
import { Brusher } from '../src/brush.js';
const dir = path.resolve('src/pictures');
const all = loadPictures(dir);
const pics = all.filter((p) => !p.grid), gridPics = all.filter((p) => p.grid);
console.log('pictures: ' + pics.length + ' shapes + ' + gridPics.length + ' grid');
await test('at least 24 pictures, unique ids, all categories + difficulties covered', () => {
  assert.ok(pics.length >= 24, 'only ' + pics.length);
  assert.equal(new Set(pics.map((p) => p.id)).size, pics.length);
  const cats = new Set(pics.map((p) => p.cat)); for (const c of ['animals', 'unicorns', 'dinosaurs', 'vehicles', 'space', 'fantasy', 'food']) assert.ok(cats.has(c), 'missing category ' + c);
  const d = { easy: 0, medium: 0, hard: 0 }; pics.forEach((p) => d[p.diff]++); assert.ok(d.easy >= 6 && d.medium >= 6 && d.hard >= 4, JSON.stringify(d));
  for (const p of all) assert.ok(p.thumb.startsWith('data:image/png;base64,') && p.thumb.length > (p.grid ? 150 : 500), p.id + ' thumb');
});
for (const p of all) {
  await test(`${p.id}${p.grid ? ' [grid ' + p.grid.w + 'x' + p.grid.h + ']' : ''} (${p.diff}, ${p.stats.regions} regions, ${p.palette.length} colours): valid + solvable`, () => {
    assert.deepEqual(validatePuzzle(p), []);
    const map = mapOf(p), area = new Int32Array(p.regions.length); for (const id of map) area[id]++;
    p.regions.forEach((r, i) => assert.equal(area[i], r[4], 'area of region ' + i));
    assert.equal(area.reduce((a, b) => a + b, 0), p.w * p.h);
    // every numbered region has a number within the palette and a label that sits inside it
    p.regions.forEach((r, i) => { if (r[0] > 0) { assert.ok(r[0] <= p.palette.length); assert.equal(map[r[2] * p.w + r[1]], i); } });
    // easy pictures: sensible limits for little children
    if (p.diff === 'easy' && !p.grid) assert.ok(p.stats.regions <= 25);
    for (const mode of [MODE_MAGIC, MODE_CLASSIC, MODE_BRUSH]) {
      const brusher = mode === MODE_BRUSH ? new Brusher(p, map) : null;
      const g = createGame(p, { mode }); let taps = 0, res;
      for (let c = 1; c <= p.palette.length; c++) {
        res = g.selectColour(c); assert.equal(res.type, 'select'); assert.equal(g.filledCount(), g.total - [...Array(p.palette.length).keys()].reduce((a, k) => a + g.remaining(k + 1), 0), 'selecting never fills');
        if (!g.byColour[c].length) continue;
        const before = g.filledCount();
        if (mode === MODE_BRUSH) { // one tiny dab (radius 1px) on each region's label: only that region of the selected number fills
          g.beginStroke(); for (const id of g.byColour[c]) { const hit = brusher.hit(p.regions[id][1], p.regions[id][2], 1, g.byColour[c], g.filled, new Set()); res = g.brushPaint([...hit]); taps++; assert.equal(res.type, 'brush'); assert.ok(res.ids.includes(id)); } g.endStroke();
        } else if (mode === MODE_CLASSIC) for (const id of g.byColour[c]) { res = g.tapRegion(id); taps++; assert.notEqual(res.type, 'wrong'); }
        else { res = g.tapRegion(g.byColour[c][0]); taps++; assert.equal(res.type, 'fill'); assert.equal(g.filledCount() - before, g.byColour[c].length, 'one tap fills every region of the colour'); }
      }
      assert.ok(g.complete && g.isComplete(), mode + ' did not complete'); assert.ok(res.complete);
      if (mode === MODE_MAGIC) assert.equal(taps, p.palette.filter((_, i) => g.byColour[i + 1].length).length);
      else assert.equal(taps, p.regions.filter((r) => r[0] > 0).length);
      if (mode === MODE_BRUSH) assert.equal(g.undoStack.length, p.palette.length, 'one undo step per stroke');
    }
  });
}

// ---- Grid type ----
await test('grid type: at least 28 pictures, sizes from ~16 to ~120, all easy/medium/hard/epic, several categories', () => {
  assert.ok(gridPics.length >= 28, 'only ' + gridPics.length);
  const sizes = gridPics.map((p) => p.grid.w); assert.ok(Math.min(...sizes) <= 16 && Math.max(...sizes) >= 120, sizes.join());
  const d = { easy: 0, medium: 0, hard: 0, epic: 0 }; gridPics.forEach((p) => d[p.diff]++); assert.ok(d.easy >= 3 && d.medium >= 3 && d.hard >= 3, JSON.stringify(d));
  // EPIC tier: big, long-to-finish scenes (the scheduled routine should keep adding these)
  const epics = gridPics.filter((p) => p.diff === 'epic'); assert.ok(epics.length >= 12, 'only ' + epics.length + ' epic grid pictures');
  assert.ok(epics.every((p) => p.grid.w >= 60 && p.grid.w <= 130), 'epic sizes'); assert.ok(epics.filter((p) => p.grid.w >= 120).length >= 2, 'need a few 120x120');
  assert.ok(epics.every((p) => p.stats.regions >= 2500), 'epic pictures need at least 2500 squares to colour');
  assert.ok(new Set(gridPics.map((p) => p.cat)).size >= 5);
  for (const name of ['unicorn', 'heart', 'rainbow', 'cat', 'dog', 'rocket', 'ice-cream', 'flower', 'dino', 'robot', 'butterfly', 'castle']) assert.ok(gridPics.some((p) => p.id.includes(name)), 'missing ' + name);
  assert.ok(!all.some((p) => p.cat === 'pixel'));
});
for (const p of gridPics) {
  await test(`${p.id}: every cell is its own square region, numbers readable, same-number neighbours are separate cells`, () => {
    const { w: gw, h: gh, cs } = p.grid; assert.equal(p.regions.length, gw * gh); assert.equal(p.w, gw * cs); assert.equal(p.h, gh * cs);
    assert.ok(cs >= 14 && cs / 2 >= 7, 'cell size ' + cs);
    const map = mapOf(p); p.regions.forEach((r, i) => { assert.equal(r[4], cs * cs); const x = i % gw, y = (i / gw) | 0; assert.equal(map[(y * cs + (cs >> 1)) * p.w + x * cs + (cs >> 1)], i); assert.equal(r[1], x * cs + (cs >> 1)); });
    let adjacentSame = 0; for (let y = 0; y < gh; y++) for (let x = 0; x < gw - 1; x++) { const a = p.regions[y * gw + x][0]; if (a && a === p.regions[y * gw + x + 1][0]) adjacentSame++; }
    assert.ok(adjacentSame > 5, 'expected neighbouring cells with the same number');
    // a wide brush stroke sweeping over the whole grid fills exactly the cells of the selected number
    const g = createGame(p, { mode: MODE_BRUSH }), br = new Brusher(p, map), c = 1; g.selectColour(c); g.beginStroke();
    const cov = new Set(); for (let y = cs / 2; y < p.h; y += cs) br.segment(0, y, p.w, y, cs * 0.7, g.byColour[c], g.filled, cov, true);
    const res = g.brushPaint([...cov]); g.endStroke(); assert.equal(res.ids.length, g.byColour[c].length); assert.equal(g.remaining(c), 0);
    g.selectColour(2); const none = new Set(); br.segment(0, p.h / 2, p.w, p.h / 2, 1, g.byColour[2], g.filled, none, true); const r2 = g.brushPaint([...none]);
    for (const id of r2.ids) assert.equal(p.regions[id][0], 2);
  });
}
done('picture tests');
