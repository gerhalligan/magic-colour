// EPIC grid pictures (about 60x60 .. 120x120 squares): rich full-page scenes made of many colours. Drawn with the same Grid primitives as
// tools/art/pixel.mjs but in a small "sprite" layer (L) that can place/scale/mirror a drawing anywhere on the grid.
// Registered from pixel.mjs via bigDesigns(add). All pictures here are full scenes (no paper left), each with a different subject and layout.

// ---------- helpers ----------
export const rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const hash = (x, y, s = 0) => { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const vnoise = (x, y, s = 0) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
/** vertical gradient of flat colour bands with a dithered seam, rows y0..y1 */
export const bands = (g, y0, y1, cols, x0 = 0, x1 = g.w - 1) => {
  const n = cols.length, h = (y1 - y0 + 1) / n;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const t = (y - y0) / h; let i = Math.min(n - 1, Math.floor(t)); const f = t - i;
    if (i < n - 1 && f > 0.72 && (x + y) % 2 === 0) i++; else if (i > 0 && f < 0.28 && (x + y) % 2 === 1) i--;
    g.set(x, y, cols[i]);
  }
};
/** sprite layer: local coordinates -> grid (origin ox,oy, scale sc, optional left-right flip) */
export const L = (g, ox, oy, sc = 1, flip = false) => {
  const X = (x) => ox + (flip ? -x : x) * sc, Y = (y) => oy + y * sc, P = (pts) => pts.map(([x, y]) => [X(x), Y(y)]);
  const l = {
    disc: (x, y, r, c) => (g.disc(X(x), Y(y), r * sc, c), l), ell: (x, y, rx, ry, c, rot = 0) => (g.ell(X(x), Y(y), rx * sc, ry * sc, c, flip ? -rot : rot), l),
    poly: (pts, c) => (g.poly(P(pts), c), l), rect: (x0, y0, x1, y1, c) => (g.poly(P([[x0, y0], [x1 + 1, y0], [x1 + 1, y1 + 1], [x0, y1 + 1]]), c), l),
    line: (x0, y0, x1, y1, t, c) => (g.line(X(x0), Y(y0), X(x1), Y(y1), t * sc, c), l), px: (x, y, c) => l.rect(x, y, x, y, c),
    // a chain of discs along a path of [x, y, r] points (smooth bodies, tails, vines)
    chain: (pts, c) => { for (let i = 0; i < pts.length - 1; i++) { const [x0, y0, r0] = pts[i], [x1, y1, r1] = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 0.7)); for (let k = 0; k <= n; k++) { const t = k / n; l.disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r0 + (r1 - r0) * t, c); } } return l; },
  };
  return l;
};
const star4 = (g, x, y, c, c2 = c) => g.px(x, y, c).px(x - 1, y, c2).px(x + 1, y, c2).px(x, y - 1, c2).px(x, y + 1, c2);
const cloud = (g, x, y, s, c, shade) => { const l = L(g, x, y, s); l.disc(0, 0, 3, c).disc(4, -1.4, 3.6, c).disc(8.5, 0, 3, c).rect(-2, 0, 10, 2.6, c); if (shade) l.rect(-2, 2, 10, 2.6, shade); };
/** hill: everything below a gentle double-sine curve, with a lighter rim */
const hill = (g, base, amp, f, ph, col, rim, x0 = 0, x1 = g.w - 1) => {
  for (let x = x0; x <= x1; x++) { const top = Math.round(base + amp * Math.sin(x * f + ph) + amp * 0.45 * Math.sin(x * f * 2.3 + ph * 1.7)); for (let y = top; y < g.h; y++) g.set(x, y, rim && y === top ? rim : col); }
};
const speckle = (g, test, col, dens, seed) => { const r = rng(seed); for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (g.get(x, y) && test(g.get(x, y), x, y) && r() < dens) g.set(x, y, col); };
const R6 = ['#e63946', '#ff9f1c', '#ffd93d', '#51cf66', '#339af0', '#9775fa'];

/** a small full-body unicorn (local box about 40 x 36, facing right) */
const unicornSprite = (l, mane, body = '#f8f4ff', shade = '#d9d2ea') => {
  const tail = [[11, 22, 2.4], [9.2, 24.6, 2.5], [8, 27.6, 2.5], [7.6, 30.6, 2.4], [8.4, 33, 2]];
  tail.forEach(([x, y, r], i) => l.disc(x, y, r, mane[(i + 5) % mane.length]));
  l.rect(12, 28, 14, 34, shade).rect(24, 28, 26, 34, shade).rect(15, 28, 17, 34, body).rect(27, 28, 29, 34, body);
  [[11.5, 14.5], [23.5, 26.5], [14.5, 17.5], [26.5, 29.5]].forEach(([a, b]) => l.rect(a, 34, b, 34, '#ffd93d'));
  l.ell(20, 25, 9.4, 5.2, body); l.poly([[23, 24], [24.4, 13], [30, 13.4], [29.2, 25]], body);
  l.ell(30, 12.4, 4.6, 3.1, body, 24).ell(33.2, 15, 2.8, 2.1, body, 34);
  l.poly([[26.4, 10.4], [27, 6.6], [29.6, 9.6]], body).poly([[29, 9.6], [31.6, 9], [32.6, 2]], '#ffd93d');
  [[24.2, 9.6, 2.2], [22.6, 12.6, 2.3], [21.8, 15.8, 2.3], [21, 19, 2.3]].forEach(([x, y, r], i) => l.disc(x, y, r, mane[i % mane.length]));
  l.px(30, 11, '#22223b').px(30, 12, '#22223b').px(29, 14, '#ff6fa5').px(30, 14, '#ff6fa5');
};

/** keep at most `max` colours: the two closest colours are merged (the rarer one into the more common) until it fits; near-identical colours always merge */
export const reduceColours = (g, max = 24, minDist = 24) => {
  const rgb = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  for (;;) {
    const cnt = new Map(); for (const c of g.c) if (c) cnt.set(c, (cnt.get(c) || 0) + 1);
    const cols = [...cnt.keys()]; let best = null;
    for (let i = 0; i < cols.length; i++) for (let j = i + 1; j < cols.length; j++) { const a = rgb(cols[i]), b = rgb(cols[j]), d = Math.hypot((a[0] - b[0]) * 0.9, (a[1] - b[1]) * 1.2, (a[2] - b[2]) * 0.8); if (!best || d < best.d) best = { d, i, j }; }
    if (!best || (cols.length <= max && best.d >= minDist)) return g;
    const [lo, hi] = cnt.get(cols[best.i]) < cnt.get(cols[best.j]) ? [cols[best.i], cols[best.j]] : [cols[best.j], cols[best.i]];
    for (let k = 0; k < g.c.length; k++) if (g.c[k] === lo) g.c[k] = hi;
  }
};

/** a full scene has no paper left: any empty square takes the colour of its nearest drawn neighbour (looking up, then left) */
const fillEmpty = (g) => { for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) if (!g.get(x, y)) { let c = null; for (let d = 1; d < 6 && !c; d++) c = g.get(x, y - d) || g.get(x - d, y) || g.get(x + d, y) || g.get(x, y + d); g.set(x, y, c || '#1b1f4b'); } };

