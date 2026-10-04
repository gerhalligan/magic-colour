// Near-duplicate detection for pictures (used by tests/duplicates.mjs and tools/audit-duplicates.mjs).
// Every picture is rendered to a small SxS "finished picture" (white paper, area-sampled) and a SxS colour-number map. Two pictures are
// compared in two independent ways, so a picture that is merely scaled, recoloured or mirrored still counts as a copy:
//   look  - how many of the pixels that are drawn in either picture have (almost) the same colour             (0..1)
//   shape - adjusted Rand index of the two region partitions (colour numbers for grid pictures) (colour-blind: same layout, other colours) (-1..1)
//   outline - correlation of the two outline (edge) maps: a colour-blind check that catches the same design drawn at another size or in other colours
// Pictures are "too similar" when look >= LOOK_MAX, shape >= SHAPE_MAX[type] or outline >= OUTLINE_MAX[type] (checked for the picture and its left-right mirror).
import { mapOf, hexToRgb } from '../../src/codec.js';
export const S = 40;
export const LOOK_MAX = 0.80;
/** region-layout limits: grid pictures are small and clean (copies score 0.80+, different pictures stay below ~0.45); shapes pictures are busy full-page scenes whose big regions always overlap a little, so only a near-perfect match counts */
export const SHAPE_MAX = { grid: 0.80, shapes: 0.92 };
/** outline limits (real grid copies score 0.89+, different grid pictures stay below ~0.4) */
export const OUTLINE_MAX = { grid: 0.60, shapes: 0.90 };

