// Paint-brush helpers (pure, no DOM): brush size -> radius, stroke interpolation and hit-testing against the label map.
// The brush only ever *finds* regions; game.brushPaint() decides what is allowed to fill (matching number only).

/** Brush sizes (radius in CSS px at "fit" zoom). Big, kid-friendly steps. */
export const BRUSH_SIZES = [
  { id: 'small', label: 'Small', px: 14 },
  { id: 'medium', label: 'Medium', px: 26 },
  { id: 'large', label: 'Large', px: 44 },
  { id: 'huge', label: 'Huge', px: 70 },
];
export const DEFAULT_BRUSH = 0; // the smallest brush is the default (a size the player picks later is remembered)
export const clampBrushSize = (i) => { i = Math.round(+i); return Number.isFinite(i) ? Math.min(BRUSH_SIZES.length - 1, Math.max(0, i)) : DEFAULT_BRUSH; };

/**
 * Brush radius on screen (CSS px). It grows gently when the picture is zoomed in (sqrt of the zoom, at most 1.8x)
 * so a small brush is never absurdly tiny on a 9x zoom, but zooming in still means finer control.
 * It never exceeds 42% of the shorter side of the view.
 */
export function brushRadiusPx(sizeIdx, zoomRatio = 1, viewMin = 360) {
  const base = BRUSH_SIZES[clampBrushSize(sizeIdx)].px;
  const k = Math.min(1.8, Math.max(1, Math.sqrt(Math.max(1, zoomRatio))));
  return Math.min(base * k, Math.max(base, viewMin * 0.42));
}
/** Brush radius in picture (map) pixels for the current zoom `s` (screen px per map px) relative to the fit zoom. */
export function brushRadiusMap(sizeIdx, s, fitS, viewMin) { return brushRadiusPx(sizeIdx, s / (fitS || s || 1), viewMin) / (s || 1); }

/**
 * Interpolated stamp centres along the segment (x0,y0)->(x1,y1): every point is at most `spacing` from the previous one,
 * the start is NOT included and the end always is, so fast strokes (two far-apart pointer events) never skip regions.
 */
export function strokePoints(x0, y0, x1, y1, spacing) {
  const d = Math.hypot(x1 - x0, y1 - y0); if (!(d > 0)) return [];
  const n = Math.max(1, Math.ceil(d / Math.max(0.5, spacing))), out = [];
  for (let i = 1; i <= n; i++) { const t = i / n; out.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]); }
  return out;
}
/** stamp spacing for a brush of radius r: half a radius keeps the swept band within ~3% of full width */
export const stampSpacing = (r) => Math.max(1.5, r * 0.5);

/** inclusive bounding boxes per region id: Int32Array [x0,y0,x1,y1, ...] (x1 = -1 for an id with no pixels) */
export function computeBBoxes(map, w, h, n) {
  const bb = new Int32Array(n * 4);
  for (let i = 0; i < n; i++) { bb[i * 4] = w; bb[i * 4 + 1] = h; bb[i * 4 + 2] = -1; bb[i * 4 + 3] = -1; }
  for (let y = 0, p = 0; y < h; y++) for (let x = 0; x < w; x++, p++) {
    const o = map[p] * 4; if (x < bb[o]) bb[o] = x; if (y < bb[o + 1]) bb[o + 1] = y; if (x > bb[o + 2]) bb[o + 2] = x; if (y > bb[o + 3]) bb[o + 3] = y;
  }
  return bb;
}

export class Brusher {
  constructor(puzzle, map, bb) { this.P = puzzle; this.map = map; this.bb = bb || computeBBoxes(map, puzzle.w, puzzle.h, puzzle.regions.length); }
  regionAt(x, y) { const { w, h } = this.P; x = Math.floor(x); y = Math.floor(y); return x < 0 || y < 0 || x >= w || y >= h ? -1 : this.map[y * w + x]; }
  /**
   * Add to `out` (a Set) every candidate region id that is not filled and overlaps the disc (cx,cy,r).
   * Only `candidates` (the regions of the selected number) are examined, so wrong-number regions can never be hit.
   * Cheap first: label point inside the disc = hit; bounding box not touching the disc = miss; else scan the clipped box (early exit).
   */
  hit(cx, cy, r, candidates, filled, out) {
    const { w, regions } = this.P, bb = this.bb, map = this.map, r2 = r * r;
    for (let k = 0; k < candidates.length; k++) {
      const id = candidates[k]; if (filled[id] || out.has(id)) continue;
      const o = id * 4, x1 = bb[o + 2]; if (x1 < 0) continue;
      const x0 = bb[o], y0 = bb[o + 1], y1 = bb[o + 3];
      const dx0 = cx < x0 ? x0 - cx : cx > x1 + 1 ? cx - (x1 + 1) : 0, dy0 = cy < y0 ? y0 - cy : cy > y1 + 1 ? cy - (y1 + 1) : 0;
      if (dx0 * dx0 + dy0 * dy0 > r2) continue; // bbox (as continuous rect) is out of reach
      const lr = regions[id], lx = lr[1] + 0.5 - cx, ly = lr[2] + 0.5 - cy;
      if (lx * lx + ly * ly <= r2) { out.add(id); continue; }
      const sx0 = Math.max(x0, Math.floor(cx - r)), sx1 = Math.min(x1, Math.ceil(cx + r)), sy0 = Math.max(y0, Math.floor(cy - r)), sy1 = Math.min(y1, Math.ceil(cy + r));
      const step = (sx1 - sx0 + 1) * (sy1 - sy0 + 1) > 24000 ? 2 : 1;
      let found = false;
      for (let y = sy0; y <= sy1 && !found; y += step) {
        const ddy = y + 0.5 - cy, row = y * w; if (ddy * ddy > r2) continue;
        for (let x = sx0; x <= sx1; x += step) { const ddx = x + 0.5 - cx; if (ddx * ddx + ddy * ddy <= r2 && map[row + x] === id) { found = true; break; } }
      }
      if (found) out.add(id);
    }
    return out;
  }
  /** all stamps along a segment; `first` also stamps the start point (stroke start / tap) */
  segment(x0, y0, x1, y1, r, candidates, filled, out, first = false) {
    if (first) this.hit(x0, y0, r, candidates, filled, out);
    for (const [x, y] of strokePoints(x0, y0, x1, y1, stampSpacing(r))) this.hit(x, y, r, candidates, filled, out);
    return out;
  }
}
