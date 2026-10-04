// Canvas renderer + pan/zoom + tap handling for one puzzle. Fill layer = label map painted into an offscreen canvas,
// outline = one Path2D stroked on top, numbers drawn in screen space so they stay readable at every zoom.
import { mapOf, hexToRgb, rgb32 } from './codec.js';
import { Brusher, computeBBoxes, brushRadiusPx, DEFAULT_BRUSH } from './brush.js';

const INK = '#3b3f58';
const WHITE32 = rgb32(255, 255, 255), GREY32 = rgb32(226, 227, 236); // Pixel Grid squares that are not coloured yet are light grey

export class PuzzleView {
  constructor(canvas, hooks = {}) {
    this.cv = canvas; this.ctx = canvas.getContext('2d', { alpha: true });
    this.hooks = hooks; this.dpr = 1; this.vw = 300; this.vh = 300;
    this.s = 1; this.tx = 0; this.ty = 0; this.fitS = 1;
    this.ptrs = new Map(); this.moving = 0; this.anim = null;
    this.sparks = []; this.rings = []; this.wiggle = new Map(); this.overlayUntil = 0; this.overlayItems = null; this.celeb = null;
    this.dirty = true; this.raf = 0; this.lastT = 0; this.puzzle = null;
    this.outCache = null;
    this.brush = { on: false, size: DEFAULT_BRUSH }; this.stroke = null; this.cur = null; this.spaceDown = false; this.brusher = null;
    this._bind();
  }

