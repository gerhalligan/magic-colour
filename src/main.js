import pictures from './pictures.generated.js';
import { createGame, textColourFor, MODE_MAGIC, MODE_CLASSIC, MODE_BRUSH } from './game.js';
import { BRUSH_SIZES } from './brush.js';
import { PuzzleView } from './view.js';
import { store } from './store.js';
import { audio } from './audio.js';
import { saveOrShare, renderFinal, canShareFiles } from './export.js';
import { confetti } from './confetti.js';
import { I, CAT, DIFF, STICKER } from './icons.js';

const $ = (sel, el = document) => el.querySelector(sel);
const app = $('#app');
let settings = store.settings();
audio.setMuted(!settings.sound);
const filters = { shapes: { cat: 'all', diff: 'all' }, grid: { cat: 'all', diff: 'all' } };
let filter = filters[settings.type];
const ofType = (t) => pictures.filter((p) => (t === 'grid') === !!p.grid);
let tipShown = false, cur = null, view = null, pending = [], toastTimer = 0, stopConfetti = null, celebTimer = 0;
const stars = (d) => '<span class="stars' + (d === 'epic' ? ' epic' : '') + '" aria-label="' + d + '">' + '\u2605'.repeat(DIFF[d]) + '<i>' + '\u2605'.repeat(Math.max(0, 3 - DIFF[d])) + '</i></span>';
const byId = (id) => pictures.find((p) => p.id === id);

app.innerHTML = `
<section id="home" class="screen on">
  <header class="top">
    <h1><span class="logo">\u2728</span> Magic Colour</h1>
    <div class="types" id="types" role="tablist" aria-label="Picture type">
      <button class="type" data-type="shapes" role="tab" aria-label="Shapes: colour pictures made of pretty shapes">${I.shapes}<b>Shapes</b><small id="nShapes"></small></button>
      <button class="type" data-type="grid" role="tab" aria-label="Grid: colour square numbered pixel pictures">${I.grid}<b>Grid</b><small id="nGrid"></small></button>
    </div>
    <div class="grow"></div>
    <button class="tbtn" id="hSurprise" aria-label="Surprise me">${I.dice}<span>Surprise</span></button>
    <button class="tbtn" id="hGallery" aria-label="My gallery">${I.gallery}<span>Gallery</span></button>
    <button class="tbtn icon" id="hSound" aria-label="Sound"></button>
  </header>
  <div class="filters" id="filters">
    <div class="chips" id="catChips" aria-label="Categories"></div>
    <div class="chips small" id="diffChips" aria-label="Levels"></div>
  </div>
  <div class="hscroll" id="hscroll">
    <div class="strips" id="strips" hidden>
      <div id="continue" class="continue" hidden></div>
      <div id="potd" class="potd" hidden></div>
    </div>
    <main class="grid" id="grid"></main>
    <section id="stickers" class="stickers" aria-label="My stickers" hidden>
      <p class="stickers-label">\u{1F3C5} My stickers</p>
      <div class="stickers-row" id="stickerRow"></div>
    </section>
  </div>
</section>
<section id="gallery" class="screen">
  <header class="top">
    <button class="tbtn icon" id="gBack" aria-label="Back">${I.home}</button>
    <h1>My Gallery <span class="logo">\u2B50</span></h1><div class="grow"></div>
    <span class="count" id="gCount"></span>
  </header>
  <main class="grid" id="gGrid"></main>
</section>
<section id="play" class="screen">
  <header class="bar">
    <button class="tool" id="pHome" aria-label="All pictures">${I.home}</button>
    <div class="modes" role="group" aria-label="Colouring mode">
      <button class="mode" data-mode="magic" aria-label="Magic: pick a colour, tap one spot, and every spot with that number gets coloured">${I.wand}<b>Magic</b></button>
      <button class="mode" data-mode="classic" aria-label="One by one: tap each spot">${I.finger}<b>One by one</b></button>
      <button class="mode" data-mode="brush" aria-label="Paint brush: pick a colour, then drag across the picture to paint the spots with that number">${I.brush}<b>Brush</b></button>
    </div>
    <div class="grow"></div>
    <button class="tool" id="pUndo" aria-label="Undo">${I.undo}</button>
    <button class="tool" id="pHint" aria-label="Hint">${I.bulb}</button>
  </header>
  <div id="stage">
    <canvas id="cv"></canvas>
    <div class="pbar"><i id="pFill"></i><b id="pText"></b></div>
    <button class="sndbtn" id="pSound" aria-label="Sound"></button>
    <div id="brushbar" role="group" aria-label="Brush size">${BRUSH_SIZES.map((b, i) => `<button data-size="${i}" aria-label="${b.label} brush" title="${b.label}"><i style="--d:${[10, 17, 25, 34][i]}px"></i></button>`).join('')}</div>
    <div class="zoomctl">
      <button id="zIn" aria-label="Zoom in">${I.plus}</button>
      <button id="zOut" aria-label="Zoom out">${I.minus}</button>
      <button id="zFit" aria-label="Fit picture">${I.fit}</button>
    </div>
    <div id="toast" role="status"></div>
  </div>
  <nav id="palette" aria-label="Colours"></nav>
</section>
<div id="modal" class="modal"><div class="card" id="modalCard"></div></div>
`;

