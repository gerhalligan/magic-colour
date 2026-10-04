// Grid pictures ("Grid" type): a tiny cell canvas, ASCII import/export and conversion into the game's puzzle format.
// Every cell becomes its OWN numbered square region (neighbouring cells with the same number are still separate, so a number shows in every square).
// Designs are drawn in "native" cell units; Grid(n, k) rasterises them at n cells (k = n / native size), so one design can be made at several sizes.
import sharp from 'sharp';

export class Grid {
  constructor(n, k = 1, h = n) { this.w = n; this.h = h; this.k = k; this.c = new Array(n * h).fill(null); this.m = false; }
  /** while fn runs, everything drawn is mirrored left<->right */
  mirrored(fn) { this.m = true; fn(this); this.m = false; return this; }
  get(x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? null : this.c[y * this.w + x]; }
  set(x, y, col) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.c[y * this.w + x] = col; }
  /** paint every cell whose centre satisfies test(a, b) (native coordinates) */
  paint(test, col) {
    const k = this.k, W0 = this.w / k;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const a = (x + 0.5) / k, b = (y + 0.5) / k;
      if (test(a, b) || (this.m && test(W0 - a, b))) this.c[y * this.w + x] = col;
    }
    return this;
  }
  /** one native cell (a block of cells when scaled up; at least one cell when scaled down) */
  px(x, y, col) {
    this.paint((a, b) => Math.floor(a) === x && Math.floor(b) === y, col);
    if (this.k < 1) { const cx = Math.floor((x + 0.5) * this.k), cy = Math.floor((y + 0.5) * this.k); this.set(cx, cy, col); if (this.m) this.set(this.w - 1 - cx, cy, col); }
    return this;
  }
  rect(x0, y0, x1, y1, col) { return this.paint((a, b) => a >= x0 && a < x1 + 1 && b >= y0 && b < y1 + 1, col); } // inclusive native cell indices
  disc(cx, cy, r, col) { return this.paint((a, b) => (a - cx) ** 2 + (b - cy) ** 2 <= r * r, col); }
  ell(cx, cy, rx, ry, col, rotDeg = 0) {
    const t = rotDeg * Math.PI / 180, co = Math.cos(t), si = Math.sin(t);
    return this.paint((a, b) => { const dx = a - cx, dy = b - cy, u = dx * co + dy * si, v = -dx * si + dy * co; return (u / rx) ** 2 + (v / ry) ** 2 <= 1; }, col);
  }
  poly(pts, col) {
    return this.paint((a, b) => { let ins = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > b) !== (yj > b) && a < (xj - xi) * (b - yi) / (yj - yi) + xi) ins = !ins; } return ins; }, col);
  }
  /** thick line from (x0,y0) to (x1,y1) in native units (never thinner than about one cell) */
  line(x0, y0, x1, y1, th, col) {
    const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1, t2 = Math.max(th, 0.95 / this.k) / 2;
    return this.paint((a, b) => { const t = Math.max(0, Math.min(1, ((a - x0) * dx + (b - y0) * dy) / L2)); return (a - x0 - t * dx) ** 2 + (b - y0 - t * dy) ** 2 <= t2 * t2; }, col);
  }
  /** recolour drawn cells where test(cellX, cellY, currentColour) holds (cell coordinates of THIS grid) */
  recolour(test, col) { for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { const cur = this.c[y * this.w + x]; if (cur && test(x, y, cur)) this.c[y * this.w + x] = col; } return this; }
  /** grow a one-cell outline of `col` around everything drawn (4-neighbourhood) */
  outline(col) {
    const add = []; for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (!this.get(x, y) && (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1))) add.push([x, y]);
    for (const [x, y] of add) this.set(x, y, col); return this;
  }
  /** ASCII form: one char per cell, '.' = paper (left white, not numbered) */
  toAscii() {
    const cols = [...new Set(this.c.filter(Boolean))]; const keys = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'; const map = new Map(cols.map((c, i) => [c, keys[i]]));
    const legend = cols.map((c) => `${map.get(c)}=${c}`).join('\n');
    const rows = []; for (let y = 0; y < this.h; y++) { let r = ''; for (let x = 0; x < this.w; x++) r += this.c[y * this.w + x] ? map.get(this.c[y * this.w + x]) : '.'; rows.push(r); }
    return `# Grid picture. Legend: one "char=#rrggbb" per line, then '---', then one row of characters per grid row ('.' = paper, not numbered).\n${legend}\n---\n${rows.join('\n')}\n`;
  }
  static fromAscii(text) {
    const lines = text.replace(/\r/g, '').split('\n'); const sep = lines.findIndex((l) => l.trim() === '---'); if (sep < 0) throw new Error("ascii file needs a '---' line between the legend and the rows");
    const leg = new Map(); for (const l of lines.slice(0, sep)) { const m = /^\s*(\S)\s*=\s*(#[0-9a-fA-F]{6})\s*$/.exec(l); if (m) leg.set(m[1], m[2].toLowerCase()); }
    const rows = lines.slice(sep + 1).filter((l) => l.trim().length); const h = rows.length, w = Math.max(...rows.map((r) => r.length));
    const g = new Grid(w, 1, h); rows.forEach((r, y) => { for (let x = 0; x < w; x++) { const ch = r[x] || '.'; if (ch === '.' || ch === ' ') continue; if (!leg.has(ch)) throw new Error(`row ${y + 1}: '${ch}' is not in the legend`); g.set(x, y, leg.get(ch)); } });
    return g;
  }
}

export const cellSize = (w, h) => Math.max(14, Math.round(600 / Math.max(w, h)));
/** difficulty from the grid size: up to 20 = easy, up to 32 = medium, bigger = hard */
export const gridGrade = (w, h) => (Math.max(w, h) <= 20 ? 'easy' : Math.max(w, h) <= 32 ? 'medium' : 'hard');

/** Grid -> puzzle JSON (same shape the app already loads; `grid:{w,h,cs}` replaces the map, which the app computes) */
export async function gridToPuzzle(g, meta) {
  const cs = cellSize(g.w, g.h), W = g.w * cs, H = g.h * cs;
  const count = new Map(); for (const c of g.c) if (c) count.set(c, (count.get(c) || 0) + 1);
  const palette = [...count.keys()].sort((a, b) => count.get(b) - count.get(a) || a.localeCompare(b));
  const regions = g.c.map((c, i) => { const x = i % g.w, y = (i / g.w) | 0; return [c ? palette.indexOf(c) + 1 : 0, x * cs + (cs >> 1), y * cs + (cs >> 1), cs / 2, cs * cs]; });
  let outline = ''; for (let y = 0; y <= g.h; y++) outline += `M0 ${y * cs}H${W}`; for (let x = 0; x <= g.w; x++) outline += `M${x * cs} 0V${H}`;
  const numbered = regions.filter((r) => r[0] > 0).length, diff = meta.diff || gridGrade(g.w, g.h);
  // thumbnail: the cells, padded to a square, nearest-neighbour so the pixels stay crisp
  const S = Math.max(g.w, g.h), buf = Buffer.alloc(S * S * 3, 255), ox = (S - g.w) >> 1, oy = (S - g.h) >> 1;
  g.c.forEach((c, i) => { if (!c) return; const x = i % g.w + ox, y = ((i / g.w) | 0) + oy; for (let k = 0; k < 3; k++) buf[(y * S + x) * 3 + k] = parseInt(c.slice(1 + 2 * k, 3 + 2 * k), 16); });
  const png = await sharp(buf, { raw: { width: S, height: S, channels: 3 } }).resize(128, 128, { kernel: 'nearest' }).png({ palette: true, colours: 48, compressionLevel: 9 }).toBuffer();
  const full = await sharp(buf, { raw: { width: S, height: S, channels: 3 } }).resize(256, 256, { kernel: 'nearest' }).png().toBuffer();
  const puzzle = {
    id: meta.id, name: meta.name, cat: meta.cat || 'fantasy', diff, wanted: diff, ...(meta.added ? { added: meta.added } : {}),
    w: W, h: H, palette, regions, map: '', outline,
    stats: { regions: numbered, colours: palette.length, meanErr: 0, badFrac: 0, minArea: cs * cs, outlinePoints: 4 * (g.w + g.h + 2) },
    thumb: 'data:image/png;base64,' + png.toString('base64'), grid: { w: g.w, h: g.h, cs },
  };
  return { puzzle, full };
}