  // ---------- loading ----------
  load(puzzle, game) {
    this.puzzle = puzzle; this.game = game;
    const { w, h } = puzzle;
    this.map = mapOf(puzzle);
    this.fillCv = document.createElement('canvas'); this.fillCv.width = w; this.fillCv.height = h;
    this.fctx = this.fillCv.getContext('2d');
    this.img = this.fctx.createImageData(w, h); this.img32 = new Uint32Array(this.img.data.buffer);
    this.ovCv = document.createElement('canvas'); this.ovCv.width = w; this.ovCv.height = h; this.octx = this.ovCv.getContext('2d');
    this.outline = new Path2D(puzzle.outline);
    this.heavy = (puzzle.stats && puzzle.stats.outlinePoints > 2500);
    this.pal32 = puzzle.palette.map((c) => { const [r, g, b] = hexToRgb(c); return rgb32(r, g, b); });
    // bounding boxes + brush hit-tester (shared with the unit tests via brush.js)
    this.bb = computeBBoxes(this.map, w, h, puzzle.regions.length); this.brusher = new Brusher(puzzle, this.map, this.bb); this._cancelStroke(false); this.cur = null;
    this.sparks.length = 0; this.rings.length = 0; this.wiggle.clear(); this.overlayItems = null; this.celeb = null; this.outCache = null;
    this.paintAll(); this.resize(true);
  }
  col32(id) { const r = this.puzzle.regions[id]; return r[0] > 0 && this.game.filled[id] ? this.pal32[r[0] - 1] : r[0] > 0 && this.puzzle.grid ? GREY32 : WHITE32; }
  paintAll() {
    const m = this.map, img = this.img32, rc = this.puzzle.regions.map((_, i) => this.col32(i));
    for (let p = 0; p < m.length; p++) img[p] = rc[m[p]];
    this.fctx.putImageData(this.img, 0, 0); this.dirty = true; this.kick();
  }
  /** repaint one region according to the current game state */
  paintRegion(id) {
    const { w } = this.puzzle, o = id * 4, x0 = this.bb[o], y0 = this.bb[o + 1], x1 = this.bb[o + 2], y1 = this.bb[o + 3];
    if (x1 < 0) return; const c = this.col32(id), m = this.map, img = this.img32;
    for (let y = y0; y <= y1; y++) for (let x = x0, p = y * w + x0; x <= x1; x++, p++) if (m[p] === id) img[p] = c;
    this.fctx.putImageData(this.img, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1); this.dirty = true; this.kick();
  }
  /** repaint many regions with ONE canvas upload (brush strokes / undo of a stroke) */
  paintRegions(ids) {
    if (!ids.length) return; if (ids.length === 1) return this.paintRegion(ids[0]);
    const { w } = this.puzzle, m = this.map, img = this.img32, bb = this.bb;
    let X0 = 1e9, Y0 = 1e9, X1 = -1, Y1 = -1, sum = 0;
    for (const id of ids) { const o = id * 4; if (bb[o + 2] < 0) continue; X0 = Math.min(X0, bb[o]); Y0 = Math.min(Y0, bb[o + 1]); X1 = Math.max(X1, bb[o + 2]); Y1 = Math.max(Y1, bb[o + 3]); sum += (bb[o + 2] - bb[o] + 1) * (bb[o + 3] - bb[o + 1] + 1); const c = this.col32(id); for (let y = bb[o + 1]; y <= bb[o + 3]; y++) for (let x = bb[o], p = y * w + x; x <= bb[o + 2]; x++, p++) if (m[p] === id) img[p] = c; }
    if (X1 < 0) return;
    if (ids.length > 150 || (X1 - X0 + 1) * (Y1 - Y0 + 1) <= Math.max(60000, sum * 3)) this.fctx.putImageData(this.img, 0, 0, X0, Y0, X1 - X0 + 1, Y1 - Y0 + 1);
    else for (const id of ids) { const o = id * 4; if (bb[o + 2] >= 0) this.fctx.putImageData(this.img, 0, 0, bb[o], bb[o + 1], bb[o + 2] - bb[o] + 1, bb[o + 3] - bb[o + 1] + 1); }
    this.dirty = true; this.kick();
  }
  /** show coloured overlay for regions: items [{id, color:'#rrggbb'}]; ms = how long (0 = until cleared) */
  setOverlay(items, ms = 0) {
    this.octx.clearRect(0, 0, this.puzzle.w, this.puzzle.h);
    this.overlayItems = items && items.length ? items : null;
    if (!this.overlayItems) { this.dirty = true; this.kick(); return; }
    const { w } = this.puzzle, m = this.map, byColor = new Map();
    for (const it of items) { const k = it.color; (byColor.get(k) || byColor.set(k, new Map()).get(k)).set(it.id, 1); }
    const od = this.octx.createImageData(w, this.puzzle.h), o32 = new Uint32Array(od.data.buffer);
    for (const [color, ids] of byColor) {
      const [r, g, b] = hexToRgb(color), c = rgb32(r, g, b);
      for (const id of ids.keys()) { const o = id * 4, x1 = this.bb[o + 2]; if (x1 < 0) continue; for (let y = this.bb[o + 1]; y <= this.bb[o + 3]; y++) for (let x = this.bb[o], p = y * w + x; x <= x1; x++, p++) if (m[p] === id) o32[p] = c; }
    }
    this.octx.putImageData(od, 0, 0);
    this.overlayStart = performance.now(); this.overlayUntil = ms ? this.overlayStart + ms : 0; this.dirty = true; this.kick();
  }