// ---------- helpers ----------
function toast(msg, ms = 2400) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), ms);
}
function show(name) { for (const s of app.querySelectorAll('.screen')) s.classList.toggle('on', s.id === name); if (name === 'play' && view) requestAnimationFrame(() => view.resize(false)); }
function soundIcons() { const h = settings.sound ? I.sound : I.mute; $('#hSound').innerHTML = h; $('#pSound').innerHTML = h; }
function setSound(on) { settings.sound = on; store.saveSettings(settings); audio.setMuted(!on); soundIcons(); if (on) { audio.unlock(); audio.tap(); } }
soundIcons();

// ---------- home ----------
function renderTypes() {
  for (const b of app.querySelectorAll('#types .type')) { const on = b.dataset.type === settings.type; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); }
  $('#nShapes').textContent = ofType('shapes').length; $('#nGrid').textContent = ofType('grid').length;
  for (const [t, id] of [['shapes', '#nShapes'], ['grid', '#nGrid']]) $(id).parentElement.title = ofType(t).length + ' pictures';
}
function renderChips() {
  renderTypes();
  const cats = ['all', ...new Set(ofType(settings.type).map((p) => p.cat))];
  $('#catChips').innerHTML = cats.map((c) => `<button class="chip${filter.cat === c ? ' on' : ''}" data-cat="${c}"><em>${(CAT[c] || ['\u2B50'])[0]}</em>${(CAT[c] || [0, c])[1]}</button>`).join('');
  $('#diffChips').innerHTML = [['all', 'Any level'], ['easy', '\u2605 Easy'], ['medium', '\u2605\u2605 Medium'], ['hard', '\u2605\u2605\u2605 Hard'], ['epic', '\u2605\u2605\u2605\u2605 Epic']].filter(([d]) => d === 'all' || ofType(settings.type).some((p) => p.diff === d)).map(([d, l]) => `<button class="chip${filter.diff === d ? ' on' : ''}" data-diff="${d}">${l}</button>`).join('');
}
const NEW_MS = 7 * 864e5;
/** Pictures with an `added` ISO date stay "new" for about a week (unfinished ones get a sparkle badge + sort to the front). */
function isFresh(p) {
  if (!p || !p.added) return false;
  const t = Date.parse(p.added);
  return Number.isFinite(t) && (Date.now() - t) < NEW_MS;
}
/** Stable Dublin-day pick so every device shows the same featured picture. */
function dayKey() {
  try { return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Dublin' }); }
  catch (e) { return new Date().toISOString().slice(0, 10); }
}
function pictureOfTheDay(type = settings.type) {
  const pool = ofType(type);
  const day = dayKey();
  let h = 2166136261;
  for (let i = 0; i < day.length; i++) h = Math.imul(h ^ day.charCodeAt(i), 16777619) >>> 0;
  return pool[h % pool.length];
}
function unfinishedLast() {
  const id = settings.lastId;
  if (!id) return null;
  const p = byId(id);
  if (!p || store.done()[id]) return null;
  const pct = store.pct(id, p.stats.regions);
  if (!(pct > 0 && pct < 1)) return null;
  return { p, pct };
}
function syncStrips() { $('#strips').hidden = $('#continue').hidden && $('#potd').hidden; }
function renderContinue() { renderContinue0(); syncStrips(); }
function renderContinue0() {
  const el = $('#continue');
  const u = unfinishedLast();
  if (!u) { el.hidden = true; el.innerHTML = ''; return; }
  const { p, pct } = u;
  el.hidden = false;
  el.innerHTML = '<button class="cont" data-id="' + p.id + '" aria-label="Continue ' + p.name + '">'
    + '<img src="' + p.thumb + '" alt="" draggable="false">'
    + '<span class="cont-body"><b>Continue <small>' + Math.round(pct * 100) + '%</small></b><em>' + p.name + '</em></span>'
    + '<span class="cont-meter"><i style="width:' + Math.round(pct * 100) + '%"></i></span>'
    + '<span class="cont-go" aria-hidden="true">▶</span></button>';
}
function renderPotd() { renderPotd0(); syncStrips(); }
function renderPotd0() {
  const el = $('#potd');
  const p = pictureOfTheDay();
  const matches = (filter.cat === 'all' || p.cat === filter.cat) && (filter.diff === 'all' || p.diff === filter.diff);
  if (!matches) { el.hidden = true; el.innerHTML = ''; return; }
  const done = !!store.done()[p.id];
  el.hidden = false;
  el.innerHTML = card(p, done, '<span class="potd-label"><i class="sun">\u2600\uFE0F </i>Picture of the day</span><span class="pinb" aria-label="Pinned">\uD83D\uDCCC</span>');
}
function card(p, done, extra = '') {
  const pct = done ? 1 : store.pct(p.id, p.stats.regions);
  const fresh = !done && isFresh(p);
  const newb = fresh ? '<span class="newb" aria-label="New">\u2728 NEW</span>' : '';
  return `<button class="pic${done ? ' done' : ''}${fresh ? ' fresh' : ''}" data-id="${p.id}"><img src="${p.thumb}" alt="" draggable="false"><span class="nm">${p.name}</span>${stars(p.diff)}${p.grid ? `<span class="gsz">${p.grid.w}\u00D7${p.grid.h}</span>` : ''}${done ? `<span class="badge">${I.tick}</span>` : pct > 0 ? `<span class="meter"><i style="width:${Math.round(pct * 100)}%"></i></span>` : ''}${newb}${extra}</button>`;
}
function renderStickers() {
  const el = $('#stickers'), row = $('#stickerRow');
  const got = store.stickers();
  const cats = Object.keys(STICKER).filter((c) => got[c]);
  if (!cats.length) { el.hidden = true; row.innerHTML = ''; return; }
  el.hidden = false;
  cats.sort((a, b) => (got[b] || 0) - (got[a] || 0));
  row.innerHTML = cats.map((c) => {
    const emoji = STICKER[c] || '\u2B50';
    const label = (CAT[c] || [0, c])[1];
    return `<span class="sticker" title="${label}" aria-label="${label} sticker"><em>${emoji}</em><b>${label}</b></span>`;
  }).join('');
}
function renderGrid() {
  const done = store.done();
  const list = ofType(settings.type).filter((p) => (filter.cat === 'all' || p.cat === filter.cat) && (filter.diff === 'all' || p.diff === filter.diff))
    .sort((a, b) => {
      const fa = !done[a.id] && isFresh(a), fb = !done[b.id] && isFresh(b);
      if (fa !== fb) return fa ? -1 : 1;
      return 0;
    });
  renderContinue();
  renderPotd();
  renderStickers();
  $('#grid').innerHTML = list.length ? list.map((p) => card(p, !!done[p.id])).join('') : '<p class="empty">No pictures here yet \u{1F338}</p>';
}
function renderGallery() {
  const done = store.done(), ids = Object.keys(done).filter(byId).sort((a, b) => done[b] - done[a]);
  $('#gCount').textContent = ids.length + ' / ' + pictures.length;
  $('#gGrid').innerHTML = ids.length ? ids.map((id) => card(byId(id), true)).join('') : '<p class="empty">Finish a picture and it will shine here! \u2B50</p>';
}
$('#types').addEventListener('click', (e) => {
  const b = e.target.closest('[data-type]'); if (!b || b.dataset.type === settings.type) return; audio.unlock(); audio.tap();
  settings.type = b.dataset.type; store.saveSettings(settings); filter = filters[settings.type]; renderChips(); renderGrid(); $('#hscroll').scrollTop = 0;
});
$('#catChips').addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (!b) return; filter.cat = b.dataset.cat; audio.tap(); renderChips(); renderGrid(); });
$('#diffChips').addEventListener('click', (e) => { const b = e.target.closest('[data-diff]'); if (!b) return; filter.diff = b.dataset.diff; audio.tap(); renderChips(); renderGrid(); });
$('#grid').addEventListener('click', (e) => { const b = e.target.closest('.pic'); if (b) openPicture(b.dataset.id); });
$('#potd').addEventListener('click', (e) => { const b = e.target.closest('.pic'); if (b) openPicture(b.dataset.id); });
$('#continue').addEventListener('click', (e) => { const b = e.target.closest('[data-id]'); if (b) openPicture(b.dataset.id, true); });
$('#gGrid').addEventListener('click', (e) => { const b = e.target.closest('.pic'); if (b) openViewer(byId(b.dataset.id)); });
$('#hGallery').addEventListener('click', () => { audio.unlock(); audio.tap(); renderGallery(); show('gallery'); enter(); });
$('#gBack').addEventListener('click', () => { audio.tap(); goHome(); });
$('#hSound').addEventListener('click', () => setSound(!settings.sound));
$('#pSound').addEventListener('click', () => setSound(!settings.sound));
$('#hSurprise').addEventListener('click', () => { audio.unlock(); const done = store.done(); const all = ofType(settings.type), pool = all.filter((p) => !done[p.id] && (filter.cat === 'all' || p.cat === filter.cat)); const l = pool.length ? pool : all; openPicture(l[(Math.random() * l.length) | 0].id, true); });
let hasEntry = false;
function enter() { if (hasEntry) return; try { history.pushState({ mc: 1 }, ''); hasEntry = true; } catch (e) { /* ignore */ } }
function homeNow() { flush(); closeModal(); clearTimeout(celebTimer); renderGrid(); show('home'); }
function goHome() { if (hasEntry) { hasEntry = false; try { history.back(); return; } catch (e) { /* fall through */ } } homeNow(); }
addEventListener('popstate', () => { hasEntry = false; if (!$('#home').classList.contains('on')) homeNow(); });

