// Image file -> puzzle JSON (the repeatable pipeline). Used by tools/make-picture.mjs and tools/build-pictures.mjs.
import sharp from 'sharp';
import { quantize, fillUnknown, cleanRegions, components, labelDistance, regionStats, encodeMap, traceOutline, rgb2lab, dE, hex } from './segment.mjs';

export const BANDS = { // difficulty -> targets
  easy: { size: 400, k: 6, regions: [8, 25], colours: [5, 6], minArea: 450, minR: 9 },
  medium: { size: 512, k: 9, regions: [20, 84], colours: [7, 10], minArea: 220, minR: 6.5 },
  hard: { size: 640, k: 14, regions: [75, 420], colours: [8, 20], minArea: 90, minR: 5 },
};

/** difficulty is graded from what the finished puzzle actually contains (number of regions to colour) */
export const gradeOf = (regions, colours = 0) => (regions <= 25 && colours <= 8 ? 'easy' : regions <= 84 && !(regions >= 75 && colours >= 14) ? 'medium' : 'hard');

export async function loadFlat(file, size, bg = [255, 255, 255]) {
  const { data, info } = await sharp(file).resize(size, size, { fit: 'contain', background: { r: bg[0], g: bg[1], b: bg[2], alpha: 1 }, kernel: 'lanczos3' }).flatten({ background: { r: bg[0], g: bg[1], b: bg[2] } }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { rgba: new Uint8Array(data), w: info.width, h: info.height };
}

/** Build the puzzle object from flat RGBA. opts: {diff, k, minArea, minR, regions:[min,max], paper:true, mergeDE} */
export function buildPuzzle(rgba, w, h, meta, opts = {}) {
  const band = BANDS[meta.diff || 'medium'];
  const k = opts.k || band.k;
  let minArea = opts.minArea || band.minArea; const minR = opts.minR || band.minR;
  const [rmin, rmax] = opts.regions || band.regions;
  const q = quantize(rgba, w, h, { k, mergeDE: opts.mergeDE || 14 }); let seg = null;
  if (opts.ink) { // AI / scanned line-art: dark outline pixels are not a colour to paint - dissolve them into the fields they separate
    const ink = q.labPalette.map((l) => l[0] < (opts.inkL || 30));
    if (ink.some(Boolean) && !ink.every(Boolean)) {
      for (let p = 0; p < w * h; p++) if (ink[q.idx[p]]) q.idx[p] = 255;
      if (opts.inkSplit) { // keep fields that the ink lines separate as separate regions (more, smaller areas: e.g. every shingle / pumpkin rib)
        const known = components(q.idx, w, h).lab; seg = new Int32Array(w * h); for (let p = 0; p < w * h; p++) seg[p] = q.idx[p] === 255 ? -1 : known[p];
      }
      fillUnknown(q.idx, w, h, seg);
    }
  }
  let res, tries = 0;
  for (;;) {
    res = cleanRegions(q.idx, w, h, q.labPalette, { minArea, minR, seg });
    if (res.nc <= rmax || tries++ > 12) break;
    minArea = Math.round(minArea * 1.35);
  }
  const { idx, lab, nc } = res;
  const dist = labelDistance(lab, w, h);
  const st = regionStats(lab, nc, w, h, dist);
  const colorOf = new Int32Array(nc); for (let p = 0; p < w * h; p++) colorOf[lab[p]] = idx[p];
  // true colours: mean of source over the interior of regions of that colour
  const sum = q.labPalette.map(() => [0, 0, 0, 0]);
  for (let p = 0; p < w * h; p++) { if (dist[p] >= 3) { const s = sum[idx[p]]; s[0] += rgba[p * 4]; s[1] += rgba[p * 4 + 1]; s[2] += rgba[p * 4 + 2]; s[3]++; } }
  const rgbPal = sum.map((s, i) => (s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : null));
  // paper = near-white region(s) touching the image edge
  const touches = new Uint8Array(nc);
  for (let x = 0; x < w; x++) { touches[lab[x]] = 1; touches[lab[(h - 1) * w + x]] = 1; }
  for (let y = 0; y < h; y++) { touches[lab[y * w]] = 1; touches[lab[y * w + w - 1]] = 1; }
  const isPaper = new Uint8Array(nc);
  if (opts.paper !== false) for (let r = 0; r < nc; r++) { const c = rgbPal[colorOf[r]]; if (touches[r] && c && Math.min(c[0], c[1], c[2]) > 240) isPaper[r] = 1; }
  // palette numbering: only colours used by numbered regions, biggest total area first
  const areaByColor = new Float64Array(q.count);
  for (let r = 0; r < nc; r++) if (!isPaper[r] && rgbPal[colorOf[r]]) areaByColor[colorOf[r]] += st.area[r];
  const order = [...areaByColor.keys()].filter((c) => areaByColor[c] > 0).sort((a, b) => areaByColor[b] - areaByColor[a]);
  const num = new Int32Array(q.count); order.forEach((c, i) => { num[c] = i + 1; });
  const regions = [];
  for (let r = 0; r < nc; r++) regions.push([isPaper[r] ? 0 : num[colorOf[r]], st.lx[r], st.ly[r], Math.round(st.maxR[r] * 10) / 10, st.area[r]]);
  const palette = order.map((c) => hex(rgbPal[c]));
  const outline = traceOutline(lab, w, h);
  // fidelity of the finished picture vs the source
  let err = 0, bad = 0; const pal = order.map((c) => rgbPal[c]);
  for (let p = 0; p < w * h; p++) {
    if (opts.ink && rgba[p * 4] + rgba[p * 4 + 1] + rgba[p * 4 + 2] < 150) continue; // ink pixels are intentionally replaced
    const r = lab[p], c = regions[r][0] ? pal[regions[r][0] - 1] : [255, 255, 255];
    const e = (Math.abs(c[0] - rgba[p * 4]) + Math.abs(c[1] - rgba[p * 4 + 1]) + Math.abs(c[2] - rgba[p * 4 + 2])) / 3; err += e; if (e > 60) bad++;
  }
  const stats = { regions: regions.filter((r) => r[0]).length, colours: palette.length, meanErr: +(err / (w * h)).toFixed(2), badFrac: +(bad / (w * h)).toFixed(4), minArea, outlinePoints: outline.points };
  return { puzzle: { id: meta.id, name: meta.name, cat: meta.cat, diff: opts.keepDiff ? meta.diff : gradeOf(stats.regions, stats.colours), wanted: meta.diff, ...(meta.added ? { added: meta.added } : {}), w, h, palette, regions, map: encodeMap(lab, w, h), outline: outline.d, stats }, lab, pal };
}

/** 128px palette-PNG thumbnail of the finished picture, as a data URL */
export async function makeThumb(puzzle, lab, size = 128) {
  const { w, h } = puzzle; const buf = Buffer.alloc(w * h * 3);
  const pal = puzzle.palette.map((c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]);
  for (let p = 0; p < w * h; p++) { const rc = puzzle.regions[lab[p]][0]; const c = rc ? pal[rc - 1] : [255, 255, 255]; buf[p * 3] = c[0]; buf[p * 3 + 1] = c[1]; buf[p * 3 + 2] = c[2]; }
  const png = await sharp(buf, { raw: { width: w, height: h, channels: 3 } }).resize(size, size, { kernel: 'lanczos3' }).png({ palette: true, colours: 48, compressionLevel: 9, effort: 8 }).toBuffer();
  return { png, dataUrl: 'data:image/png;base64,' + png.toString('base64'), full: await sharp(buf, { raw: { width: w, height: h, channels: 3 } }).png().toBuffer() };
}