  // ---------- geometry ----------
  resize(refit) {
    const r = this.cv.getBoundingClientRect(); if (!r.width || !r.height) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    while (r.width * r.height * this.dpr * this.dpr > 3.2e6 && this.dpr > 1) this.dpr -= 0.25;
    this.vw = r.width; this.vh = r.height;
    this.cv.width = Math.round(r.width * this.dpr); this.cv.height = Math.round(r.height * this.dpr);
    if (!this.puzzle) return;
    const oldFit = this.fitS; this.fitS = Math.min(this.vw / this.puzzle.w, this.vh / this.puzzle.h) * 0.97;
    if (refit || !this.s) { this.s = this.fitS; this.tx = this.ty = 0; } else this.s = Math.max(this.fitS, this.s * (this.fitS / oldFit));
    this.clamp(); this.outCache = null; this.dirty = true; this.kick();
  }
  get maxS() { return Math.max(this.fitS * 9, 7); }
  clamp() {
    const { w, h } = this.puzzle; this.s = Math.min(this.maxS, Math.max(this.fitS, this.s));
    const pw = w * this.s, ph = h * this.s, m = 60;
    this.tx = pw <= this.vw ? (this.vw - pw) / 2 : Math.min(m, Math.max(this.vw - pw - m, this.tx));
    this.ty = ph <= this.vh ? (this.vh - ph) / 2 : Math.min(m, Math.max(this.vh - ph - m, this.ty));
  }
  fit() { this.animateTo(this.fitS, 0, 0, true); }
  zoomAt(factor, cx, cy) {
    const ns = Math.min(this.maxS, Math.max(this.fitS, this.s * factor)), k = ns / this.s;
    this.tx = cx - (cx - this.tx) * k; this.ty = cy - (cy - this.ty) * k; this.s = ns; this.clamp(); this.bump(); this.dirty = true; this.kick();
  }
  zoomBy(factor) { const t = this.anim; this.anim = null; this.animateTo(Math.min(this.maxS, Math.max(this.fitS, (t ? t.s1 : this.s) * factor)), null, null, false, this.vw / 2, this.vh / 2); }
  animateTo(s1, tx1, ty1, centre, cx, cy) {
    const { w, h } = this.puzzle;
    if (centre) { tx1 = (this.vw - w * s1) / 2; ty1 = (this.vh - h * s1) / 2; } else if (tx1 === null) { const k = s1 / this.s; tx1 = cx - (cx - this.tx) * k; ty1 = cy - (cy - this.ty) * k; }
    this.anim = { t0: performance.now(), dur: 320, s0: this.s, tx0: this.tx, ty0: this.ty, s1, tx1, ty1 }; this.kick();
  }
  /** make sure at least one of the regions is on screen (zoom in on it if not) */
  focusRegions(ids) {
    if (!ids.length) return;
    const P = this.puzzle, vis = (id) => { const r = P.regions[id], sx = this.tx + r[1] * this.s, sy = this.ty + r[2] * this.s; return sx > 20 && sy > 20 && sx < this.vw - 20 && sy < this.vh - 20; };
    if (ids.some(vis)) return;
    let best = ids[0], ba = 0; for (const id of ids) if (P.regions[id][4] > ba) { ba = P.regions[id][4]; best = id; }
    const r = P.regions[best], o = best * 4, bw = this.bb[o + 2] - this.bb[o] + 1, bh = this.bb[o + 3] - this.bb[o + 1] + 1;
    let s1 = Math.min(this.maxS, Math.max(this.s, Math.min(this.vw, this.vh) / (Math.max(bw, bh) * 2.6), this.fitS * 2));
    if (P.grid) s1 = Math.min(this.maxS, Math.max(this.s, 1.5 * (P.grid.cs / 14))); // numbers readable, with plenty of surrounding squares
    const cx = (this.bb[o] + this.bb[o + 2]) / 2, cy = (this.bb[o + 1] + this.bb[o + 3]) / 2;
    let tx = this.vw / 2 - cx * s1, ty = this.vh / 2 - cy * s1; void r;
    const pw = P.w * s1, ph = P.h * s1;
    tx = pw <= this.vw ? (this.vw - pw) / 2 : Math.min(0, Math.max(this.vw - pw, tx)); ty = ph <= this.vh ? (this.vh - ph) / 2 : Math.min(0, Math.max(this.vh - ph, ty));
    this.animateTo(s1, tx, ty, false);
  }
  toMap(clientX, clientY) { const r = this.cv.getBoundingClientRect(); return [(clientX - r.left - this.tx) / this.s, (clientY - r.top - this.ty) / this.s]; }
  regionAt(mx, my) {
    const { w, h } = this.puzzle; const x = Math.floor(mx), y = Math.floor(my); if (x < 0 || y < 0 || x >= w || y >= h) return -1;
    return this.map[y * w + x];
  }