// ---------- opening a picture ----------
function openPicture(id, force) {
  audio.unlock(); audio.tap();
  const p = byId(id); if (!p) return;
  if (!force && store.done()[id]) { openViewer(p); return; }
  startPicture(p);
}
function startPicture(p) {
  flush(); closeModal(); clearTimeout(celebTimer); if (stopConfetti) { stopConfetti(); stopConfetti = null; }
  settings.lastId = p.id; store.saveSettings(settings);
  const game = createGame(p, { mode: settings.mode });
  game.restore(store.progress(p.id));
  cur = { pic: p, game };
  if (!view) view = new PuzzleView($('#cv'), { onTap: onTapRegion, onBrushStart, onBrush, onBrushEnd });
  buildPalette(); updateModeUI(); show('play'); enter();
  view.load(p, game);
  requestAnimationFrame(() => { view.resize(true); });
  updatePalette(); updateProgress();
  if (game.complete) finish(true);
  else if (!settings.introSeen) { settings.introSeen = true; store.saveSettings(settings); tipShown = true; toast('Three ways to play (top bar): \u2728 Magic \u00B7 \u261D\uFE0F One by one \u00B7 \u{1F58C}\uFE0F Brush', 5200); }
  else if (p.grid && !tipShown) { tipShown = true; toast('Grid: every square has a number. Try the \u{1F58C}\uFE0F Brush \u2013 drag across the squares!', 4200); }
  else if ((p.diff === 'hard' || p.diff === 'epic') && !tipShown) { tipShown = true; toast('Pinch to zoom in and find the tiny spots! \u{1F50D}', 3600); }
}

