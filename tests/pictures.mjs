// Validates every shipped puzzle and plays each one to completion in both modes.
import fs from 'node:fs';
import path from 'node:path';
import { test, done, assert } from './harness.mjs';
import { validatePuzzle } from '../tools/lib/validate.mjs';
import { decodeMap } from '../src/codec.js';
import { createGame, MODE_MAGIC, MODE_CLASSIC } from '../src/game.js';
const dir = path.resolve('src/pictures');
const pics = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
console.log('pictures: ' + pics.length);
await test('at least 24 pictures, unique ids, all categories + difficulties covered', () => {
  assert.ok(pics.length >= 24, 'only ' + pics.length);
  assert.equal(new Set(pics.map((p) => p.id)).size, pics.length);
  const cats = new Set(pics.map((p) => p.cat)); for (const c of ['animals', 'unicorns', 'dinosaurs', 'vehicles', 'space', 'fantasy', 'food']) assert.ok(cats.has(c), 'missing category ' + c);
  const d = { easy: 0, medium: 0, hard: 0 }; pics.forEach((p) => d[p.diff]++); assert.ok(d.easy >= 6 && d.medium >= 6 && d.hard >= 4, JSON.stringify(d));
  for (const p of pics) assert.ok(p.thumb.startsWith('data:image/png;base64,') && p.thumb.length > 500, p.id + ' thumb');
});
for (const p of pics) {
  await test(`${p.id} (${p.diff}, ${p.stats.regions} regions, ${p.palette.length} colours): valid + solvable`, () => {
    assert.deepEqual(validatePuzzle(p), []);
    const map = decodeMap(p.map, p.w, p.h), area = new Int32Array(p.regions.length); for (const id of map) area[id]++;
    p.regions.forEach((r, i) => assert.equal(area[i], r[4], 'area of region ' + i));
    assert.equal(area.reduce((a, b) => a + b, 0), p.w * p.h);
    // every numbered region has a number within the palette and a label that sits inside it
    p.regions.forEach((r, i) => { if (r[0] > 0) { assert.ok(r[0] <= p.palette.length); assert.equal(map[r[2] * p.w + r[1]], i); } });
    // easy pictures: sensible limits for little children
    if (p.diff === 'easy') assert.ok(p.stats.regions <= 25);
    for (const mode of [MODE_MAGIC, MODE_CLASSIC]) {
      const g = createGame(p, { mode }); let taps = 0, res;
      for (let c = 1; c <= p.palette.length; c++) {
        res = g.selectColour(c); assert.equal(res.type, 'select'); assert.equal(g.filledCount(), g.total - [...Array(p.palette.length).keys()].reduce((a, k) => a + g.remaining(k + 1), 0), 'selecting never fills');
        if (!g.byColour[c].length) continue;
        const before = g.filledCount();
        if (mode === MODE_CLASSIC) for (const id of g.byColour[c]) { res = g.tapRegion(id); taps++; assert.notEqual(res.type, 'wrong'); }
        else { res = g.tapRegion(g.byColour[c][0]); taps++; assert.equal(res.type, 'fill'); assert.equal(g.filledCount() - before, g.byColour[c].length, 'one tap fills every region of the colour'); }
      }
      assert.ok(g.complete && g.isComplete(), mode + ' did not complete'); assert.ok(res.complete);
      if (mode === MODE_MAGIC) assert.equal(taps, p.palette.filter((_, i) => g.byColour[i + 1].length).length);
      else assert.equal(taps, p.regions.filter((r) => r[0] > 0).length);
    }
  });
}
done('picture tests');
