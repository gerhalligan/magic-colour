// Built-in GRID pictures. Each design is drawn in NATIVE cell units on a native-size grid; the same design can be rasterised at any
// size (Grid(n, k = n / native)), so e.g. the dinosaur exists as a 36x36 and a 50x50 puzzle. (0,0) is the top-left corner.
// To add your own: copy a design below, or write an ASCII file (see README) and run `node tools/pixel-grid.mjs my.txt --name "My Picture"`.
import { Grid } from '../lib/grid.mjs';

const INK = '#22223b';
export const PIXEL = [];
/** add(id, name, category, nativeSize, sizes, draw): `sizes` = grid sizes to build (number or [number, ...]) */
const add = (id, name, cat, native, sizes, draw) => PIXEL.push({ id, name, cat, native, sizes: [].concat(sizes), draw });

add('grid-heart', 'Big Heart', 'fantasy', 20, 16, (g) => {
  const D = 7.4, heart = (a, b) => { const u = (a - 10) / D, v = (11.2 - b) / D; return (u * u + v * v - 1) ** 3 - u * u * v ** 3 <= 0; };
  g.paint(heart, '#e63946');
  g.px(5, 5, '#ffb3c1').px(6, 4, '#ffb3c1').px(4, 6, '#ffb3c1').px(5, 4, '#ff8fa3').px(4, 5, '#ff8fa3');
  g.outline(INK);
});

add('grid-sun', 'Smiley Sun', 'nature', 24, 16, (g) => {
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, c = Math.cos(a), s = Math.sin(a); g.line(12 + c * 8.4, 12 + s * 8.4, 12 + c * 10.8, 12 + s * 10.8, k % 2 ? 1.6 : 2.2, '#ff9f1c'); }
  g.disc(12, 12, 6.6, '#ffd93d');
  g.px(9, 10, '#5b3a1e').px(9, 11, '#5b3a1e').px(14, 10, '#5b3a1e').px(14, 11, '#5b3a1e');
  g.px(8, 13, '#ff8fab').px(15, 13, '#ff8fab').px(9, 13, '#ff8fab').px(14, 13, '#ff8fab');
  g.px(9, 14, '#5b3a1e').px(10, 15, '#5b3a1e').px(11, 15, '#5b3a1e').px(12, 15, '#5b3a1e').px(13, 15, '#5b3a1e').px(14, 14, '#5b3a1e');
  g.outline(INK);
});

add('grid-fish', 'Little Fish', 'animals', 24, 18, (g) => {
  g.poly([[17, 12], [23.4, 5.6], [23.4, 18.4]], '#e63946');
  g.poly([[8, 7.6], [11, 3.8], [14.6, 7.8]], '#e63946').poly([[8, 16.4], [11, 20.2], [14.6, 16.2]], '#e63946');
  g.ell(10.5, 12, 8.4, 5.6, '#ff9f1c');
  g.paint((a, b) => ((a - 10.5) / 8.4) ** 2 + ((b - 12) / 5.6) ** 2 <= 1 && b > 14.4, '#ffd8a8');
  g.rect(8, 7, 8, 16, '#ffe066').rect(12, 7, 12, 16, '#ffe066');
  g.ell(10.5, 12, 8.4, 5.6, '#ff9f1c'); g.rect(8, 8, 8, 15, '#ffe066').rect(12, 8, 12, 15, '#ffe066');
  g.disc(5.6, 10.6, 1.5, '#ffffff').px(5, 10, '#22223b').px(4, 14, '#c92a2a').px(3, 14, '#c92a2a');
  g.px(2, 4, '#74c0fc').px(3, 2, '#74c0fc').px(1, 7, '#74c0fc');
  g.outline(INK);
});

