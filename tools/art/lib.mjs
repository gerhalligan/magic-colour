// Tiny SVG helpers for the hand-authored (procedural) source pictures. Canvas is 1000x1000. Flat colours only, no strokes/gradients.
export const svg = (body, bg = '#ffffff') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" shape-rendering="geometricPrecision"><rect width="1000" height="1000" fill="${bg}"/>${body}</svg>`;
const tf = (rot, cx, cy) => (rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : '');
export const E = (cx, cy, rx, ry, f, rot = 0) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${f}"${tf(rot, cx, cy)}/>`;
export const C = (cx, cy, r, f) => E(cx, cy, r, r, f);
export const R = (x, y, w, h, f, r = 0, rot = 0) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${f}"${tf(rot, x + w / 2, y + h / 2)}/>`;
export const P = (pts, f) => `<polygon points="${pts.map((p) => p.join(',')).join(' ')}" fill="${f}"/>`;
export const D = (d, f) => `<path d="${d}" fill="${f}"/>`;
export const S = (cx, cy, r1, r2, n, f, rot = 0) => { const pts = []; for (let i = 0; i < n * 2; i++) { const a = rot * Math.PI / 180 - Math.PI / 2 + i * Math.PI / n, r = i % 2 ? r2 : r1; pts.push([+(cx + r * Math.cos(a)).toFixed(1), +(cy + r * Math.sin(a)).toFixed(1)]); } return P(pts, f); };
export const G = (t, ...c) => `<g transform="${t}">${c.join('')}</g>`;
export const rep = (n, fn) => Array.from({ length: n }, (_, i) => fn(i)).join('');
export const mirror = (x, ...c) => G(`translate(${2 * x} 0) scale(-1 1)`, ...c); // mirror of children around vertical axis x
export const pol = (cx, cy, r, deg) => [cx + r * Math.cos(deg * Math.PI / 180), cy + r * Math.sin(deg * Math.PI / 180)];
/** Ring sector (annular wedge) between radii r0..r1 and angles a0..a1 (degrees) */
export const sector = (cx, cy, r0, r1, a0, a1, f) => { const [x0, y0] = pol(cx, cy, r1, a0), [x1, y1] = pol(cx, cy, r1, a1), [x2, y2] = pol(cx, cy, r0, a1), [x3, y3] = pol(cx, cy, r0, a0); const big = Math.abs(a1 - a0) > 180 ? 1 : 0; const sw = a1 > a0 ? 1 : 0; return D(`M${x0.toFixed(1)} ${y0.toFixed(1)}A${r1} ${r1} 0 ${big} ${sw} ${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}A${r0} ${r0} 0 ${big} ${1 - sw} ${x3.toFixed(1)} ${y3.toFixed(1)}Z`, f); };
/** a puffy cloud */
export const cloud = (x, y, s, f) => C(x, y, 55 * s, f) + C(x + 60 * s, y - 30 * s, 70 * s, f) + C(x + 135 * s, y, 58 * s, f) + R(x - 5 * s, y, 145 * s, 58 * s, f, 20 * s);
export const COL = { navy: '#24306e', sky: '#9bdcff', skyL: '#cdeeff', white: '#ffffff', black: '#2b2d42', red: '#ee4b4b', orange: '#ff9a3c', yellow: '#ffd93d', green: '#4cbb5a', lime: '#a9dc5a', dgreen: '#1f8a4c', teal: '#2ec4b6', blue: '#3a86ff', purple: '#9b5de5', pink: '#ff8fc7', hotpink: '#f15bb5', brown: '#8d5524', tan: '#f2c98f', grey: '#9aa5b1', lgrey: '#e3e8ee', dgrey: '#4a5568' };
