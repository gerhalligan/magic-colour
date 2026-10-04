// Label-map codec shared by the app and the pipeline: varint run-length encoding as base64.
const cache = new WeakMap();
export function decodeMap(b64, w, h) {
  const bin = atob(b64);
  const out = new Uint16Array(w * h); let p = 0, o = 0;
  const rv = () => { let v = 0, s = 0, c; do { c = bin.charCodeAt(p++); v |= (c & 127) << s; s += 7; } while (c & 128); return v; };
  while (o < out.length && p < bin.length) { const id = rv(), run = rv() + 1; out.fill(id, o, o + run); o += run; }
  return out;
}
/** label map of a Pixel Grid puzzle: cell (cx,cy) is region cy*gw+cx and covers a cs x cs square (computed, so grid puzzles carry no map data) */
export function gridMap(grid) {
  const { w: gw, h: gh, cs } = grid, W = gw * cs, H = gh * cs, out = new Uint16Array(W * H);
  for (let y = 0; y < H; y++) { const row = ((y / cs) | 0) * gw, o = y * W; for (let x = 0; x < W; x++) out[o + x] = row + ((x / cs) | 0); }
  return out;
}
/**
 * Grid puzzle files are stored compactly: `cells` is one base-36 character per cell (0 = paper, otherwise the palette number) and
 * `regions` / `outline` are computed on first use (only the picture being played is ever expanded, which keeps big grids cheap in memory).
 */
export function hydrate(p) {
  if (!p || !p.grid || !p.cells || Object.getOwnPropertyDescriptor(p, 'regions')) return p;
  const { w: gw, h: gh, cs } = p.grid; let regions = null, outline = null;
  Object.defineProperty(p, 'regions', { configurable: true, enumerable: true, get() {
    if (!regions) { regions = new Array(gw * gh); for (let i = 0; i < regions.length; i++) regions[i] = [parseInt(p.cells[i], 36), (i % gw) * cs + (cs >> 1), ((i / gw) | 0) * cs + (cs >> 1), cs / 2, cs * cs]; }
    return regions;
  }, set(v) { regions = v; } });
  Object.defineProperty(p, 'outline', { configurable: true, enumerable: true, get() {
    if (outline === null) { outline = ''; for (let y = 0; y <= gh; y++) outline += `M0 ${y * cs}H${gw * cs}`; for (let x = 0; x <= gw; x++) outline += `M${x * cs} 0V${gh * cs}`; }
    return outline;
  }, set(v) { outline = v; } });
  if (p.map === undefined) p.map = '';
  return p;
}
/** decoded map of a puzzle (cached) */
export function mapOf(puzzle) { let m = cache.get(puzzle); if (!m) { m = puzzle.grid ? gridMap(puzzle.grid) : decodeMap(puzzle.map, puzzle.w, puzzle.h); cache.set(puzzle, m); } return m; }
export function hexToRgb(hex) { return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]; }
export const rgb32 = (r, g, b) => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0; // little-endian RGBA