add('grid-ice-cream', 'Ice Cream', 'food', 24, 20, (g) => {
  g.poly([[6.5, 12], [17.5, 12], [12, 23.4]], '#e9a85c');
  g.recolour((x, y) => (x + y) % 4 === 0 || (x - y + 80) % 4 === 0, '#c47a30');
  g.ell(12, 11.2, 6.4, 3, '#7b4a2d'); g.disc(6.4, 13.2, 1.5, '#7b4a2d').disc(17.6, 13.2, 1.5, '#7b4a2d').disc(12, 13.6, 1.5, '#7b4a2d');
  g.ell(12, 6.6, 5, 4.2, '#ff8fc7');
  g.px(8, 5, '#ffc2e2').px(9, 4, '#ffc2e2').px(8, 6, '#ffc2e2');
  g.px(11, 6, '#ffffff').px(14, 5, '#4cc9f0').px(13, 8, '#ffe066').px(9, 8, '#4cc9f0').px(15, 7, '#ffffff').px(11, 3, '#ffe066');
  g.disc(12, 2.7, 1.7, '#e63946').px(12, 0, '#2f9e44').px(13, 0, '#2f9e44').px(12, 1, '#2f9e44');
  g.outline(INK);
});

add('grid-butterfly', 'Butterfly', 'animals', 20, 20, (g) => {
  g.mirrored((m) => {
    m.ell(5.2, 6.2, 4.6, 4.3, '#ff9f1c', -25);
    m.ell(6.4, 13, 3.6, 3.4, '#ff6fa5', 20);
    m.disc(4.4, 5.6, 1.5, '#ffe066'); m.disc(6.3, 12.7, 1.2, '#ffe066');
    m.line(8.6, 3.8, 6.3, 1.2, 1, '#5b3f8c');
  });
  g.rect(9, 5, 10, 15, '#5b3f8c').disc(10, 4.3, 1.7, '#5b3f8c');
  g.outline(INK);
});

add('grid-flower', 'Pretty Flower', 'nature', 24, 22, (g) => {
  g.rect(11, 9, 12, 20, '#2f9e44');
  g.ell(8.2, 15.2, 3, 1.5, '#51cf66', -35); g.ell(15.8, 13.6, 3, 1.5, '#51cf66', 35);
  const cols = ['#ff6fa5', '#ff9ec7'];
  for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 - Math.PI / 2; g.disc(12 + Math.cos(a) * 4.2, 7 + Math.sin(a) * 4.2, 2.9, cols[k % 2]); }
  g.disc(12, 7, 2.5, '#ffd93d'); g.px(11, 6, '#ff9f1c').px(12, 7, '#ff9f1c');
  g.poly([[7, 20], [17, 20], [15.8, 23.9], [8.2, 23.9]], '#d9703c'); g.rect(6, 19, 17, 20, '#b5542a');
  g.outline(INK);
});

add('grid-rainbow', 'Rainbow Sky', 'nature', 24, 24, (g) => {
  const cols = ['#e63946', '#ff9f1c', '#ffd93d', '#51cf66', '#339af0', '#9775fa'];
  cols.forEach((c, i) => { const ro = 11.7 - i * 1.6, ri = ro - 1.6; g.paint((a, b) => { const d = Math.hypot(a - 12, b - 19.5); return d <= ro && d > ri && b < 19.6; }, c); });
  const cloud = (cx, cy) => { g.disc(cx, cy, 2.5, '#f1f5ff').disc(cx + 2.6, cy + 0.6, 2.1, '#f1f5ff').disc(cx - 2.4, cy + 0.8, 1.9, '#f1f5ff').rect(Math.round(cx - 3.8), Math.round(cy + 1), Math.round(cx + 4), Math.round(cy + 2.4), '#f1f5ff'); };
  cloud(4, 19.5); cloud(20, 19.5);
  g.paint((a, b) => b >= 21 && b < 23.4 && (a < 9 || a > 15), '#c3d4f5');
  const star = (x, y) => g.px(x, y, '#ffd93d').px(x - 1, y, '#ffe98a').px(x + 1, y, '#ffe98a').px(x, y - 1, '#ffe98a').px(x, y + 1, '#ffe98a');
  star(3, 3); star(20, 4); star(17, 1); star(7, 7);
  g.outline(INK);
});

