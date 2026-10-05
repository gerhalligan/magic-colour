// Core image -> colour-by-number segmentation. Pure functions on typed arrays (no I/O), unit-tested in tests/segment.mjs.

// ---------- colour helpers ----------
export function rgb2lab(r, g, b) {
  const f = (v) => { v /= 255; return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92; };
  const R = f(r), G = f(g), B = f(b);
  let x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047, y = R * 0.2126 + G * 0.7152 + B * 0.0722, z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const h = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  x = h(x); y = h(y); z = h(z);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
export const dE = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export const hex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

// seeded RNG so the pipeline is repeatable
export function rng(seed = 12345) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------- quantisation ----------
/** rgba: Uint8Array w*h*4 (already flattened on a background). Returns {idx, labPalette, count} with <= k colours.
 *  Weighted k-means on a colour histogram (greedy count*D^2 seeding => flat areas win over anti-alias junk), then Ward-style merging. */
export function quantize(rgba, w, h, { k = 8, mergeDE = 10, iters = 12 } = {}) {
  const n = w * h;
  const bins = new Map(); // 5-bit-per-channel histogram
  const keyOf = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2], key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    keyOf[i] = key; let o = bins.get(key); if (!o) { o = { n: 0, r: 0, g: 0, b: 0 }; bins.set(key, o); } o.n++; o.r += r; o.g += g; o.b += b;
  }
  const items = [...bins.entries()].map(([key, o]) => ({ key, n: o.n, lab: rgb2lab(o.r / o.n, o.g / o.n, o.b / o.n) }));
  const K0 = Math.min(k + 8, items.length);
  const centers = [];
  const d2 = new Float64Array(items.length).fill(Infinity);
  let first = 0; items.forEach((it, i) => { if (it.n > items[first].n) first = i; });
  centers.push(items[first].lab.slice());
  while (centers.length < K0) {
    const c = centers[centers.length - 1]; let best = -1, bs = 0;
    for (let i = 0; i < items.length; i++) { const l = items[i].lab; const d = (l[0] - c[0]) ** 2 + (l[1] - c[1]) ** 2 + (l[2] - c[2]) ** 2; if (d < d2[i]) d2[i] = d; const sc = items[i].n * d2[i]; if (sc > bs) { bs = sc; best = i; } }
    if (best < 0 || bs < 1) break;
    centers.push(items[best].lab.slice());
  }
  const nearest = (l, cs) => { let best = 0, bd = Infinity; for (let c = 0; c < cs.length; c++) { const d = (l[0] - cs[c][0]) ** 2 + (l[1] - cs[c][1]) ** 2 + (l[2] - cs[c][2]) ** 2; if (d < bd) { bd = d; best = c; } } return best; };
  let cnt = new Float64Array(centers.length);
  for (let it = 0; it < iters; it++) {
    const sum = centers.map(() => [0, 0, 0]); cnt = new Float64Array(centers.length);
    for (const o of items) { const c = nearest(o.lab, centers); sum[c][0] += o.lab[0] * o.n; sum[c][1] += o.lab[1] * o.n; sum[c][2] += o.lab[2] * o.n; cnt[c] += o.n; }
    for (let c = 0; c < centers.length; c++) if (cnt[c]) centers[c] = [sum[c][0] / cnt[c], sum[c][1] / cnt[c], sum[c][2] / cnt[c]];
  }
  let cs = centers.map((c, i) => ({ c, n: cnt[i] })).filter((o) => o.n > 0);
  for (;;) {
    let bi = -1, bj = -1, bw = Infinity, bd = Infinity, bdi = -1, bdj = -1;
    for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
      const d = dE(cs[i].c, cs[j].c), wd = (cs[i].n * cs[j].n) / (cs[i].n + cs[j].n) * d * d;
      if (wd < bw) { bw = wd; bi = i; bj = j; } if (d < bd) { bd = d; bdi = i; bdj = j; }
    }
    let mi, mj;
    if (cs.length > k) { mi = bi; mj = bj; } else if (bd < mergeDE) { mi = bdi; mj = bdj; } else break;
    const a = cs[mi], b = cs[mj], t = a.n + b.n;
    cs[mi] = { c: [(a.c[0] * a.n + b.c[0] * b.n) / t, (a.c[1] * a.n + b.c[1] * b.n) / t, (a.c[2] * a.n + b.c[2] * b.n) / t], n: t };
    cs.splice(mj, 1);
  }
  const labPal = cs.map((o) => o.c);
  const binToIdx = new Map(); for (const o of items) binToIdx.set(o.key, nearest(o.lab, labPal));
  const idx = new Uint8Array(n);
  for (let i = 0; i < n; i++) idx[i] = binToIdx.get(keyOf[i]);
  return { idx, labPalette: labPal, count: labPal.length };
}

