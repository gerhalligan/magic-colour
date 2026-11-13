// "Watch it colour" (1.14.0): replays a finished picture filling itself in, colour by colour, top to bottom.
// Read-only: it only reads the puzzle data (never touches progress, the game, undo or the play canvas). Offline, no assets.
import { mapOf, hexToRgb, rgb32 } from './codec.js';

/** coloured region ids (paper excluded) in replay order: by colour number, then top to bottom, then left to right */
export function replayOrder(puzzle) {
  const R = puzzle.regions, ids = [];
  for (let i = 0; i < R.length; i++) if (R[i][0] > 0) ids.push(i);
  if (puzzle.grid) { const gw = puzzle.grid.w; return ids.sort((a, b) => (R[a][0] - R[b][0]) || (((a / gw) | 0) - ((b / gw) | 0)) || ((a % gw) - (b % gw))); }
  return ids.sort((a, b) => (R[a][0] - R[b][0]) || (R[a][2] - R[b][2]) || (R[a][1] - R[b][1]));
}
export const replayDuration = (n) => Math.min(7000, 3200 + n * 6);

/**
 * createReplay(puzzle, size, { onColour(c), onEnd() }) -> { canvas, play(), stop(), seek(t 0..1), order, duration }
 * The canvas has the same size/padding as renderFinal(puzzle, size, { caption: false }) and its last frame is the finished picture.
 */
export function createReplay(puzzle, size = 560, { onColour, onEnd } = {}) {
  const grid = puzzle.grid, w = grid ? grid.w : puzzle.w, h = grid ? grid.h : puzzle.h;
  const order = replayOrder(puzzle), R = puzzle.regions, n = order.length, duration = replayDuration(n);
  // pixels of each region in the small frame buffer (grids: one pixel per square, so a 120x120 Epic stays tiny)
  let start = null, pix = null;
  if (!grid) {
    const map = mapOf(puzzle); start = new Int32Array(R.length + 1);
    for (let p = 0; p < map.length; p++) start[map[p] + 1]++;
    for (let i = 0; i < R.length; i++) start[i + 1] += start[i];
    const fill = start.slice(0, R.length); pix = new Uint32Array(map.length);
    for (let p = 0; p < map.length; p++) pix[fill[map[p]]++] = p;
  }
  const pal = puzzle.palette.map((c) => { const [r, g, b] = hexToRgb(c); return rgb32(r, g, b); });
  const WHITE = rgb32(255, 255, 255), BLANK = grid ? rgb32(238, 240, 245) : WHITE;
  const fc = document.createElement('canvas'); fc.width = w; fc.height = h; const fx = fc.getContext('2d');
  const img = fx.createImageData(w, h), i32 = new Uint32Array(img.data.buffer);
  const pad = Math.round(size * 0.05), W = size + pad * 2, H = W;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
  const k = size / Math.max(puzzle.w, puzzle.h), ox = pad + (size - puzzle.w * k) / 2, oy = pad + (size - puzzle.h * k) / 2;
  // ink outline drawn once onto its own layer (cheap per frame on low-end phones)
  let ink = null;
  if (!grid) {
    ink = document.createElement('canvas'); ink.width = W; ink.height = H; const x = ink.getContext('2d');
    x.translate(ox, oy); x.scale(k, k); x.strokeStyle = '#3b3f58'; x.lineWidth = 1.6; x.lineJoin = 'round'; x.lineCap = 'round';
    x.stroke(new Path2D(puzzle.outline)); x.strokeRect(0, 0, puzzle.w, puzzle.h);
  }
  const setRegion = (id, col) => { if (grid) i32[id] = col; else for (let q = start[id], e = start[id + 1]; q < e; q++) i32[pix[q]] = col; };
  let shown = 0, raf = 0, t0 = 0, lastColour = 0, ended = false;
  const reset = () => { i32.fill(WHITE); for (const id of order) setRegion(id, BLANK); shown = 0; lastColour = 0; ended = false; };
  const draw = () => {
    fx.putImageData(img, 0, 0);
    c.fillStyle = '#fffaf0'; c.fillRect(0, 0, W, H);
    c.save(); c.translate(ox, oy); c.imageSmoothingEnabled = !grid; c.imageSmoothingQuality = 'high';
    if (grid) c.drawImage(fc, 0, 0, puzzle.w * k, puzzle.h * k); else { c.scale(k, k); c.drawImage(fc, 0, 0); }
    c.restore(); if (ink) c.drawImage(ink, 0, 0);
  };
  const reveal = (upto) => {
    upto = Math.max(0, Math.min(n, upto));
    if (upto < shown) reset();
    for (; shown < upto; shown++) { const id = order[shown], col = R[id][0]; setRegion(id, pal[col - 1]); if (col !== lastColour) { lastColour = col; if (onColour) try { onColour(col); } catch (e) { /* ignore */ } } }
  };
  const seek = (t) => { reveal(Math.ceil(n * Math.max(0, Math.min(1, t)))); draw(); };
  const tick = (now) => {
    if (!t0) t0 = now;
    const t = (now - t0) / duration; seek(t);
    if (t < 1) raf = requestAnimationFrame(tick);
    else { raf = 0; if (!ended) { ended = true; if (onEnd) try { onEnd(); } catch (e) { /* ignore */ } } }
  };
  reset(); draw();
  return {
    canvas: cv, order, duration,
    play() { cancelAnimationFrame(raf); reset(); draw(); t0 = 0; raf = requestAnimationFrame(tick); },
    stop() { cancelAnimationFrame(raf); raf = 0; },
    seek,
    get playing() { return !!raf; },
  };
}
