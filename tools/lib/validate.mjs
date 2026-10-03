import { decodeMap, rgb2lab, dE } from './segment.mjs';
export const LIMITS = { easy: { regions: [8, 25], colours: [4, 9] }, medium: { regions: [20, 84], colours: [5, 17] }, hard: { regions: [75, 260], colours: [11, 17] } };
/** returns an array of problem strings (empty = valid) */
export function validatePuzzle(p) {
  const bad = []; const lim = LIMITS[p.diff]; const { w, h } = p;
  if (!lim) return ['unknown difficulty ' + p.diff];
  const map = decodeMap(p.map, w, h);
  const numbered = p.regions.filter((r) => r[0] > 0);
  if (numbered.length < lim.regions[0] || numbered.length > lim.regions[1]) bad.push(`regions ${numbered.length} not in ${lim.regions}`);
  if (p.palette.length < lim.colours[0] || p.palette.length > lim.colours[1]) bad.push(`colours ${p.palette.length} not in ${lim.colours}`);
  const used = new Set();
  p.regions.forEach((r, i) => {
    const [c, lx, ly, rad] = r;
    if (c > p.palette.length || c < 0) bad.push(`region ${i} bad colour ${c}`);
    if (c === 0 && !p.paper) { /* paper region allowed */ }
    if (c > 0) used.add(c);
    if (map[ly * w + lx] !== i) bad.push(`region ${i} label (${lx},${ly}) not inside its region`);
    if (c > 0 && rad < 3.5) bad.push(`region ${i} label radius ${rad} too small`);
    if (lx < 0 || ly < 0 || lx >= w || ly >= h) bad.push(`region ${i} label off image`);
  });
  const seen = new Set(map); if (seen.size !== p.regions.length) bad.push(`map has ${seen.size} ids for ${p.regions.length} regions`);
  for (let c = 1; c <= p.palette.length; c++) if (!used.has(c)) bad.push(`palette colour ${c} unused`);
  const labs = p.palette.map((x) => rgb2lab(parseInt(x.slice(1, 3), 16), parseInt(x.slice(3, 5), 16), parseInt(x.slice(5, 7), 16)));
  for (let i = 0; i < labs.length; i++) for (let j = i + 1; j < labs.length; j++) if (dE(labs[i], labs[j]) < 5) bad.push(`colours ${i + 1} and ${j + 1} nearly identical`);
  if (p.stats.meanErr > 14) bad.push(`finished picture differs from source (meanErr ${p.stats.meanErr})`);
  if (p.stats.badFrac > 0.08) bad.push(`too many badly coloured pixels ${p.stats.badFrac}`);
  if (!p.outline || p.outline.length < 20) bad.push('no outline');
  // paper regions must touch the edge
  p.regions.forEach((r, i) => { if (r[0] === 0) { let t = false; for (let x = 0; x < w && !t; x++) if (map[x] === i || map[(h - 1) * w + x] === i) t = true; for (let y = 0; y < h && !t; y++) if (map[y * w] === i || map[y * w + w - 1] === i) t = true; if (!t) bad.push(`paper region ${i} not on the edge`); } });
  return bad;
}