// ---------- connected components (4-connectivity, same value) ----------
export function components(idx, w, h, seg = null) { // seg (optional Int32Array): pixels only connect when their seg ids match too (ink-separated fields)
  const n = w * h, lab = new Int32Array(n).fill(-1), stack = new Int32Array(n); let nc = 0;
  const same = seg ? (p, q, v, g) => idx[q] === v && seg[q] === g : (p, q, v) => idx[q] === v;
  for (let s = 0; s < n; s++) {
    if (lab[s] >= 0) continue;
    const v = idx[s], g = seg ? seg[s] : 0; let sp = 0; stack[sp++] = s; lab[s] = nc;
    while (sp) {
      const p = stack[--sp], x = p % w, y = (p / w) | 0;
      if (x > 0 && lab[p - 1] < 0 && same(p, p - 1, v, g)) { lab[p - 1] = nc; stack[sp++] = p - 1; }
      if (x < w - 1 && lab[p + 1] < 0 && same(p, p + 1, v, g)) { lab[p + 1] = nc; stack[sp++] = p + 1; }
      if (y > 0 && lab[p - w] < 0 && same(p, p - w, v, g)) { lab[p - w] = nc; stack[sp++] = p - w; }
      if (y < h - 1 && lab[p + w] < 0 && same(p, p + w, v, g)) { lab[p + w] = nc; stack[sp++] = p + w; }
    }
    nc++;
  }
  return { lab, n: nc };
}

// ---------- exact Euclidean distance transform (Felzenszwalb) ----------
function edt1d(f, n, d, v, z) {
  let k = 0; v[0] = 0; z[0] = -1e30; z[1] = 1e30;
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
    k++; v[k] = q; z[k] = s; z[k + 1] = 1e30;
  }
  k = 0; for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; }
}
/** squared EDT of a binary seed mask (1 = seed => distance 0) */
export function edtSq(seed, w, h) {
  const INF = 1e12, out = new Float64Array(w * h), m = Math.max(w, h);
  const f = new Float64Array(m), d = new Float64Array(m), v = new Int32Array(m), z = new Float64Array(m + 1);
  for (let x = 0; x < w; x++) { for (let y = 0; y < h; y++) f[y] = seed[y * w + x] ? 0 : INF; edt1d(f, h, d, v, z); for (let y = 0; y < h; y++) out[y * w + x] = d[y]; }
  for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) f[x] = out[y * w + x]; edt1d(f, w, d, v, z); for (let x = 0; x < w; x++) out[y * w + x] = d[x]; }
  return out;
}
/** For every pixel: distance to the nearest pixel of a different label (or the image edge). Returns Float32 (pixel-centre radius ~ d+0.5) */
export function labelDistance(lab, w, h) {
  const seed = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x, l = lab[p];
    if (x === 0 || y === 0 || x === w - 1 || y === h - 1 || lab[p - 1] !== l || lab[p + 1] !== l || lab[p - w] !== l || lab[p + w] !== l) seed[p] = 1;
  }
  const sq = edtSq(seed, w, h), out = new Float32Array(w * h);
  for (let i = 0; i < out.length; i++) out[i] = Math.sqrt(sq[i]) + 0.5;
  return out;
}

