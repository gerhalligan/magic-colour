// Procedural "ink outline" Shapes scenes (v1.11.0): flat colours with dark outlines, rendered to PNG and then converted with
// tools/make-picture.mjs --ink --ink-split (every outlined piece stays its own area, so these give big Hard pictures with 250-400 areas).
// Not part of `npm run pictures` re-rendering (file name does not match easy|medium|hard*); the rendered PNGs live in art/source/.
//   node tools/art/ink-scenes.mjs [outDir] [id...]
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const INK = '#1b1b2f';
const st = (w = 5) => ` stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const f1 = (n) => +n.toFixed(1);
const poly = (pts, f, w) => `<polygon points="${pts.map(([x, y]) => f1(x) + ',' + f1(y)).join(' ')}" fill="${f}"${st(w)}/>`;
const circ = (cx, cy, r, f, w) => `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}" fill="${f}"${st(w)}/>`;
const ell = (cx, cy, rx, ry, f, rot = 0, w) => `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="${f}"${rot ? ` transform="rotate(${rot} ${f1(cx)} ${f1(cy)})"` : ''}${st(w)}/>`;
const pth = (d, f, w) => `<path d="${d}" fill="${f}"${st(w)}/>`;
const line = (x0, y0, x1, y1, w = 5) => `<path d="M${f1(x0)} ${f1(y0)}L${f1(x1)} ${f1(y1)}" fill="none"${st(w)}/>`;
const svg = (body, bg = '#ffffff') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><rect width="1000" height="1000" fill="${bg}"/>${body}</svg>`;
const rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const pol = (cx, cy, r, deg) => [cx + r * Math.cos(deg * Math.PI / 180), cy + r * Math.sin(deg * Math.PI / 180)];
const star = (cx, cy, r1, r2, n, f, rot = 0, w = 4) => { const p = []; for (let i = 0; i < n * 2; i++) p.push(pol(cx, cy, i % 2 ? r2 : r1, rot - 90 + i * 180 / n)); return poly(p, f, w); };
const sector = (cx, cy, r0, r1, a0, a1, f, w) => { const [x0, y0] = pol(cx, cy, r1, a0), [x1, y1] = pol(cx, cy, r1, a1), [x2, y2] = pol(cx, cy, r0, a1), [x3, y3] = pol(cx, cy, r0, a0); return pth(`M${f1(x0)} ${f1(y0)}A${r1} ${r1} 0 0 1 ${f1(x1)} ${f1(y1)}L${f1(x2)} ${f1(y2)}A${r0} ${r0} 0 0 0 ${f1(x3)} ${f1(y3)}Z`, f, w); };
/** clip a polygon by the half-plane a*x + b*y <= c (Sutherland-Hodgman, one edge) */
const clipHP = (pts, a, b, c) => { const out = []; for (let i = 0; i < pts.length; i++) { const P = pts[i], Q = pts[(i + 1) % pts.length], dp = a * P[0] + b * P[1] - c, dq = a * Q[0] + b * Q[1] - c; if (dp <= 0) out.push(P); if ((dp < 0) !== (dq < 0) && dp !== dq) { const t = dp / (dp - dq); out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]); } } return out; };
/** Voronoi cells of `seeds` inside the convex polygon `box` */
const voronoi = (seeds, box) => seeds.map((p, i) => { let cell = box; for (let j = 0; j < seeds.length && cell.length; j++) { if (j === i) continue; const q = seeds[j]; if (Math.hypot(q[0] - p[0], q[1] - p[1]) > 260) continue; const a = q[0] - p[0], b = q[1] - p[1], c = (a * (p[0] + q[0]) + b * (p[1] + q[1])) / 2; cell = clipHP(cell, a, b, c); } return cell; });
/** blue-noise points in a test region */
const scatterPts = (n, gap, test, r, box = [0, 0, 1000, 1000]) => { const pts = []; let tries = 0; while (pts.length < n && tries++ < 60000) { const x = box[0] + r() * (box[2] - box[0]), y = box[1] + r() * (box[3] - box[1]); if (test(x, y) && pts.every(([a, b]) => (a - x) ** 2 + (b - y) ** 2 > gap * gap)) pts.push([x, y]); } return pts; };
/** pointed leaf (vesica) with a mid-rib, at x,y, length len, angle deg */
const leaf = (x, y, len, deg, f, w = 4) => { const t = deg * Math.PI / 180, ux = Math.cos(t), uy = Math.sin(t), wv = len * 0.36; const A = [x - ux * len / 2, y - uy * len / 2], B = [x + ux * len / 2, y + uy * len / 2], N = [-uy * wv, ux * wv];
  return pth(`M${f1(A[0])} ${f1(A[1])}Q${f1(x + N[0])} ${f1(y + N[1])} ${f1(B[0])} ${f1(B[1])}Q${f1(x - N[0])} ${f1(y - N[1])} ${f1(A[0])} ${f1(A[1])}Z`, f, w) + line(A[0] + ux * len * 0.12, A[1] + uy * len * 0.12, B[0] - ux * len * 0.15, B[1] - uy * len * 0.15, w * 0.8); };

// ======================= 1. Unicorn Stained Glass =======================
function unicornWindow() {
  const r = rng(1016), cx = 500, R0 = 380, top = 410, x0 = cx - R0, x1 = cx + R0, y1 = 965;
  const arch = (rad, n = 48) => { const p = []; for (let i = 0; i <= n; i++) p.push(pol(cx, top, rad, 180 + i * 180 / n)); return p; };
  const outer = [...arch(R0 + 22), [x1 + 22, y1 + 22], [x0 - 22, y1 + 22]];
  const inner = [...arch(R0), [x1, y1], [x0, y1]];
  let s = poly(outer, '#b197fc', 6);
  // frame tiles
  const FR = ['#ffd43b', '#b197fc'];
  for (let i = 0; i < 18; i++) s += sector(cx, top, R0, R0 + 22, 180 + i * 10, 180 + (i + 1) * 10, FR[i % 2], 4);
  for (let k = 0; k < 11; k++) { const ya = top + k * (y1 + 22 - top) / 11, yb = top + (k + 1) * (y1 + 22 - top) / 11; s += poly([[x0 - 22, ya], [x0, ya], [x0, yb], [x0 - 22, yb]], FR[(k + 1) % 2], 4) + poly([[x1, ya], [x1 + 22, ya], [x1 + 22, yb], [x1, yb]], FR[(k + 1) % 2], 4); }
  // glass: seeds denser where the unicorn is not
  const inside = (x, y) => x > x0 + 6 && x < x1 - 6 && y < y1 - 6 && (y > top || Math.hypot(x - cx, y - top) < R0 - 6);
  const seeds = scatterPts(250, 38, inside, r);
  const cells = voronoi(seeds, inner);
  const sky = ['#a5d8ff', '#d0bfff', '#99e9f2', '#a5d8ff'], hillA = ['#8ce99a', '#51cf66', '#8ce99a'], RB = ['#ff6b6b', '#ffa94d', '#ffe066', '#8ce99a', '#74c0fc', '#b197fc'];
  const sunC = [760, 250];
  cells.forEach((c, i) => {
    if (c.length < 3) return; const [x, y] = seeds[i];
    const hill = 790 + 45 * Math.sin(x * 0.011 + 0.6);
    const dr = Math.hypot(x - 500, y - 900);
    let col;
    if (Math.hypot(x - sunC[0], y - sunC[1]) < 70) col = '#ffd43b';
    else if (Math.hypot(x - sunC[0], y - sunC[1]) < 125) col = (i % 2 ? '#ffe066' : '#ffa94d');
    else if (y > hill) col = hillA[i % 3];
    else if (dr > 470 && dr < 650) col = RB[Math.min(5, Math.floor((650 - dr) / 30))];
    else col = sky[i % 4];
    s += poly(c, col, 5);
  });
  // the unicorn (big pale pieces on top, facing left), standing on the hills
  const W = '#fff8fc', Sh = '#ffd6e7', G = '#ffd43b', M = ['#f783ac', '#da77f2', '#748ffc', '#63e6be', '#ffa94d'];
  // tail
  [[650, 560, 34, 70, 30], [690, 610, 32, 64, 15], [705, 670, 30, 60, 0], [690, 728, 28, 52, -20]].forEach(([x, y, rx, ry, rot], i) => { s += ell(x, y, rx, ry, M[(i + 2) % 5], rot); });
  // back legs
  s += pth('M590 640 L630 640 L640 800 L606 800 Z', Sh) + pth('M545 650 L580 650 L586 805 L552 805 Z', W);
  s += ell(623, 808, 24, 14, G) + ell(569, 812, 24, 14, G);
  // body
  s += ell(500, 600, 170, 95, W);
  s += ell(470, 610, 60, 40, Sh, -10); // wing-ish patch
  // front legs
  s += pth('M400 640 L436 640 L432 810 L398 810 Z', W) + pth('M445 650 L478 650 L470 800 L438 800 Z', Sh);
  s += ell(415, 818, 24, 14, G) + ell(454, 808, 24, 14, G);
  // neck + head
  s += pth('M360 600 L330 430 L400 400 L450 560 Z', W);
  s += ell(300, 400, 82, 56, W, -20) + ell(240, 435, 44, 34, Sh, -20);
  s += circ(226, 432, 7, '#f06595', 3) + circ(300, 385, 12, '#5f3dc4', 3);
  s += poly([[322, 345], [342, 300], [352, 352]], W);
  // horn with 4 twist pieces
  const hb = [[270, 352], [300, 342]], tip = [235, 200];
  for (let k = 0; k < 4; k++) { const t0 = k / 4, t1 = (k + 1) / 4, L0 = [hb[0][0] + (tip[0] - hb[0][0]) * t0, hb[0][1] + (tip[1] - hb[0][1]) * t0], R0p = [hb[1][0] + (tip[0] - hb[1][0]) * t0, hb[1][1] + (tip[1] - hb[1][1]) * t0], L1 = [hb[0][0] + (tip[0] - hb[0][0]) * t1, hb[0][1] + (tip[1] - hb[0][1]) * t1], R1 = [hb[1][0] + (tip[0] - hb[1][0]) * t1, hb[1][1] + (tip[1] - hb[1][1]) * t1];
    s += poly(k === 3 ? [L0, R0p, tip] : [L0, R0p, R1, L1], k % 2 ? '#ffe066' : '#fab005', 4); }
  // mane: a cascade of curls along the neck
  [[318, 322, 26, 30, -30], [352, 352, 30, 44, -35], [382, 400, 30, 46, -25], [404, 450, 28, 44, -20], [422, 498, 27, 42, -15], [436, 544, 24, 36, -10]].forEach(([x, y, rx, ry, rot], i) => { s += ell(x, y, rx, ry, M[i % 5], rot); });
  s += ell(268, 356, 26, 16, M[3], -40); // forelock
  // stars and a little heart in the sky glass (separate pieces)
  [[180, 260, 30], [420, 170, 26], [600, 140, 22], [860, 420, 24], [150, 520, 22]].forEach(([x, y, rr], i) => { s += star(x, y, rr, rr * 0.45, 5, i % 2 ? '#ffe066' : '#ffd43b', i * 9); });
  s += pth('M845 650 C790 600 815 560 846 588 C877 560 902 600 847 650 Z', '#ff6b6b', 4);
  // flowers in the hills
  [[150, 880], [270, 925], [700, 900], [820, 860], [880, 930], [520, 935]].forEach(([x, y], i) => { for (let k = 0; k < 5; k++) { const [a, b] = pol(x, y, 15, k * 72 - 90); s += circ(a, b, 11, ['#ff6b6b', '#fff8fc', '#f783ac'][i % 3], 3); } s += circ(x, y, 9, '#ffd43b', 3); });
  return svg(s);
}

// ======================= 2. Solar System Parade =======================
function solarSystem() {
  const r = rng(2026);
  const BG = ['#5c6bd6', '#7950f2', '#6741d9'];
  let s = '';
  // orbits split the sky into rings around the sun (centre off the left edge)
  const sc = [-120, 520];
  const orbits = [300, 390, 480, 580, 700, 830, 960, 1100, 1260];
  for (let i = orbits.length - 1; i >= 0; i--) s += circ(sc[0], sc[1], orbits[i], BG[i % 3], 5);
  // sun with rays and a smile
  for (let i = 0; i < 18; i++) { const a0 = -90 + i * 10, a1 = a0 + 10; const p = [pol(sc[0], sc[1], 250, a0), pol(sc[0], sc[1], 335, a0 + 5), pol(sc[0], sc[1], 250, a1)]; s += poly(p, i % 2 ? '#ff922b' : '#ffd43b', 4); }
  s += circ(sc[0], sc[1], 255, '#ffd43b') + circ(sc[0], sc[1], 200, '#ffe066') + circ(sc[0], sc[1], 140, '#fff3bf');
  s += circ(50, 460, 16, '#5f3dc4', 3) + circ(90, 545, 16, '#5f3dc4', 3) + pth('M10 560 Q30 640 110 620', 'none', 6) + circ(-4, 520, 20, '#ff8787', 3);
  const planet = (R, deg, rad, body) => { const [x, y] = pol(sc[0], sc[1], R, deg); return { x, y, rad, body }; };
  const P = [
    planet(390, -40, 34, (x, y, q) => circ(x, y, q, '#ced4da') + circ(x - 10, y - 8, 9, '#868e96', 3) + circ(x + 12, y + 10, 7, '#868e96', 3)),
    planet(480, 34, 44, (x, y, q) => circ(x, y, q, '#ffc078') + pth(`M${x - q + 2} ${y - 8} Q${x} ${y - 26} ${x + q - 2} ${y - 8}`, 'none', 4) + pth(`M${x - q + 4} ${y + 14} Q${x} ${y} ${x + q - 4} ${y + 14}`, 'none', 4)),
    planet(580, -15, 60, (x, y, q) => circ(x, y, q, '#4dabf7') + pth(`M${x - 34} ${y - 30} q20 -16 36 0 q10 18 -8 30 q-20 4 -28 -30Z`, '#51cf66', 4) + pth(`M${x + 12} ${y + 12} q22 -6 30 10 q-6 22 -26 18 q-12 -10 -4 -28Z`, '#51cf66', 4) + ell(x - 4, y + 46, 22, 8, '#ffffff', 0, 4) + ell(x + 2, y - 47, 18, 7, '#ffffff', 0, 4)),
    planet(700, 25, 46, (x, y, q) => circ(x, y, q, '#ff6b6b') + circ(x - 14, y - 10, 11, '#e8590c', 3) + circ(x + 16, y + 14, 9, '#e8590c', 3) + circ(x + 10, y - 24, 6, '#e8590c', 3)),
    planet(830, -18, 100, (x, y, q) => { let o = circ(x, y, q, '#ffd8a8'); const bands = [-66, -36, -8, 20, 48, 74]; bands.forEach((b, i) => { const hw = Math.sqrt(Math.max(0, q * q - b * b)) - 4; o += ell(x, y + b, hw, 10, i % 2 ? '#e8590c' : '#ff922b', 0, 4); }); return o + ell(x + 34, y + 33, 22, 12, '#ff6b6b', 0, 4); }),
    planet(960, 15, 62, (x, y, q) => sector(x, y, q + 16, q + 32, 180, 360, '#ffe066', 4) + sector(x, y, q + 32, q + 50, 180, 360, '#ffd8a8', 4) + circ(x, y, q, '#fcc419') + ell(x, y - 20, q - 10, 9, '#ffe066', 0, 4) + ell(x, y + 16, q - 8, 9, '#ff922b', 0, 4) + sector(x, y, q + 16, q + 32, 0, 180, '#ffe066', 4) + sector(x, y, q + 32, q + 50, 0, 180, '#ffd8a8', 4)),
    planet(1100, -21, 40, (x, y, q) => circ(x, y, q, '#99e9f2') + ell(x, y, q - 4, 9, '#3bc9db', 0, 4)),
  ];
  const near = (x, y, m) => P.some((p) => Math.hypot(x - p.x, y - p.y) < p.rad + m) || Math.hypot(x - 430, y - 610) < 150 || Math.hypot(x - 130, y - 915) < 95 || Math.hypot(x - 560, y - 70) < 120;
  const onOrbit = (x, y) => orbits.some((R) => Math.abs(Math.hypot(x - sc[0], y - sc[1]) - R) < 28);
  // stars in the gaps
  scatterPts(80, 50, (x, y) => Math.hypot(x - sc[0], y - sc[1]) > 370 && !onOrbit(x, y) && !near(x, y, 80), r, [25, 25, 975, 975])
    .forEach(([x, y], i) => { s += i % 3 === 0 ? star(x, y, 17, 6, 4, '#ffffff', 0, 4) : star(x, y, 21, 9, 5, i % 2 ? '#ffe066' : '#fff3bf', i * 13, 4); });
  // asteroid belt between Mars and Jupiter
  for (let i = 0; i < 30; i++) { const deg = -38 + i * 2.6 + r() * 1.2, R = 765 + (r() - 0.5) * 34; const [x, y] = pol(sc[0], sc[1], R, deg); if (x > 975 || y < 25 || y > 975 || near(x, y, 30)) continue; const n = 7, rr = 13 + r() * 8; const p = []; for (let k = 0; k < n; k++) p.push(pol(x, y, rr * (0.75 + r() * 0.4), k * 360 / n + r() * 20)); s += poly(p, i % 2 ? '#adb5bd' : '#c0a080', 4); }
  P.forEach((p) => { s += p.body(p.x, p.y, p.rad); });
  // rocket flying between the orbits
  const rx = 430, ry = 610;
  s += `<g transform="rotate(35 ${rx} ${ry})">` + poly([[rx - 22, ry + 60], [rx, ry + 120], [rx + 22, ry + 60]], '#ff922b') + poly([[rx - 12, ry + 60], [rx, ry + 96], [rx + 12, ry + 60]], '#ffe066', 3) +
    poly([[rx - 34, ry + 20], [rx - 66, ry + 70], [rx - 30, ry + 64]], '#fa5252') + poly([[rx + 34, ry + 20], [rx + 66, ry + 70], [rx + 30, ry + 64]], '#fa5252') +
    pth(`M${rx - 36} ${ry + 64} L${rx - 36} ${ry - 30} Q${rx} ${ry - 120} ${rx + 36} ${ry - 30} L${rx + 36} ${ry + 64} Z`, '#f8f9fa') + pth(`M${rx - 22} ${ry - 74} Q${rx} ${ry - 120} ${rx + 22} ${ry - 74} Z`, '#fa5252', 4) +
    circ(rx, ry - 20, 20, '#74c0fc', 4) + circ(rx, ry + 28, 11, '#74c0fc', 4) + '</g>';
  // comet at the top and a little UFO at the bottom
  s += pth('M640 90 L430 30 L620 112 L410 92 L626 130 Z', '#e7f5ff', 4) + circ(655, 108, 30, '#d0ebff', 4);
  s += ell(130, 925, 72, 22, '#20c997') + pth('M90 917 Q130 852 170 917 Z', '#b2f2bb', 4) + circ(90, 931, 7, '#ffe066', 3) + circ(130, 937, 7, '#ff8787', 3) + circ(170, 931, 7, '#ffe066', 3);
  return svg(s, BG[0]);
}

// ======================= 3. Autumn Hedgehog =======================
function autumnHedgehog() {
  const r = rng(1031);
  let s = '';
  // sky with clouds and sun, rolling hills
  s += `<rect x="-10" y="-10" width="1020" height="600" fill="#a5d8ff"${st(5)}/>`;
  s += ell(200, 140, 100, 42, '#ffffff') + ell(285, 115, 66, 44, '#ffffff') + ell(700, 100, 96, 38, '#ffffff') + ell(770, 80, 58, 36, '#ffffff');
  for (let i = 0; i < 10; i++) { const a = i * 36; s += poly([pol(500, 120, 64, a), pol(500, 120, 94, a + 6), pol(500, 120, 64, a + 12)], '#ffc078', 4); }
  s += circ(500, 120, 52, '#ffe066');
  s += pth('M-10 520 Q250 400 520 480 Q760 560 1010 430 L1010 1010 L-10 1010 Z', '#b2f2bb') + pth('M-10 640 Q300 550 600 630 Q820 690 1010 610 L1010 1010 L-10 1010 Z', '#8ce99a');
  // tree on the right
  s += pth('M850 1000 L866 560 Q856 450 790 380 L822 366 Q884 432 896 500 Q936 400 996 360 L1004 392 Q940 440 912 560 L940 1000 Z', '#a0522d');
  s += ell(892, 800, 18, 30, '#6f4518', 0, 4);
  const LC = ['#fa5252', '#fd7e14', '#fcc419', '#c92a2a', '#ffa94d'];
  scatterPts(50, 33, (x, y) => ((x - 870) / 165) ** 2 + ((y - 300) / 150) ** 2 < 1, r, [700, 150, 1000, 450]).forEach(([x, y], i) => { s += leaf(x, y, 66, r() * 360, LC[i % 5]); });
  scatterPts(14, 120, (x, y) => x < 660 && (x - 500) ** 2 + (y - 120) ** 2 > 140 ** 2, r, [40, 60, 690, 440]).forEach(([x, y], i) => { s += leaf(x, y, 58, r() * 360, LC[(i + 2) % 5]); });
  // mushrooms (left)
  const mush = (x, y, k) => { let o = pth(`M${x - 22 * k} ${y} L${x - 16 * k} ${y - 70 * k} L${x + 16 * k} ${y - 70 * k} L${x + 22 * k} ${y} Z`, '#fff4e6'); o += pth(`M${x - 80 * k} ${y - 62 * k} Q${x} ${y - 180 * k} ${x + 80 * k} ${y - 62 * k} Z`, '#f03e3e'); [[-40, -90, 12], [0, -120, 14], [38, -88, 11], [-14, -80, 8], [56, -70, 7], [-62, -70, 7]].forEach(([dx, dy, rr]) => { o += circ(x + dx * k, y + dy * k, rr * k, '#ffffff', 3); }); return o; };
  s += mush(120, 700, 1.05) + mush(230, 730, 0.75) + mush(60, 760, 0.55);
  // the hedgehog: chunky spines in rows (outer row first), then the body
  const hx = 520, hy = 800, SP = ['#8b5a2b', '#b5834a', '#dcae76'];
  const rows = [[330, 210, 15], [285, 170, 13], [240, 130, 11], [195, 100, 9]];
  rows.forEach(([R1, R0, n], row) => { for (let i = 0; i < n; i++) { const span = 186 / n, a = 177 + i * span + (row % 2 ? span / 2 : 0); const tip = pol(hx, hy, R1, a + span / 2), b0 = pol(hx, hy, R0, a - span * 0.15), b1 = pol(hx, hy, R0, a + span * 1.15); if (a + span / 2 > 356) continue; s += poly([b0, tip, b1], SP[(i + row) % 3], 5); } });
  s += pth(`M${hx - 190} ${hy + 10} Q${hx - 170} ${hy - 150} ${hx} ${hy - 160} Q${hx + 170} ${hy - 150} ${hx + 200} ${hy + 10} Z`, '#b5834a');
  // a leaf and an apple stuck on the spines
  s += leaf(hx + 60, hy - 250, 76, -30, '#fcc419') + leaf(hx - 150, hy - 220, 70, 40, '#fa5252') + circ(hx + 210, hy - 170, 38, '#e03131') + pth(`M${hx + 210} ${hy - 206} l6 -24`, 'none', 6) + leaf(hx + 230, hy - 222, 34, -20, '#51cf66', 3);
  // face (pointing left), feet
  s += pth(`M${hx - 150} ${hy + 20} Q${hx - 330} ${hy + 10} ${hx - 380} ${hy - 50} Q${hx - 270} ${hy - 170} ${hx - 120} ${hy - 110} Z`, '#f3d2a2');
  s += circ(hx - 382, hy - 50, 20, '#5c3a21') + circ(hx - 265, hy - 85, 17, '#6f4518', 3) + ell(hx - 200, hy - 126, 24, 34, '#e0a96d', -20) + circ(hx - 280, hy - 30, 16, '#ffa8a8', 3) + pth(`M${hx - 350} ${hy - 20} Q${hx - 320} ${hy} ${hx - 290} ${hy - 10}`, 'none', 5);
  s += ell(hx - 120, hy + 22, 40, 18, '#f3d2a2') + ell(hx + 130, hy + 22, 40, 18, '#f3d2a2');
  // acorns and a little pumpkin
  const acorn = (x, y, a) => `<g transform="rotate(${a} ${x} ${y})">` + ell(x, y + 18, 20, 26, '#d9480f') + pth(`M${x - 26} ${y + 4} Q${x} ${y - 30} ${x + 26} ${y + 4} Z`, '#8b5a2b') + line(x, y - 18, x + 4, y - 30, 5) + '</g>';
  s += acorn(300, 850, 15) + acorn(360, 880, -20) + acorn(780, 860, 10);
  s += ell(930, 900, 62, 46, '#fd7e14') + ell(930, 900, 28, 46, '#ffa94d') + pth('M926 856 l4 -26 l12 2 l-6 26 Z', '#2f9e44', 4);
  // leaf pile at the front
  scatterPts(46, 44, (x, y) => !(x > 860 && y > 840) && !((x - 300) ** 2 + (y - 865) ** 2 < 70 ** 2) && !((x - 780) ** 2 + (y - 860) ** 2 < 40 ** 2), r, [20, 868, 980, 990]).forEach(([x, y], i) => { s += leaf(x, y, 62, r() * 360, LC[(i + 1) % 5]); });
  // grass tufts
  for (let i = 0; i < 12; i++) { const x = 30 + i * 85 + (i % 2) * 20, y = 640 + (i * 37) % 120; if ((x > 830 && x < 960) || (x > 160 && x < 800 && y > 600)) continue; s += poly([[x - 14, y], [x - 8, y - 34], [x, y - 6], [x + 6, y - 40], [x + 14, y]], '#40c057', 4); }
  return svg(s);
}

export const SCENES = { 'unicorn-window': unicornWindow, 'solar-system': solarSystem, 'autumn-hedgehog': autumnHedgehog };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = process.argv[2] || '.'; const only = process.argv.slice(3); fs.mkdirSync(out, { recursive: true });
  for (const [id, fn] of Object.entries(SCENES)) { if (only.length && !only.includes(id)) continue; const s = fn(); fs.writeFileSync(path.join(out, id + '.svg'), s); await sharp(Buffer.from(s), { density: 96 }).resize(1024, 1024).png().toFile(path.join(out, id + '.png')); console.log('rendered', id); }
}
