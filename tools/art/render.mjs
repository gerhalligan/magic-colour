// Render all source pictures (SVG -> PNG) into art/source/. Run: node tools/art/render.mjs [id...]
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scatter } from './decor.mjs';
import DECOR from './decor-map.mjs';
import EXTRAS from './extras.mjs';
import MORE from './decor-more.mjs';
for (const [k, v] of Object.entries(MORE)) DECOR[k] = [...(DECOR[k] || []), ...v];
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
export async function loadAll() {
  const files = fs.readdirSync(here).filter((f) => /^(easy|medium|hard)\w*\.mjs$/.test(f)).sort();
  const all = []; for (const f of files) { const m = await import('./' + f); all.push(...m.default); } return all;
}
const only = process.argv.slice(2);
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const all = await loadAll(); fs.mkdirSync(path.join(root, 'art/source'), { recursive: true });
  const s_by_id = {};
  for (const p of all) {
    if (only.length && !only.includes(p.id)) continue;
    let s = p.svg(); if (DECOR[p.id]) s = s.replace(/(<rect width="1000" height="1000" fill="[^"]*"\/>)/, (m) => m + DECOR[p.id].map((d) => scatter({ ...d, diff: p.diff })).join('')); if (EXTRAS[p.id]) s = s.replace('</svg>', EXTRAS[p.id]() + '</svg>'); fs.writeFileSync(path.join(root, 'art/source', p.id + '.svg'), s); s_by_id[p.id] = s;
    await sharp(Buffer.from(s), { density: 96 }).resize(1024, 1024).png().toFile(path.join(root, 'art/source', p.id + '.png'));
  }
  // keep art/manifest.json in sync for the procedural pictures (hand-added AI/photo entries are preserved)
  const mf = path.join(root, 'art/manifest.json'); const cur = fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf, 'utf8')) : [];
  const byId = new Map(cur.map((m) => [m.id, m]));
  for (const p of all) byId.set(p.id, { ...(byId.get(p.id) || {}), id: p.id, name: p.name, cat: p.cat, diff: p.diff, src: 'art/source/' + p.id + '.png', opts: { k: Math.min(16, new Set(s_by_id[p.id].match(/fill="#[0-9a-f]{6}"/gi)).size), mergeDE: 9 } });
  fs.writeFileSync(mf, JSON.stringify([...byId.values()], null, 1));
  console.log('rendered', all.length);
}
