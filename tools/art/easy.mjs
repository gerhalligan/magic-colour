import { svg, E, C, R, P, D, S, G, rep, mirror, cloud, sector, pol, COL as K } from './lib.mjs';
export default [
  { id: 'happy-fish', name: 'Happy Fish', cat: 'animals', diff: 'easy', svg: () => svg(
    C(150, 800, 50, K.white) + C(250, 650, 36, K.white) + C(180, 300, 44, K.white) + C(820, 250, 55, K.white) +
    P([[700, 500], [930, 340], [900, 500], [930, 660]], K.red) + P([[420, 340], [560, 190], [650, 360]], K.red) + P([[430, 680], [540, 800], [610, 660]], K.red) +
    E(480, 510, 280, 185, K.orange) +
    R(470, 345, 50, 330, K.yellow, 22, 0) + R(580, 360, 50, 300, K.yellow, 22, 0) +
    C(300, 470, 62, K.white) + C(285, 475, 32, K.black) + D('M170 565Q230 620 300 585', K.red) +
    '', K.sky) },
  { id: 'kitty-cat', name: 'Kitty Cat', cat: 'animals', diff: 'easy', svg: () => svg(
    P([[240, 420], [250, 170], [440, 300]], K.orange) + P([[760, 420], [750, 170], [560, 300]], K.orange) +
    P([[290, 380], [300, 250], [400, 315]], K.pink) + P([[710, 380], [700, 250], [600, 315]], K.pink) +
    E(500, 590, 330, 290, K.orange) + R(475, 320, 50, 130, '#e0701f', 22) + R(380, 335, 44, 90, '#e0701f', 20, -12) + R(576, 335, 44, 90, '#e0701f', 20, 12) +
    E(425, 705, 120, 90, K.white) + E(575, 705, 120, 90, K.white) +
    C(375, 550, 68, K.white) + C(625, 550, 68, K.white) + C(385, 555, 36, K.black) + C(615, 555, 36, K.black) +
    P([[455, 640], [545, 640], [500, 695]], K.pink), '#fff1b8') },
  { id: 'yummy-ice-cream', name: 'Yummy Ice Cream', cat: 'food', diff: 'easy', svg: () => svg(
    P([[300, 520], [700, 520], [500, 930]], K.tan) + P([[372, 520], [428, 520], [470, 770]], '#d9944a') +
    P([[572, 520], [628, 520], [500, 790]], '#d9944a') +
    C(500, 470, 190, '#7ee0b5') + R(310, 440, 380, 100, '#7ee0b5', 40) +
    C(500, 300, 165, K.pink) + C(335, 435, 60, K.pink) + C(665, 435, 60, K.pink) +
    C(500, 175, 60, K.red) + R(486, 70, 28, 80, K.dgreen, 12, 22), '#d9cbff') },
  { id: 'rocket-blast', name: 'Rocket Blast', cat: 'space', diff: 'easy', svg: () => svg(
    S(150, 190, 80, 34, 5, K.white) + S(850, 140, 70, 30, 5, K.white) + S(860, 560, 82, 34, 5, K.white) + S(130, 640, 72, 30, 5, K.white) +
    P([[430, 760], [570, 760], [500, 970]], K.yellow) + P([[400, 740], [600, 740], [500, 900]], K.orange) +
    P([[350, 560], [180, 760], [350, 740]], K.red) + P([[650, 560], [820, 760], [650, 740]], K.red) +
    E(500, 460, 170, 320, K.white, 0) + D('M500 80Q650 220 670 380L330 380Q350 220 500 80Z', K.red) + R(320, 700, 360, 60, K.red, 20) +
    C(500, 500, 85, '#7ec8ff'), K.navy) },
  { id: 'little-red-car', name: 'Little Red Car', cat: 'vehicles', diff: 'easy', svg: () => svg(
    C(840, 170, 90, K.yellow) + R(0, 720, 1000, 280, K.green) +
    R(130, 480, 740, 210, K.red, 70) + D('M300 490L380 330Q400 300 440 300L600 300Q640 300 665 335L740 490Z', K.red) +
    D('M335 475L395 355Q405 340 430 340L490 340L490 475Z', K.white) + D('M530 475L530 340L590 340Q615 340 630 360L690 475Z', K.white) +
    C(300, 700, 100, K.black) + C(700, 700, 100, K.black) + C(300, 700, 45, K.white) + C(700, 700, 45, K.white) + C(850, 560, 34, K.yellow), K.sky) },
  { id: 'sailboat', name: 'Sailing Day', cat: 'vehicles', diff: 'easy', svg: () => svg(
    C(190, 200, 110, K.yellow) + R(0, 650, 1000, 350, K.blue) +
    P([[490, 150], [490, 560], [210, 560]], K.white) + P([[540, 230], [540, 560], [790, 560]], K.yellow) + R(468, 120, 44, 480, K.brown, 10) + P([[512, 120], [640, 160], [512, 205]], K.red) +
    D('M170 580L830 580Q780 760 650 800L350 800Q220 760 170 580Z', K.brown) + R(180, 560, 640, 38, K.red, 14), K.skyL) },
  { id: 'dino-egg', name: 'Hatching Dino', cat: 'dinosaurs', diff: 'easy', svg: () => svg(
    C(190, 190, 90, '#fff') + C(820, 230, 70, '#fff') +
    E(500, 400, 230, 220, K.green) + C(290, 330, 35, K.green) + C(380, 205, 45, K.green) +
    C(405, 360, 62, K.white) + C(595, 360, 62, K.white) + C(415, 365, 30, K.black) + C(585, 365, 30, K.black) + C(420, 215, 40, '#2f8f46') + C(560, 205, 34, '#2f8f46') + C(500, 480, 24, '#2f8f46') +
    D('M200 570L300 500L380 590L470 500L560 590L650 500L720 590L800 530L800 930Q500 1010 200 930Z', '#fff3d6') +
    C(330, 740, 56, '#ffb3c6') + C(560, 840, 46, '#ffb3c6') + C(660, 700, 40, '#ffb3c6'), '#ffd6a5') },
  { id: 'rainbow-sky', name: 'Over the Rainbow', cat: 'nature', diff: 'easy', svg: () => svg(
    C(150, 160, 85, K.yellow) +
    [K.red, K.yellow, K.green, K.purple].map((c, i) => C(500, 720, 480 - i * 85, c)).join('') + C(500, 720, 480 - 4 * 85, K.sky) +
    E(500, 1010, 560, 130, K.green) + cloud(150, 760, 1.0, K.white) + cloud(640, 780, 1.1, K.white), K.sky) },
  { id: 'sunny-flower', name: 'Sunny Flower', cat: 'nature', diff: 'easy', svg: () => svg(
    R(0, 880, 1000, 120, K.lime) + R(468, 480, 64, 430, K.dgreen, 10) + E(350, 740, 120, 50, K.dgreen, -30) + E(650, 700, 120, 50, K.dgreen, 30) +
    rep(8, (i) => { const [x, y] = pol(500, 360, 170, i * 45); return E(x, y, 100, 62, i % 2 ? K.hotpink : K.pink, i * 45); }) +
    C(500, 360, 105, K.yellow) + C(500, 360, 48, K.brown), '#d8f1ff') },
  { id: 'magic-potion', name: 'Magic Potion', cat: 'fantasy', diff: 'easy', svg: () => svg(
    S(150, 160, 85, 36, 5, K.yellow) + S(850, 230, 75, 32, 5, K.yellow) + S(110, 720, 70, 30, 5, K.yellow) +
    R(400, 190, 200, 80, K.brown, 22) + R(410, 240, 180, 260, K.white, 20) + C(500, 650, 300, K.white) +
    D('M215 640Q500 560 785 640A290 290 0 0 1 215 640Z', '#c77dff') + C(420, 560, 36, K.white) + C(560, 520, 26, '#c77dff') + C(510, 430, 28, '#c77dff'), '#4b3fa0') },
  { id: 'unicorn-pal', name: 'Unicorn Pal', cat: 'unicorns', diff: 'easy', svg: () => svg(
    cloud(50, 880, 1.2, K.white) + cloud(640, 900, 1.0, K.white) +
    D('M250 400Q150 500 190 720Q260 650 300 540Z', K.pink) + D('M250 300Q130 330 110 480Q220 440 300 390Z', K.purple) + D('M330 190Q200 190 150 300Q260 290 350 300Z', K.pink) +
    P([[430, 240], [520, 20], [610, 240]], K.yellow) + P([[320, 330], [300, 150], [440, 260]], K.white) + P([[345, 295], [335, 200], [405, 270]], K.pink) +
    E(560, 560, 260, 300, K.white) + E(660, 760, 170, 120, K.pink) + C(690, 740, 20, K.purple) +
    C(500, 520, 66, K.black) + C(480, 500, 20, K.white), K.skyL) },
  { id: 'cupcake-party', name: 'Cupcake Party', cat: 'food', diff: 'easy', svg: () => svg(
    cloud(80, 220, 0.9, K.white) + S(860, 180, 80, 34, 5, K.yellow) +
    D('M240 560L760 560L690 930L310 930Z', K.orange) + rep(4, (i) => P([[340 + i * 105 - 20, 560], [380 + i * 105 - 20, 560], [400 + i * 105 - 20, 930], [350 + i * 105 - 20, 930]], '#d9743a')) +
    E(500, 540, 290, 90, K.pink) + E(500, 410, 230, 100, K.white) + E(500, 295, 160, 90, K.pink) + C(500, 190, 62, K.red), '#c9ecff') },
];