  // ---------- brush ----------
  setBrush(on, size) { this.brush.on = !!on; this.brush.size = size; if (!on) { this._cancelStroke(true); this.cur = null; } this.cv.style.cursor = on ? 'crosshair' : ''; this.dirty = true; this.kick(); }
  /** brush radius on screen (CSS px) and in picture pixels at the current zoom */
  brushRadiusScreen() { return brushRadiusPx(this.brush.size, this.s / (this.fitS || 1), Math.min(this.vw, this.vh)); }
  brushRadiusMap() { return this.brushRadiusScreen() / this.s; }
  /** show the brush circle for a moment in the middle of the picture (after changing size) */
  previewBrush(ms = 1100) { if (!this.brush.on) return; this.cur = { x: this.vw / 2, y: this.vh / 2, until: performance.now() + ms }; this.dirty = true; this.kick(); }
  setSpace(on) { this.spaceDown = !!on; this.cv.style.cursor = on ? 'grab' : this.brush.on ? 'crosshair' : ''; }
  _armStroke(p, e) {
    const [mx, my] = this.toMap(e.clientX, e.clientY), st = { pid: e.pointerId, started: false, down: [mx, my], q: [], last: null, painted: 0, sx: e.clientX, sy: e.clientY, timer: 0 };
    this.stroke = st; { const r = this.cv.getBoundingClientRect(); this.cur = { x: e.clientX - r.left, y: e.clientY - r.top, until: 0 }; }
    if (e.pointerType === 'mouse') this._startStroke(); else st.timer = setTimeout(() => { if (this.stroke === st && !st.started && this.ptrs.size === 1) this._startStroke(); }, 70);
  }
  _startStroke() { const st = this.stroke; if (!st || st.started) return; clearTimeout(st.timer); st.started = true; st.q.push([st.down[0], st.down[1], true]); this.setOverlay(null); if (this.hooks.onBrushStart) this.hooks.onBrushStart(); this.kick(); }
  _strokeMove(e) {
    const st = this.stroke; if (!st) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : null, list = evs && evs.length ? evs : [e], r = this.cv.getBoundingClientRect();
    for (const ev of list) {
      if (!st.started) { if (Math.hypot(ev.clientX - st.sx, ev.clientY - st.sy) < 3) continue; this._startStroke(); }
      st.q.push([(ev.clientX - r.left - this.tx) / this.s, (ev.clientY - r.top - this.ty) / this.s, false]);
    }
    this.cur = { x: e.clientX - r.left, y: e.clientY - r.top, until: 0 }; this.bump(); this.dirty = true; this.kick();
  }
  /** end the current stroke; a stroke that never moved is a "dab" (tap) */
  _endStroke(e, cancelled) {
    const st = this.stroke; if (!st) return; clearTimeout(st.timer);
    if (!st.started && !cancelled) this._startStroke();
    if (st.started && e && !cancelled) { const [mx, my] = this.toMap(e.clientX, e.clientY); st.q.push([mx, my, false]); }
    this._brushFrame(); this.stroke = null;
    if (st.started && this.hooks.onBrushEnd) this.hooks.onBrushEnd(st.painted);
    if (this.cur && !(e && e.pointerType === 'mouse')) this.cur.until = performance.now() + 350;
    this.dirty = true; this.kick();
  }
  _cancelStroke(keep) { const st = this.stroke; if (!st) return; if (keep && st.started) this._endStroke(null, true); else { clearTimeout(st.timer); this.stroke = null; } }
  /** process the queued stroke points once per animation frame: interpolate, hit-test, report to the game in one batch */
  _brushFrame() {
    const st = this.stroke, g = this.game; if (!st || !st.started || !st.q.length || !this.brusher) return;
    const sel = g.selected, cand = sel > 0 && !g.colourDone(sel) ? g.byColour[sel] : [], r = this.brushRadiusMap(), found = new Set(); let wrong = -1;
    const P = this.puzzle;
    for (const [x, y, first] of st.q) {
      if (first || !st.last) { this.brusher.hit(x, y, r, cand, g.filled, found); }
      else this.brusher.segment(st.last[0], st.last[1], x, y, r, cand, g.filled, found);
      st.last = [x, y];
      const id = this.brusher.regionAt(x, y); if (id >= 0 && sel > 0 && P.regions[id][0] > 0 && P.regions[id][0] !== sel && !g.filled[id]) wrong = id;
    }
    st.q.length = 0; this.bump();
    if (this.hooks.onBrush) { const n = this.hooks.onBrush([...found], { wrongId: wrong, x: st.last[0], y: st.last[1] }); if (n) st.painted += n; }
  }
  /** gentle "that one is a different number" cue for the brush: label wiggle + a tiny ring, no overlay */
  nudgeRegion(id) { const r = this.puzzle.regions[id]; if (!r) return; this.wiggle.set(id, performance.now()); this.rings.push({ x: r[1], y: r[2], t: 0, dur: 0.4, r: Math.max(r[3], 8), color: '#ff8fab' }); this.kick(); }
  /** a few sparkles for a batch of filled regions (capped so a huge brush stays smooth) */
  sparkle(ids, color) { const step = Math.max(1, Math.ceil(ids.length / 6)); for (let i = 0; i < ids.length; i += step) this.burst(ids[i], color, 2); }

