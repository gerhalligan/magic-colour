#!/usr/bin/env node
// Add (or rebuild) one picture:  node tools/make-picture.mjs path/to/image.png --name "Space Cat" --cat animals [--diff easy|medium|hard]
//   [--id space-cat] [--k 8] [--min-area 200] [--min-r 6] [--ink] [--ink-split] [--ink-l 30] [--merge-de 14] [--size 896] [--added YYYY-MM-DD] [--bg ffffff]
// The image can be a PNG/JPG/WebP/SVG: flat-colour cartoon, white or light background, no text (e.g. AI generated).
// It is copied to art/source/, registered in art/manifest.json and converted into src/pictures/<id>.json (+ art/thumbs/<id>.png).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const a = process.argv.slice(2), file = a.find((x) => !x.startsWith('--') && fs.existsSync(x));
const opt = (n, d) => { const i = a.indexOf('--' + n); return i >= 0 ? a[i + 1] : d; };
if (!file && !opt('id')) { console.log('usage: node tools/make-picture.mjs image.png --name "Name" --cat animals [--diff medium] [--id my-id] [--k 8] [--min-area N] [--min-r N] [--ink] [--bg ffffff]'); process.exit(1); }
const name = opt('name', path.basename(file || opt('id'), path.extname(file || '')).replace(/[-_]/g, ' ')); const id = opt('id', name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
const mf = path.join(root, 'art/manifest.json'); const manifest = JSON.parse(fs.readFileSync(mf, 'utf8'));
let entry = manifest.find((m) => m.id === id);
let entry0Added = null;
if (file) {
  const ext = path.extname(file).toLowerCase(); const dest = path.join(root, 'art/source', id + ext); fs.mkdirSync(path.dirname(dest), { recursive: true }); if (path.resolve(file) !== dest) fs.copyFileSync(file, dest);
  const opts = {}; if (opt('k')) opts.k = +opt('k'); if (opt('min-area')) opts.minArea = +opt('min-area'); if (opt('min-r')) opts.minR = +opt('min-r'); if (a.includes('--ink')) opts.ink = true; if (a.includes('--ink-split')) opts.inkSplit = true; if (opt('ink-l')) opts.inkL = +opt('ink-l'); if (opt('merge-de')) opts.mergeDE = +opt('merge-de'); if (opt('size')) opts.size = +opt('size'); if (opt('added')) entry0Added = opt('added'); if (a.includes('--keep-diff')) opts.keepDiff = true;
  const bgHex = opt('bg'); const bg = bgHex ? [0, 2, 4].map((i) => parseInt(bgHex.slice(i, i + 2), 16)) : undefined;
  entry = { id, name, cat: opt('cat', 'fantasy'), diff: opt('diff', 'medium'), src: 'art/source/' + id + ext, ...(bg ? { bg } : {}), opts, ...(entry0Added ? { added: entry0Added } : {}) };
  const i = manifest.findIndex((m) => m.id === id); if (i >= 0) manifest[i] = entry; else manifest.push(entry);
  fs.writeFileSync(mf, JSON.stringify(manifest, null, 1));
}
const r = spawnSync('node', ['tools/build-pictures.mjs', '--only=' + id, '--lenient'], { cwd: root, stdio: 'inherit' });
console.log(r.status === 0 ? `\nDone. "${name}" is in src/pictures/${id}.json. Run \`npm test && npm run build\` to ship it.` : 'build-pictures failed');
process.exit(r.status || 0);