// ---------- palette ----------
function buildPalette() {
  const p = cur.pic, K = p.palette.length;
  const nav = $('#palette'); nav.style.setProperty('--rows', K > 6 ? 2 : 1); nav.style.setProperty('--cols', K > 12 ? 3 : K > 5 ? 2 : 1);
  nav.innerHTML = p.palette.map((hex, i) => `<button class="sw" data-c="${i + 1}" style="--c:${hex};--t:${textColourFor(hex)}" aria-label="Colour ${i + 1}"><u class="ring"></u><b>${i + 1}</b><i class="tk">${I.tick}</i></button>`).join('');
}
function updatePalette() {
  const g = cur.game;
  for (const b of $('#palette').children) {
    const c = +b.dataset.c, tot = g.byColour[c].length, d = g.doneCount[c];
    b.classList.toggle('sel', g.selected === c); b.classList.toggle('done', g.colourDone(c));
    b.style.setProperty('--p', tot ? Math.round(100 * d / tot) : 100);
  }
}
function updateProgress() {
  const g = cur.game, pc = Math.round(g.progress() * 100); $('#pFill').style.width = pc + '%'; $('#pText').textContent = pc + '%';
}
function updateModeUI() {
  for (const b of app.querySelectorAll('.mode')) { const on = b.dataset.mode === settings.mode; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }
  for (const b of app.querySelectorAll('#brushbar [data-size]')) { const on = +b.dataset.size === settings.brushSize; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }
  $('#play').dataset.mode = settings.mode;
  if (cur) { cur.game.setMode(settings.mode); }
  if (view) view.setBrush(settings.mode === MODE_BRUSH, settings.brushSize);
  updateUndo();
}
function updateUndo() { $('#pUndo').disabled = !cur || !cur.game.canUndo(); }
$('#palette').addEventListener('click', (e) => {
  const b = e.target.closest('.sw'); if (!b || !cur) return; audio.unlock();
  const c = +b.dataset.c, g = cur.game;
  flush();
  const res = g.selectColour(c);
  if (res.type === 'select' && res.done) { toast('All the ' + c + 's are done \u2705'); audio.tap(); }
  else if (res.type === 'select') {
    // selecting only selects: softly glow the matching spots so the player can find one and tap it
    const ids = g.byColour[c].filter((i) => !g.filled[i]);
    view.setOverlay(ids.map((id) => ({ id, color: '#ffd93d' })), 1600);
    toast(g.mode === MODE_MAGIC ? '\u{1FA84} Now tap a spot numbered ' + c + ' \u2013 the magic brush colours them all!' : 'Now tap the spots numbered ' + c, 2400);
  }
  handle(res);
});
app.querySelector('.modes').addEventListener('click', (e) => {
  const b = e.target.closest('.mode'); if (!b) return; audio.unlock(); settings.mode = b.dataset.mode; settings.modeChosen = true; store.saveSettings(settings); updateModeUI(); audio.tap();
  toast(settings.mode === MODE_MAGIC ? '\u{1FA84} Magic: pick a colour, tap one spot \u2013 every spot with that number gets coloured!' : settings.mode === MODE_BRUSH ? '\u{1F58C}\uFE0F Brush: pick a colour, then drag across the picture \u2013 it paints only the spots with that number! Two fingers zoom & move.' : '\u261D\uFE0F One by one: tap each spot to colour it', 3600);
  if (settings.mode === MODE_BRUSH && view) view.previewBrush(1200);
});
$('#brushbar').addEventListener('click', (e) => {
  const b = e.target.closest('[data-size]'); if (!b) return; audio.unlock(); setBrushSize(+b.dataset.size);
});
function setBrushSize(i) {
  i = Math.min(BRUSH_SIZES.length - 1, Math.max(0, i)); settings.brushSize = i; settings.brushChosen = true; store.saveSettings(settings); audio.tap(); updateModeUI();
  if (view) view.previewBrush(1100);
  toast(BRUSH_SIZES[i].label + ' brush \u{1F58C}\uFE0F', 1100);
}

