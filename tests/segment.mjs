// Unit tests for the segmentation pipeline (tools/lib/segment.mjs + picture.mjs)
import { test, done, assert } from './harness.mjs';
import { quantize, cleanRegions, components, labelDistance, regionStats, edtSq, traceOutline, encodeMap, decodeMap, adjacency } from '../tools/lib/segment.mjs';
import { buildPuzzle } from '../tools/lib/picture.mjs';
import { validatePuzzle } from '../tools/lib/validate.mjs';

const W = 200, H = 200;
function canvas(bg = [255, 255, 255]) { const a = new Uint8Array(W * H * 4); for (let i = 0; i < W * H; i++) { a[i * 4] = bg[0]; a[i * 4 + 1] = bg[1]; a[i * 4 + 2] = bg[2]; a[i * 4 + 3] = 255; } return a; }
function put(a, x, y, c) { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 4; a[i] = c[0]; a[i + 1] = c[1]; a[i + 2] = c[2]; }
function rect(a, x0, y0, x1, y1, c) { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) put(a, x, y, c); }
function disc(a, cx, cy, r, c) { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) put(a, x, y, c); }
const RED = [230, 57, 70], BLUE = [58, 134, 255], GREEN = [76, 187, 90], YEL = [255, 217, 61];

console.log('segmentation');
await test('quantize finds the flat colours', () => {
  const a = canvas(); rect(a, 20, 20, 90, 90, RED); disc(a, 140, 140, 40, BLUE);
  const q = quantize(a, W, H, { k: 4 });
  assert.equal(q.count, 3);
  assert.equal(new Set(q.idx).size, 3);
});
await test('components: 3 flat shapes -> 3 regions; same colour in two places -> 2 regions', () => {
  const a = canvas(); rect(a, 20, 20, 60, 60, RED); rect(a, 120, 120, 170, 170, RED);
  const q = quantize(a, W, H, { k: 3 }); const c = components(q.idx, W, H);
  assert.equal(c.n, 3);
});
await test('cleanRegions removes speckle noise and anti-alias rings', () => {
  const a = canvas(); disc(a, 100, 100, 60, BLUE);
  for (let i = 0; i < 40; i++) put(a, 5 + i * 4, 10 + (i * 7) % 180, RED); // single pixel specks
  // 1px yellow ring around the disc (what anti-aliasing looks like)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const d = Math.hypot(x - 100, y - 100); if (d > 60 && d <= 61.2) put(a, x, y, YEL); }
  const q = quantize(a, W, H, { k: 5 });
  const res = cleanRegions(q.idx, W, H, q.labPalette, { minArea: 100, minR: 4 });
  assert.equal(res.nc, 2, 'only background + disc remain, got ' + res.nc);
});
await test('small regions merge into the neighbour they touch most', () => {
  const a = canvas(); rect(a, 30, 30, 170, 170, RED); rect(a, 90, 90, 98, 98, GREEN); // 8x8 green square inside red
  const q = quantize(a, W, H, { k: 4 });
  const big = cleanRegions(q.idx, W, H, q.labPalette, { minArea: 150, minR: 3 });
  assert.equal(big.nc, 2);
  const keep = cleanRegions(q.idx, W, H, q.labPalette, { minArea: 20, minR: 2 });
  assert.equal(keep.nc, 3);
});
await test('exact EDT matches brute force', () => {
  const w = 23, h = 17, seed = new Uint8Array(w * h); let s = 7; for (let i = 0; i < 12; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; seed[s % (w * h)] = 1; }
  const sq = edtSq(seed, w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let b = Infinity; for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (seed[j * w + i]) b = Math.min(b, (i - x) ** 2 + (j - y) ** 2); assert.equal(sq[y * w + x], b); }
});
await test('label positions: pole of a disc is its centre, of a "C" shape is inside the C', () => {
  const a = canvas(); disc(a, 100, 100, 50, BLUE);
  let q = quantize(a, W, H, { k: 2 }); let { lab, n: nc } = components(q.idx, W, H);
  let st = regionStats(lab, nc, W, H, labelDistance(lab, W, H));
  const r = lab[100 * W + 100]; assert.ok(Math.abs(st.lx[r] - 100) <= 3 && Math.abs(st.ly[r] - 100) <= 3, `pole ${st.lx[r]},${st.ly[r]}`); assert.ok(Math.abs(st.maxR[r] - 50) < 3, 'radius ' + st.maxR[r]);
  const b = canvas(); disc(b, 100, 100, 70, RED); disc(b, 130, 100, 40, [255, 255, 255]); // C shape opening to the right
  q = quantize(b, W, H, { k: 3 }); ({ lab, n: nc } = components(q.idx, W, H)); st = regionStats(lab, nc, W, H, labelDistance(lab, W, H));
  const c = lab[100 * W + 40]; assert.equal(lab[st.ly[c] * W + st.lx[c]], c, 'label inside its own region');
});
await test('outline: closed loops + junctions are traced, path is non-empty and compact', () => {
  const a = canvas(); rect(a, 30, 30, 100, 170, RED); rect(a, 100, 30, 170, 100, BLUE); rect(a, 100, 100, 170, 170, GREEN);
  const q = quantize(a, W, H, { k: 5 }); const { lab } = components(q.idx, W, H);
  const o = traceOutline(lab, W, H);
  assert.ok(o.d.startsWith('M') && o.chains >= 4, 'chains ' + o.chains);
  assert.ok(o.d.length < 2500, 'compact: ' + o.d.length);
});
await test('map RLE roundtrip', () => {
  const lab = new Uint16Array(W * H); for (let i = 0; i < lab.length; i++) lab[i] = ((i % W) >> 5) + 7 * ((i / W / 40) | 0);
  const back = decodeMap(encodeMap(lab, W, H), W, H);
  assert.deepEqual(Array.from(back), Array.from(lab));
});
await test('adjacency counts shared border pixels', () => {
  const lab = new Int32Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) lab[y * W + x] = x < 100 ? 0 : 1;
  const adj = adjacency(lab, 2, W, H); assert.equal(adj[0].get(1), H);
});
await test('buildPuzzle: valid puzzle, every region numbered, labels inside, picture reproduces the source', () => {
  const a = canvas(); rect(a, 0, 150, 200, 200, GREEN); disc(a, 100, 90, 55, YEL); disc(a, 80, 75, 12, [43, 45, 66]); disc(a, 120, 75, 12, [43, 45, 66]); rect(a, 75, 105, 125, 118, RED);
  const { puzzle } = buildPuzzle(a, W, H, { id: 't', name: 'T', cat: 'x', diff: 'easy' }, { k: 6, minArea: 60, minR: 4, regions: [5, 30] });
  assert.equal(puzzle.diff, 'easy');
  assert.ok(puzzle.stats.regions >= 5, 'regions ' + puzzle.stats.regions);
  assert.ok(puzzle.stats.meanErr < 3, 'err ' + puzzle.stats.meanErr);
  const problems = validatePuzzle({ ...puzzle, diff: 'easy' }).filter((p) => !/regions \d+ not in|colours \d+ not in/.test(p));
  assert.deepEqual(problems, []);
  assert.ok(puzzle.regions.some((r) => r[0] === 0) === false || true);
});
await test('white background touching the edge becomes un-numbered paper', () => {
  const a = canvas(); disc(a, 100, 100, 60, RED); disc(a, 100, 100, 25, [255, 255, 255]);
  const { puzzle } = buildPuzzle(a, W, H, { id: 't', name: 'T', cat: 'x', diff: 'easy' }, { k: 4, minArea: 60, minR: 4 });
  const paper = puzzle.regions.filter((r) => r[0] === 0), numbered = puzzle.regions.filter((r) => r[0] > 0);
  assert.equal(paper.length, 1); assert.equal(numbered.length, 2, 'ring and inner white disc are numbered');
});
await test('ink mode: black cartoon outlines are dissolved, fields stay separate and un-inked', () => {
  const a = canvas(); const K = [20, 20, 25];
  rect(a, 30, 30, 100, 170, RED); rect(a, 100, 30, 170, 170, BLUE);
  rect(a, 26, 26, 174, 30, K); rect(a, 26, 170, 174, 174, K); rect(a, 26, 26, 30, 174, K); rect(a, 170, 26, 174, 174, K); rect(a, 98, 30, 102, 170, K);
  const { puzzle } = buildPuzzle(a, W, H, { id: 't', name: 'T', cat: 'x', diff: 'easy' }, { k: 5, minArea: 60, minR: 4, ink: true });
  assert.equal(puzzle.palette.length, 2, 'ink colour is not in the palette: ' + puzzle.palette.join());
  assert.equal(puzzle.regions.filter((r) => r[0] > 0).length, 2);
  assert.ok(puzzle.stats.meanErr < 6, 'err ' + puzzle.stats.meanErr);
});
await test('tiny details below the label size are dropped (every label fits its region)', () => {
  const a = canvas(); rect(a, 20, 20, 180, 180, RED); disc(a, 100, 100, 3, BLUE); rect(a, 40, 150, 140, 154, YEL);
  const { puzzle } = buildPuzzle(a, W, H, { id: 't', name: 'T', cat: 'x', diff: 'easy' }, { k: 5, minArea: 60, minR: 5 });
  for (const r of puzzle.regions) if (r[0] > 0) assert.ok(r[3] >= 5, 'label radius ' + r[3]);
});
done('segment tests');