// ---------- region statistics ----------
export function regionStats(lab, nc, w, h, dist) {
  const area = new Int32Array(nc), maxR = new Float32Array(nc), lx = new Int32Array(nc), ly = new Int32Array(nc);
  const x0 = new Int32Array(nc).fill(1 << 30), y0 = new Int32Array(nc).fill(1 << 30), x1 = new Int32Array(nc).fill(-1), y1 = new Int32Array(nc).fill(-1);
  const sx = new Float64Array(nc), sy = new Float64Array(nc);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x, l = lab[p]; area[l]++; sx[l] += x; sy[l] += y;
    if (x < x0[l]) x0[l] = x; if (x > x1[l]) x1[l] = x; if (y < y0[l]) y0[l] = y; if (y > y1[l]) y1[l] = y;
    const d = dist[p];
    // pole of inaccessibility: max distance; prefer pixel closest to the centroid among near-max (stable, central label)
    if (d > maxR[l] + 1e-4) { maxR[l] = d; lx[l] = x; ly[l] = y; }
  }
  // refine: among pixels with d >= 0.92*max pick the one closest to the centroid of those -> centred labels
  const cx = new Float64Array(nc), cy = new Float64Array(nc), cn = new Int32Array(nc);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = y * w + x, l = lab[p]; if (dist[p] >= 0.9 * maxR[l]) { cx[l] += x; cy[l] += y; cn[l]++; } }
  const best = new Float64Array(nc).fill(Infinity);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x, l = lab[p];
    if (dist[p] >= 0.9 * maxR[l]) { const dx = x - cx[l] / cn[l], dy = y - cy[l] / cn[l], dd = dx * dx + dy * dy; if (dd < best[l]) { best[l] = dd; lx[l] = x; ly[l] = y; } }
  }
  return { area, maxR, lx, ly, x0, y0, x1, y1 };
}

// ---------- adjacency ----------
export function adjacency(lab, nc, w, h) {
  const adj = Array.from({ length: nc }, () => new Map());
  const add = (a, b) => { if (a === b) return; adj[a].set(b, (adj[a].get(b) || 0) + 1); adj[b].set(a, (adj[b].get(a) || 0) + 1); };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = y * w + x; if (x < w - 1) add(lab[p], lab[p + 1]); if (y < h - 1) add(lab[p], lab[p + w]); }
  return adj;
}

/** Re-assign pixels flagged -1 to the nearest known pixel value (multi-source BFS). */
export function fillUnknown(idx, w, h, seg = null) { // seg (optional): copied along with the colour
  const n = w * h, q = new Int32Array(n); let qh = 0, qt = 0;
  for (let p = 0; p < n; p++) if (idx[p] !== 255) q[qt++] = p;
  const put = (t, p) => { idx[t] = idx[p]; if (seg) seg[t] = seg[p]; q[qt++] = t; };
  while (qh < qt) {
    const p = q[qh++], x = p % w, y = (p / w) | 0;
    if (x > 0 && idx[p - 1] === 255) put(p - 1, p);
    if (x < w - 1 && idx[p + 1] === 255) put(p + 1, p);
    if (y > 0 && idx[p - w] === 255) put(p - w, p);
    if (y < h - 1 && idx[p + w] === 255) put(p + w, p);
  }
}

