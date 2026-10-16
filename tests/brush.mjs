// Paint brush: size/radius, stroke interpolation, hit-testing against the label map, "only the matching number" rule, one-undo-per-stroke.
import { test, done, assert } from './harness.mjs';
import { BRUSH_SIZES, brushRadiusPx, brushRadiusMap, clampBrushSize, strokePoints, stampSpacing, computeBBoxes, Brusher, snapTap, TAP_SNAP_PX, TAP_SNAP_WRONG_PX } from '../src/brush.js';
import { MODE_MAGIC } from '../src/game.js';
import { createGame, MODE_BRUSH, MODE_CLASSIC, MODES } from '../src/game.js';
import { gridMap } from '../src/codec.js';
import { store } from '../src/store.js';
import { DEFAULT_BRUSH } from '../src/brush.js';

// synthetic 120x120 picture: 6x6 blocks of 20px (ids 0..35, colour = 1 + id%3), plus a thin 6px wide vertical strip (id 36, colour 4) drawn over x 100..105
const W = 120, H = 120, N = 37;
const map = new Uint16Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) map[y * W + x] = ((y / 20) | 0) * 6 + ((x / 20) | 0);
for (let y = 10; y < 110; y++) for (let x = 100; x < 106; x++) map[y * W + x] = 36;
const bb = computeBBoxes(map, W, H, N);
const regions = []; for (let i = 0; i < N; i++) { const o = i * 4; const lx = (bb[o] + bb[o + 2]) >> 1, ly = (bb[o + 1] + bb[o + 3]) >> 1; regions.push([i === 36 ? 4 : 1 + (i % 3), map[ly * W + lx] === i ? lx : bb[o], map[ly * W + lx] === i ? ly : bb[o + 1], 5, 0]); }
// the strip's label must be inside it
regions[36][1] = 102; regions[36][2] = 60;
const puzzle = { id: 'syn', w: W, h: H, palette: ['#f00', '#0f0', '#00f', '#ff0'], regions };
const brusher = () => new Brusher(puzzle, map, bb);
const oracle = (pts, r, cand, filled) => { const s = new Set(); for (const [cx, cy] of pts) for (const id of cand) { if (filled[id]) continue; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (map[y * W + x] === id && (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) { s.add(id); break; } } return s; };

console.log('brush');
await test('brush sizes: 4 big steps, growing, clamped; radius scales gently with zoom and is capped by the view', () => {
  assert.equal(BRUSH_SIZES.length, 4); for (let i = 1; i < 4; i++) assert.ok(BRUSH_SIZES[i].px > BRUSH_SIZES[i - 1].px);
  assert.equal(clampBrushSize(-3), 0); assert.equal(clampBrushSize(99), 3); assert.equal(clampBrushSize('2'), 2); assert.equal(clampBrushSize(NaN), 0);
  const r0 = brushRadiusPx(1, 1, 400), r4 = brushRadiusPx(1, 4, 400), r9 = brushRadiusPx(1, 9, 400);
  assert.equal(r0, BRUSH_SIZES[1].px); assert.ok(r4 > r0 && r4 <= r0 * 1.8 + 1e-9 && r9 >= r4 && r9 <= r0 * 1.8 + 1e-9, `${r0} ${r4} ${r9}`);
  assert.ok(brushRadiusPx(3, 9, 300) <= 300 * 0.42 + 1e-9, 'huge brush never swallows the view');
  assert.equal(brushRadiusPx(0, 0.2, 400), BRUSH_SIZES[0].px, 'zoom below fit does not shrink it');
  // in picture pixels: a larger zoom means fewer picture pixels under the same screen radius
  assert.ok(brushRadiusMap(2, 3, 1, 400) < brushRadiusMap(2, 1, 1, 400));
});
await test('stroke interpolation: spacing never exceeded, end included, start excluded, zero-length = nothing', () => {
  const pts = strokePoints(0, 0, 100, 0, 8); assert.equal(pts.length, 13); assert.deepEqual(pts[pts.length - 1], [100, 0]);
  let prev = [0, 0]; for (const p of pts) { assert.ok(Math.hypot(p[0] - prev[0], p[1] - prev[1]) <= 8 + 1e-9); prev = p; }
  assert.deepEqual(strokePoints(5, 5, 5, 5, 3), []); assert.equal(strokePoints(0, 0, 1, 1, 50).length, 1);
  assert.ok(stampSpacing(40) <= 20 && stampSpacing(0.1) >= 1.5);
});
await test('hit-test equals a brute-force pixel oracle for random discs (all numbers allowed)', () => {
  const b = brusher(); const all = [...Array(N).keys()]; let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let t = 0; t < 40; t++) {
    const cx = rnd() * 130 - 5, cy = rnd() * 130 - 5, r = 1 + rnd() * 35;
    assert.deepEqual([...b.hit(cx, cy, r, all, new Uint8Array(N), new Set())].sort((a, c) => a - c), [...oracle([[cx, cy]], r, all, new Uint8Array(N))].sort((a, c) => a - c), `disc ${cx.toFixed(1)},${cy.toFixed(1)} r${r.toFixed(1)}`);
  }
});
await test('fast stroke (two far-apart events) does not skip regions, even a thin 6px strip; stamping only the end points would', () => {
  const b = brusher(), all = [...Array(N).keys()], r = 4;
  const got = b.segment(10, 60, 118, 60, r, all, new Uint8Array(N), new Set(), true);
  assert.ok(got.has(36), 'thin strip hit'); for (let col = 0; col < 6; col++) assert.ok(got.has(3 * 6 + col), 'block in the row crossed: ' + col);
  const endsOnly = new Set(); b.hit(10, 60, r, all, new Uint8Array(N), endsOnly); b.hit(118, 60, r, all, new Uint8Array(N), endsOnly); assert.ok(!endsOnly.has(36));
  const o = oracle([[10, 60], ...strokePoints(10, 60, 118, 60, 0.25)], r, all, new Uint8Array(N)); assert.deepEqual([...got].sort((a, c) => a - c), [...o].sort((a, c) => a - c));
});
await test('hit-test only ever returns candidates (the selected number) that are not filled', () => {
  const b = brusher(), sel = [...Array(N).keys()].filter((i) => regions[i][0] === 2), filled = new Uint8Array(N); filled[sel[0]] = 1;
  const got = b.hit(60, 60, 200, sel, filled, new Set()); assert.ok(got.size === sel.length - 1 && !got.has(sel[0])); for (const id of got) assert.equal(regions[id][0], 2);
});
await test('bigger brush covers more areas per stroke; a 1px dab covers only the area under it', () => {
  const b = brusher(), all = [...Array(N).keys()]; const n = (r) => b.segment(10, 50, 90, 50, r, all, new Uint8Array(N), new Set(), true).size;
  assert.ok(n(1) <= 5 && n(8) <= n(20) && n(20) < n(40) && n(1) < n(40), `${n(1)} ${n(8)} ${n(20)} ${n(40)}`);
  assert.equal(b.hit(25, 25, 1, all, new Uint8Array(N), new Set()).size, 1);
});
await test('GAME: brush fills ONLY the selected number; other numbers, paper and filled areas are untouched', () => {
  const g = createGame(puzzle, { mode: MODE_BRUSH }); assert.equal(g.brushPaint([1, 2, 3]).type, 'nocolour'); assert.equal(g.filledCount(), 0);
  g.selectColour(2); const cov = [...Array(N).keys()]; const r = g.brushPaint(cov);
  assert.equal(r.type, 'brush'); assert.ok(r.ids.length > 0); for (const id of r.ids) assert.equal(regions[id][0], 2); assert.equal(g.filledCount(), r.ids.length);
  assert.equal(g.remaining(2), 0); assert.equal(g.remaining(1), g.byColour[1].length); assert.equal(g.remaining(3), g.byColour[3].length); assert.ok(r.wrong.length > 0);
  assert.equal(g.brushPaint(cov).type, 'colourdone');
  g.selectColour(1); assert.equal(g.brushPaint([r.ids[0]]).ids.length, 0, 'already-filled / other number not repainted'); assert.equal(g.filledCount(), r.ids.length);
});
await test('GAME: selecting a colour alone never fills (brush mode too); modes list has three entries', () => {
  const g = createGame(puzzle, { mode: MODE_BRUSH }); for (let c = 1; c <= 4; c++) { g.selectColour(c); assert.equal(g.filledCount(), 0); } assert.deepEqual(MODES, ['magic', 'classic', 'brush']);
});
await test('GAME: a whole stroke is ONE undo step (even across many frames); undo restores exactly', () => {
  const g = createGame(puzzle, { mode: MODE_BRUSH }); g.selectColour(1); g.beginStroke();
  g.brushPaint([0, 3]); assert.ok(g.canUndo()); g.brushPaint([6, 9]); g.brushPaint([12]); g.endStroke(); assert.equal(g.undoStack.length, 1);
  g.selectColour(2); g.beginStroke(); g.brushPaint([1]); g.endStroke(); assert.equal(g.undoStack.length, 2);
  let u = g.undo(); assert.deepEqual(u.ids, [1]); assert.equal(g.filledCount(), 5);
  u = g.undo(); assert.equal(u.ids.length, 5); assert.equal(g.filledCount(), 0); assert.equal(g.selected, 1); assert.equal(g.undo(), null);
  g.selectColour(1); g.beginStroke(); g.brushPaint([0]); assert.equal(g.undo().ids.length, 1, 'an unfinished stroke can be undone too');
});
await test('GAME: brush stroke reports colour done + completion, then actions stop; save/restore round trip', () => {
  const g = createGame(puzzle, { mode: MODE_BRUSH }); let last;
  for (const c of [1, 2, 3, 4]) { g.selectColour(c); g.beginStroke(); last = g.brushPaint([...Array(N).keys()]); g.endStroke(); assert.ok(last.colourDone); }
  assert.ok(last.complete && g.complete); assert.equal(g.brushPaint([0]).type, 'noop'); assert.equal(g.progress(), 1);
  const g2 = createGame(puzzle); g2.restore(JSON.parse(JSON.stringify(g.save()))); assert.ok(g2.complete);
  const g3 = createGame(puzzle, { mode: MODE_BRUSH }); g3.selectColour(1); g3.beginStroke(); g3.brushPaint([0, 3]); g3.endStroke(); const g4 = createGame(puzzle); g4.restore(JSON.parse(JSON.stringify(g3.save()))); assert.equal(g4.filledCount(), 2);
});
await test('GAME: tapping in brush mode behaves like One by one; palette change ends the open stroke', () => {
  const g = createGame(puzzle, { mode: MODE_BRUSH }); g.selectColour(1); assert.equal(g.tapRegion(0).ids.length, 1);
  g.beginStroke(); g.brushPaint([3]); g.selectColour(2); assert.equal(g.undoStack.length, 2);
  const c = createGame(puzzle, { mode: MODE_CLASSIC }); c.selectColour(1); c.tapRegion(0); assert.equal(c.filledCount(), 1);
});
await test('GRID: the cell map is computed (no data), cells are squares, and the brush hits exactly the cells it touches', () => {
  const grid = { w: 5, h: 4, cs: 20 }, m = gridMap(grid); assert.equal(m.length, 100 * 80); assert.equal(m[0], 0); assert.equal(m[(79) * 100 + 99], 19); assert.equal(m[(20) * 100 + 40], 5 + 2);
  const regs = Array.from({ length: 20 }, (_, i) => [1 + (i % 2), (i % 5) * 20 + 10, ((i / 5) | 0) * 20 + 10, 10, 400]); const P = { w: 100, h: 80, regions: regs, grid };
  const b = new Brusher(P, m), cand = regs.map((_, i) => i).filter((i) => regs[i][0] === 1);
  const got = b.hit(50, 30, 12, cand, new Uint8Array(20), new Set()), want = new Set();
  for (const i of cand) { let hit = false; for (let y = 0; y < 80 && !hit; y++) for (let x = 0; x < 100; x++) if (m[y * 100 + x] === i && (x + 0.5 - 50) ** 2 + (y + 0.5 - 30) ** 2 <= 144) { hit = true; break; } if (hit) want.add(i); }
  assert.deepEqual([...got].sort((a, c) => a - c), [...want].sort((a, c) => a - c), 'cells under the brush'); assert.ok(got.size >= 2);
});
await test('default brush is the SMALLEST size; a later choice is remembered; the old auto-saved default is reset; big progress packs into ranges', () => {
  assert.equal(DEFAULT_BRUSH, 0); assert.equal(BRUSH_SIZES[DEFAULT_BRUSH].id, 'small');
  assert.equal(store.settings().brushSize, 0, 'fresh profile');
  store.saveSettings({ mode: 'brush', modeChosen: true, brushSize: 1 }); assert.equal(store.settings().brushSize, 0, 'v1.5.0 auto-saved medium (never chosen) -> small');
  store.saveSettings({ mode: 'brush', modeChosen: true, brushSize: 3, brushChosen: true }); assert.equal(store.settings().brushSize, 3, 'a real choice is kept');
  store.saveSettings({ mode: 'brush', modeChosen: true, brushSize: 0, brushChosen: true }); assert.equal(store.settings().brushSize, 0);
  const ids = []; for (let i = 0; i < 9000; i++) if (i % 50 !== 7) ids.push(i); store.saveProgress('t-big', { f: ids, s: 3 });
  const back = store.progress('t-big'); assert.deepEqual(back.f, ids); assert.equal(back.s, 3); assert.ok(Math.abs(store.pct('t-big', 9000) - ids.length / 9000) < 1e-9);
  store.saveProgress('t-small', { f: [1, 5, 9], s: 2 }); assert.deepEqual(store.progress('t-small'), { f: [1, 5, 9], s: 2 }); store.clearProgress('t-big'); store.clearProgress('t-small');
});