add('grid-cat', 'Cosy Cat', 'animals', 28, 28, (g) => {
  g.ell(14, 26, 8.2, 5, '#f6a04d');
  g.mirrored((m) => {
    m.poly([[4.2, 11], [4.6, 1.8], [11.8, 7.6]], '#f6a04d');
    m.poly([[6, 9.2], [6.3, 4.6], [9.6, 7.6]], '#ff9ec7');
  });
  g.ell(14, 15.5, 10, 8.2, '#f6a04d');
  g.mirrored((m) => {
    m.rect(11, 8, 11, 10, '#d9772b').rect(7, 10, 7, 11, '#d9772b').rect(4, 14, 5, 14, '#d9772b').rect(4, 17, 5, 17, '#d9772b');
    m.ell(9.4, 15.2, 2, 2.6, '#ffffff'); m.px(9, 15, '#3b2a20').px(9, 16, '#3b2a20').px(10, 15, '#3b2a20').px(10, 16, '#3b2a20'); m.px(9, 14, '#d0ebff');
    m.line(0.6, 18.5, 5, 19.2, 1, '#5b3a1e'); m.line(0.8, 21.6, 5, 20.4, 1, '#5b3a1e');
    m.px(5, 18, '#ff9ec7').px(6, 19, '#ff9ec7');
  });
  g.ell(14, 20, 4.4, 3, '#fff1dc').px(13, 18, '#e5486b').px(14, 18, '#e5486b');
  g.px(13, 20, '#3b2a20').px(14, 20, '#3b2a20').px(12, 21, '#3b2a20').px(15, 21, '#3b2a20').px(11, 20, '#3b2a20').px(16, 20, '#3b2a20');
  g.rect(8, 23, 19, 24, '#e63946'); g.disc(14, 25.8, 1.6, '#ffd93d');
  g.mirrored((m) => { m.ell(9.2, 27.4, 2.3, 1.3, '#fff1dc'); });
  g.outline(INK);
});

add('grid-dog', 'Happy Dog', 'animals', 28, 28, (g) => {
  g.ell(14, 26, 7.6, 4.6, '#d4a373');
  g.mirrored((m) => { m.ell(5.4, 12.6, 3, 6.2, '#8d5a3b', 12); });
  g.ell(14, 14, 8.6, 8, '#d4a373');
  g.ell(9.3, 11.2, 2.4, 2.4, '#8d5a3b');
  g.ell(14, 18.4, 4.8, 3.6, '#f6e7d1');
  g.mirrored((m) => { m.ell(10.4, 12.2, 1.6, 1.8, '#ffffff'); m.px(10, 12, '#22223b').px(10, 13, '#22223b'); });
  g.disc(14, 16.4, 1.9, '#22223b').px(13, 15, '#6c757d');
  g.px(14, 18, '#22223b').px(14, 19, '#22223b').px(12, 19, '#22223b').px(13, 20, '#22223b').px(15, 20, '#22223b').px(16, 19, '#22223b');
  g.rect(13, 20, 14, 22, '#ff6b81');
  g.rect(8, 23, 19, 24, '#339af0'); g.disc(14, 25.8, 1.5, '#ffd93d');
  g.outline(INK);
});

add('grid-robot', 'Cute Robot', 'fantasy', 28, 28, (g) => {
  g.mirrored((m) => { m.rect(1, 14, 4, 21, '#adb5bd'); m.disc(2.5, 22.5, 2, '#868e96'); m.rect(9, 25, 12, 27, '#868e96'); m.rect(8, 27, 12, 27, '#495057'); });
  g.rect(6, 14, 21, 24, '#4dabf7');
  g.rect(10, 16, 17, 21, '#ffe066').disc(12, 18.4, 0.9, '#e63946').disc(15, 18.4, 0.9, '#51cf66').rect(11, 20, 16, 20, '#c79100');
  g.rect(6, 4, 21, 12, '#ced4da');
  g.mirrored((m) => { m.rect(4, 6, 5, 9, '#868e96'); m.rect(8, 6, 11, 9, '#4cc9f0'); m.px(9, 7, '#d7f6ff'); });
  g.rect(10, 11, 17, 11, '#22223b').px(11, 11, '#ffffff').px(13, 11, '#ffffff').px(15, 11, '#ffffff');
  g.rect(13, 1, 14, 3, '#868e96').disc(13.5, 1, 1.4, '#e63946');
  g.outline(INK);
});