class Heap { // min-heap on [key, id]
  constructor() { this.a = []; }
  push(k, id) { const a = this.a; a.push([k, id]); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() { const a = this.a; const top = a[0]; const last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { let l = 2 * i + 1, r = l + 1, m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; }
  get size() { return this.a.length; }
}

/**
 * Clean a colour-index image into regions.
 * 1. thin structures (anti-alias rings, hairlines) are dissolved into their neighbours,
 * 2. regions smaller than minArea or with a too small inscribed circle are merged into the best neighbour.
 * Returns {idx, lab, nc} (idx = colour index per pixel, lab = region id per pixel).
 */
export function cleanRegions(idx0, w, h, labPalette, { minArea = 150, minR = 4, thinR = 2.2, passes = 8, seg: seg0 = null } = {}) {
  const idx = Uint8Array.from(idx0), seg = seg0 ? Int32Array.from(seg0) : null; // seg: optional field ids (same colour, different seg = separate regions)
  let lab, nc;
  for (let pass = 0; pass < 3; pass++) { // thin pass
    ({ lab, n: nc } = components(idx, w, h, seg));
    const dist = labelDistance(lab, w, h), st = regionStats(lab, nc, w, h, dist);
    let any = false;
    for (let p = 0; p < w * h; p++) if (st.maxR[lab[p]] < thinR) { idx[p] = 255; any = true; }
    if (!any) break;
    // keep at least something known
    fillUnknown(idx, w, h, seg);
  }
  for (let pass = 0; pass < passes; pass++) {
    ({ lab, n: nc } = components(idx, w, h, seg));
    const dist = labelDistance(lab, w, h), st = regionStats(lab, nc, w, h, dist);
    const colorOf = new Int32Array(nc); for (let p = 0; p < w * h; p++) colorOf[lab[p]] = idx[p];
    const small = []; for (let r = 0; r < nc; r++) if (st.area[r] < minArea || st.maxR[r] < minR) small.push(r);
    if (!small.length) break;
    const adj = adjacency(lab, nc, w, h);
    const parent = Int32Array.from({ length: nc }, (_, i) => i), area = Float64Array.from(st.area), color = Int32Array.from(colorOf), mr = Float32Array.from(st.maxR);
    const find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
    const heap = new Heap(); for (const r of small) heap.push(Math.min(area[r], mr[r] * 40), r);
    while (heap.size) {
      const [, r0] = heap.pop(); const r = find(r0);
      if (r !== r0 || !(area[r] < minArea || mr[r] < minR)) continue;
      if (!adj[r].size) continue;
      let best = -1, bs = -1;
      for (const [t, c] of adj[r]) { const d = dE(labPalette[color[r]], labPalette[color[t]]); const s = c / (1 + d / 40); if (s > bs) { bs = s; best = t; } }
      const s = best;
      parent[r] = s; area[s] += area[r]; mr[s] = Math.max(mr[s], mr[r]);
      for (const [t, c] of adj[r]) { if (t === s) continue; adj[s].set(t, (adj[s].get(t) || 0) + c); adj[t].delete(r); adj[t].set(s, (adj[t].get(s) || 0) + c); }
      adj[s].delete(r); adj[r] = new Map();
      if (area[s] < minArea || mr[s] < minR) heap.push(Math.min(area[s], mr[s] * 40), s);
    }
    if (seg) { const segOf = new Int32Array(nc); for (let p = 0; p < w * h; p++) segOf[lab[p]] = seg[p]; for (let p = 0; p < w * h; p++) seg[p] = segOf[find(lab[p])]; }
    for (let p = 0; p < w * h; p++) idx[p] = color[find(lab[p])];
  }
  ({ lab, n: nc } = components(idx, w, h, seg));
  return { idx, lab, nc };
}

// ---------- RLE label map (varints -> base64) ----------
export function encodeMap(lab, w, h) {
  const bytes = []; const vi = (v) => { while (v >= 128) { bytes.push((v & 127) | 128); v >>>= 7; } bytes.push(v); };
  let run = 1; const n = w * h;
  for (let i = 1; i <= n; i++) { if (i < n && lab[i] === lab[i - 1]) { run++; continue; } vi(lab[i - 1]); vi(run - 1); run = 1; }
  return Buffer.from(Uint8Array.from(bytes)).toString('base64');
}
export { decodeMap } from '../../src/codec.js';

// ---------- outline tracing ----------
function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const st = [[0, pts.length - 1]];
  while (st.length) {
    const [a, b] = st.pop(); let md = 0, mi = -1; const [ax, ay] = pts[a], [bx, by] = pts[b]; const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1e-9;
    for (let i = a + 1; i < b; i++) { const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / L; if (d > md) { md = d; mi = i; } }
    if (md > eps && mi >= 0) { keep[mi] = 1; st.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
/** Trace all region boundaries (shared once) into smooth SVG path data. */
export function traceOutline(lab, w, h, { eps = 0.7, round = 4 } = {}) {
  const W1 = w + 1; const vid = (x, y) => y * W1 + x;
  // edges between pixels with different labels, as vertex pairs
  const nbr = new Map(); const addE = (a, b) => { (nbr.get(a) || nbr.set(a, []).get(a)).push(b); (nbr.get(b) || nbr.set(b, []).get(b)).push(a); };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x;
    if (x < w - 1 && lab[p] !== lab[p + 1]) addE(vid(x + 1, y), vid(x + 1, y + 1)); // vertical edge right of pixel
    if (y < h - 1 && lab[p] !== lab[p + w]) addE(vid(x, y + 1), vid(x + 1, y + 1)); // horizontal edge below pixel
  }
  const used = new Set(); const ek = (a, b) => (a < b ? a * 1e7 + b : b * 1e7 + a);
  const chains = [];
  const walk = (start, next) => {
    const pts = [start]; let prev = start, cur = next; used.add(ek(prev, cur));
    for (;;) {
      pts.push(cur); const ns = nbr.get(cur);
      if (ns.length !== 2 || cur === start) break;
      const nx = ns[0] === prev ? ns[1] : ns[0]; if (used.has(ek(cur, nx))) break;
      used.add(ek(cur, nx)); prev = cur; cur = nx;
    }
    return pts;
  };
  for (const [v, ns] of nbr) if (ns.length !== 2) for (const nx of ns) if (!used.has(ek(v, nx))) chains.push(walk(v, nx));
  for (const [v, ns] of nbr) for (const nx of ns) if (!used.has(ek(v, nx))) chains.push(walk(v, nx)); // closed loops
  let d = '', segs = 0; const f = (v) => Math.round(v * 10) / 10;
  for (const ch of chains) {
    let pts = ch.map((v) => [v % W1, (v / W1) | 0]);
    const closed = ch[0] === ch[ch.length - 1];
    if (pts.length > 6) { // light smoothing of the stair steps, endpoints (junctions) stay put
      const n = pts.length, sm = pts.map((p) => p.slice());
      const get = (i) => (closed ? pts[(i + n - 1) % (n - 1)] : pts[Math.min(n - 1, Math.max(0, i))]);
      for (let i = closed ? 0 : 1; i < (closed ? n - 1 : n - 1); i++) { let sx = 0, sy = 0; for (let k = -2; k <= 2; k++) { const q = get(i + k); sx += q[0]; sy += q[1]; } sm[i] = [sx / 5, sy / 5]; }
      if (closed) sm[n - 1] = sm[0];
      pts = sm;
    }
    pts = rdp(pts, eps);
    if (pts.length < 2) continue;
    d += 'M' + f(pts[0][0]) + ' ' + f(pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], c = pts[i + 1];
      if (!c) { d += 'L' + f(b[0]) + ' ' + f(b[1]); break; }
      const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
      const t = Math.min(l1 / 2, l2 / 2, round);
      d += 'L' + f(b[0] - (b[0] - a[0]) / l1 * t) + ' ' + f(b[1] - (b[1] - a[1]) / l1 * t) + 'Q' + f(b[0]) + ' ' + f(b[1]) + ' ' + f(b[0] + (c[0] - b[0]) / l2 * t) + ' ' + f(b[1] + (c[1] - b[1]) / l2 * t);
    }
    segs += pts.length;
  }
  return { d, chains: chains.length, points: segs };
}
