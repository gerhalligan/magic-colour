// Duplicate guard: fails when two pictures of the same type (Shapes / Grid) look too much alike, i.e. the same art re-used at another
// size, in other colours or mirrored. A harder level of the same subject must be a genuinely different, more detailed design.
// See tools/lib/similarity.mjs for the metrics; run `node tools/audit-duplicates.mjs` to list the closest pairs.
import fs from 'node:fs';
import path from 'node:path';
import { loadPictures } from '../tools/lib/load-pictures.mjs';
import { test, done, assert } from './harness.mjs';
import { pairs, LOOK_MAX, SHAPE_MAX, OUTLINE_MAX } from '../tools/lib/similarity.mjs';
const dir = path.resolve('src/pictures');
const all = loadPictures(dir);
const grid = all.filter((p) => p.grid), shapes = all.filter((p) => !p.grid);
console.log(`duplicate check: ${shapes.length} shapes + ${grid.length} grid pictures`);
for (const [label, set] of [['grid', grid], ['shapes', shapes]]) {
  await test(`no two ${label} pictures are near-duplicates (look < ${LOOK_MAX}, layout < ${SHAPE_MAX[label]}, outline < ${OUTLINE_MAX[label]})`, () => {
    const bad = pairs(set).filter((r) => r.score >= 1);
    assert.deepEqual(bad.map((r) => `${r.a} ("${r.an}") ~ ${r.b} ("${r.bn}"): look ${r.look.toFixed(2)} layout ${r.shape.toFixed(2)} outline ${r.outline.toFixed(2)}`), [], 'near-duplicate pictures - draw a genuinely different picture instead of re-using the same art at another size/colours');
  });
}
await test('no two pictures share a name, and no picture name carries a size suffix like "30\u00D730"', () => {
  const names = all.map((p) => p.name.toLowerCase()); assert.equal(new Set(names).size, names.length, 'duplicate picture names');
  for (const p of all) assert.ok(!/\d+\s*[x\u00D7]\s*\d+/i.test(p.name), p.id + ': "' + p.name + '" - sizes are shown by the app, keep them out of the title');
});
await test('the duplicate detector itself works: a picture is flagged against a recoloured, mirrored or re-scaled copy of itself', () => {
  const p = grid.find((x) => x.id === 'grid-dino') || grid[0];
  const flip = JSON.parse(JSON.stringify(p)); flip.id = 'flip'; const { w, h } = p.grid; flip.regions = flip.regions.map((_, i) => p.regions[(((i / w) | 0) * w) + (w - 1 - (i % w))].slice()); flip.regions.forEach((r, i) => { r[1] = (i % w) * p.grid.cs + (p.grid.cs >> 1); r[2] = (((i / w) | 0)) * p.grid.cs + (p.grid.cs >> 1); });
  const recol = JSON.parse(JSON.stringify(p)); recol.id = 'recol'; recol.palette = recol.palette.map((c) => '#' + [...c.slice(1).match(/../g)].reverse().join(''));
  const r = pairs([p, flip, recol]); assert.equal(r.length, 3); assert.ok(r.every((x) => x.score >= 1), JSON.stringify(r.map((x) => [x.a, x.b, x.score.toFixed(2)])));
  const other = grid.find((x) => x.id === 'grid-heart'); assert.ok(pairs([p, other])[0].score < 1);
});
done('duplicate tests');