add('grid-rocket', 'Rocket Ship', 'space', 30, [30, 44], (g) => {
  g.poly([[15, 22.6], [18.3, 22.6], [15, 29.6], [11.7, 22.6]], '#ff9f1c').poly([[15, 22.6], [16.6, 22.6], [15, 27], [13.4, 22.6]], '#ffe066');
  g.mirrored((m) => { m.poly([[10.4, 15.5], [5.2, 24.2], [5.4, 20], [10.4, 12]], '#e63946'); });
  g.ell(15, 14, 5.2, 9, '#f1f4ff'); g.rect(10, 12, 19, 20, '#f1f4ff');
  g.poly([[15, 1.2], [20.2, 11], [9.8, 11]], '#e63946'); g.ell(15, 11, 5.2, 1.1, '#e63946');
  g.paint((a, b) => a < 12.5 && b > 11 && b < 21 && ((a - 15) / 5.2) ** 2 + ((b - 14) / 9) ** 2 <= 1, '#d3dcf2');
  g.rect(10, 19, 19, 20, '#e63946');
  g.disc(15, 14.6, 3.5, '#2b6cb0').disc(15, 14.6, 2.5, '#4cc9f0').px(14, 13, '#d7f6ff');
  g.rect(12, 21, 17, 22, '#8a93ad');
  const star = (x, y, c = '#ffd93d') => g.px(x, y, c).px(x - 1, y, c).px(x + 1, y, c).px(x, y - 1, c).px(x, y + 1, c);
  star(3, 4); star(25, 7); star(5, 14); star(26, 19); star(22, 2, '#4cc9f0'); star(2, 24, '#ff8fc7');
  g.outline(INK);
});

const unicorn = (g) => {
  const mane = ['#ff5d8f', '#ffa94d', '#ffe066', '#69db7c', '#4dabf7', '#9775fa'];
  [[13, 10, 3], [10.4, 13.4, 3.1], [8.4, 17.2, 3.2], [7, 21, 3.2], [6.4, 25, 3.2], [6, 28.6, 3]].forEach(([x, y, r], i) => g.disc(x, y, r, mane[i % 6]));
  g.poly([[7, 32], [9, 17], [19, 14], [25, 32]], '#fbf7ff');
  g.ell(19, 13, 7.2, 6, '#fbf7ff', -12); g.ell(25.2, 17.4, 4.6, 3.5, '#fbf7ff', 28);
  g.poly([[13.2, 8.4], [14.6, 2.4], [18.2, 7.4]], '#fbf7ff').poly([[14.6, 7.2], [15, 4.4], [17, 7]], '#ff9ec7');
  g.poly([[17.4, 8], [21.4, 7], [20.4, 0.4]], '#ffd23f');
  g.paint((a, b) => a > 17.4 && b < 7.6 && Math.floor(a + b) % 3 === 0 && ((a - 17.4) / 4 + (7 - b) / 6.6) < 1.02 && b > 0.6, '#ff9f1c');
  [[15.5, 9.6, 1.8], [12.8, 12, 1.7]].forEach(([x, y, r], i) => g.disc(x, y, r, mane[i]));
  g.px(21, 12, '#2b2d42').px(21, 13, '#2b2d42').px(22, 12, '#2b2d42').px(22, 13, '#2b2d42').px(23, 16, '#ff9ec7').px(22, 16, '#ff9ec7');
  g.px(28, 18, '#e5486b').px(28, 19, '#e5486b').px(25, 21, '#b0527a').px(26, 21, '#b0527a').px(27, 20, '#b0527a');
  g.outline(INK);
};
add('grid-unicorn-small', 'Little Unicorn', 'unicorns', 32, 24, unicorn);
add('grid-unicorn', 'Unicorn Dream', 'unicorns', 32, 40, unicorn);

