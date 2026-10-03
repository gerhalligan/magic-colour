// Background decoration scatter (adds detail/regions behind the main subject). Deterministic.
import { S, C, E, P, D, R, pol } from './lib.mjs';
function rnd(seed) { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }
const shapes = {
  star: (x, y, s, c) => S(x, y, 42 * s, 18 * s, 5, c, (x * 7) % 30),
  dot: (x, y, s, c) => C(x, y, 28 * s, c),
  heart: (x, y, s, c) => D(`M${x} ${y + 34 * s}C${x - 70 * s} ${y - 10 * s} ${x - 30 * s} ${y - 50 * s} ${x} ${y - 14 * s}C${x + 30 * s} ${y - 50 * s} ${x + 70 * s} ${y - 10 * s} ${x} ${y + 34 * s}Z`, c),
  diamond: (x, y, s, c) => P([[x, y - 40 * s], [x + 30 * s, y], [x, y + 40 * s], [x - 30 * s, y]], c),
  flower: (x, y, s, c) => [0, 1, 2, 3, 4].map((i) => { const [a, b] = pol(x, y, 28 * s, i * 72 - 90); return C(a, b, 22 * s, c); }).join('') + C(x, y, 20 * s, '#ffd93d'),
  bird: (x, y, s, c) => D(`M${x - 50 * s} ${y}Q${x - 25 * s} ${y - 40 * s} ${x} ${y}Q${x + 25 * s} ${y - 40 * s} ${x + 50 * s} ${y}L${x + 50 * s} ${y + 18 * s}Q${x + 25 * s} ${y - 14 * s} ${x} ${y + 18 * s}Q${x - 25 * s} ${y - 14 * s} ${x - 50 * s} ${y + 18 * s}Z`, c),
  leaf: (x, y, s, c) => E(x, y, 20 * s, 40 * s, c, (x * 3) % 70 - 35),
};
const BASE = { star: 14.5, dot: 28, heart: 17, diamond: 24, flower: 17, bird: 8, leaf: 20 };
const NEED = { easy: 30, medium: 18, hard: 10.5 };
export function scatter({ kind = 'star', n = 8, box = [0, 0, 1000, 300], colours = ['#fff'], seed = 1, size = 1, gap = 120, diff = 'medium' }) {
  size = Math.max(size, NEED[diff] / BASE[kind]); gap = Math.max(gap * 0.8, 2.6 * NEED[diff]);
  const r = rnd(seed), pts = []; let tries = 0;
  while (pts.length < n && tries++ < 4000) {
    const x = box[0] + r() * (box[2] - box[0]), y = box[1] + r() * (box[3] - box[1]);
    if (pts.every(([a, b]) => Math.hypot(a - x, b - y) > gap * size)) pts.push([Math.round(x), Math.round(y)]);
  }
  return pts.map(([x, y], i) => shapes[kind](x, y, size * (0.85 + 0.3 * r()), colours[i % colours.length])).join('');
}
