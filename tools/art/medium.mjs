import { svg, E, C, R, P, D, S, G, rep, mirror, cloud, sector, pol, COL as K } from './lib.mjs';
export default [
  { id: 'butterfly-garden', name: 'Butterfly Garden', cat: 'animals', diff: 'medium', svg: () => {
    const wing = (c1, c2, c3) => E(310, 330, 190, 135, c1, -28) + E(330, 335, 120, 85, c2, -28) + C(265, 270, 36, c3) + C(370, 345, 30, c3) + C(250, 385, 28, K.white) +
      E(345, 640, 140, 110, c1, 30) + E(350, 640, 85, 66, c2, 30) + C(330, 640, 30, c3);
    return svg(
      C(850, 150, 90, K.yellow) + cloud(60, 160, 0.8, K.white) + R(0, 800, 1000, 200, K.lime) +
      rep(5, (i) => R(110 + i * 190, 700 + (i % 2) * 40, 26, 160, K.dgreen, 10) + C(123 + i * 190, 680 + (i % 2) * 40, 52, i % 2 ? K.hotpink : K.red) + C(123 + i * 190, 680 + (i % 2) * 40, 20, K.yellow)) +
      wing(K.orange, K.yellow, K.purple) + mirror(500, wing(K.orange, K.yellow, K.purple)) +
      E(500, 470, 42, 210, K.black) + C(500, 245, 52, K.black) + C(485, 240, 14, K.white) + C(515, 240, 14, K.white) + E(500, 420, 42, 18, K.pink) + E(500, 520, 42, 18, K.pink), K.sky); } },
  { id: 'wise-owl', name: 'Wise Owl', cat: 'animals', diff: 'medium', svg: () => svg(
    C(790, 200, 120, K.yellow) + C(840, 170, 100, K.navy) + S(130, 150, 60, 26, 5, K.yellow) + S(300, 80, 44, 20, 5, K.yellow) + S(110, 520, 50, 22, 5, K.yellow) + S(900, 520, 54, 24, 5, K.yellow) +
    R(0, 800, 1000, 90, K.brown, 30) +
    P([[290, 210], [320, 70], [420, 180]], '#7a4a1e') + P([[710, 210], [680, 70], [580, 180]], '#7a4a1e') +
    E(500, 520, 290, 340, '#a0652a') + E(500, 600, 200, 230, K.tan) +
    rep(3, (r) => rep(3, (c) => E(400 + c * 100 + (r % 2) * 0, 560 + r * 90, 48, 36, r % 2 ? '#e0a870' : '#e8b982'))).replace(/e8b982/g, 'f7dcb4') +
    E(230, 560, 70, 190, '#6b3f16', 12) + E(770, 560, 70, 190, '#6b3f16', -12) +
    C(400, 330, 100, K.white) + C(600, 330, 100, K.white) + C(400, 330, 66, K.yellow) + C(600, 330, 66, K.yellow) + C(400, 330, 34, K.black) + C(600, 330, 34, K.black) +
    P([[455, 390], [545, 390], [500, 480]], K.orange) + E(410, 850, 54, 28, K.orange) + E(590, 850, 54, 28, K.orange), '#2a3a82') },
  { id: 'elephant-parade', name: 'Elly Elephant', cat: 'animals', diff: 'medium', svg: () => svg(
    C(150, 160, 85, K.yellow) + cloud(600, 130, 0.9, K.white) + R(0, 760, 1000, 240, K.lime) +
    R(250, 560, 100, 230, '#8b98a8', 40) + R(570, 560, 100, 230, '#8b98a8', 40) + R(350, 560, 100, 230, K.grey, 40) + R(660, 560, 100, 230, K.grey, 40) +
    E(430, 480, 330, 215, K.grey) + D('M650 330Q860 330 860 540Q860 760 790 820Q740 840 735 770Q760 620 700 520Z', K.grey) +
    C(690, 330, 150, K.grey) + E(560, 360, 100, 140, K.pink, 10) + E(560, 360, 70, 110, '#e56fa3', 10) +
    P([[760, 440], [900, 520], [820, 560]], K.white) +
    C(740, 290, 50, K.white) + C(750, 295, 24, K.black) +
    D('M300 340Q420 350 540 340L560 400Q420 440 280 410Z', K.red).replace('M300', 'M300') + C(360, 380, 24, K.yellow) + C(440, 392, 24, K.yellow) + C(520, 385, 24, K.yellow) +
    E(160, 470, 40, 90, K.grey, 20) + C(130, 560, 22, '#8b98a8'), K.sky) },
  { id: 'penguin-pals', name: 'Penguin Pal', cat: 'animals', diff: 'medium', svg: () => svg(
    S(130, 150, 56, 24, 6, K.white) + S(860, 120, 66, 28, 6, K.white) + S(200, 520, 46, 20, 6, K.white) + S(830, 450, 48, 22, 6, K.white) + S(520, 90, 40, 18, 6, K.white) +
    E(500, 1010, 620, 230, K.white) + E(500, 940, 400, 80, K.skyL) +
    E(500, 540, 250, 340, K.black) + E(500, 600, 180, 270, K.white) +
    E(250, 560, 56, 170, K.black, 18) + E(750, 560, 56, 170, K.black, -18) +
    C(500, 260, 160, K.black) + C(500, 300, 110, K.white).replace('#ffffff', '#ffffff') +
    C(430, 255, 46, K.white) + C(570, 255, 46, K.white) + C(440, 258, 22, K.black) + C(560, 258, 22, K.black) + P([[440, 310], [560, 310], [500, 380]], K.orange) +
    R(330, 395, 340, 70, K.red, 30) + R(540, 440, 70, 160, K.red, 28) + R(540, 480, 70, 28, '#fff', 0).replace('#fff', K.yellow) +
    E(410, 880, 80, 38, K.orange) + E(590, 880, 80, 38, K.orange), '#8fd3ff') },
  { id: 'rainbow-unicorn', name: 'Rainbow Unicorn', cat: 'unicorns', diff: 'medium', svg: () => svg(
    cloud(40, 130, 1, K.white) + cloud(640, 90, 0.9, K.white) + R(0, 800, 1000, 200, K.lime) +
    // tail blobs
    C(150, 520, 60, K.red) + C(120, 600, 56, K.orange) + C(140, 690, 54, K.yellow) + C(200, 760, 52, K.green) + C(260, 800, 44, K.blue) +
    R(240, 650, 70, 220, K.white, 30) + R(360, 650, 70, 220, K.white, 30) + R(580, 650, 70, 220, K.white, 30) + R(690, 650, 70, 220, K.white, 30) +
    R(240, 830, 70, 50, K.yellow, 20) + R(360, 830, 70, 50, K.yellow, 20) + R(580, 830, 70, 50, K.yellow, 20) + R(690, 830, 70, 50, K.yellow, 20) +
    E(450, 600, 290, 170, K.white) +
    D('M600 560L700 280L820 330L760 640Z', K.white) + E(760, 290, 125, 100, K.white, -20) + E(845, 340, 85, 62, K.white, -20) + C(880, 345, 12, K.pink) +
    P([[720, 240], [730, 60], [790, 220]], K.yellow) + P([[690, 250], [660, 140], [740, 220]], K.pink) +
    C(640, 230, 62, K.red) + C(590, 300, 62, K.orange) + C(580, 390, 62, K.yellow) + C(590, 480, 58, K.green) + C(620, 560, 50, K.blue) + C(680, 220, 0.1, K.red).replace(/<circle[^>]*r="0.1"[^>]*>/, '') +
    C(780, 270, 20, K.black) + E(450, 640, 200, 70, K.pink).replace('rx="200"', 'rx="150"'), K.skyL) },
  { id: 'dream-castle', name: 'Dream Castle', cat: 'fantasy', diff: 'medium', svg: () => svg(
    C(820, 140, 80, K.yellow) + cloud(60, 190, 0.9, K.white) + cloud(600, 300, 0.7, K.white) +
    E(500, 1040, 700, 220, K.green) +
    R(120, 440, 190, 480, '#d7c6f5', 0) + R(690, 440, 190, 480, '#d7c6f5', 0) + R(380, 280, 240, 640, '#d7c6f5') +
    P([[100, 450], [215, 230], [330, 450]], K.hotpink) + P([[670, 450], [785, 230], [900, 450]], K.hotpink) + P([[360, 290], [500, 40], [640, 290]], K.purple) +
    R(212, 130, 10, 100, K.brown) + P([[222, 130], [290, 155], [222, 180]], K.red) + R(495, -30, 10, 70, K.brown) +
    D('M440 920L440 740Q500 660 560 740L560 920Z', K.brown) + D('M200 660L200 580Q215 540 230 580L230 660Z', K.yellow).replace('M200', 'M185').replace('L200 580', 'L185 560') +
    D('M450 520L450 420Q500 340 550 420L550 520Z', K.yellow) + D('M775 560L775 480Q800 440 825 480L825 560Z', K.yellow) + D('M175 560L175 480Q200 440 225 480L225 560Z', K.yellow) +
    R(270, 660, 110, 260, '#b9a2e8', 0).replace('<rect', '<rect opacity="1"') + R(620, 660, 110, 260, '#b9a2e8') +
    rep(4, (i) => C(250 + i * 166, 960, 24, i % 2 ? K.hotpink : K.yellow)), K.sky) },
  { id: 'trex-roar', name: 'T-Rex Roar', cat: 'dinosaurs', diff: 'medium', svg: () => svg(
    C(840, 190, 100, K.yellow) + R(0, 800, 1000, 200, '#7bc96f') + P([[0, 800], [150, 560], [300, 800]], '#b08968') + P([[700, 800], [850, 620], [1000, 800]], '#b08968') +
    P([[640, 560], [930, 700], [620, 700]], '#2f9e44') +
    E(540, 520, 250, 190, K.green).replace('#4cbb5a', '#3cae4f') + E(540, 585, 190, 120, '#bfe8a0') +
    E(330, 330, 150, 105, '#3cae4f') + R(180, 330, 260, 120, '#3cae4f', 50) +
    R(185, 410, 190, 40, K.white, 14).replace('fill="#ffffff"', 'fill="#e8505b"') + 
    C(300, 285, 40, K.white) + C(290, 288, 18, K.black) +
    rep(4, (i) => P([[205 + i * 42, 398], [235 + i * 42, 398], [220 + i * 42, 440]], K.white)) +
    E(425, 560, 34, 62, '#2f9e44', -20) + E(300, 520, 22, 50, '#2f9e44', -20) +
    R(380, 650, 110, 175, '#2f9e44', 40) + R(570, 650, 110, 175, '#2f9e44', 40) + E(425, 835, 80, 34, '#2f9e44') + E(625, 835, 80, 34, '#2f9e44') +
    C(480, 440, 24, '#2f9e44') + C(580, 450, 28, '#2f9e44') + C(680, 480, 22, '#2f9e44'), '#ffd8a8') },
  { id: 'stegosaurus', name: 'Spiky Stegosaurus', cat: 'dinosaurs', diff: 'medium', svg: () => svg(
    C(200, 160, 90, K.yellow) + cloud(600, 130, 0.9, K.white) + R(0, 760, 1000, 240, K.lime) + P([[560, 760], [740, 500], [920, 760]], '#b08968') + P([[700, 600], [740, 500], [780, 600]], K.white).replace('740,500', '740,500') +
    P([[330, 390], [400, 220], [470, 380]], K.orange) + P([[450, 360], [530, 170], [600, 350]], K.yellow) + P([[580, 350], [660, 190], [720, 380]], K.orange) + P([[700, 390], [780, 270], [810, 440]], K.yellow) +
    E(520, 560, 330, 190, '#5aa9e6') + E(520, 640, 240, 90, '#a8d8ff') +
    D('M800 520Q930 560 960 670L960 560Q930 440 820 420Z', '#5aa9e6') + P([[930, 620], [990, 560], [990, 700]], K.red) + P([[880, 700], [960, 770], [840, 740]], K.red).replace('960,770', '940,760') +
    E(210, 560, 110, 90, '#5aa9e6') + C(170, 530, 28, K.white) + C(166, 532, 12, K.black) + D('M110 600Q180 640 250 600', K.red).replace(/fill="#ee4b4b"/, 'fill="none"') +
    R(300, 680, 100, 150, '#3f87c4', 36) + R(620, 680, 100, 150, '#3f87c4', 36) + R(410, 700, 90, 130, '#5aa9e6', 36) + R(520, 700, 90, 130, '#5aa9e6', 36) , '#ffe8b0').replace('<path d="M110 600Q180 640 250 600" fill="none"/>', '') },
  { id: 'choo-choo-train', name: 'Choo-Choo Train', cat: 'vehicles', diff: 'medium', svg: () => svg(
    C(850, 150, 85, K.yellow) + cloud(80, 120, 1, K.white) + P([[0, 640], [180, 400], [360, 640]], '#79c96b') + P([[300, 640], [520, 360], [740, 640]], '#5fb35a') + P([[680, 640], [850, 450], [1000, 640]], '#79c96b') + R(0, 640, 1000, 360, K.lime) +
    R(0, 800, 1000, 40, K.brown) + 
    C(300, 220, 50, '#ffffff') + C(240, 150, 38, K.lgrey) + C(190, 90, 28, K.white) +
    R(540, 380, 190, 70, K.red, 14).replace('#ee4b4b', '#2b2d42') + R(580, 450, 110, 40, K.dgrey, 10).replace('#4a5568', '#ffd93d') + 
    R(120, 440, 420, 250, K.blue, 40) + E(330, 440, 210, 40, '#2d6fd6') + R(330, 280, 70, 190, K.black, 20) + R(310, 270, 110, 40, K.dgrey, 18) +
    R(530, 360, 260, 330, K.red, 30) + R(570, 395, 180, 130, K.white, 20) + C(660, 460, 38, K.sky) +
    R(100, 690, 700, 40, K.dgrey, 12) + C(220, 710, 70, K.black) + C(220, 710, 30, K.yellow) + C(380, 730, 52, K.black) + C(380, 730, 20, K.yellow) + C(620, 710, 70, K.black) + C(620, 710, 30, K.yellow) +
    P([[100, 660], [60, 740], [160, 740]], K.yellow), K.sky) },
  { id: 'fire-truck', name: 'Fire Truck', cat: 'vehicles', diff: 'medium', svg: () => svg(
    rep(4, (i) => R(40 + i * 245, 250 + (i % 2) * 90, 200, 560, i % 2 ? '#c9b6e4' : '#ffd6a5')) + 
    rep(4, (i) => rep(3, (r) => R(75 + i * 245, 290 + (i % 2) * 90 + r * 130, 55, 70, K.white) + R(145 + i * 245, 290 + (i % 2) * 90 + r * 130, 55, 70, K.yellow))) +
    R(0, 800, 1000, 200, K.dgrey) + R(80, 880, 140, 24, K.yellow) + R(430, 880, 140, 24, K.yellow) + R(780, 880, 140, 24, K.yellow) +
    R(80, 520, 560, 250, K.red, 40) + R(620, 440, 280, 330, K.red, 50) + R(660, 480, 170, 120, K.sky, 20) + R(110, 540, 500, 40, K.white, 14) +
    R(110, 440, 440, 40, K.lgrey, 12) + rep(8, (i) => R(130 + i * 52, 440, 18, 80, K.white, 4).replace('#ffffff', '#9aa5b1')) +
    R(120, 400, 100, 40, K.yellow, 14) + C(750, 405, 30, K.blue) + C(190, 780, 80, K.black) + C(190, 780, 36, K.lgrey) + C(560, 780, 80, K.black) + C(560, 780, 36, K.lgrey) + C(780, 780, 80, K.black) + C(780, 780, 36, K.lgrey) +
    C(120, 190, 80, K.yellow) + cloud(580, 100, 0.9, K.white) , K.sky) },
  { id: 'hot-air-balloon', name: 'Hot Air Balloon', cat: 'vehicles', diff: 'medium', svg: () => svg(
    C(160, 170, 90, K.yellow) + cloud(640, 760, 1.1, K.white) + cloud(40, 640, 0.9, K.white) + P([[0, 1000], [240, 790], [480, 1000]], '#79c96b') + P([[380, 1000], [680, 760], [1000, 1000]], '#5fb35a') + 
    rep(5, (i) => sector(500, 400, 0, 300, 180 + i * 36, 216 + i * 36, ['#ee4b4b', '#ffd93d', '#3a86ff', '#ffd93d', '#ee4b4b'][i]).replace('Z', 'Z')) +
    P([[300, 400], [700, 400], [570, 650], [430, 650]], K.orange).replace('#ff9a3c', '#9b5de5') + R(430, 650, 140, 100, K.brown, 18) + R(410, 640, 180, 36, '#6b3f16', 14) +
    P([[440, 400], [560, 400], [520, 650], [480, 650]], K.pink) + S(500, 520, 36, 16, 5, K.yellow) , K.skyL).replace('fill="#ffd93d"/><path', 'fill="#ffd93d"/><path') },
  { id: 'pizza-time', name: 'Pizza Time', cat: 'food', diff: 'medium', svg: () => svg(
    C(500, 500, 460, '#8d5524').replace('#8d5524', '#c98f5a') + C(500, 500, 400, '#f2b45e') + C(500, 500, 350, K.red) + C(500, 500, 320, K.yellow) +
    rep(7, (i) => { const [x, y] = pol(500, 500, 210, i * 360 / 7 + 10); return C(x, y, 62, '#c1121f') + C(x, y, 26, '#e56b6f'); }) +
    rep(5, (i) => { const [x, y] = pol(500, 500, 100, i * 72 + 30); return C(x, y, 40, K.dgreen); }) +
    rep(6, (i) => { const [x, y] = pol(500, 500, 300, i * 60 + 5); return C(x, y, 36, K.black) + C(x, y, 14, K.yellow); }) +
    rep(4, (i) => { const [x, y] = pol(500, 500, 130 + (i % 2) * 70, i * 90 + 70); return E(x, y, 52, 34, K.white, i * 40); }) +
    C(500, 500, 40, '#c1121f'), '#a7d8ff') },
  { id: 'big-burger', name: 'Big Burger', cat: 'food', diff: 'medium', svg: () => svg(
    cloud(50, 140, 0.9, K.white) + S(880, 150, 72, 30, 5, K.yellow) + R(0, 830, 1000, 170, '#ff8fa3') +
    E(500, 880, 420, 70, K.white) +
    D('M180 700Q180 780 260 780L740 780Q820 780 820 700Z', '#e9a15b') + R(190, 700, 620, 40, '#c97a2b', 0).replace('#c97a2b', '#8d5524') + 
    D('M170 630Q300 700 420 650Q560 720 680 650Q770 690 830 630L830 700L170 700Z', K.lime) +
    P([[200, 580], [800, 580], [700, 690], [300, 690]], K.yellow).replace('M', 'M') + R(180, 530, 640, 80, K.brown, 36) + 
    E(500, 480, 330, 70, K.red) +
    D('M170 430Q170 160 500 150Q830 160 830 430L830 470Q500 520 170 470Z', '#e9a15b') +
    E(330, 270, 26, 16, K.white, -30) + E(500, 220, 26, 16, K.white, 10) + E(660, 270, 26, 16, K.white, 30) + E(400, 360, 26, 16, K.white, 40) + E(600, 360, 26, 16, K.white, -40), '#c9ecff').replace(/<rect x="180" y="530"[^>]*>/, (m) => m) },
  { id: 'ufo-visitor', name: 'Friendly UFO', cat: 'space', diff: 'medium', svg: () => svg(
    S(120, 120, 56, 24, 5, K.yellow) + S(880, 100, 50, 22, 5, K.yellow) + S(100, 560, 46, 20, 5, K.yellow) + S(900, 520, 52, 22, 5, K.yellow) + C(180, 880, 100, '#ff7b9c') + C(150, 850, 36, '#ff9fb7') + C(820, 880, 80, '#7bdff2') +
    P([[400, 520], [600, 520], [780, 960], [220, 960]], '#fff3b0').replace('#fff3b0', '#e9ffb0') +
    C(500, 340, 190, '#9fe3ff') + C(500, 330, 100, K.green) + C(465, 320, 24, K.black) + C(535, 320, 24, K.black) + R(480, 370, 40, 14, K.black, 6).replace('#2b2d42', '#2d6a4f') +
    E(500, 480, 400, 100, K.grey) + E(500, 500, 400, 80, K.lgrey, 0).replace('fill="#e3e8ee"', 'fill="#e3e8ee"') + 
    rep(5, (i) => C(220 + i * 140, 495, 28, i % 2 ? K.yellow : K.red)), K.navy) },
  { id: 'ringed-planet', name: 'Ringed Planet', cat: 'space', diff: 'medium', svg: () => svg(
    rep(8, (i) => S(60 + (i * 337) % 880, 70 + (i * 521) % 860, 36, 16, 5, K.white)).replace(/fill="#ffffff"/g, 'fill="#ffffff"') + C(180, 800, 110, K.grey) + C(150, 770, 30, K.dgrey) + C(215, 830, 24, K.dgrey) + C(820, 170, 80, K.teal) +
    E(500, 520, 430, 100, K.pink, -18) + C(500, 500, 270, K.orange) + 
    D('M270 370Q500 320 730 370L750 450Q500 400 250 450Z', K.yellow) + D('M232 550Q500 500 768 550L740 640Q500 590 260 640Z', K.red) + C(400, 420, 0.1, K.red) + C(580, 720, 36, K.red) +
    D('M110 640Q300 760 520 600Q700 480 900 380L920 430Q700 600 520 680Q300 790 90 700Z', K.pink) + 
    C(850, 780, 60, K.blue), K.navy) },
  { id: 'wizard-wonder', name: 'Wizard Wonder', cat: 'fantasy', diff: 'medium', svg: () => svg(
    S(120, 160, 60, 26, 5, K.yellow) + S(880, 200, 66, 28, 5, K.yellow) + S(120, 640, 52, 22, 5, K.yellow) + S(900, 700, 50, 22, 5, K.yellow) + C(850, 520, 70, '#e9d8ff') +
    E(500, 1000, 330, 300, K.blue) + R(450, 640, 100, 60, K.white).replace('fill="#ffffff"', 'fill="#e3e8ee"') +
    E(500, 520, 190, 200, K.tan) + D('M300 560Q320 940 500 960Q680 940 700 560Q600 700 500 700Q400 700 300 560Z', K.white) +
    C(430, 480, 40, K.white) + C(570, 480, 40, K.white) + C(436, 484, 18, K.black) + C(564, 484, 18, K.black) + E(500, 560, 38, 30, '#e8a07a') + 
    P([[260, 400], [740, 400], [560, 80], [500, 20]], K.purple).replace('560,80 500,20', '600,120 520,30') + E(500, 400, 300, 56, '#7b3fc4') + 
    S(480, 260, 52, 22, 5, K.yellow) + C(560, 150, 20, K.yellow) + 
    R(790, 480, 30, 400, K.brown, 12, 12) + S(850, 440, 66, 28, 5, K.yellow, 12), '#3b2f8f').replace('#3b2f8f', '#3b2f8f') },
];