/** Render a puzzle to {rgb: Uint8Array(S*S*3), lab: Int16Array(S*S) colour number, 0 = paper} by sampling the label map on an SxS lattice (3x3 samples per pixel, majority vote). */
export function signature(p) {
  const map = mapOf(p), pal = p.palette.map(hexToRgb), W = p.w, H = p.h;
  // use the longer side for scale so the whole picture is kept, centred (grid pictures may be non-square)
  const side = Math.max(W, H), ox = (side - W) / 2, oy = (side - H) / 2;
  const rgb = new Uint8Array(S * S * 3).fill(255), lab = new Int16Array(S * S), part = new Int32Array(S * S);
  const votes = new Map();
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    votes.clear();
    for (let sy = 0; sy < 3; sy++) for (let sx = 0; sx < 3; sx++) {
      const px = Math.floor(((x + (sx + 0.5) / 3) / S) * side - ox), py = Math.floor(((y + (sy + 0.5) / 3) / S) * side - oy);
      const c = px < 0 || py < 0 || px >= W || py >= H ? -1 : map[py * W + px]; // region id, -1 = outside
      votes.set(c, (votes.get(c) || 0) + 1);
    }
    let best = 0, bv = -1; for (const [c, v] of votes) if (v > bv || (v === bv && c > best)) { best = c; bv = v; }
    const num = best < 0 ? 0 : p.regions[best][0];
    lab[y * S + x] = num; part[y * S + x] = p.grid ? num : best + 1; // grid cells are all separate regions, so grids are compared by colour number
    if (num > 0) rgb.set(pal[num - 1], (y * S + x) * 3);
  }
  return { rgb, lab, part };
}
const mirror = (sig) => {
  const rgb = new Uint8Array(sig.rgb.length), lab = new Int16Array(sig.lab.length), part = new Int32Array(sig.part.length);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const a = y * S + x, b = y * S + (S - 1 - x); lab[a] = sig.lab[b]; part[a] = sig.part[b]; for (let k = 0; k < 3; k++) rgb[a * 3 + k] = sig.rgb[b * 3 + k]; }
  return { rgb, lab, part };
};
export function lookSim(a, b) {
  let union = 0, same = 0;
  for (let i = 0; i < S * S; i++) {
    if (!a.lab[i] && !b.lab[i]) continue; union++;
    if (!a.lab[i] || !b.lab[i]) continue;
    const d = Math.abs(a.rgb[i * 3] - b.rgb[i * 3]) + Math.abs(a.rgb[i * 3 + 1] - b.rgb[i * 3 + 1]) + Math.abs(a.rgb[i * 3 + 2] - b.rgb[i * 3 + 2]);
    if (d <= 90) same++;
  }
  return union ? same / union : 1;
}
/** adjusted Rand index between two colour-number partitions of the SxS lattice (paper counts as one class) */
export function shapeSim(a, b) {
  const n = S * S, tab = new Map(), ra = new Map(), rb = new Map();
  for (let i = 0; i < n; i++) { const k = a.part[i] * 100000 + b.part[i]; tab.set(k, (tab.get(k) || 0) + 1); ra.set(a.part[i], (ra.get(a.part[i]) || 0) + 1); rb.set(b.part[i], (rb.get(b.part[i]) || 0) + 1); }
  const c2 = (v) => v * (v - 1) / 2; let sij = 0, sa = 0, sb = 0;
  for (const v of tab.values()) sij += c2(v); for (const v of ra.values()) sa += c2(v); for (const v of rb.values()) sb += c2(v);
  const exp = sa * sb / c2(n), mx = (sa + sb) / 2; return mx === exp ? 1 : (sij - exp) / (mx - exp);
}
/** colour-blind outline similarity: normalised correlation of the (blurred) boundary maps between differently-coloured neighbouring pixels */
function edges(sig) {
  if (sig.edge) return sig.edge;
  const e = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = y * S + x, l = (j) => 0.3 * sig.rgb[j * 3] + 0.59 * sig.rgb[j * 3 + 1] + 0.11 * sig.rgb[j * 3 + 2];
    const dx = x + 1 < S ? Math.abs(l(i) - l(i + 1)) : 0, dy = y + 1 < S ? Math.abs(l(i) - l(i + S)) : 0;
    e[i] = Math.min(1, (dx + dy) / 60);
  }
  const b = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { let t = 0; for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) { const X = x + u, Y = y + v; if (X >= 0 && Y >= 0 && X < S && Y < S) t += e[Y * S + X]; } b[y * S + x] = t / 9; }
  return (sig.edge = b);
}
export function outlineSim(a, b) {
  const ea = edges(a), eb = edges(b); let ma = 0, mb = 0; for (let i = 0; i < S * S; i++) { ma += ea[i]; mb += eb[i]; } ma /= S * S; mb /= S * S;
  let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < S * S; i++) { const x = ea[i] - ma, y = eb[i] - mb; sab += x * y; saa += x * x; sbb += y * y; }
  return saa && sbb ? sab / Math.sqrt(saa * sbb) : 0;
}
/** compare two signatures (also against the mirrored second picture); returns { look, shape, score } */
export function compare(a, b, grid = true) {
  const m = mirror(b);
  const look = Math.max(lookSim(a, b), lookSim(a, m)), shape = Math.max(shapeSim(a, b), shapeSim(a, m)), outline = Math.max(outlineSim(a, b), outlineSim(a, m));
  return { look, shape, outline, score: Math.max(look / LOOK_MAX, shape / SHAPE_MAX[grid ? 'grid' : 'shapes'], outline / OUTLINE_MAX[grid ? 'grid' : 'shapes']) };
}
/** all pairs of puzzles (within the same type: shapes vs shapes, grid vs grid) sorted by similarity, most similar first */
export function pairs(puzzles) {
  const sigs = puzzles.map(signature), out = [];
  for (let i = 0; i < puzzles.length; i++) for (let j = i + 1; j < puzzles.length; j++) {
    if (!!puzzles[i].grid !== !!puzzles[j].grid) continue;
    out.push({ a: puzzles[i].id, b: puzzles[j].id, an: puzzles[i].name, bn: puzzles[j].name, ...compare(sigs[i], sigs[j], !!puzzles[i].grid) });
  }
  return out.sort((x, y) => y.score - x.score);
}
