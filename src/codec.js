// Label-map codec shared by the app and the pipeline: varint run-length encoding as base64.
const cache = new WeakMap();
export function decodeMap(b64, w, h) {
  const bin = atob(b64);
  const out = new Uint16Array(w * h); let p = 0, o = 0;
  const rv = () => { let v = 0, s = 0, c; do { c = bin.charCodeAt(p++); v |= (c & 127) << s; s += 7; } while (c & 128); return v; };
  while (o < out.length && p < bin.length) { const id = rv(), run = rv() + 1; out.fill(id, o, o + run); o += run; }
  return out;
}
/** decoded map of a puzzle (cached) */
export function mapOf(puzzle) { let m = cache.get(puzzle); if (!m) { m = decodeMap(puzzle.map, puzzle.w, puzzle.h); cache.set(puzzle, m); } return m; }
export function hexToRgb(hex) { return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]; }
export const rgb32 = (r, g, b) => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0; // little-endian RGBA
