// Extra foreground details appended on top of a picture (id -> svg markup)
import { E, C, R, P, D, S, G, rep, pol, COL as K } from './lib.mjs';
export default {
  'yummy-ice-cream': () => rep(5, (i) => C(420 + (i * 83) % 190, 255 + ((i * 61) % 120), 26, ['#ffd93d', '#3a86ff', '#ee4b4b', '#9b5de5', '#ffffff'][i])) + rep(4, (i) => R(520 + (i % 2) * 90 - 40, 450 + Math.floor(i / 2) * 70, 70, 36, i % 2 ? '#ff8fc7' : '#ffd93d', 18)) + R(300, 538, 400, 38, '#c97a2b', 14),
  'sailboat': () => rep(5, (i) => C(110 + i * 195, 930, 70, '#6fa8ff')) + rep(3, (i) => C(330 + i * 130, 680, 34, '#9bdcff')) + rep(2, (i) => D(`M${700 + i * 120} ${300 + i * 60}q30 -40 60 0q30 -40 60 0l0 16q-30 -40 -60 0q-30 -40 -60 0z`, '#ffffff')),
  'magic-potion': () => rep(4, (i) => C(370 + i * 90, 770 - (i % 2) * 80, 30, '#e8c6ff')) + R(380, 600, 240, 70, '#ffd93d', 20) + rep(3, (i) => C(80 + i * 420, 900, 36, '#7a6fd0')),
  'unicorn-pal': () => S(210, 470, 44, 18, 5, '#ffd93d') + S(200, 640, 40, 17, 5, '#ffd93d') + E(430, 640, 46, 28, '#ff8fc7') + R(500 - 40, 120, 80, 18, '#e0a800', 8, -8) + R(500 - 30, 175, 60, 18, '#e0a800', 8, -8),
};