export function bigDesigns(add0) {
  const add = (id, name, cat, native, size, draw) => add0(id, name, cat, native, size, (g) => { draw(g); fillEmpty(g); reduceColours(g); });
  // ===== 1. Unicorn Castle (80) =====
  add('grid-unicorn-castle', 'Unicorn Castle', 'unicorns', 80, 80, (g) => {
    bands(g, 0, 56, ['#2a1b5e', '#43288a', '#6a3aa8', '#a456b8', '#e58bb1', '#ffc4a0']);
    const r = rng(11); for (let i = 0; i < 40; i++) { const x = Math.floor(r() * 80), y = Math.floor(r() * 30); g.set(x, y, i % 4 ? '#f1f5ff' : '#ffd93d'); }
    star4(g, 10, 8, '#ffd93d', '#fff3b0'); star4(g, 70, 14, '#ffd93d', '#fff3b0'); star4(g, 58, 5, '#f1f5ff', '#cfd8ff');
    g.disc(64, 18, 7.5, '#fff3c4'); g.disc(61.5, 16, 1.6, '#f0dc9a').disc(66, 21, 1.9, '#f0dc9a').disc(67, 15, 1, '#f0dc9a');
    R6.forEach((c, i) => { const ro = 38 - i * 2.1, ri = ro - 2.1; g.paint((a, b) => { const d = Math.hypot(a - 38, b - 64); return d <= ro && d > ri && b < 60; }, c); });
    cloud(g, 6, 50, 1.2, '#fde6f2', '#e9b8d6'); cloud(g, 62, 53, 1.3, '#fde6f2', '#e9b8d6');
    hill(g, 58, 2, 0.12, 0.4, '#3a8f56', '#69db7c'); speckle(g, (c) => c === '#3a8f56', '#2f7a47', 0.12, 3);
    const stone = '#cfc8dc', dark = '#a59db8', roofA = '#e63946', roofB = '#ff6fa5';
    const tower = (x0, x1, top, roof, h, flag) => { g.rect(x0, top, x1, 62, stone); g.rect(x1 - 1, top, x1, 62, dark); g.poly([[x0 - 1.4, top], [(x0 + x1 + 1) / 2, top - h], [x1 + 2.4, top]], roof); g.rect(x0 + 1, top + 5, x0 + 1, top + 7, '#ffd93d'); g.rect(Math.floor((x0 + x1) / 2), top + 5, Math.floor((x0 + x1) / 2), top + 8, '#ffd93d'); g.line((x0 + x1 + 1) / 2, top - h, (x0 + x1 + 1) / 2, top - h - 4, 1, '#7b4a2d'); g.poly([[(x0 + x1 + 1) / 2 + 0.5, top - h - 4], [(x0 + x1 + 1) / 2 + 4, top - h - 3], [(x0 + x1 + 1) / 2 + 0.5, top - h - 2]], flag); };
    tower(9, 15, 40, roofB, 8, '#ffd93d'); tower(65, 71, 40, roofB, 8, '#ffd93d');
    g.rect(15, 46, 65, 62, stone); g.rect(15, 44, 65, 45, dark); for (let x = 15; x <= 65; x += 3) g.rect(x, 42, x + 1, 43, stone);
    tower(19, 28, 30, roofA, 12, '#f1f5ff'); tower(52, 61, 30, roofA, 12, '#f1f5ff');
    g.rect(31, 18, 49, 62, stone); g.rect(47, 18, 49, 62, dark); g.poly([[29, 18], [40, 4], [51, 18]], roofB); g.line(40, 4, 40, -1, 1, '#7b4a2d'); g.poly([[40.5, 0], [46, 1.5], [40.5, 3]], '#ffd93d');
    g.ell(40, 24, 3, 3.6, '#ffd93d'); g.ell(40, 24, 1.4, 2.2, '#ff9f1c'); g.rect(34, 33, 35, 36, '#ffd93d'); g.rect(45, 33, 46, 36, '#ffd93d');
    g.paint((a, b) => b > 20 && b < 62 && a > 15 && a < 65 && !(a > 34 && a < 46 && b > 50) && (Math.floor(b) % 4 === 0 || (Math.floor(a) + (Math.floor(b / 4) % 2) * 2) % 5 === 0), dark);
    g.rect(35, 52, 45, 62, '#7b4a2d'); g.ell(40, 52, 5.5, 4, '#7b4a2d'); g.rect(39, 52, 41, 62, '#5c3a22'); g.px(43, 58, '#ffd93d');
    g.poly([[36, 62], [44, 62], [54, 80], [26, 80]], '#e9c78f'); speckle(g, (c) => c === '#e9c78f', '#d2a96c', 0.18, 8);
    g.rect(0, 64, 79, 79, '#3a8f56'); g.poly([[36, 62], [44, 62], [56, 79], [24, 79]], '#e9c78f'); speckle(g, (c, x, y) => (c === '#3a8f56'), '#2f7a47', 0.1, 4);
    speckle(g, (c, x, y) => c === '#3a8f56' && y > 64, '#69db7c', 0.08, 5);
    const fl = [['#ff6fa5', '#ffd93d'], ['#f1f5ff', '#ffd93d'], ['#9775fa', '#ffd93d']]; const q = rng(5);
    for (let i = 0; i < 46; i++) { const x = Math.floor(q() * 78) + 1, y = 66 + Math.floor(q() * 12); if (g.get(x, y) === '#e9c78f') continue; const [a, b] = fl[i % 3]; g.px(x, y, a).px(x + 1, y, a).px(x, y + 1, a).px(x - 1, y, a).px(x, y - 1, a).px(x, y, b); }
    unicornSprite(L(g, 54, 54, 0.62), R6);
    unicornSprite(L(g, 24, 59, 0.42, false), R6);
  });

  // ===== 2. Rainbow Valley (90) =====
  add('grid-rainbow-valley', 'Rainbow Valley', 'nature', 90, 90, (g) => {
    bands(g, 0, 60, ['#5cb8f5', '#80ccf8', '#a6dcfb', '#c9ecfd', '#e6f6ff']);
    g.disc(76, 14, 8, '#ffe066'); g.disc(76, 14, 6, '#fff3a0'); for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; g.line(76 + Math.cos(a) * 10.5, 14 + Math.sin(a) * 10.5, 76 + Math.cos(a) * 14, 14 + Math.sin(a) * 14, 1.2, '#ffe066'); }
    cloud(g, 8, 12, 1.5, '#ffffff', '#dbe9f7'); cloud(g, 32, 24, 1.1, '#ffffff', '#dbe9f7'); cloud(g, 52, 8, 1.2, '#ffffff', '#dbe9f7');
    // far mountains with snow caps
    [[14, 52, 20, 34], [38, 54, 26, 26], [66, 52, 22, 30]].forEach(([cx, base, hw, hh]) => { g.poly([[cx - hw, base], [cx, base - hh], [cx + hw, base]], '#7f8cc4'); g.poly([[cx, base - hh], [cx + hw, base], [cx + hw * 0.3, base]], '#6a76b0'); g.poly([[cx, base - hh], [cx - hw * 0.27, base - hh * 0.7], [cx - 2, base - hh * 0.78], [cx + 1, base - hh * 0.66], [cx + hw * 0.25, base - hh * 0.72]], '#f4f8ff'); });
    R6.forEach((c, i) => { const ro = 43 - i * 2.4, ri = ro - 2.4; g.paint((a, b) => { const d = Math.hypot(a - 45, b - 70); return d <= ro && d > ri && b < 66; }, c); });
    hill(g, 56, 3, 0.09, 1.2, '#4bb15a', '#7bd88a'); hill(g, 66, 3.5, 0.075, 3, '#3b9b4c', '#62c46f'); hill(g, 76, 3, 0.1, 0.2, '#2f8a43', '#55b862');
    speckle(g, (c) => c === '#4bb15a', '#3b9b4c', 0.12, 21); speckle(g, (c) => c === '#2f8a43', '#3b9b4c', 0.14, 22);
    // river from the horizon to the bottom edge
    for (let y = 58; y < 90; y++) { const t = (y - 58) / 32, cx = 45 + Math.sin(y * 0.2) * (3 + t * 8) + t * 4, hw = 1.5 + t * 9; for (let x = Math.floor(cx - hw); x <= Math.ceil(cx + hw); x++) if (Math.abs(x + 0.5 - cx) <= hw) g.set(x, y, (x + y) % 7 === 0 ? '#bfe6ff' : '#2f9be0'); }
    const tree = (x, y, s, c1, c2) => { const l = L(g, x, y, s); l.rect(-1, 0, 0, 6, '#8d5524'); l.disc(0, -3, 4.5, c1).disc(-3, -1, 3, c1).disc(3, -1, 3, c1).disc(1.5, -4, 2, c2); };
    const pine = (x, y, s) => { const l = L(g, x, y, s); l.rect(-1, 0, 0, 4, '#8d5524'); l.poly([[-5, 0], [0.5, -7], [6, 0]], '#1f7a3e').poly([[-4, -4], [0.5, -11], [5, -4]], '#2a9450').poly([[-3, -8], [0.5, -14], [4, -8]], '#36ad5e'); };
    tree(8, 66, 1.1, '#2e9b44', '#58c46a'); tree(20, 71, 1.3, '#38a84e', '#6cd37d'); pine(78, 70, 1.1); pine(86, 74, 1.3); tree(70, 78, 1.0, '#2e9b44', '#58c46a'); pine(14, 82, 1); pine(3, 76, 0.9);
    // tiny house on the right hill
    g.rect(58, 71, 65, 76, '#f2e1c3'); g.poly([[56, 71], [61.5, 65], [67, 71]], '#d6453d'); g.rect(60, 73, 62, 76, '#8d5524'); g.rect(63, 72, 64, 73, '#9be0ff'); g.rect(65, 66, 66, 69, '#a55a3c');
    const q = rng(9), cols = ['#ff6b81', '#ffd93d', '#f1f5ff', '#b36bff', '#ff9f1c'];
    for (let i = 0; i < 90; i++) { const x = Math.floor(q() * 88) + 1, y = 68 + Math.floor(q() * 21); const c = g.get(x, y); if (c !== '#3b9b4c' && c !== '#2f8a43' && c !== '#4bb15a') continue; const f = cols[i % 5]; g.px(x, y, f).px(x, y - 1, '#ffd93d'); if (i % 3 === 0) g.px(x, y + 1, '#1f7a3e'); }
    const bf = (x, y, c) => { g.px(x, y, c).px(x + 1, y + 1, c).px(x + 2, y, c).px(x + 1, y, '#22223b'); }; bf(30, 40, '#ff6fa5'); bf(52, 48, '#ffd93d'); bf(18, 36, '#b36bff');
    for (let i = 0; i < 6; i++) { const x = 25 + i * 9, y = 28 + (i % 2) * 5; g.px(x, y, '#3b4a6b').px(x + 1, y - 1, '#3b4a6b').px(x - 1, y - 1, '#3b4a6b'); }
  });

  // ===== 3. Fire Dragon (90) =====
  add('grid-fire-dragon', 'Fire Dragon', 'fantasy', 90, 90, (g) => {
    bands(g, 0, 70, ['#0f1038', '#1a1a52', '#2a2272', '#47307f', '#6b3b86', '#93467f']);
    const r = rng(33); for (let i = 0; i < 70; i++) g.set(Math.floor(r() * 90), Math.floor(r() * 45), i % 5 ? '#f1f5ff' : '#ffd93d');
    g.disc(70, 16, 9, '#f6efc0'); g.disc(67, 13, 2.2, '#dcd29b').disc(73, 19, 2.8, '#dcd29b').disc(72, 11, 1.4, '#dcd29b'); g.disc(74, 14, 9, '#0f1038'); g.disc(70, 16, 9, '#f6efc0'); g.disc(67, 13, 2.2, '#dcd29b').disc(73, 19, 2.8, '#dcd29b').disc(72, 11, 1.4, '#dcd29b');
    // mountains
    g.poly([[0, 72], [0, 52], [14, 40], [26, 54], [38, 36], [54, 58], [66, 44], [80, 56], [90, 46], [90, 72]], '#3a2a68'); g.poly([[38, 36], [34, 44], [38, 42], [41, 46], [43, 42]], '#e8e6ff');
    g.poly([[0, 72], [0, 62], [18, 52], [34, 64], [52, 54], [70, 66], [90, 58], [90, 72]], '#2a1f52');
    // castle on the cliff, left
    g.rect(4, 58, 22, 72, '#4b4a78'); g.rect(6, 50, 11, 58, '#5a5990'); g.poly([[5, 50], [8.5, 43], [12, 50]], '#c2255c'); g.rect(15, 52, 20, 58, '#5a5990'); g.poly([[14, 52], [17.5, 46], [21, 52]], '#c2255c'); g.px(8, 54, '#ffd93d').px(17, 55, '#ffd93d').px(9, 62, '#ffd93d').px(15, 63, '#ffd93d').px(19, 63, '#ffd93d');
    g.rect(0, 72, 89, 89, '#1d3b32'); hill(g, 76, 3, 0.1, 1, '#16302a', '#2d5a49'); speckle(g, (c) => c === '#16302a', '#102721', 0.15, 6);
    for (let x = 3; x < 90; x += 7) { const l = L(g, x, 80 + (x % 3), 1); l.poly([[-3, 0], [0, -8], [3, 0]], '#0e2a1f').poly([[-2, -4], [0, -11], [2, -4]], '#123826'); }
    // the dragon: flying right-to-left, breathing fire to the lower left
    const D = '#2fa04a', DD = '#1c6e33', DL = '#8fdc6a', BL = '#ffe08a', WM = '#b8326a', WB = '#8a1f4f';
    const body = [[78, 22, 2.2], [72, 28, 3.2], [64, 34, 4.4], [54, 38, 5.2], [44, 38, 5.2], [36, 34, 4.4], [30, 30, 4]];
    const tailPts = [[78, 22, 2.2], [82, 17, 1.8], [85, 11, 1.2], [88, 6, 0.8]];
    const l = L(g, 0, 0, 1);
    // wings (behind body)
    l.poly([[52, 34], [56, 6], [64, 14], [70, 4], [74, 16], [82, 12], [66, 36]], WM); l.poly([[52, 34], [56, 6]], WB);
    l.line(52, 34, 56, 6, 1.6, WB).line(52, 34, 70, 4, 1.6, WB).line(52, 34, 82, 12, 1.6, WB).line(56, 34, 74, 16, 1.4, WB);
    l.poly([[44, 36], [34, 10], [42, 16], [46, 6], [52, 20], [56, 14], [56, 36]], WM); l.line(44, 36, 34, 10, 1.6, WB).line(46, 36, 46, 6, 1.6, WB).line(48, 36, 56, 14, 1.4, WB);
    l.chain(tailPts, D).chain(body, D);
    l.poly([[88, 3], [90, 9], [84, 7]], DD);
    l.chain([[50, 44, 2], [64, 42, 2.4], [74, 36, 1.8]], DL); // belly
    l.ell(54, 40, 9, 3.2, BL, -6);
    // legs
    l.chain([[58, 42, 2.2], [60, 50, 1.6], [57, 54, 1.4]], D); l.chain([[44, 42, 2.2], [46, 50, 1.6], [43, 55, 1.4]], DD); [[55, 55], [57, 55], [59, 55], [41, 56], [43, 56], [45, 56]].forEach(([x, y]) => l.px(x, y, '#f1e4c3'));
    // spikes along the back
    for (let i = 0; i < 9; i++) { const t = i / 8, x = 78 - t * 48, y = 21 + (t < 0.5 ? t * 12 : 6 - (t - 0.5) * 4) - 3; l.poly([[x - 1.6, y + 2.5], [x, y - 3.5], [x + 1.6, y + 2.5]], DD); }
    // neck + head
    l.chain([[30, 30, 4], [24, 26, 3.6], [20, 24, 3.4]], D); l.ell(14, 26, 8, 4.8, D, 14); l.ell(10, 29, 5.4, 2.6, DL, 14);
    l.poly([[14, 22], [10, 12], [18, 20]], '#f1e4c3'); l.poly([[19, 22], [18, 11], [24, 21]], '#f1e4c3');
    l.px(15, 24, '#ffd93d').px(16, 24, '#ffd93d').px(15, 25, '#22223b').px(16, 25, '#22223b'); l.px(7, 26, '#22223b').px(6, 27, DD);
    [[5, 30], [8, 31], [11, 32]].forEach(([x, y]) => l.px(x, y, '#ffffff'));
    // fire
    l.poly([[5, 29], [0, 34], [-8, 40], [-16, 44], [-4, 48], [-12, 56], [6, 52], [10, 40]], '#e63946');
    l.poly([[5, 30], [0, 36], [-6, 42], [-12, 44], [-3, 47], [-8, 52], [6, 48], [8, 38]], '#ff9f1c'); l.poly([[5, 31], [1, 37], [-3, 42], [-6, 44], [0, 46], [-2, 49], [6, 45], [7, 38]], '#ffd93d'); l.poly([[5, 32], [2, 38], [0, 42], [4, 43]], '#fff3b0');
    // embers
    [[2, 58], [10, 62], [16, 50], [22, 44]].forEach(([x, y]) => g.px(x, y, '#ff9f1c'));
  });

  // ===== 4. Coral Reef (80) =====
  add('grid-coral-reef', 'Coral Reef', 'animals', 80, 80, (g) => {
    bands(g, 0, 68, ['#8fe3f0', '#5fcde6', '#38b6dc', '#2a95c9', '#2373b5', '#1c5596']);
    for (let k = 0; k < 6; k++) { const x0 = 6 + k * 14; for (let y = 0; y < 52; y++) for (let x = x0 + Math.floor(y * 0.45); x < x0 + 4 + Math.floor(y * 0.45) && x < 80; x++) { const c = g.get(x, y); if (c) g.set(x, y, c === '#8fe3f0' ? '#b6f0f7' : c === '#5fcde6' ? '#8fe3f0' : c === '#38b6dc' ? '#5fcde6' : c); } }
    g.rect(0, 68, 79, 79, '#f2d49b'); hill(g, 67, 2, 0.15, 0.5, '#f2d49b', '#fbe8bd'); speckle(g, (c) => c === '#f2d49b', '#d9b57a', 0.14, 4); speckle(g, (c) => c === '#f2d49b', '#fff3d6', 0.06, 5);
    const coral = (x, y, h, c1, c2) => { const l = L(g, x, y, 1); l.chain([[0, 0, 2.4], [0, -h * 0.5, 2]], c1); [[-1, 0.55, -5], [1, 0.4, 6], [-1, 0.8, -3]].forEach(([dir, t, dx], i) => l.chain([[0, -h * t, 1.7], [dx, -h * t - 5, 1.5], [dx * 1.3, -h * t - 9 - i * 2, 1.2]], i % 2 ? c2 : c1)); l.chain([[0, -h * 0.5, 1.8], [0, -h, 1.5]], c1); l.disc(0, -h, 1.9, c2).disc(-5, -h * 0.55 - 5, 1.7, c2).disc(6, -h * 0.4 - 5, 1.7, c2); };
    coral(10, 70, 18, '#ff6b81', '#ffb3c1'); coral(24, 72, 14, '#ff9f1c', '#ffd08a'); coral(60, 71, 20, '#b36bff', '#dcb8ff'); coral(72, 74, 15, '#ff6b81', '#ffb3c1'); coral(46, 74, 10, '#ff9f1c', '#ffd08a');
    // sea fan + brain coral
    const fan = L(g, 33, 72, 1); for (let a = -60; a <= 60; a += 12) { const r = a * Math.PI / 180; fan.line(0, 0, Math.sin(r) * 14, -Math.cos(r) * 14, 1, '#c9368a'); } for (let rr = 6; rr <= 14; rr += 4) for (let a = -60; a <= 60; a += 6) { const r = a * Math.PI / 180; fan.px(Math.round(Math.sin(r) * rr), Math.round(-Math.cos(r) * rr), '#ff7ac2'); }
    g.ell(52, 70, 8, 5, '#7bd3a0'); speckle(g, (c, x, y) => c === '#7bd3a0', '#4cae7c', 0.35, 8); g.disc(4, 74, 4, '#ffb3c1'); g.px(1, 72, '#ff6b81').px(5, 76, '#ff6b81');
    // seaweed
    [[18, 78, 20], [20, 79, 14], [66, 78, 22], [68, 79, 12], [40, 79, 16]].forEach(([x, y, h], i) => { for (let t = 0; t < h; t++) g.set(Math.round(x + Math.sin(t * 0.5 + i) * 2), y - t, i % 2 ? '#2e9b44' : '#49c760'); });
    // turtle
    const T = L(g, 38, 30, 1.2); T.ell(-9, 1, 3.6, 2.6, '#7bd3a0').ell(9, 3, 3.8, 2.4, '#7bd3a0', 20).ell(-7, 8, 3.4, 1.8, '#7bd3a0', -30).ell(8, 9, 3.4, 1.8, '#7bd3a0', 30).ell(0, 3, 10, 7.2, '#2f8f5b').ell(0, 2, 8.4, 5.8, '#4cae7c');
    T.ell(-14, 3, 3, 2.4, '#7bd3a0').px(-15, 2, '#22223b'); [[-4, -1], [0, -2], [4, -1], [-4, 4], [0, 5], [4, 4], [0, 1]].forEach(([x, y]) => T.px(x, y, '#2f8f5b')); T.ell(0, 2, 8.4, 5.8, '#4cae7c').ell(0, 2, 2.4, 2, '#2f8f5b').ell(-4.6, 1, 1.8, 1.6, '#2f8f5b').ell(4.6, 1, 1.8, 1.6, '#2f8f5b').ell(0, 6, 1.8, 1.2, '#2f8f5b').ell(0, -2.4, 1.8, 1.2, '#2f8f5b');
    // fish: clownfish, blue tang, yellow butterfly fish
    const clown = (x, y, s, flip) => { const f = L(g, x, y, s, flip); f.poly([[5, 0], [10, -4], [10, 4]], '#ff7a1a').ell(0, 0, 6, 4, '#ff7a1a').rect(-1, -4, 0, 4, '#f1f5ff').rect(3, -3, 3, 3, '#f1f5ff').px(-4, -1, '#22223b').px(-5, -1, '#f1f5ff'); f.poly([[-1, -4], [1, -6], [3, -4]], '#ff7a1a'); };
    clown(14, 24, 1, false); clown(62, 18, 1.2, true); clown(20, 44, 0.8, true);
    const tang = (x, y, s, flip) => { const f = L(g, x, y, s, flip); f.poly([[6, 0], [11, -5], [11, 5]], '#ffd93d').ell(0, 0, 7, 5, '#2f6fe8').poly([[-4, -2], [2, -1.6], [6, 0], [2, 1.6], [-4, 2], [-2, 0]], '#1b3f9a').px(-5, -1, '#22223b').poly([[-2, -5], [3, -6], [4, -4]], '#2f6fe8'); };
    tang(60, 52, 1.2, false); tang(12, 54, 0.9, true);
    const fly = (x, y, s, flip) => { const f = L(g, x, y, s, flip); f.ell(0, 0, 4.4, 5, '#ffe066').rect(-1, -5, 0, 5, '#22223b').poly([[3, 0], [7, -3], [7, 3]], '#ffe066').px(-3, -1, '#22223b').px(-2, 2, '#ff9f1c'); };
    fly(32, 56, 1, false); fly(70, 38, 0.9, true);
    for (const [x, y, r] of [[8, 8, 2.4], [11, 14, 1.6], [14, 5, 1.2], [50, 8, 2], [53, 13, 1.4], [74, 30, 1.6], [26, 40, 1.4], [29, 36, 1]]) { g.disc(x, y, r, '#d8f7fc'); g.px(Math.round(x - r / 3), Math.round(y - r / 3), '#ffffff'); }
    const sf = L(g, 9, 76, 1); sf.disc(0, 0, 1.4, '#e63946').poly([[-0.6, -1], [0, -4], [0.6, -1]], '#e63946').poly([[1, -0.5], [4, -1.8], [1.2, 0.8]], '#e63946').poly([[0.8, 0.8], [3, 3.4], [0, 1.4]], '#e63946').poly([[-0.8, 0.8], [-3, 3.4], [0, 1.4]], '#e63946').poly([[-1, -0.5], [-4, -1.8], [-1.2, 0.8]], '#e63946');
  });

  // ===== 5. Galaxy Voyage (100) =====
  add('grid-galaxy-voyage', 'Galaxy Voyage', 'space', 100, 100, (g) => {
    const nb = ['#0b0b2a', '#14123f', '#1f1a5a', '#34206e', '#4f2a7e', '#7a3a8c'];
    for (let y = 0; y < 100; y++) for (let x = 0; x < 100; x++) { const v = vnoise(x / 14, y / 14, 3) * 0.6 + vnoise(x / 6, y / 6, 4) * 0.4, d = Math.hypot(x - 50, y - 50) / 70; let t = v * 1.15 - d * 0.35; g.set(x, y, nb[Math.max(0, Math.min(5, Math.floor(t * 7.5 - 1.4)))]); }
    const r = rng(77); for (let i = 0; i < 160; i++) { const x = Math.floor(r() * 100), y = Math.floor(r() * 100); g.set(x, y, i % 6 === 0 ? '#ffd93d' : i % 7 === 0 ? '#74c0fc' : '#f1f5ff'); }
    [[12, 12], [88, 20], [30, 72], [92, 80], [60, 8], [8, 52]].forEach(([x, y], i) => star4(g, x, y, i % 2 ? '#ffd93d' : '#f1f5ff', i % 2 ? '#fff3b0' : '#b9c6ff'));
    // spiral galaxy (top right)
    for (let a = 0; a < 3.14 * 5; a += 0.04) for (const off of [0, Math.PI]) { const rad = 2 + a * 1.9, th = a + off, x = 76 + Math.cos(th) * rad, y = 24 + Math.sin(th) * rad * 0.55; if (rad < 22) { g.px(Math.round(x), Math.round(y), a < 6 ? '#fff3b0' : '#e6a8ff'); if (a > 3) g.px(Math.round(x) + 1, Math.round(y), '#a56bd6'); } }
    g.ell(76, 24, 4, 2.4, '#fff3b0');
    // gas giant with bands + ring (bottom left)
    const bands2 = ['#f4a259', '#e07a3f', '#f6c77d', '#c9602b', '#f2b36b']; g.disc(26, 74, 17, '#e07a3f'); g.paint((a, b) => Math.hypot(a - 26, b - 74) <= 17, '#e07a3f'); for (let y = 57; y < 92; y++) for (let x = 9; x < 44; x++) if (Math.hypot(x + 0.5 - 26, y + 0.5 - 74) <= 17) g.set(x, y, bands2[Math.floor((y + Math.sin(x * 0.3) * 1.5) / 3.2) % 5]);
    g.ell(23, 70, 3.6, 2, '#b8431f'); g.paint((a, b) => { const u = a - 26, v = (b - 74) / 0.28; const d = Math.hypot(u, v); return d > 20 && d < 27; }, '#e9e1c8'); g.paint((a, b) => { const u = a - 26, v = (b - 74) / 0.28; const d = Math.hypot(u, v); return d > 22 && d < 24.5 && (b > 74.5 || Math.hypot(a - 26, b - 74) > 17); }, '#bfb597');
    g.paint((a, b) => { const u = a - 26, v = (b - 74) / 0.28; const d = Math.hypot(u, v); return d > 20 && d < 27 && b < 74 && Math.hypot(a - 26, b - 74) <= 17; }, '#e07a3f'); for (let y = 57; y < 74; y++) for (let x = 9; x < 44; x++) if (Math.hypot(x + 0.5 - 26, y + 0.5 - 74) <= 17) g.set(x, y, bands2[Math.floor((y + Math.sin(x * 0.3) * 1.5) / 3.2) % 5]);
    // red planet with craters + moon
    g.disc(80, 70, 11, '#d6453d'); g.disc(80, 70, 11, '#d6453d'); g.paint((a, b) => Math.hypot(a - 80, b - 70) <= 11 && a - 80 > 3, '#b3332c'); g.disc(76, 66, 2.4, '#a32a24').disc(83, 74, 1.8, '#a32a24').disc(78, 75, 1.4, '#a32a24').disc(74, 71, 1, '#a32a24'); g.px(78, 63, '#f08a80').px(77, 64, '#f08a80');
    g.disc(63, 88, 4, '#cfd4e6'); g.disc(62, 87, 1.2, '#aab1c9'); g.disc(64.6, 89.4, 0.9, '#aab1c9');
    // space ship in the middle, flying right
    const S = L(g, 52, 44, 1.5); S.poly([[-14, 0], [-20, -5], [-20, 5]], '#ff9f1c').poly([[-14, 0], [-18, -2.4], [-18, 2.4]], '#ffd93d');
    S.ell(0, 0, 14, 5.2, '#d9deea').ell(0, 1.4, 14, 3.6, '#aeb6cc').poly([[-4, -4], [-10, -10], [-6, -4]], '#e63946').poly([[-4, 4], [-10, 10], [-6, 4]], '#e63946');
    S.poly([[8, -3], [16, 0], [8, 3]], '#e63946').ell(3, -2, 5, 3.6, '#4cc9f0').ell(2, -3.2, 2, 1.2, '#d7f6ff'); for (let k = -9; k <= 0; k += 3) S.px(k, 1, '#ffd93d');
    // astronaut
    const A = L(g, 20, 28, 1.1); A.rect(-2, 0, 3, 6, '#f1f5ff').disc(0.5, -3, 4, '#f1f5ff').ell(0.5, -3, 2.6, 2.2, '#2b6cb0').px(-0.5, -4, '#74c0fc').rect(-5, 1, -3, 5, '#b9c6ff').rect(-3, 6, -1, 10, '#f1f5ff').rect(1, 6, 3, 10, '#f1f5ff').rect(-3, 10, -1, 11, '#868e96').rect(1, 10, 3, 11, '#868e96').rect(3, 1, 7, 2, '#f1f5ff').rect(-6, 1, -2, 2, '#f1f5ff').rect(-1, 2, 2, 3, '#e63946');
    A.line(0, 11, -8, 20, 0.7, '#ffd93d');
    // comet
    g.line(92, 6, 70, 14, 1.4, '#9ad8ff'); g.line(92, 6, 78, 11, 2.2, '#d7f6ff'); g.disc(93, 5.6, 2.2, '#ffffff');
  });

  // ===== 6. Jungle Friends (90) =====
  add('grid-jungle-friends', 'Jungle Friends', 'animals', 90, 90, (g) => {
    bands(g, 0, 89, ['#1b5e3a', '#237a47', '#2f9b55', '#2f9b55', '#3fb768']);
    const r = rng(41);
    for (let i = 0; i < 26; i++) { const x = Math.floor(r() * 90), y = Math.floor(r() * 60); const l = L(g, x, y, 1 + r() * 0.8); l.ell(0, 0, 5, 2.2, i % 2 ? '#34a85a' : '#1f7a46', 30 * (i % 3 - 1)).line(-5, 0, 5, 0, 0.5, '#145a34'); }
    // big trunks + vines
    [[8, 0, 8], [78, 0, 9]].forEach(([x, , w]) => { g.rect(x, 0, x + w, 89, '#7a4a28'); g.rect(x + w - 2, 0, x + w, 89, '#5c371c'); speckle(g, (c) => c === '#7a4a28', '#965f35', 0.12, 12); });
    for (const [x0, x1] of [[18, 28], [60, 70]]) for (let y = 0; y < 52; y++) g.set(Math.round((x0 + x1) / 2 + Math.sin(y * 0.18 + x0) * 4), y, '#145a34'), g.set(Math.round((x0 + x1) / 2 + Math.sin(y * 0.18 + x0) * 4) + 1, y, '#1c7a45');
    // sun rays through the canopy
    for (let k = 0; k < 4; k++) for (let y = 0; y < 50; y++) for (let x = 36 + k * 7 + Math.floor(y * 0.3); x < 38 + k * 7 + Math.floor(y * 0.3); x++) { const c = g.get(x, y); if (c === '#237a47' || c === '#1b5e3a') g.set(x, y, '#2f9b55'); else if (c === '#2f9b55') g.set(x, y, '#4fcf7a'); }
    // forest floor
    hill(g, 76, 2, 0.12, 0.3, '#5b8f2a', '#86c244'); speckle(g, (c) => c === '#5b8f2a', '#477022', 0.15, 6); g.rect(0, 84, 89, 89, '#6b4a2a'); speckle(g, (c) => c === '#6b4a2a', '#563a20', 0.2, 7);
    // branch + monkey
    g.poly([[18, 40], [60, 34], [62, 38], [18, 45]], '#7a4a28'); g.rect(30, 38, 31, 40, '#5c371c');
    const M = L(g, 40, 22, 1); M.chain([[8, 16, 1.6], [14, 14, 1.5], [18, 10, 1.4]], '#8d5a2b'); M.ell(0, 12, 7, 8, '#8d5a2b').ell(0, 14, 4.6, 5.4, '#e6c08a').disc(0, 0, 7, '#8d5a2b').disc(-6, 0, 3, '#8d5a2b').disc(6, 0, 3, '#8d5a2b').disc(-6, 0, 1.6, '#e6c08a').disc(6, 0, 1.6, '#e6c08a').ell(0, 2, 5, 4.2, '#e6c08a').disc(-2.4, -1, 1.1, '#f1f5ff').disc(2.4, -1, 1.1, '#f1f5ff').px(-3, -1, '#22223b').px(2, -1, '#22223b').px(-1, 2, '#22223b').px(0, 2, '#22223b').rect(-2, 4, 1, 4, '#c2255c');
    M.chain([[-6, 14, 1.6], [-10, 22, 1.4], [-8, 27, 1.3]], '#8d5a2b'); M.chain([[6, 14, 1.6], [10, 22, 1.4], [8, 27, 1.3]], '#8d5a2b');
    // toucan on the left trunk
    const T = L(g, 24, 46, 1); T.ell(0, 0, 4.6, 7.4, '#22223b').ell(0.4, 2, 2.8, 4.4, '#f1f5ff').disc(0, -8, 4, '#22223b').poly([[2, -9], [14, -6], [13, -3], [2, -4]], '#ff9f1c').poly([[7, -8], [14, -6], [13, -4], [7, -5]], '#e63946').px(1, -9, '#f1f5ff').px(2, -9, '#22223b').poly([[-2, 6], [0, 13], [3, 6]], '#22223b').rect(-2, 8, 2, 8, '#ffd93d');
    // red macaw on the right
    const P = L(g, 68, 44, 1); P.poly([[-3, 6], [-6, 18], [0, 12], [-1, 6]], '#339af0').poly([[-1, 6], [1, 20], [4, 12], [3, 6]], '#ffd93d').ell(0, 0, 5.2, 8, '#e63946').ell(-3, 2, 3, 5.2, '#c92a2a').ell(3, 2, 2.6, 5, '#339af0', -10).disc(1, -8, 4, '#e63946').ell(3, -8, 2.4, 2.4, '#f1f5ff').px(2, -9, '#22223b').poly([[4, -9], [9, -7], [5, -5]], '#f1f5ff').poly([[5, -8], [8, -7], [5, -6]], '#22223b');
    // tiger peeking from the grass (bottom)
    const Tg = L(g, 50, 68, 1); Tg.disc(0, 6, 11, '#ff9f1c'); Tg.disc(-9, -3, 3.2, '#ff9f1c').disc(9, -3, 3.2, '#ff9f1c').disc(-9, -3, 1.5, '#f1f5ff').disc(9, -3, 1.5, '#f1f5ff').ell(0, 9, 6, 4.6, '#f1f5ff').rect(-1, 5, 1, 7, '#22223b').px(-2, 7, '#22223b').px(2, 7, '#22223b').px(0, 8, '#22223b');
    Tg.ell(-5, 2, 1.8, 1.4, '#7ed957').ell(5, 2, 1.8, 1.4, '#7ed957').px(-5, 2, '#22223b').px(5, 2, '#22223b'); [[-9, 6], [-8, 10], [9, 6], [8, 10], [-3, -2], [3, -2], [0, -4]].forEach(([x, y]) => Tg.px(x, y, '#22223b').px(x + (x < 0 ? 1 : -1), y, '#22223b')); Tg.line(-6, 9, -12, 8, 0.6, '#f1f5ff').line(6, 9, 12, 8, 0.6, '#f1f5ff');
    for (let x = 0; x < 90; x += 3) { const h = 3 + Math.floor(hash(x, 1, 5) * 6); for (let y = 0; y < h; y++) if (y + 74 < 88 && !(x > 36 && x < 64 && y + 74 > 70)) g.set(x, 80 - y + 8, '#3d8a2a'); }
    const fl = [['#ff6b81', '#ffd93d'], ['#ffd93d', '#ff9f1c'], ['#f1f5ff', '#ffd93d'], ['#b36bff', '#ffd93d']]; for (let i = 0; i < 26; i++) { const x = 3 + Math.floor(r() * 84), y = 78 + Math.floor(r() * 9); if (x > 34 && x < 66 && y < 82) continue; const [a, b] = fl[i % 4]; g.px(x, y, a).px(x - 1, y, a).px(x + 1, y, a).px(x, y - 1, a).px(x, y + 1, a).px(x, y, b); }
  });

  // ===== 7. Grand Mandala (100) =====
  add('grid-grand-mandala', 'Grand Mandala', 'fantasy', 100, 100, (g) => {
    const P = ['#2a1b5e', '#5b2a9a', '#9d4edd', '#ff6fa5', '#ff9f1c', '#ffd93d', '#51cf66', '#1fa59a', '#339af0', '#f1f5ff', '#e63946', '#0f1038'];
    for (let y = 0; y < 100; y++) for (let x = 0; x < 100; x++) {
      const dx = x + 0.5 - 50, dy = y + 0.5 - 50, rad = Math.hypot(dx, dy), th = Math.atan2(dy, dx);
      const seg = (n, off = 0) => ((th + Math.PI + off) / (2 * Math.PI) * n);
      const petal = (n, off = 0) => Math.abs(((seg(n, off)) % 1) - 0.5) * 2; // 0 centre .. 1 edge
      let c;
      if (rad < 4) c = P[5]; else if (rad < 6.5) c = P[10]; else if (rad < 9) c = petal(8) < 0.5 ? P[3] : P[4];
      else if (rad < 17) { const p = petal(8, 0.4); c = rad < 11 + (1 - p) * 6 ? (p < 0.35 ? P[9] : P[8]) : (p < 0.7 ? P[2] : P[1]); }
      else if (rad < 19) c = Math.floor(seg(24)) % 2 ? P[5] : P[4];
      else if (rad < 29) { const p = petal(12); c = (rad - 19) / 10 < 1 - p * 0.9 ? (p < 0.3 ? P[6] : P[7]) : P[0]; if (rad > 22 && p < 0.12) c = P[9]; }
      else if (rad < 31) c = P[10];
      else if (rad < 40) { const p = petal(16, 0.5); const edge = 31 + (1 - p) * 9; c = rad < edge ? (Math.floor(rad) % 3 === 0 ? P[3] : P[2]) : P[11]; if (rad < edge - 4 && p < 0.25) c = P[5]; }
      else if (rad < 42) c = P[9]; else if (rad < 47) { const b = Math.floor(seg(32)) % 2; c = (b ? P[8] : P[1]); if (rad > 43.5 && rad < 45.5 && Math.floor(seg(32, 0.1)) % 2 === 0) c = P[5]; }
      else c = (Math.floor(x / 2) + Math.floor(y / 2)) % 2 ? P[11] : P[0];
      if (rad > 47 && Math.abs(dx) + Math.abs(dy) < 66) c = P[11];
      g.set(x, y, c);
    }
    for (const [cx, cy] of [[6, 6], [93, 6], [6, 93], [93, 93]]) { g.disc(cx, cy, 5, '#ffd93d'); g.disc(cx, cy, 3.4, '#e63946'); g.disc(cx, cy, 1.6, '#f1f5ff'); }
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + 0.2, x = 50 + Math.cos(a) * 44, y = 50 + Math.sin(a) * 44; g.disc(x, y, 1.3, '#0f1038'); }
  });

  // ===== 8. City Lights (100) =====
  add('grid-city-lights', 'City Lights', 'vehicles', 100, 100, (g) => {
    bands(g, 0, 62, ['#1b2a6b', '#2e3d94', '#5a4fa3', '#9a5aa5', '#e07a8a', '#ffb27a']);
    const r = rng(5); for (let i = 0; i < 38; i++) g.set(Math.floor(r() * 100), Math.floor(r() * 26), '#f1f5ff'); g.disc(80, 20, 7, '#fff3c4'); g.disc(77, 18, 1.6, '#e8d89a'); g.disc(83, 23, 1.2, '#e8d89a');
    // hot air balloon
    const B = L(g, 24, 22, 1); B.ell(0, 0, 9, 11, '#e63946'); for (let k = -1; k <= 1; k++) B.ell(k * 4, 0, 2.6, 11, k === 0 ? '#ffd93d' : '#f1f5ff'); B.poly([[-5, 9], [5, 9], [3, 14], [-3, 14]], '#e63946').rect(-3, 16, 3, 20, '#8d5a2b').line(-4, 11, -3, 16, 0.5, '#22223b').line(4, 11, 3, 16, 0.5, '#22223b');
    // far skyline
    const heights = [30, 42, 36, 50, 34, 44, 38, 48, 32, 40, 52, 36, 44, 34, 46, 38, 30, 42, 36, 48]; heights.forEach((h, i) => { g.rect(i * 5, 78 - h, i * 5 + 4, 78, '#3b3a78'); if (i % 3 === 0) g.rect(i * 5 + 2, 78 - h - 5, i * 5 + 2, 78 - h, '#3b3a78'); });
    // main buildings
    const cols = [['#2a2a5e', '#ffd93d'], ['#3c2f6e', '#ffe98a'], ['#242b5c', '#ffd93d'], ['#41306f', '#9be0ff']]; let x = 0, i = 0; const rr = rng(8);
    while (x < 100) { const w = 8 + Math.floor(rr() * 7), h = 20 + Math.floor(rr() * 38), [b, win] = cols[i % 4]; const x1 = Math.min(99, x + w - 1); g.rect(x, 82 - h, x1, 86, b); g.rect(x1, 82 - h, x1, 86, '#1a1a40'); if (i % 4 === 1) { g.poly([[x - 1, 82 - h], [(x + x1) / 2 + 0.5, 82 - h - 6], [x1 + 2, 82 - h]], '#e63946'); } if (i % 4 === 3) g.rect(x + 2, 82 - h - 4, x + 3, 82 - h, '#9a9fb5');
      for (let wy = 82 - h + 3; wy < 83; wy += 4) for (let wx = x + 2; wx < x1 - 1; wx += 3) g.set(wx, wy, rr() < 0.66 ? win : '#1a1a40'), g.set(wx, wy + 1, rr() < 0.5 ? win : '#1a1a40'); x = x1 + 2; i++; }
    // road, pavement, vehicles
    g.rect(0, 86, 99, 99, '#3b3f50'); g.rect(0, 86, 99, 88, '#9a9fb5'); for (let rx = 2; rx < 100; rx += 10) g.rect(rx, 93, rx + 5, 93, '#ffd93d'); g.rect(0, 98, 99, 99, '#2a2d3c');
    const bus = L(g, 8, 87, 1); bus.rect(0, 0, 24, 7, '#ff9f1c').rect(0, 5, 24, 5, '#e07a00'); for (let k = 2; k < 22; k += 5) bus.rect(k, 1, k + 3, 3, '#9be0ff'); bus.disc(5, 8, 2.4, '#22223b').disc(19, 8, 2.4, '#22223b').px(5, 8, '#9a9fb5').px(19, 8, '#9a9fb5').px(24, 5, '#ffd93d');
    const car = (x, y, c, fl) => { const l = L(g, x, y, 1, fl); l.rect(0, 2, 14, 6, c).poly([[3, 2], [5, -1], [10, -1], [12, 2]], c).poly([[4.5, 1.6], [5.6, 0], [8, 0], [8, 1.6]], '#9be0ff').poly([[8.6, 1.6], [8.6, 0], [10, 0], [11, 1.6]], '#9be0ff').disc(3.5, 7, 1.8, '#22223b').disc(11, 7, 1.8, '#22223b').px(14, 4, '#ffd93d'); };
    car(44, 90, '#e63946', false); car(86, 94, '#339af0', true); car(66, 90, '#51cf66', false); car(30, 94, '#f1f5ff', true);
    for (const lx of [36, 58, 80]) { g.rect(lx, 76, lx, 87, '#1a1a40'); g.rect(lx, 76, lx + 3, 76, '#1a1a40'); g.disc(lx + 3.5, 77.5, 1.8, '#ffe98a'); }
  });

  // ===== 9. Happy Farm (80) =====
  add('grid-happy-farm', 'Happy Farm', 'animals', 80, 80, (g) => {
    bands(g, 0, 50, ['#79c8f7', '#9ad7f9', '#bde6fb', '#dcf2fd']); g.disc(66, 14, 7, '#ffe066'); for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5; g.line(66 + Math.cos(a) * 9, 14 + Math.sin(a) * 9, 66 + Math.cos(a) * 12, 14 + Math.sin(a) * 12, 1, '#ffe066'); }
    cloud(g, 6, 12, 1.3, '#ffffff', '#dbe9f7'); cloud(g, 34, 24, 1, '#ffffff', '#dbe9f7');
    hill(g, 42, 3, 0.07, 2, '#7fc45a', '#a5e07a'); hill(g, 50, 2.5, 0.09, 0, '#69ad48', '#8ccf68');
    // crop rows
    for (let y = 52; y < 66; y++) for (let x = 0; x < 80; x++) { const rowC = (y - 52) % 3; g.set(x, y, rowC === 0 ? '#c9a06a' : rowC === 1 ? '#5aa83c' : '#7cc654'); }
    g.rect(0, 66, 79, 79, '#7fc45a'); speckle(g, (c, x, y) => c === '#7fc45a' && y > 60, '#5e9f40', 0.14, 9); speckle(g, (c, x, y) => c === '#7fc45a' && y > 60, '#a5e07a', 0.08, 10);
    // barn
    g.rect(40, 36, 64, 58, '#c0392b'); g.rect(62, 36, 64, 58, '#9c2a1f'); g.poly([[38, 36], [52, 20], [66, 36]], '#7a4a28'); g.poly([[38, 36], [52, 20], [52, 21], [39, 36]], '#5c371c'); g.poly([[46, 36], [52, 27], [58, 36]], '#c0392b'); g.ell(52, 31, 2.4, 2.4, '#f1f5ff');
    g.rect(46, 44, 58, 58, '#f1f5ff'); g.rect(51, 44, 52, 58, '#c0392b'); for (let k = 0; k < 6; k++) g.px(46 + k * 2, 44 + k * 2, '#c0392b'), g.px(58 - k * 2, 44 + k * 2, '#c0392b'); g.rect(46, 44, 58, 44, '#c0392b'); g.rect(46, 58, 58, 58, '#c0392b');
    speckle(g, (c, x, y) => c === '#c0392b' && y < 44, '#a93226', 0.1, 11);
    // silo
    g.rect(28, 30, 37, 58, '#cfd6de'); g.rect(35, 30, 37, 58, '#a9b2bd'); g.ell(32.5, 30, 5, 5, '#9aa4b0'); for (let y = 34; y < 58; y += 4) g.rect(28, y, 37, y, '#aab3bd'); g.px(32, 38, '#6b7480');
    // fence
    for (let x = 0; x < 80; x += 6) { g.rect(x, 62, x + 1, 72, '#f1e4c3'); g.rect(x + 1, 62, x + 1, 72, '#d5c49a'); } g.rect(0, 65, 79, 66, '#f1e4c3'); g.rect(0, 69, 79, 70, '#f1e4c3');
    // cow
    const C = L(g, 8, 62, 1); C.rect(2, 4, 4, 11, '#f1f5ff').rect(10, 4, 12, 11, '#f1f5ff').ell(8, 3, 8, 5, '#f1f5ff').ell(4, 1, 3, 2.4, '#22223b').ell(11, 5, 2.6, 2, '#22223b').ell(-2, 0, 4, 3.6, '#f1f5ff').ell(-4, 2, 2.4, 2, '#f4a8b8').px(-3, -1, '#22223b').poly([[-4, -3], [-5, -6], [-2, -3]], '#f1f5ff').poly([[-1, -3], [-1, -6], [0, -3]], '#f1e4c3').px(-2, 3, '#22223b');
    C.line(15, 0, 17, 6, 0.6, '#22223b'); C.ell(8, 8, 3, 1.6, '#f4a8b8');
    // sheep, pig, chicken
    const Sh = L(g, 62, 66, 1); Sh.disc(0, 0, 4, '#f1f5ff').disc(5, 0, 3.4, '#f1f5ff').disc(-4, 1, 3.4, '#f1f5ff').disc(0, -3, 3, '#f1f5ff').ell(8.4, 1, 2.2, 2.6, '#3a3a52').px(9, 0, '#f1f5ff').rect(-2, 3, -1, 7, '#3a3a52').rect(3, 3, 4, 7, '#3a3a52');
    const Pg = L(g, 26, 66, 1); Pg.ell(0, 0, 6, 4.4, '#f4a8b8').ell(7, 0, 3.4, 3.2, '#f4a8b8').ell(10, 1, 1.6, 1.4, '#e8869a').px(8, -1, '#22223b').poly([[5, -3], [6, -6], [8, -3]], '#e8869a').rect(-4, 3, -3, 6, '#e8869a').rect(3, 3, 4, 6, '#e8869a').line(-6, -1, -8, -3, 0.6, '#e8869a');
    const Ch = L(g, 46, 70, 1); Ch.ell(0, 0, 3.6, 3, '#f1f5ff').disc(3, -3, 2, '#f1f5ff').px(5, -3, '#ff9f1c').px(3, -4, '#22223b').px(3, -6, '#e63946').px(2, -6, '#e63946').rect(0, 3, 0, 5, '#ff9f1c').rect(2, 3, 2, 5, '#ff9f1c').poly([[-4, -1], [-6, -4], [-3, 0]], '#d9d2ea');
    // tractor
    const Tr = L(g, 54, 74, 1); Tr.rect(0, 0, 9, 4, '#339af0').rect(8, -4, 12, 4, '#339af0').rect(9, -3, 11, 0, '#9be0ff').disc(3, 5, 3.6, '#22223b').disc(3, 5, 1.6, '#ffd93d').disc(12, 6, 2.2, '#22223b').disc(12, 6, 1, '#ffd93d').rect(-1, -3, 0, 0, '#22223b');
    // flowers + sunflowers
    for (let i = 0; i < 16; i++) { const x = 2 + i * 5 + (i % 3), y = 75 + (i % 2) * 2; g.px(x, y, i % 3 ? '#ff6b81' : '#ffd93d').px(x, y - 1, '#ffd93d').px(x, y + 1, '#3d8a2a'); }
  });

  // ===== 10. Fairy Garden (70) =====
  add('grid-fairy-garden', 'Fairy Garden', 'fantasy', 70, 70, (g) => {
    bands(g, 0, 44, ['#2b2d6e', '#3d3a8c', '#5c4aa3', '#8a5fb3']); const r = rng(14);
    for (let i = 0; i < 40; i++) g.set(Math.floor(r() * 70), Math.floor(r() * 24), i % 4 ? '#f1f5ff' : '#ffe98a');
    g.disc(56, 12, 6, '#fff3c4'); g.disc(54, 10, 1.2, '#e8d89a'); g.disc(58, 14, 1.6, '#e8d89a');
    hill(g, 42, 2, 0.16, 1, '#3b8a4e', '#62c070'); g.rect(0, 46, 69, 69, '#2f7a43'); speckle(g, (c) => c === '#2f7a43' || c === '#3b8a4e', '#276a39', 0.14, 3); speckle(g, (c) => c === '#2f7a43', '#4aa65d', 0.08, 4);
    // mushroom houses
    const house = (x, y, s, cap, dot) => { const l = L(g, x, y, s); l.rect(-5, 0, 5, 12, '#f6e6c8').rect(3, 0, 5, 12, '#dcc79f').ell(0, 0, 12, 9, cap).rect(-13, 0, 13, 1, cap); [[-7, -3], [0, -6], [7, -3], [-3, 0], [4, 1], [10, 0], [-11, 0]].forEach(([a, b]) => l.disc(a, b, 1.5, dot)); l.rect(-2, 5, 2, 12, '#8d5a2b').ell(0, 5, 2, 2, '#8d5a2b').px(0, 9, '#ffd93d').rect(-5, 3, -4, 5, '#ffe98a'); l.rect(3, 3, 4, 5, '#ffe98a'); };
    house(18, 36, 1.3, '#e63946', '#f1f5ff'); house(50, 40, 1.0, '#9d4edd', '#ffe98a'); house(36, 44, 0.7, '#ff9f1c', '#f1f5ff');
    // flowers and fireflies
    const fl = (x, y, c1, c2, h) => { for (let t = 0; t < h; t++) g.set(x, y + t, '#1f6a35'); g.px(x - 1, y, c1).px(x + 1, y, c1).px(x, y - 1, c1).px(x, y + 1, c1).px(x, y, c2); g.px(x + 1, y + 3, '#2c8a49').px(x + 2, y + 2, '#2c8a49'); };
    const fc = [['#ff6fa5', '#ffd93d'], ['#9be0ff', '#ffffff'], ['#ffd93d', '#ff9f1c'], ['#ff9f1c', '#ffe98a'], ['#c9a0ff', '#ffe98a']];
    for (let i = 0; i < 24; i++) { const x = 3 + Math.floor(r() * 64), y = 50 + Math.floor(r() * 16); const [a, b] = fc[i % 5]; fl(x, y, a, b, 3 + (i % 3)); }
    for (let i = 0; i < 18; i++) { const x = Math.floor(r() * 68), y = 18 + Math.floor(r() * 34); g.px(x, y, '#e8ff7a'); if (i % 3 === 0) g.px(x + 1, y, '#9fc936'); }
    // fairy
    const F = L(g, 34, 20, 1.15); F.ell(-8, -4, 8, 4.4, '#bfe8ff', -35).ell(8, -4, 8, 4.4, '#bfe8ff', 35).ell(-6, 3, 5, 2.8, '#e6f6ff', 30).ell(6, 3, 5, 2.8, '#e6f6ff', -30);
    F.poly([[-3, 2], [3, 2], [5, 12], [-5, 12]], '#ff6fa5').poly([[-5, 12], [5, 12], [7, 14], [-7, 14]], '#ff9ec7').rect(-2, 14, -1, 19, '#ffd7b0').rect(1, 14, 2, 19, '#ffd7b0').rect(-3, 19, -1, 19, '#ff6fa5').rect(1, 19, 3, 19, '#ff6fa5').disc(0, -2, 3.2, '#ffd7b0').disc(0, -4.6, 3.6, '#ffd93d').disc(-3.4, -3, 1.6, '#ffd93d').px(-1, -2, '#22223b').px(1, -2, '#22223b').px(0, 0, '#e63946');
    F.line(3, 6, 9, 2, 0.8, '#ffd7b0').line(8, 2, 11, -3, 0.5, '#8d5a2b'); star4(g, Math.round(34 + 11 * 1.15), Math.round(20 - 3 * 1.15), '#ffd93d', '#fff3b0');
    // butterflies
    const bf = (x, y, c, c2) => { g.px(x - 2, y - 1, c).px(x - 1, y - 1, c).px(x - 2, y, c2).px(x + 2, y - 1, c).px(x + 1, y - 1, c).px(x + 2, y, c2).px(x, y, '#22223b').px(x, y - 1, '#22223b'); }; bf(10, 24, '#ff9f1c', '#ffd93d'); bf(60, 30, '#9be0ff', '#339af0'); bf(12, 56, '#ff6fa5', '#ffd0e0');
  });

  // ===== 11. Snowy Village (80) =====
  add('grid-snowy-village', 'Snowy Village', 'nature', 80, 80, (g) => {
    bands(g, 0, 50, ['#16224f', '#1b3a6e', '#1f5a82', '#2a8a8e', '#5ab8a0']);
    for (let y = 0; y < 34; y++) for (let x = 0; x < 80; x++) { const v = Math.sin(x * 0.11 + Math.sin(y * 0.22) * 1.2 + 1) * 0.5 + 0.5; if (v > 0.74 && y > 5 + Math.sin(x * 0.07) * 4) g.set(x, y, v > 0.88 ? '#7be0a8' : '#2fae8a'); }
    const r = rng(23); for (let i = 0; i < 46; i++) g.set(Math.floor(r() * 80), Math.floor(r() * 30), '#f1f5ff'); g.disc(12, 12, 4.4, '#f6efc0'); g.disc(14, 11, 4, '#16224f'); g.disc(12, 12, 4.4, '#f6efc0'); g.disc(14, 10, 3.6, '#16224f');
    // mountains
    g.poly([[0, 52], [18, 26], [34, 52]], '#6d7fb5'); g.poly([[18, 26], [34, 52], [22, 52]], '#5a6ba3'); g.poly([[18, 26], [13, 35], [17, 33], [19, 36], [22, 33]], '#f1f5ff'); g.poly([[28, 52], [50, 20], [76, 52]], '#7f90c2'); g.poly([[50, 20], [76, 52], [56, 52]], '#6a7bb0'); g.poly([[50, 20], [43, 32], [48, 29], [51, 33], [55, 29]], '#f1f5ff'); g.poly([[58, 52], [72, 32], [80, 44], [80, 52]], '#6d7fb5');
    g.rect(0, 52, 79, 79, '#eef3ff'); hill(g, 54, 2.5, 0.1, 0.5, '#eef3ff', '#ffffff'); speckle(g, (c) => c === '#eef3ff', '#cfdcf5', 0.14, 3); speckle(g, (c) => c === '#eef3ff', '#ffffff', 0.1, 4);
    const pine = (x, y, s) => { const l = L(g, x, y, s); l.rect(-1, 0, 0, 4, '#6b4a2a'); l.poly([[-7, 1], [0.5, -8], [8, 1]], '#1f6a45').poly([[-6, -4], [0.5, -13], [7, -4]], '#2a8a58').poly([[-5, -9], [0.5, -17], [6, -9]], '#36a96c'); l.poly([[-3.6, -12], [0.5, -17], [4.6, -12]], '#f1f5ff'); l.poly([[-6, -3], [-2, -5.4], [2, -3]], '#f1f5ff'); l.poly([[-7, 1.6], [-3, -0.6], [1, 1.6]], '#f1f5ff'); };
    pine(6, 62, 1.1); pine(72, 60, 1.2); pine(14, 70, 0.9); pine(64, 72, 1); pine(76, 74, 0.8);
    const cabin = (x, y, w, h, wall, roof, dark) => { g.rect(x, y, x + w, y + h, wall); g.rect(x + w - 2, y, x + w, y + h, dark); g.poly([[x - 3, y], [x + w / 2 + 0.5, y - 9], [x + w + 4, y]], roof); g.poly([[x - 3, y], [x + w / 2 + 0.5, y - 9], [x + w / 2 + 0.5, y - 7.4], [x - 1.4, y]], '#f1f5ff'); g.poly([[x + w + 4, y], [x + w / 2 + 0.5, y - 9], [x + w / 2 + 0.5, y - 7.4], [x + w + 2.4, y]], '#f1f5ff'); g.rect(x + 2, y + 3, x + 4, y + 5, '#ffd93d'); g.rect(x + w - 6, y + 3, x + w - 4, y + 5, '#ffd93d'); g.rect(x + Math.floor(w / 2) - 1, y + h - 5, x + Math.floor(w / 2) + 1, y + h, '#5c371c'); g.rect(x + w - 3, y - 11, x + w - 2, y - 6, '#a55a3c'); g.rect(x + w - 3, y - 12, x + w - 2, y - 12, '#f1f5ff'); };
    cabin(26, 52, 14, 10, '#b8794a', '#c0392b', '#8d5a2b'); cabin(46, 56, 12, 9, '#d68b52', '#2b6cb0', '#a56a3a'); cabin(4, 52, 10, 8, '#c58b5a', '#8d3ba8', '#9a6a40');
    // path + snowman
    g.poly([[36, 62], [44, 62], [58, 79], [24, 79]], '#dbe6fb'); speckle(g, (c) => c === '#dbe6fb', '#c4d3f0', 0.2, 7);
    const S = L(g, 42, 66, 1); S.disc(0, 8, 6, '#ffffff').disc(0, 0, 4.6, '#ffffff').disc(0, -6, 3.4, '#ffffff').rect(-4, -10, 4, -9, '#22223b').rect(-2, -14, 2, -10, '#22223b').px(-1, -7, '#22223b').px(1, -7, '#22223b').poly([[0, -6], [4, -5.4], [0, -5]], '#ff7a1a').rect(-4, -4, 4, -3, '#e63946').px(0, 0, '#22223b').px(0, 3, '#22223b').px(0, 7, '#22223b').line(-4, 0, -9, -4, 0.6, '#6b4a2a').line(4, 0, 9, -3, 0.6, '#6b4a2a');
    for (let i = 0; i < 70; i++) { const x = Math.floor(r() * 80), y = Math.floor(r() * 78); const c = g.get(x, y); if (c === '#16224f' || c === '#1b3a6e' || c === '#1f5a82') g.px(x, y, '#ffffff'); }
  });

  // ===== 12. Pirate Bay (90) =====
  add('grid-pirate-bay', 'Pirate Bay', 'vehicles', 90, 90, (g) => {
    bands(g, 0, 52, ['#5aa0e8', '#8ab8f0', '#f6b26b', '#ffa04d', '#ff7a5a', '#e0506a']);
    g.disc(60, 50, 12, '#fff0a0'); g.disc(60, 50, 9, '#ffe066'); cloud(g, 8, 14, 1.4, '#ffd9b8', '#f0a98a'); cloud(g, 50, 8, 1.1, '#ffd9b8', '#f0a98a');
    bands(g, 52, 89, ['#2a95c9', '#2373b5', '#1c5596', '#173f78']); for (let y = 52; y < 90; y++) for (let x = 0; x < 90; x++) if ((x * 3 + y * 7) % 11 === 0 && y % 3 === 0) g.set(x, y, y < 62 ? '#5fcde6' : '#38b6dc');
    for (let y = 52; y < 64; y++) for (let x = 48; x < 72; x++) if (Math.abs(x - 60) < 11 - (y - 52) * 0.6 && (x + y) % 3 === 0) g.set(x, y, '#ffe066');
    // island with palm trees
    g.ell(70, 62, 22, 6, '#f2d49b'); g.ell(68, 61, 16, 4.4, '#7fc45a'); g.ell(78, 62, 7, 3, '#f2d49b'); speckle(g, (c) => c === '#f2d49b', '#d9b57a', 0.2, 3);
    const palm = (x, y, lean, s) => { const l = L(g, x, y, s); l.chain([[0, 0, 1.4], [lean * 0.4, -8, 1.2], [lean, -16, 1]], '#8d5a2b'); [-1, 1].forEach((d) => { l.chain([[lean, -16, 1], [lean + d * 6, -20, 1], [lean + d * 12, -15, 0.8]], '#2f9b55'); l.chain([[lean, -16, 1], [lean + d * 9, -17, 0.9], [lean + d * 14, -10, 0.7]], '#49c760'); l.chain([[lean, -16, 1], [lean + d * 3, -22, 0.9], [lean + d * 8, -26, 0.7]], '#2f9b55'); }); l.disc(lean - 1, -15, 1.4, '#6b4a2a').disc(lean + 1.4, -14.4, 1.4, '#6b4a2a'); };
    palm(64, 62, 4, 1.2); palm(78, 61, -5, 1); palm(72, 64, 2, 0.8);
    g.rect(80, 56, 82, 60, '#ffd93d'); g.poly([[78, 66], [86, 66], [84, 69], [80, 69]], '#8d5a2b'); g.rect(80, 66, 84, 67, '#ffd93d'); g.px(82, 65, '#e63946');
    // pirate ship
    const Sh = L(g, 30, 60, 1.25); Sh.poly([[-16, 0], [18, 0], [13, 8], [-11, 8]], '#7a4a28').poly([[-16, 0], [18, 0], [17, 2], [-15, 2]], '#5c371c').rect(-14, 3, 15, 3, '#9a6a40'); for (let k = -10; k <= 10; k += 5) Sh.disc(k, 5, 1, '#22223b');
    Sh.rect(-1, -26, 0, 0, '#5c371c').rect(-12, -18, -11, 0, '#5c371c').rect(11, -16, 12, 0, '#5c371c');
    Sh.poly([[-9, -24], [8, -24], [10, -8], [-10, -8]], '#f1e4c3').poly([[8, -24], [10, -8], [4, -8]], '#d9c9a0').poly([[-9, -7], [9, -7], [10, -1], [-10, -1]], '#f1e4c3').disc(0, -16, 3.6, '#22223b').px(-1, -17, '#f1f5ff').px(1, -17, '#f1f5ff').rect(-1, -14, 1, -13, '#f1f5ff');
    Sh.poly([[-18, -16], [-12, -17], [-12, -8], [-18, -7]], '#f1e4c3').poly([[13, -14], [19, -12], [13, -6]], '#f1e4c3').poly([[1, -26], [10, -29], [1, -32]], '#22223b').rect(1, -30, 1, -28, '#f1f5ff'); Sh.px(2, -29, '#f1f5ff');
    Sh.poly([[16, 0], [22, -3], [22, 2], [18, 2]], '#7a4a28');
    // waves in front + sea creatures
    for (let x = 0; x < 90; x++) { const y = 74 + Math.round(Math.sin(x * 0.35) * 1.4); g.set(x, y, '#5fcde6'); g.set(x, y + 1, '#2a95c9'); } for (let x = 0; x < 90; x++) { const y = 84 + Math.round(Math.sin(x * 0.28 + 2) * 1.6); g.set(x, y, '#38b6dc'); }
    const fin = L(g, 14, 72, 1); fin.poly([[0, 4], [4, -6], [8, 4]], '#8fa3b8'); fin.rect(-4, 4, 12, 5, '#8fa3b8'); fin.poly([[0, 4], [4, -6], [4, 4]], '#6f8399');
    const w = L(g, 56, 82, 1); w.ell(0, 0, 9, 4.4, '#4a7bd0').ell(0, 1.6, 8, 2.6, '#cfd8ff').poly([[8, 0], [14, -5], [13, 3]], '#4a7bd0').px(-5, -1, '#22223b').line(-4, -4, -4, -9, 0.6, '#9be0ff').line(-4, -9, -7, -11, 0.6, '#9be0ff').line(-4, -9, -1, -11, 0.6, '#9be0ff');
    const tr = L(g, 10, 82, 1); tr.rect(0, 0, 10, 6, '#8d5a2b').rect(0, 0, 10, 2, '#a56a3a').rect(0, 3, 10, 3, '#ffd93d').px(5, 4, '#ffd93d').disc(2, -2, 1.4, '#ffd93d').disc(5, -3, 1.6, '#ffe066').disc(8, -2, 1.4, '#ffd93d');
    for (let i = 0; i < 6; i++) g.px(4 + i * 15, 56 + (i % 3), '#f1f5ff').px(5 + i * 15, 55 + (i % 3), '#f1f5ff').px(6 + i * 15, 56 + (i % 3), '#f1f5ff');
  });

  // ===== 13. Dino Valley (120) =====
  add('grid-dino-valley', 'Dino Valley', 'dinosaurs', 120, 120, (g) => {
    bands(g, 0, 80, ['#ffb38a', '#ffc49a', '#ffd7a8', '#ffe6b8', '#fff0c8', '#ffe6b8']);
    g.disc(30, 26, 12, '#fff6d6'); g.disc(30, 26, 9, '#ffe27a'); cloud(g, 50, 14, 1.8, '#fff3e0', '#f2cfa8'); cloud(g, 84, 30, 1.4, '#fff3e0', '#f2cfa8'); cloud(g, 6, 50, 1.2, '#fff3e0', '#f2cfa8');
    // volcano with lava + smoke
    g.poly([[60, 90], [86, 38], [96, 38], [124, 90]], '#7a5a4a'); g.poly([[90, 38], [96, 38], [124, 90], [100, 90]], '#634838'); g.poly([[84, 38], [98, 38], [95, 44], [92, 41], [89, 45], [86, 42]], '#e8503a'); g.poly([[91, 44], [93, 54], [90, 62], [94, 74], [91, 90], [97, 90], [96, 70], [98, 56], [95, 44]], '#e8503a'); g.poly([[92, 46], [93, 54], [92, 60]], '#ffb347');
    [[91, 32, 5], [96, 26, 6.5], [90, 18, 7.5], [98, 10, 8]].forEach(([x, y, r], i) => { g.disc(x, y, r, '#8d8d9b'); g.disc(x - 1.5, y - 1.5, r * 0.7, '#a9a9b8'); });
    [[84, 30], [100, 34], [104, 20]].forEach(([x, y]) => g.px(x, y, '#ff9f1c'));
    // distant mountains
    g.poly([[0, 90], [0, 70], [14, 56], [30, 74], [44, 62], [64, 90]], '#9c8ec4'); g.poly([[14, 56], [10, 64], [14, 62], [17, 66]], '#e9e3f7');
    // ground
    hill(g, 90, 2, 0.1, 1, '#6fb04a', '#96d46c'); g.rect(0, 94, 119, 119, '#5da03b'); speckle(g, (c) => c === '#6fb04a' || c === '#5da03b', '#4b8a2e', 0.1, 3); speckle(g, (c) => c === '#5da03b', '#8bcf62', 0.06, 4);
    g.rect(0, 108, 119, 119, '#8a6a3f'); hill(g, 106, 1.5, 0.2, 0.5, '#8a6a3f', '#a98353'); speckle(g, (c) => c === '#8a6a3f', '#6f5330', 0.2, 5); speckle(g, (c) => c === '#8a6a3f', '#b0905d', 0.06, 6);
    // palms / ferns / cycads
    const fern = (x, y, s, c1, c2) => { const l = L(g, x, y, s); l.rect(-1, -14, 0, 0, '#7a5a3a'); for (let a = -80; a <= 80; a += 20) { const r2 = a * Math.PI / 180; l.line(0, -14, Math.sin(r2) * 14, -14 - Math.cos(r2) * 9 + Math.abs(a) * 0.12, 1, a % 40 ? c1 : c2); } l.disc(0, -14, 1.6, c2); };
    fern(8, 98, 1.4, '#3f9b3a', '#5fc153'); fern(112, 100, 1.3, '#3f9b3a', '#5fc153'); fern(46, 96, 1, '#357f31', '#58b24d'); fern(70, 94, 0.9, '#3f9b3a', '#5fc153');
    // brontosaurus (long neck) middle-left
    const B = L(g, 14, 70, 1.5); const BG = '#4aa39a', BD = '#357f78', BL = '#a6e0d4';
    B.chain([[28, 24, 3.4], [34, 20, 3], [40, 8, 2.4], [42, -4, 2], [41, -14, 1.7]], BG); B.ell(14, 26, 18, 9, BG); B.chain([[-4, 26, 4], [-14, 30, 3], [-24, 34, 2], [-34, 33, 1.4], [-40, 29, 0.8]], BG);
    B.ell(14, 31, 14, 4.4, BL, 0); B.ell(44, -16, 3.6, 2.6, BG).px(46, -17, '#22223b').px(47, -15, BD).px(45, -20, BD).px(42, -19, BD);
    [[2, 36], [10, 36], [22, 36], [30, 36]].forEach(([x, y], i) => { B.rect(x - 2, y - 4, x + 2, y + 12, i % 2 ? BD : BG); B.rect(x - 3, y + 11, x + 3, y + 13, i % 2 ? '#2b605b' : BD); });
    [[6, 18], [12, 15], [18, 14], [24, 16], [29, 19]].forEach(([x, y]) => B.disc(x, y, 1.4, BD)); [[8, 24], [20, 22], [14, 28]].forEach(([x, y]) => B.disc(x, y, 1.1, BD));
    // T-rex small (right foreground)
    const T = L(g, 96, 80, 0.75, true); const O = '#e9873a', OD = '#b9591a', CR = '#ffe3b3';
    T.poly([[33, 21], [49.2, 31.4], [49.2, 33.6], [31, 34]], O).ell(27, 27, 11.5, 8.2, O, -12).ell(25, 31.6, 9, 4.4, CR).poly([[19, 33], [30, 31], [28.4, 41], [31, 43.4], [31.4, 46.6], [17, 46.6], [18, 43], [18, 39]], O).poly([[27, 33], [37, 31], [35, 42], [37.6, 44], [38, 46.6], [26, 46.6], [26.6, 43], [26, 39]], OD);
    T.poly([[17, 24], [14, 14], [24, 11], [26, 24]], O).poly([[3, 14], [14, 7.4], [24, 8.6], [24, 18.4], [6, 18.4]], O).poly([[6, 19.6], [22, 19.6], [24, 22.4], [10, 22.6]], OD).poly([[5, 18.4], [23, 18.4], [22, 19.8], [6, 19.8]], '#c92a2a'); for (let x = 6; x <= 21; x += 3) T.px(x, 19, '#ffffff'); T.ell(14.4, 11.4, 2.3, 2.1, '#ffffff').px(14, 11, '#22223b').px(14, 12, '#22223b').poly([[13, 25], [8, 28], [8.4, 30], [13.6, 28]], OD);
    // triceratops (left foreground)
    const C = L(g, 12, 100, 1.1); const CG = '#8a7ac2', CD = '#6a5ba3', CL = '#cfc6f0';
    C.ell(14, 8, 12, 7, CG).ell(14, 12, 10, 3.6, CL).poly([[26, 6], [32, 12], [36, 12], [34, 8]], CG).ell(-2, 6, 7, 5.6, CG).ell(-8, 8, 4, 3.4, CG).ell(2, -1, 8.4, 8.4, CD).ell(2, -1, 6.6, 6.6, '#c7a0e6').poly([[-6, 2], [-16, 0], [-8, 4]], '#f1e4c3').poly([[-3, -3], [-10, -10], [-1, -5]], '#f1e4c3').poly([[3, -4], [4, -13], [7, -5]], '#f1e4c3');
    C.px(-3, 5, '#22223b'); [[4, 14], [10, 14], [20, 14], [26, 14]].forEach(([x, y], i) => C.rect(x - 2, y, x + 1, y + 6, i % 2 ? CD : CG)); for (let a = -150; a < -40; a += 18) { const r2 = a * Math.PI / 180; C.disc(2 + Math.cos(r2) * 8, -1 + Math.sin(r2) * 8, 1.2, '#ffd93d'); }
    // pterodactyls + eggs + footprints
    const pt = (x, y, s) => { const l = L(g, x, y, s); l.poly([[0, 0], [-12, -6], [-16, 2], [-6, 0]], '#d9534f').poly([[0, 0], [12, -6], [16, 2], [6, 0]], '#d9534f').ell(0, 0, 3.6, 2, '#a8332f').poly([[3, -1], [10, -2], [3, 1]], '#a8332f').poly([[-2, -2], [-6, -6], [-1, -1]], '#a8332f').px(2, -1, '#ffffff'); }; pt(40, 28, 1); pt(60, 40, 0.8); pt(20, 40, 0.7);
    const egg = (x, y) => { g.ell(x, y, 3, 4, '#f1ead8'); g.px(x - 1, y - 1, '#c9a96b').px(x + 1, y + 1, '#c9a96b').px(x, y + 2, '#c9a96b'); }; egg(58, 112); egg(64, 114); egg(61, 109);
    for (let i = 0; i < 7; i++) { const x = 70 + i * 6, y = 112 + (i % 2) * 2; g.px(x, y, '#6f5330').px(x + 1, y, '#6f5330').px(x, y - 1, '#6f5330').px(x + 2, y - 1, '#6f5330'); }
  });

  // ===== 14. Candy Land (120) =====
  add('grid-candy-land', 'Candy Land', 'food', 120, 120, (g) => {
    bands(g, 0, 90, ['#ffb8e0', '#ffc9ea', '#ffdcf0', '#d9ccff', '#c4d7ff', '#b2e8ff']);
    const r = rng(88); for (let i = 0; i < 30; i++) { const x = Math.floor(r() * 118), y = Math.floor(r() * 40); star4(g, x + 1, y + 1, i % 2 ? '#ffffff' : '#fff3b0'); }
    cloud(g, 6, 20, 1.8, '#ffffff', '#ffe0f2'); cloud(g, 70, 14, 2, '#ffffff', '#ffe0f2'); cloud(g, 42, 44, 1.3, '#ffffff', '#ffe0f2');
    // ice cream cone mountains
    const cone = (x, base, w, h, scoop, drip) => { g.poly([[x - w, base - h * 0.35], [x + w, base - h * 0.35], [x, base]], '#e9a85c'); for (let k = 0; k < 7; k++) g.line(x - w + k * w * 0.33, base - h * 0.35, x - w * 0.5 + k * w * 0.33 - w, base, 0.5, '#c47a30'); g.ell(x, base - h * 0.4, w * 1.1, h * 0.2, scoop); g.disc(x, base - h * 0.6, w * 0.9, scoop); g.disc(x, base - h * 0.95, 2.4, '#e63946'); g.px(x, base - h - 1, '#2f9e44'); for (let k = -2; k <= 2; k++) g.rect(Math.round(x + k * w * 0.4) - 1, base - h * 0.4, Math.round(x + k * w * 0.4), base - h * 0.4 + 3 + (k % 2 ? 2 : 4), drip); };
    cone(14, 88, 14, 54, '#ff8fc7', '#ff8fc7'); cone(104, 90, 12, 46, '#9be0d4', '#9be0d4');
    // candy castle (centre)
    g.rect(40, 54, 78, 94, '#ffe6f2'); g.rect(76, 54, 78, 94, '#f2c4dc'); for (let y = 54; y < 94; y += 4) g.rect(40, y, 78, y, '#ffb8d9'); 
    const tow = (x0, x1, top, c, cd, roof) => { g.rect(x0, top, x1, 94, c); g.rect(x1 - 2, top, x1, 94, cd); for (let y = top; y < 94; y += 3) g.rect(x0, y, x1, y, y % 6 === 0 ? '#f1f5ff' : c); g.poly([[x0 - 2, top], [(x0 + x1 + 1) / 2, top - 14], [x1 + 3, top]], roof); g.disc((x0 + x1 + 1) / 2, top - 15, 2.2, '#e63946'); };
    tow(34, 44, 40, '#ff8fc7', '#e0609f', '#7ad7c8'); tow(74, 84, 40, '#9be0d4', '#6cc1b2', '#ff8fc7'); tow(52, 66, 26, '#ffd93d', '#e0b400', '#b36bff');
    g.rect(55, 44, 58, 49, '#b36bff'); g.rect(61, 44, 64, 49, '#b36bff'); g.ell(59, 78, 6, 7, '#8d5a2b'); g.rect(53, 78, 65, 94, '#8d5a2b'); g.rect(58, 78, 59, 94, '#6b4423'); g.disc(63, 86, 1, '#ffd93d');
    for (const [x, y] of [[37, 52], [40, 62], [78, 52], [80, 62], [46, 70], [72, 70]]) g.disc(x, y, 1.7, '#ff6b81');
    // ground: chocolate river + candy-sprinkle meadow
    g.rect(0, 94, 119, 119, '#9ae38d'); hill(g, 93, 2, 0.12, 1, '#9ae38d', '#c4f2b8'); speckle(g, (c) => c === '#9ae38d', '#7bd16f', 0.12, 3);
    for (let y = 104; y < 120; y++) for (let x = 0; x < 120; x++) { const cx = 60 + Math.sin(y * 0.35 + 1) * 10, hw = 20 + (y - 104) * 1.8; if (Math.abs(x - cx) < hw) g.set(x, y, (x + y) % 9 === 0 ? '#8d5a3a' : '#6b4226'); }
    const lolli = (x, y, h, c1, c2) => { g.rect(x, y, x, y + h, '#f1f5ff'); g.disc(x, y - 1, 5.4, c1); for (let a = 0; a < 6.28; a += 0.2) { const rr = a * 0.8; g.px(Math.round(x + Math.cos(a * 2) * Math.min(5, rr)), Math.round(y - 1 + Math.sin(a * 2) * Math.min(5, rr)), c2); } };
    lolli(8, 98, 14, '#ff8fc7', '#ffffff'); lolli(24, 100, 12, '#9be0d4', '#ffffff'); lolli(98, 98, 14, '#ffd93d', '#ff6b81'); lolli(112, 100, 12, '#b36bff', '#ffffff');
    // cupcake trees
    const cup = (x, y, s, fr, cherry) => { const l = L(g, x, y, s); l.poly([[-6, 0], [6, 0], [4, 9], [-4, 9]], '#e9a85c'); for (let k = -4; k <= 4; k += 2) l.line(k, 0, k * 0.6, 9, 0.4, '#c47a30'); l.ell(0, -1, 7, 3.4, fr).ell(0, -5, 5.4, 3.4, fr).ell(0, -8.5, 3.4, 2.6, fr).disc(0, -11.5, 1.8, cherry); [[-4, -2], [3, -3], [0, -6], [-2, -8]].forEach(([a, b]) => l.px(a, b, '#ffffff')); };
    cup(40, 98, 1.4, '#ff8fc7', '#e63946'); cup(82, 100, 1.2, '#9be0d4', '#e63946'); cup(66, 106, 0.9, '#ffd93d', '#e63946');
    // candy canes, gumdrops, rainbow
    const cane = (x, y, h) => { for (let t = 0; t < h; t++) g.px(x, y - t, t % 4 < 2 ? '#e63946' : '#ffffff'); for (let a = 0; a < 3.2; a += 0.25) g.px(Math.round(x + 3 - Math.cos(a) * 3), Math.round(y - h - Math.sin(a) * 3), Math.round(a * 4) % 4 < 2 ? '#e63946' : '#ffffff'); };
    cane(30, 100, 14); cane(90, 100, 12); cane(49, 106, 9);
    [[16, 108, '#e63946'], [20, 110, '#ffd93d'], [100, 108, '#339af0'], [104, 111, '#51cf66'], [34, 112, '#b36bff'], [88, 112, '#ff9f1c']].forEach(([x, y, c]) => { g.ell(x, y, 3.4, 2.8, c); g.px(x - 1, y - 1, '#ffffff'); });
    R6.forEach((c, i) => { const ro = 22 - i * 1.5, ri = ro - 1.5; g.paint((a, b) => { const d = Math.hypot(a - 60, b - 30); return d <= ro && d > ri && b < 31 && b > 8 && a > 30 && a < 90 && !(a > 50 && a < 70 && b > 16 && b < 30 && false); }, c); });
    star4(g, 100, 50, '#ffd93d', '#fff3b0'); star4(g, 24, 56, '#ffffff', '#ffe0f2');
    for (let i = 0; i < 90; i++) { const x = Math.floor(r() * 118) + 1, y = 96 + Math.floor(r() * 10); if (g.get(x, y) === '#9ae38d' || g.get(x, y) === '#c4f2b8') g.px(x, y, ['#ff6b81', '#ffd93d', '#339af0', '#b36bff', '#ffffff'][i % 5]); }
  });
}