// ---- forgiving taps (v1.11.0): a tap just beside a spot of the selected number still colours it ----
const nearestOracle = (cx, cy, r, cand, filled) => { let best = -1, bd = Infinity; for (const id of cand) { if (filled[id]) continue; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (map[y * W + x] === id) { const d = (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2; if (d <= r * r && d < bd) { bd = d; best = id; } } } return best; };
await test('TAPS: nearest() finds the closest unfilled candidate within r and matches a brute-force oracle', () => {
  const b = brusher(); let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let t = 0; t < 60; t++) {
    const c = 1 + (t % 4), cand = [...Array(N).keys()].filter((i) => regions[i][0] === c), filled = new Uint8Array(N); if (t % 3 === 0) filled[cand[0]] = 1;
    const cx = rnd() * 130 - 5, cy = rnd() * 130 - 5, r = 1 + rnd() * 12;
    const got = b.nearest(cx, cy, r, cand, filled), want = nearestOracle(cx, cy, r, cand, filled);
    if (got !== want) { // equal distance ties may pick either; both must be at the same distance
      const d = (id) => { let m = Infinity; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (map[y * W + x] === id) m = Math.min(m, (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2); return m; };
      assert.ok(got >= 0 && want >= 0 && Math.abs(d(got) - d(want)) < 1e-9, `t${t}: got ${got} want ${want}`);
    }
    if (got >= 0) { assert.equal(regions[got][0], c, 'only the selected number'); assert.ok(!filled[got], 'never a filled spot'); }
  }
  assert.equal(b.nearest(60, 60, 50, [], new Uint8Array(N)), -1, 'no candidates');
});
await test('TAPS: snapTap - right spot unchanged; paper/coloured spot snaps within 14 css px; a different number only within 6; nothing selected or colour done = no snap', () => {
  assert.ok(TAP_SNAP_PX === 14 && TAP_SNAP_WRONG_PX === 6 && TAP_SNAP_WRONG_PX < TAP_SNAP_PX);
  const b = brusher(), g = createGame(puzzle, { mode: MODE_CLASSIC }), scale = 1;
  // block id 0 (x 0..19, y 0..19, colour 1), block 1 (x 20..39, colour 2), block 6 (y 20..39, colour 1)
  assert.equal(snapTap({ id: 1, mx: 22, my: 5, game: g, brusher: b, scale }), 1, 'nothing selected: tap is used as it is (picks the colour)');
  g.selectColour(1);
  assert.equal(snapTap({ id: 0, mx: 5, my: 5, game: g, brusher: b, scale }), 0, 'right on a matching spot');
  // a tap on a different number (colour 2) 4px from the colour-1 block: snaps (<= 6px) ...
  assert.equal(snapTap({ id: 1, mx: 24, my: 5, game: g, brusher: b, scale }), 0);
  // ... but 10px inside the other number it stays a gentle "wrong" tap
  assert.equal(snapTap({ id: 1, mx: 30, my: 5, game: g, brusher: b, scale }), 1);
  // the same 10px from an ALREADY coloured spot snaps (<= 14px)
  g.tapRegion(0); const g2 = createGame(puzzle, { mode: MODE_CLASSIC }); g2.selectColour(2); g2.tapRegion(1); g2.selectColour(1);
  assert.equal(snapTap({ id: 1, mx: 30, my: 5, game: g2, brusher: b, scale }), 0, 'coloured spot -> nearest matching spot');
  assert.equal(snapTap({ id: -1, mx: -6, my: 5, game: g2, brusher: b, scale }), 0, 'just outside the picture');
  assert.equal(snapTap({ id: -1, mx: -30, my: 5, game: g2, brusher: b, scale }), -1, 'far outside: nothing');
  // radius is in screen px: zoomed in 4x, 10 picture px = 40 screen px is too far
  assert.equal(snapTap({ id: 1, mx: 30, my: 5, game: g2, brusher: b, scale: 4 }), 1);
  // never a filled spot: g has block 0 filled already -> nearest unfilled colour-1 spot is block 6 (y 20..39)
  assert.equal(snapTap({ id: 0, mx: 5, my: 12, game: g, brusher: b, scale }), 6, 'tap on the coloured spot reaches the next unfilled one 8px away');
  // colour finished or game complete -> unchanged
  const g3 = createGame(puzzle, { mode: MODE_CLASSIC }); g3.selectColour(4); g3.tapRegion(36); assert.ok(g3.colourDone(4));
  assert.equal(snapTap({ id: 35, mx: 99, my: 60, game: g3, brusher: b, scale }), 35);
});
await test('TAPS: a snapped tap goes through the normal game rules (one region in One by one, all in Magic, palette alone still fills nothing)', () => {
  const b = brusher();
  const c = createGame(puzzle, { mode: MODE_CLASSIC }); c.selectColour(1); assert.equal(c.filledCount(), 0);
  let id = snapTap({ id: 1, mx: 23, my: 5, game: c, brusher: b, scale: 1 }); let r = c.tapRegion(id); assert.equal(r.type, 'fill'); assert.deepEqual(r.ids, [0]);
  const m = createGame(puzzle, { mode: MODE_MAGIC }); m.selectColour(1); assert.equal(m.filledCount(), 0, 'magic: selecting alone fills nothing');
  id = snapTap({ id: 1, mx: 23, my: 5, game: m, brusher: b, scale: 1 }); r = m.tapRegion(id); assert.equal(r.type, 'fill'); assert.equal(r.ids.length, m.byColour[1].length); assert.equal(m.undoStack.length, 1);
});
done('brush tests');