// ---------- gameplay ----------
function flush() { const p = pending; pending = []; for (const o of p) { clearTimeout(o.t); o.fn(); } }
function later(fn, ms) { const o = { fn: () => fn() }; o.t = setTimeout(() => { pending = pending.filter((x) => x !== o); fn(); }, ms); pending.push(o); return o; }
function onTapRegion(id, mx, my) {
  if (!cur || id < 0) return; audio.unlock(); flush();
  const res = cur.game.tapRegion(id);
  handle(res, { id, mx, my });
}
function handle(res, ctx = {}) {
  const g = cur.game, P = cur.pic;
  switch (res.type) {
    case 'fill': {
      view.setOverlay(null);
      const col = P.palette[res.colour - 1];
      const ids = res.ids.slice();
      const ox = ctx.mx !== undefined ? ctx.mx : P.regions[ids[0]][1], oy = ctx.my !== undefined ? ctx.my : P.regions[ids[0]][2];
      ids.sort((a, b) => Math.hypot(P.regions[a][1] - ox, P.regions[a][2] - oy) - Math.hypot(P.regions[b][1] - ox, P.regions[b][2] - oy));
      const step = res.magic ? Math.min(70, 650 / Math.max(1, ids.length)) : 0;
      ids.forEach((id, i) => { const run = () => { view.paintRegion(id); view.burst(id, col, res.magic ? 3 : 6); }; if (i === 0 || !step) run(); else later(run, i * step); });
      if (res.magic) audio.magic(res.colour, ids.length); else audio.fill(res.colour);
      if (res.colourDone) { audio.done(); const b = $('#palette').children[res.colour - 1]; b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
      save();
      if (res.complete) later(() => finish(false), ids.length * step + 350);
      break; }
    case 'select': audio.select(res.colour); if (res.fromRegion) toast('Colour ' + res.colour + ' picked! ' + (g.mode === MODE_MAGIC ? 'Tap that spot again \u2013 the magic brush colours them all!' : 'Now tap the spots numbered ' + res.colour)); break;
    case 'wrong': {
      view.wrong(res.id); audio.wrong();
      const b = $('#palette').children[res.want - 1]; b.classList.remove('nudge'); void b.offsetWidth; b.classList.add('nudge');
      toast('Oops! That spot is number ' + res.want + ' \u{1F642}'); break; }
    case 'already': audio.tap(); break;
    default: break;
  }
  view.dirty = true; view.kick(); updatePalette(); updateProgress(); updateModeUI();
}
// ---------- paint brush ----------
let bs = null, lastSparkle = 0, lastWrong = 0, lastWrongToast = 0, lastSave = 0, lastGlow = 0;
function onBrushStart() {
  if (!cur) return; audio.unlock(); flush(); cur.game.beginStroke(); bs = { told: false, wrongShown: false, painted: 0 };
}
/** called once per animation frame with the region ids the brush covered; ONLY matching-number regions get filled (game.brushPaint enforces it) */
function onBrush(ids, info) {
  if (!cur || !bs) return 0;
  const g = cur.game, P = cur.pic, now = performance.now();
  if (g.complete) return 0;
  const sel = g.selected;
  if (sel === 0 || g.colourDone(sel)) {
    if (!bs.told) {
      bs.told = true;
      if (sel === 0) { toast('Pick a colour first, then paint \u{1F3A8}', 2200); audio.nudge(); for (const b of $('#palette').children) { b.classList.remove('nudge'); void b.offsetWidth; b.classList.add('nudge'); } }
      else toast('All the ' + sel + 's are done \u2705 Pick another colour', 2400);
    }
    return 0;
  }
  const res = g.brushPaint(ids);
  if (res.type !== 'brush') return 0;
  if (res.ids.length) {
    bs.painted += res.ids.length; view.paintRegions(res.ids); view.sparkle(res.ids, P.palette[sel - 1]);
    if (now - lastSparkle > 120) { lastSparkle = now; audio.sparkle(sel, res.ids.length); }
    if (res.colourDone) { audio.done(); const b = $('#palette').children[sel - 1]; b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop'); }
    updatePalette(); updateProgress(); updateUndo();
    if (now - lastSave > 2500) { lastSave = now; save(); }
    if (res.complete) { g.endStroke(); save(); later(() => finish(false), 450); }
  } else if (info && info.wrongId >= 0 && now - lastWrong > 1500) {
    // gentle, throttled: the brush ran over a different number
    lastWrong = now; view.nudgeRegion(info.wrongId);
    if (!bs.wrongShown) {
      bs.wrongShown = true; audio.nudge();
      if (now - lastWrongToast > 9000) { lastWrongToast = now; toast('The brush only paints number ' + sel + ' \u{1F642}', 2000); }
    }
  }
  return res.ids.length;
}
function onBrushEnd(painted) {
  if (!cur) return; const g = cur.game; g.endStroke(); save(); updateUndo();
  const sel = g.selected, now = performance.now();
  if (!painted && sel && !g.colourDone(sel) && !(bs && bs.told) && now - lastGlow > 4000) { // nothing painted: softly show where that number is
    lastGlow = now; view.setOverlay(g.byColour[sel].filter((i) => !g.filled[i]).map((id) => ({ id, color: '#ffd93d' })), 1400);
  }
  bs = null;
}
function save() { if (!cur) return; store.saveProgress(cur.pic.id, cur.game.save()); }
$('#pUndo').addEventListener('click', () => {
  if (!cur) return; flush(); const r = cur.game.undo(); if (!r) return; audio.unlock(); audio.undo();
  view.paintRegions(r.ids);
  save(); updatePalette(); updateProgress(); updateModeUI(); view.setOverlay(null);
});
$('#pHint').addEventListener('click', () => {
  if (!cur) return; audio.unlock(); flush(); const h = cur.game.hint(); if (!h) return; audio.hint();
  view.focusRegions(h.ids); view.setOverlay(h.ids.map((id) => ({ id, color: '#ffd93d' })), 4200);
  updatePalette(); view.dirty = true; view.kick();
  const b = $('#palette').children[h.colour - 1]; b.classList.remove('nudge'); void b.offsetWidth; b.classList.add('nudge');
  toast('Look for the glowing spots \u2013 they are number ' + h.colour + '!', 3200);
});
$('#pHome').addEventListener('click', () => { audio.tap(); goHome(); });
$('#zIn').addEventListener('click', () => view && view.zoomBy(1.6));
$('#zOut').addEventListener('click', () => view && view.zoomBy(1 / 1.6));
$('#zFit').addEventListener('click', () => view && view.fit());
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
addEventListener('pagehide', save);
addEventListener('blur', () => view && view.setSpace(false));
addEventListener('keyup', (e) => { if (e.key === ' ' && view) { view.setSpace(false); if (cur && $('#play').classList.contains('on')) e.preventDefault(); } });
addEventListener('keydown', (e) => { if (!cur || !$('#play').classList.contains('on')) return;
  if (e.key === ' ') { e.preventDefault(); if (view) view.setSpace(true); return; }
  if (settings.mode === MODE_BRUSH && (e.key === '[' || e.key === ']')) { setBrushSize(settings.brushSize + (e.key === ']' ? 1 : -1)); return; }
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') $('#pUndo').click(); else if (/^[1-9]$/.test(e.key)) { const b = $('#palette').children[+e.key - 1]; if (b) b.click(); } });

// ---------- completion ----------
function finish(restored) {
  const P = cur.pic; store.markDone(P.id); save();
  const award = store.earnSticker(P.cat);
  if (restored) { view.celeb = null; showWin(true, award); return; }
  view.celebrate(); audio.win(); if (stopConfetti) stopConfetti(); stopConfetti = confetti($('#confetti'));
  celebTimer = setTimeout(() => showWin(false, award), 2100);
}
function nextPicture() {
  const done = store.done(), same = ofType(cur.pic.grid ? 'grid' : 'shapes'), i = same.findIndex((p) => p.id === cur.pic.id);
  for (let k = 1; k <= same.length; k++) { const p = same[(i + k) % same.length]; if (!done[p.id]) return p; }
  return same[(i + 1) % same.length];
}
function showWin(restored, award) {
  const P = cur.pic, share = canShareFiles();
  const card = $('#modalCard'); card.className = 'card win';
  const stickerBit = award ? `<p class="sticker-award${award.fresh ? ' fresh' : ''}"><span class="sticker-big">${STICKER[award.cat] || '\u2B50'}</span> ${award.fresh ? 'New sticker!' : 'Sticker'} <b>${(CAT[award.cat] || [0, award.cat])[1]}</b></p>` : '';
  card.innerHTML = `<h2>${restored ? 'All done!' : 'Brilliant!'} \u{1F389}</h2><p class="sub">${P.name} is finished</p>${stickerBit}<div class="prev"></div>
    <div class="btns"><button class="big pri" data-a="save">${I.save}<span>Save picture</span></button>${share ? `<button class="big" data-a="share">${I.share}<span>Share</span></button>` : ''}
    <button class="big mint" data-a="next">${I.next}<span>Next picture</span></button><button class="big" data-a="gallery">${I.gallery}<span>My gallery</span></button>
    <button class="big ghost" data-a="again">${I.again}<span>Colour it again</span></button><button class="big ghost" data-a="look">${I.close}<span>Close</span></button></div>`;
  const cv = renderFinal(P, 560, { caption: false }); cv.className = 'final'; $('.prev', card).appendChild(cv);
  openModal();
  card.onclick = (e) => modalAction(e, P);
}
function modalAction(e, P) {
  const b = e.target.closest('[data-a]'); if (!b) { if (e.target.id === 'modal') closeModal(); return; }
  audio.unlock(); audio.tap(); const a = b.dataset.a;
  if (a === 'save') saveOrShare(P, false).then((r) => toast('Picture saved \u2705'));
  else if (a === 'share') saveOrShare(P, true).then((r) => { if (r === 'saved') toast('Picture saved \u2705'); });
  else if (a === 'next') startPicture(nextPicture());
  else if (a === 'gallery') { closeModal(); renderGallery(); show('gallery'); }
  else if (a === 'again') { store.clearProgress(P.id); startPicture(P); cur.game.reset(); view.paintAll(); updatePalette(); updateProgress(); save(); }
  else if (a === 'look') { closeModal(); if (cur) { view.clearCelebrate(); } }
  else if (a === 'close') closeModal();
}
function openViewer(P) {
  const share = canShareFiles(), card = $('#modalCard'); card.className = 'card win';
  card.innerHTML = `<h2>${P.name}</h2><p class="sub">${stars(P.diff)}</p><div class="prev"></div>
    <div class="btns"><button class="big pri" data-a="save">${I.save}<span>Save picture</span></button>${share ? `<button class="big" data-a="share">${I.share}<span>Share</span></button>` : ''}
    <button class="big ghost" data-a="again">${I.again}<span>Colour it again</span></button><button class="big ghost" data-a="close">${I.close}<span>Close</span></button></div>`;
  const cv = renderFinal(P, 560, { caption: false }); cv.className = 'final'; $('.prev', card).appendChild(cv);
  openModal(); card.onclick = (e) => { const b = e.target.closest('[data-a]'); if (b && b.dataset.a === 'again') { audio.tap(); store.clearProgress(P.id); cur = null; closeModal(); startPicture(P); cur.game.reset(); view.paintAll(); updatePalette(); updateProgress(); return; } modalAction(e, P); };
}
function openModal() { $('#modal').classList.add('on'); }
function closeModal() { $('#modal').classList.remove('on'); }
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });

// ---------- boot ----------
renderChips(); renderGrid();
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});
window.__MC = { onBrush, setBrushSize, ofType, get cur() { return cur; }, get view() { return view; }, pictures, store, flush, openPicture, startPicture, handle, settings, isFresh, pictureOfTheDay, dayKey, renderStickers, renderContinue, unfinishedLast, STICKER, get pending() { return pending; } };
