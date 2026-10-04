#!/usr/bin/env node
// GRID pictures (the "Grid" type): every square of a grid is a numbered region.
//   node tools/pixel-grid.mjs                       rebuild the built-in grid pictures (designs in tools/art/pixel.mjs)
//   node tools/pixel-grid.mjs my.txt --name "Cute Frog" [--cat animals] [--id grid-cute-frog] [--diff easy|medium|hard]
//        add one from an ASCII file (legend lines "x=#rrggbb", a '---' line, then one row of characters per grid row; '.' = paper)
// Writes src/pictures/<id>.json, art/thumbs/<id>.png, art/pixel/<id>.txt and registers the picture in art/manifest.json (kind "grid").
// Then run `node tools/build-pictures.mjs` (or `npm run pictures`) to refresh src/pictures.generated.js, and `npm test`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Grid, gridToPuzzle, compactGrid } from './lib/grid.mjs';
import { validatePuzzle } from './lib/validate.mjs';
import { PIXEL } from './art/pixel.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const a = process.argv.slice(2), opts = new Set(['name', 'cat', 'id', 'diff']);
const file = a.find((x, i) => !x.startsWith('--') && !(i > 0 && opts.has(a[i - 1].slice(2)) && a[i - 1].startsWith('--')) && fs.existsSync(x));
const opt = (n, d) => { const i = a.indexOf('--' + n); return i >= 0 ? a[i + 1] : d; };
const mf = path.join(root, 'art/manifest.json'), manifest = JSON.parse(fs.readFileSync(mf, 'utf8'));
for (const d of ['art/pixel', 'art/thumbs', 'src/pictures']) fs.mkdirSync(path.join(root, d), { recursive: true });
const jobs = [];
if (file) {
  const name = opt('name', path.basename(file, path.extname(file)).replace(/[-_]/g, ' ')), id = opt('id', 'grid-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  const text = fs.readFileSync(file, 'utf8');
  jobs.push({ id, name, cat: opt('cat', 'fantasy'), diff: opt('diff'), grid: Grid.fromAscii(text), ascii: text });
} else {
  for (const d of PIXEL) for (const n of d.sizes) {
    const g = new Grid(n, n / d.native); d.draw(g);
    const big = d.sizes.length > 1 && n === Math.max(...d.sizes);
    jobs.push({ id: d.sizes.length > 1 ? `${d.id}-${n}` : d.id, name: d.sizes.length > 1 ? `${d.name} ${n}\u00D7${n}` : d.name, cat: d.cat, grid: g, big });
  }
}
let bad = 0;
for (const j of jobs) {
  const old = manifest.find((m) => m.id === j.id), added = (old && old.added) || new Date().toISOString().slice(0, 10);
  const { puzzle, full } = await gridToPuzzle(j.grid, { id: j.id, name: j.name, cat: j.cat, diff: j.diff, added });
  const problems = validatePuzzle(puzzle); if (problems.length) { bad++; console.log('PROBLEMS', j.id, problems.slice(0, 5)); }
  fs.writeFileSync(path.join(root, 'src/pictures', j.id + '.json'), JSON.stringify(compactGrid(puzzle)));
  fs.writeFileSync(path.join(root, 'art/thumbs', j.id + '.png'), full);
  fs.writeFileSync(path.join(root, 'art/pixel', j.id + '.txt'), j.ascii || j.grid.toAscii());
  const entry = { id: j.id, name: j.name, cat: j.cat, diff: puzzle.diff, kind: 'grid', src: 'art/pixel/' + j.id + '.txt', added };
  const i = manifest.findIndex((m) => m.id === j.id); if (i >= 0) manifest[i] = entry; else manifest.push(entry);
  console.log(`${j.id.padEnd(22)} ${String(j.grid.w).padStart(2)}x${j.grid.h}  ${puzzle.diff.padEnd(6)} cells ${String(puzzle.stats.regions).padStart(4)}  colours ${puzzle.stats.colours}  ${j.cat}`);
}
fs.writeFileSync(mf, JSON.stringify(manifest, null, 1));
if (file) console.log('\nNow run: node tools/build-pictures.mjs   (updates the picture index), then npm test && npm run build');
process.exit(bad ? 1 : 0);