  // ---------- input ----------
  _bind() {
    const cv = this.cv; cv.style.touchAction = 'none';
    cv.addEventListener('pointerdown', (e) => {
      if (!this.puzzle) return; cv.setPointerCapture(e.pointerId); this.anim = null;
      const mouse = e.pointerType === 'mouse', pan = mouse && (e.button === 1 || e.button === 2 || (this.spaceDown && e.button === 0));
      if (mouse && e.button !== 0 && !pan) return;
      this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), type: e.pointerType, pan });
      this.tapOk = this.ptrs.size === 1 && !pan; this.dragged = pan;
      if (this.ptrs.size >= 2) { this._cancelStroke(true); this.tapOk = false; this._pinchInit(); }
      else if (this.brush.on && !pan) this._armStroke(this.ptrs.get(e.pointerId), e);
    });
    cv.addEventListener('mousedown', (e) => { if (e.button === 1) e.preventDefault(); });
    cv.addEventListener('pointermove', (e) => {
      const p = this.ptrs.get(e.pointerId);
      if (e.pointerType === 'mouse' && this.brush.on && !(this.stroke && this.stroke.pid === e.pointerId)) { const r = cv.getBoundingClientRect(); this.cur = { x: e.clientX - r.left, y: e.clientY - r.top, until: 0 }; this.dirty = true; this.kick(); }
      if (!p) return;
      const px = p.x, py = p.y; p.x = e.clientX; p.y = e.clientY;
      if (this.ptrs.size >= 2) { this._pinchMove(); this.tapOk = false; return; }
      if (this.stroke && this.stroke.pid === e.pointerId) { this._strokeMove(e); return; }
      const slop = p.pan ? 0 : p.type === 'mouse' ? 4 : 9;
      if (!this.dragged && Math.hypot(p.x - p.sx, p.y - p.sy) > slop) { this.dragged = true; this.tapOk = false; }
      if (this.dragged) { this.tx += p.x - px; this.ty += p.y - py; this.clamp(); this.bump(); this.dirty = true; this.kick(); }
    });
    cv.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !this.stroke && this.cur && !this.cur.until) { this.cur = null; this.dirty = true; this.kick(); } });
    const up = (e) => {
      const p = this.ptrs.get(e.pointerId); if (!p) return;
      this.ptrs.delete(e.pointerId);
      if (this.stroke && this.stroke.pid === e.pointerId) this._endStroke(e, e.type !== 'pointerup');
      else if (e.type === 'pointerup' && this.tapOk && !this.brush.on && this.ptrs.size === 0 && performance.now() - p.t < 700) {
        const [mx, my] = this.toMap(e.clientX, e.clientY); const id = this.regionAt(mx, my);
        if (this.hooks.onTap) this.hooks.onTap(id, mx, my);
      }
      if (this.ptrs.size === 1) { const q = [...this.ptrs.values()][0]; q.sx = q.x; q.sy = q.y; this.dragged = true; this.tapOk = false; }
      this.dirty = true; this.kick();
    };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', (e) => {
      if (!this.puzzle) return; e.preventDefault(); this.anim = null;
      const r = cv.getBoundingClientRect(); const f = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018));
      this.zoomAt(f, e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    new ResizeObserver(() => this.resize(false)).observe(cv);
  }
  _pinchInit() {
    const [a, b] = [...this.ptrs.values()]; this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: this.s, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, tx: this.tx, ty: this.ty };
  }
  _pinchMove() {
    const [a, b] = [...this.ptrs.values()]; const pc = this.pinch; if (!pc) return;
    const d = Math.hypot(a.x - b.x, a.y - b.y) || 1, cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2, r = this.cv.getBoundingClientRect();
    const ns = Math.min(this.maxS, Math.max(this.fitS, pc.s * d / pc.d)), k = ns / pc.s;
    const ax = pc.cx - r.left, ay = pc.cy - r.top; // anchor in canvas px
    this.s = ns; this.tx = (cx - r.left) - (ax - pc.tx) * k; this.ty = (cy - r.top) - (ay - pc.ty) * k;
    this.clamp(); this.bump(); this.dirty = true; this.kick();
  }
  bump() { this.moving = performance.now() + 140; }

  // ---------- effects ----------
  burst(id, color, n = 6) {
    const r = this.puzzle.regions[id]; if (!r) return;
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = 30 + Math.random() * 60; this.sparks.push({ x: r[1], y: r[2], vx: Math.cos(a) * v, vy: Math.sin(a) * v - 20, t: 0, life: 0.5 + Math.random() * 0.5, size: 5 + Math.random() * 6, color: color || '#ffd93d', world: true }); }
    this.rings.push({ x: r[1], y: r[2], t: 0, dur: 0.45, r: Math.max(r[3], 10), color: color || '#ffd93d' });
    if (this.sparks.length > 220) this.sparks.splice(0, this.sparks.length - 220);
    this.kick();
  }
  wrong(id) {
    this.wiggle.set(id, performance.now());
    this.setOverlay([{ id, color: '#ffc2d1' }], 1100); this.kick();
  }
  celebrate() { this.celeb = { t0: performance.now(), next: 0 }; this.kick(); }
  clearCelebrate() { this.celeb = null; this.dirty = true; this.kick(); }

  // ---------- frame loop ----------
  kick() { if (!this.raf) this.raf = requestAnimationFrame((t) => this.frame(t)); }
  frame(t) {
    this.raf = 0; const now = performance.now(), dt = Math.min(0.05, (now - (this.lastT || now)) / 1000); this.lastT = now;
    let busy = false;
    if (this.stroke && this.stroke.started) { this._brushFrame(); busy = true; }
    if (this.anim) {
      const a = this.anim, k = Math.min(1, (now - a.t0) / a.dur), e = 1 - Math.pow(1 - k, 3);
      this.s = a.s0 + (a.s1 - a.s0) * e; this.tx = a.tx0 + (a.tx1 - a.tx0) * e; this.ty = a.ty0 + (a.ty1 - a.ty0) * e; this.clamp();
      if (k >= 1) { this.anim = null; this.outCache = null; } else busy = true; this.dirty = true;
    }
    for (const p of this.sparks) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 90 * dt; } this.sparks = this.sparks.filter((p) => p.t < p.life);
    for (const r of this.rings) r.t += dt; this.rings = this.rings.filter((r) => r.t < r.dur);
    for (const [id, t0] of this.wiggle) if (now - t0 > 900) this.wiggle.delete(id);
    if (this.celeb && now > this.celeb.next && now - this.celeb.t0 < 6000) { // twinkles over the picture
      this.celeb.next = now + 110; const P = this.puzzle;
      for (let i = 0; i < 2; i++) { const a = Math.random() * Math.PI * 2; this.sparks.push({ x: Math.random() * P.w, y: Math.random() * P.h, vx: Math.cos(a) * 10, vy: Math.sin(a) * 10 - 10, t: 0, life: 0.7 + Math.random() * 0.5, size: 6 + Math.random() * 10, color: ['#ffffff', '#ffd93d', '#ff8fc7', '#7ee0ff'][(Math.random() * 4) | 0], world: true }); }
    }
    if (this.cur && this.cur.until) { if (now > this.cur.until) { this.cur = null; this.dirty = true; } else busy = true; }
    if (this.overlayUntil && now > this.overlayUntil) { this.setOverlay(null); this.overlayUntil = 0; }
    if (this.sparks.length || this.rings.length || this.wiggle.size || this.overlayItems || (this.celeb && now - this.celeb.t0 < 6000)) { busy = true; this.dirty = true; }
    if (this.moving && now > this.moving) { this.moving = 0; if (this.heavy) { this.outCache = null; this.dirty = true; } }
    else if (this.moving) busy = true;
    if (this.dirty) { this.draw(now); this.dirty = false; }
    if (busy || this.dirty) this.kick();
  }
  draw(now) {
    const P = this.puzzle; if (!P) return;
    const ctx = this.ctx, dpr = this.dpr, s = this.s;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, this.cv.width, this.cv.height);
    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * this.tx, dpr * this.ty);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.fillCv, 0, 0);
    if (this.overlayItems) {
      const el = (now - this.overlayStart) / 1000; ctx.globalAlpha = 0.45 + 0.4 * Math.sin(el * 7 - 1.2) ** 2 * 1; ctx.drawImage(this.ovCv, 0, 0); ctx.globalAlpha = 1;
    }
    // celebration: outline fades to a soft line, shine sweeps across
    let oa = 1, ce = 0;
    if (this.celeb) { ce = (now - this.celeb.t0) / 1000; oa = Math.max(0.28, 1 - ce / 0.9); }
    const lw = P.grid ? Math.max(1.3, 1.1 / s) : Math.max(2.0, 1.5 / s);
    ctx.globalAlpha = oa;
    if (this.heavy && this.moving && this.outCache && this.outCache.ok) {
      const c = this.outCache, k = s / c.s; ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(c.cv, 0, 0, c.cv.width, c.cv.height, dpr * (this.tx - c.tx * k), dpr * (this.ty - c.ty * k), c.cv.width * k, c.cv.height * k);
      ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * this.tx, dpr * this.ty);
    } else {
      this._stroke(ctx, lw);
      if (this.heavy && !this.moving) { // refresh the bitmap used while panning
        if (!this.outCache) this.outCache = { cv: document.createElement('canvas') };
        const c = this.outCache; c.cv.width = this.cv.width; c.cv.height = this.cv.height; c.s = s; c.tx = this.tx; c.ty = this.ty; c.ok = true;
        const cc = c.cv.getContext('2d'); cc.setTransform(dpr * s, 0, 0, dpr * s, dpr * this.tx, dpr * this.ty); this._stroke(cc, lw);
      }
    }
    ctx.globalAlpha = 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!this.celeb) this._labels(ctx, now);
    this._effects(ctx, now);
    if (this.brush.on && this.cur && !this.celeb) this._brushCircle(ctx);
    if (this.celeb && ce < 2) { // shine band
      const x0 = this.tx, y0 = this.ty, W = P.w * s, H = P.h * s; ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, W, H); ctx.clip();
      const k = Math.min(1, Math.max(0, (ce - 0.25) / 1.3)); const cx = x0 - W * 0.3 + k * W * 1.6;
      const gr = ctx.createLinearGradient(cx - W * 0.18, 0, cx + W * 0.18, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gr; ctx.translate(x0 + W / 2, y0 + H / 2); ctx.rotate(-0.35); ctx.fillRect(-W, -H, 2 * W, 2 * H); ctx.restore();
    }
  }
  _brushCircle(ctx) {
    const c = this.cur, r = this.brushRadiusScreen(), sel = this.game ? this.game.selected : 0, col = sel ? this.puzzle.palette[sel - 1] : '#7b5cff';
    ctx.save(); ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, 6.2832);
    ctx.globalAlpha = 0.2; ctx.fillStyle = col; ctx.fill(); ctx.globalAlpha = 1;
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.stroke();
    ctx.lineWidth = 2.5; ctx.strokeStyle = sel ? col : '#7b5cff'; ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(43,45,66,.55)'; ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.arc(c.x, c.y, r + 2.5, 0, 6.2832); ctx.stroke();
    ctx.restore();
  }
  _stroke(ctx, lw) {
    const P = this.puzzle; ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.stroke(this.outline); ctx.strokeRect(0, 0, P.w, P.h);
  }
  /** labels of a Grid picture: only the squares that are on screen (visible column/row range), one font setting, no work at all when zoomed out too far to read */
  _gridLabels(ctx, now) {
    const P = this.puzzle, s = this.s, g = this.game, sel = g.selected, { w: gw, h: gh, cs } = P.grid, rad = (cs / 2) * s;
    const fs = Math.min(rad * 1.45, rad * 1.8 / 0.62, 30), fs2 = Math.min(rad * 1.45, (rad * 1.8) / (0.62 * 2), 30);
    if (fs2 < 8.5 && fs < 8.5) return;
    const c0 = Math.max(0, Math.floor((-this.tx) / (cs * s))), c1 = Math.min(gw - 1, Math.floor((this.vw - this.tx) / (cs * s))), r0 = Math.max(0, Math.floor((-this.ty) / (cs * s))), r1 = Math.min(gh - 1, Math.floor((this.vh - this.ty) / (cs * s)));
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; let lastFont = '';
    for (let y = r0; y <= r1; y++) for (let x = c0; x <= c1; x++) {
      const i = y * gw + x; if (g.filled[i]) continue; const r = P.regions[i]; if (r[0] === 0) continue;
      const dg = r[0] > 9 ? 2 : 1, f = dg === 1 ? fs : fs2; if (f < 8.5) continue;
      let px = this.tx + r[1] * s, py = this.ty + r[2] * s;
      const wg = this.wiggle.size ? this.wiggle.get(i) : undefined; if (wg !== undefined) px += Math.sin((now - wg) / 45) * 5 * (1 - (now - wg) / 900);
      if (r[0] === sel) { ctx.fillStyle = P.palette[sel - 1]; ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.arc(px, py, Math.min(rad * 0.95, f * 0.95 + 3), 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1; }
      const font = `800 ${f}px "Trebuchet MS", system-ui, sans-serif`; if (font !== lastFont) { ctx.font = font; lastFont = font; }
      ctx.fillStyle = r[0] === sel ? '#1d1f33' : '#585d7a'; ctx.fillText(String(r[0]), px, py + f * 0.04);
    }
  }
  _labels(ctx, now) {
    if (this.puzzle.grid) return this._gridLabels(ctx, now);
    const P = this.puzzle, s = this.s, g = this.game, sel = g.selected;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < P.regions.length; i++) {
      if (g.filled[i]) continue; const r = P.regions[i]; if (r[0] === 0) continue;
      let x = this.tx + r[1] * s, y = this.ty + r[2] * s; if (x < -30 || y < -30 || x > this.vw + 30 || y > this.vh + 30) continue;
      const txt = String(r[0]), dg = txt.length, rad = r[3] * s;
      let fs = Math.min(rad * 1.45, (rad * 1.8) / (0.62 * dg), 30);
      if (fs < 8.5) continue;
      const wg = this.wiggle.get(i); if (wg !== undefined) x += Math.sin((now - wg) / 45) * 5 * (1 - (now - wg) / 900);
      if (r[0] === sel) { ctx.fillStyle = P.palette[sel - 1]; ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.arc(x, y, Math.min(rad * 0.95, fs * 0.95 + 3), 0, 6.2832); ctx.fill(); ctx.globalAlpha = 1; }
      ctx.font = `800 ${fs}px "Trebuchet MS", system-ui, sans-serif`; ctx.fillStyle = r[0] === sel ? '#1d1f33' : '#585d7a'; ctx.fillText(txt, x, y + fs * 0.04);
    }
  }
  _effects(ctx, now) {
    const s = this.s;
    for (const r of this.rings) { const k = r.t / r.dur; ctx.globalAlpha = 1 - k; ctx.strokeStyle = r.color; ctx.lineWidth = 4 * (1 - k) + 1; ctx.beginPath(); ctx.arc(this.tx + r.x * s, this.ty + r.y * s, (r.r * (0.6 + 0.9 * k)) * s, 0, 6.2832); ctx.stroke(); }
    for (const p of this.sparks) {
      const k = p.t / p.life, x = this.tx + p.x * s, y = this.ty + p.y * s, z = p.size * (1 - k * 0.6) * Math.max(0.8, Math.min(1.6, s / this.fitS * 0.8));
      ctx.globalAlpha = Math.min(1, 2 * (1 - k)); ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.moveTo(x, y - z); ctx.quadraticCurveTo(x, y, x + z, y); ctx.quadraticCurveTo(x, y, x, y + z); ctx.quadraticCurveTo(x, y, x - z, y); ctx.quadraticCurveTo(x, y, x, y - z); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