add('grid-castle', 'Fairy Castle', 'fantasy', 32, 36, (g) => {
  g.rect(0, 29, 31, 31, '#69db7c'); g.recolour((x, y) => y >= 0 && (x * 5 + y * 3) % 7 === 0, '#40c057');
  g.rect(7, 15, 24, 28, '#adb5bd'); for (let x = 7; x <= 24; x += 2) g.rect(x, 13, x, 14, '#adb5bd');
  g.mirrored((m) => { m.rect(3, 9, 8, 28, '#ced4da'); m.poly([[2.4, 9], [5.5, 2.4], [8.6, 9]], '#e63946'); m.rect(5, 12, 5, 14, '#364fc7'); m.rect(5, 18, 5, 20, '#364fc7'); m.rect(10, 18, 11, 20, '#364fc7'); });
  g.rect(12, 6, 19, 14, '#ced4da'); g.poly([[11, 6], [15.5, 0.2], [20, 6]], '#e63946'); g.rect(15, 9, 16, 11, '#364fc7');
  g.rect(14, 23, 17, 28, '#8d5a3b'); g.ell(15.5, 23, 2, 2.2, '#8d5a3b'); g.px(16, 26, '#ffd93d');
  g.line(15.5, 0.2, 15.5, -1, 1, '#22223b');
  g.paint((a, b) => b > 15 && b < 29 && a > 7 && a < 24 && ((Math.floor(b) % 3 === 0) || ((Math.floor(a) + (Math.floor(b / 3) % 2) * 2) % 4 === 0)) && !(a > 14 && a < 17.2 && b > 21), '#8e979f');
  g.outline(INK);
});

const dino = (g) => {
  const G = '#58c96b', GD = '#3fa855', GL = '#a8e6a1';
  g.rect(0, 34, 35, 35, '#b07d4f'); g.recolour((x, y) => (x * 7 + y * 3) % 5 === 0 && y > 0, '#8d5f35');
  g.poly([[8, 18.5], [0.4, 27.4], [1, 29.2], [10, 27]], G);
  g.rect(9, 27, 12, 32, GD).rect(8, 32, 13, 33, GD);
  g.rect(22, 27, 25, 32, GD).rect(21, 32, 26, 33, GD);
  g.ell(17, 22, 11.2, 7.6, G);
  g.rect(14, 26, 17, 33, G).rect(13, 32, 18, 33, G); g.rect(19, 26, 21, 33, G).rect(18, 32, 22, 33, G);
  g.poly([[22, 18], [26.6, 5.6], [31.2, 8.4], [27.6, 21]], G);
  g.ell(30, 6.6, 4.8, 3.3, G);
  g.paint((a, b) => ((a - 17) / 8.8) ** 2 + ((b - 26.6) / 3.6) ** 2 <= 1 && b > 24.6, GL);
  g.poly([[10, 17.6], [12.2, 11.8], [14.6, 16]], '#ff922b').poly([[15.2, 15], [17.6, 9.8], [20, 14.6]], '#ff922b').poly([[20.6, 15.4], [23.2, 11.4], [24.6, 17.4]], '#ff922b');
  g.px(12, 15, '#ffd43b').px(17, 13, '#ffd43b').px(23, 15, '#ffd43b');
  [[12, 21], [16, 19], [20, 22], [14, 24], [8, 25], [24, 20]].forEach(([x, y]) => g.px(x, y, GD));
  g.px(31, 5, '#2b2d42').px(31, 6, '#2b2d42').px(30, 5, '#ffffff').px(33, 7, GD).px(32, 9, '#e5486b').px(31, 9, '#e5486b').px(30, 8, '#e5486b');
  g.outline(INK);
};
add('grid-dino', 'Friendly Dino', 'dinosaurs', 36, 36, dino);
add('grid-dino-giant', 'Giant Dino', 'dinosaurs', 36, 50, dino);
