import pictures from './pictures.generated.js';
import { createGame, textColourFor, MODE_MAGIC, MODE_CLASSIC } from './game.js';
import { PuzzleView } from './view.js';
import { store } from './store.js';
import { audio } from './audio.js';
import { saveOrShare, renderFinal, canShareFiles } from './export.js';
import { confetti } from './confetti.js';
import { I, CAT, DIFF } from './icons.js';

const $ = (sel, el = document) => el.querySelector(sel);
const app = $('#app');
let settings = store.settings();
audio.setMuted(!settings.sound);
const filter = { cat: 'all', diff: 'all' };
let tipShown = false, cur = null, view = null, pending = [], toastTimer = 0, stopConfetti = null, celebTimer = 0;
const stars = (d) => '<span class="stars" aria-label="' + d + '">' + '\u2605'.repeat(DIFF[d]) + '<i>' + '\u2605'.repeat(3 - DIFF[d]) + '</i></span>';
const byId = (id) => pictures.find((p) => p.id === id);

app.innerHTML = `
<section id="home" class="screen on">
  <header class="top">
    <h1><span class="logo">\u2728</span> Magic Colour</h1>
    <div class="grow"></div>
    <button class="tbtn" id="hSurprise" aria-label="Surprise me">${I.dice}<span>Surprise</span></button>
    <button class="tbtn" id="hGallery" aria-label="My gallery">${I.gallery}<span>Gallery</span></button>
    <button class="tbtn icon" id="hSound" aria-label="Sound"></button>
  </header>
  <div class="chips" id="catChips"></div>
  <div class="chips small" id="diffChips"></div>
  <main class="grid" id="grid"></main>
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
      <button class="mode" data-mode="magic" aria-label="Magic brush: colours every spot with that number">${I.wand}<b>Magic</b></button>
      <button class="mode" data-mode="classic" aria-label="One by one: tap each spot">${I.finger}<b>One by one</b></button>
    </div>
    <div class="grow"></div>
    <button class="tool" id="pUndo" aria-label="Undo">${I.undo}</button>
    <button class="tool" id="pHint" aria-label="Hint">${I.bulb}</button>
    <button class="tool small" id="pSound" aria-label="Sound"></button>
  </header>
  <div id="stage">
    <canvas id="cv"></canvas>
    <div class="pbar"><i id="pFill"></i><b id="pText"></b></div>
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
function renderChips() {
  const cats = ['all', ...new Set(pictures.map((p) => p.cat))];
  $('#catChips').innerHTML = cats.map((c) => `<button class="chip${filter.cat === c ? ' on' : ''}" data-cat="${c}"><em>${(CAT[c] || ['\u2B50'])[0]}</em>${(CAT[c] || [0, c])[1]}</button>`).join('');
  $('#diffChips').innerHTML = [['all', 'Any level'], ['easy', '\u2605 Easy'], ['medium', '\u2605\u2605 Medium'], ['hard', '\u2605\u2605\u2605 Hard']].map(([d, l]) => `<button class="chip${filter.diff === d ? ' on' : ''}" data-diff="${d}">${l}</button>`).join('');
}
function card(p, done, extra = '') {
  const pct = done ? 1 : store.pct(p.id, p.stats.regions);
  return `<button class="pic${done ? ' done' : ''}" data-id="${p.id}"><img src="${p.thumb}" alt="" draggable="false"><span class="nm">${p.name}</span>${stars(p.diff)}${done ? `<span class="badge">${I.tick}</span>` : pct > 0 ? `<span class="meter"><i style="width:${Math.round(pct * 100)}%"></i></span>` : ''}${extra}</button>`;
}
function renderGrid() {
  const done = store.done();
  const list = pictures.filter((p) => (filter.cat === 'all' || p.cat === filter.cat) && (filter.diff === 'all' || p.diff === filter.diff));
  $('#grid').innerHTML = list.length ? list.map((p) => card(p, !!done[p.id])).join('') : '<p class="empty">No pictures here yet \u{1F338}</p>';
}
function renderGallery() {
  const done = store.done(), ids = Object.keys(done).filter(byId).sort((a, b) => done[b] - done[a]);
  $('#gCount').textContent = ids.length + ' / ' + pictures.length;
  $('#gGrid').innerHTML = ids.length ? ids.map((id) => card(byId(id), true)).join('') : '<p class="empty">Finish a picture and it will shine here! \u2B50</p>';
}
$('#catChips').addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (!b) return; filter.cat = b.dataset.cat; audio.tap(); renderChips(); renderGrid(); });
$('#diffChips').addEventListener('click', (e) => { const b = e.target.closest('[data-diff]'); if (!b) return; filter.diff = b.dataset.diff; audio.tap(); renderChips(); renderGrid(); });
$('#grid').addEventListener('click', (e) => { const b = e.target.closest('.pic'); if (b) openPicture(b.dataset.id); });
$('#gGrid').addEventListener('click', (e) => { const b = e.target.closest('.pic'); if (b) openViewer(byId(b.dataset.id)); });
$('#hGallery').addEventListener('click', () => { audio.unlock(); audio.tap(); renderGallery(); show('gallery'); enter(); });
$('#gBack').addEventListener('click', () => { audio.tap(); goHome(); });
$('#hSound').addEventListener('click', () => setSound(!settings.sound));
$('#pSound').addEventListener('click', () => setSound(!settings.sound));
$('#hSurprise').addEventListener('click', () => { audio.unlock(); const done = store.done(); const pool = pictures.filter((p) => !done[p.id] && (filter.cat === 'all' || p.cat === filter.cat)); const l = pool.length ? pool : pictures; openPicture(l[(Math.random() * l.length) | 0].id, true); });
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
  const game = createGame(p, { mode: settings.mode });
  game.restore(store.progress(p.id));
  cur = { pic: p, game };
  if (!view) view = new PuzzleView($('#cv'), { onTap: onTapRegion });
  buildPalette(); updateModeUI(); show('play'); enter();
  view.load(p, game);
  requestAnimationFrame(() => { view.resize(true); });
  updatePalette(); updateProgress();
  if (game.complete) finish(true);
  else if (p.diff === 'hard' && !tipShown) { tipShown = true; toast('Pinch to zoom in and find the tiny spots! \u{1F50D}', 3600); }
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
  if (cur) { cur.game.setMode(settings.mode); }
  $('#pUndo').disabled = !cur || !cur.game.canUndo();
}
$('#palette').addEventListener('click', (e) => {
  const b = e.target.closest('.sw'); if (!b || !cur) return; audio.unlock();
  const c = +b.dataset.c, g = cur.game;
  flush();
  const res = g.selectColour(c);
  if (res.type === 'select' && res.done) { toast('All the ' + c + 's are done \u2705'); audio.tap(); }
  handle(res);
});
app.querySelector('.modes').addEventListener('click', (e) => {
  const b = e.target.closest('.mode'); if (!b) return; audio.unlock(); settings.mode = b.dataset.mode; store.saveSettings(settings); updateModeUI(); audio.tap();
  toast(settings.mode === MODE_MAGIC ? '\u{1FA84} Magic brush: one tap colours every spot with that number!' : '\u261D\uFE0F One by one: tap each spot to colour it', 3200);
});

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
    case 'select': audio.select(res.colour); if (res.fromRegion) toast('Colour ' + res.colour + ' picked! Now tap the spots numbered ' + res.colour); break;
    case 'wrong': {
      view.wrong(res.id); audio.wrong();
      const b = $('#palette').children[res.want - 1]; b.classList.remove('nudge'); void b.offsetWidth; b.classList.add('nudge');
      toast('Oops! That spot is number ' + res.want + ' \u{1F642}'); break; }
    case 'already': audio.tap(); break;
    default: break;
  }
  view.dirty = true; view.kick(); updatePalette(); updateProgress(); updateModeUI();
}
function save() { if (!cur) return; store.saveProgress(cur.pic.id, cur.game.save()); }
$('#pUndo').addEventListener('click', () => {
  if (!cur) return; flush(); const r = cur.game.undo(); if (!r) return; audio.unlock(); audio.undo();
  for (const id of r.ids) view.paintRegion(id);
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
addEventListener('keydown', (e) => { if (!cur || !$('#play').classList.contains('on')) return; if ((e.ctrlKey || e.metaKey) && e.key === 'z') $('#pUndo').click(); else if (/^[1-9]$/.test(e.key)) { const b = $('#palette').children[+e.key - 1]; if (b) b.click(); } });

// ---------- completion ----------
function finish(restored) {
  const P = cur.pic; store.markDone(P.id); save();
  if (restored) { view.celeb = null; showWin(true); return; }
  view.celebrate(); audio.win(); if (stopConfetti) stopConfetti(); stopConfetti = confetti($('#confetti'));
  celebTimer = setTimeout(() => showWin(false), 2100);
}
function nextPicture() {
  const done = store.done(), i = pictures.findIndex((p) => p.id === cur.pic.id);
  for (let k = 1; k <= pictures.length; k++) { const p = pictures[(i + k) % pictures.length]; if (!done[p.id]) return p; }
  return pictures[(i + 1) % pictures.length];
}
function showWin(restored) {
  const P = cur.pic, share = canShareFiles();
  const card = $('#modalCard'); card.className = 'card win';
  card.innerHTML = `<h2>${restored ? 'All done!' : 'Brilliant!'} \u{1F389}</h2><p class="sub">${P.name} is finished</p><div class="prev"></div>
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
window.__MC = { get cur() { return cur; }, get view() { return view; }, pictures, store, flush, openPicture, startPicture, handle, settings, get pending() { return pending; } };
