#!/usr/bin/env node
// Lists the most similar picture pairs (per type). Usage: node tools/audit-duplicates.mjs [--top=25]
import fs from 'node:fs';
import path from 'node:path';
import { loadPictures } from './lib/load-pictures.mjs';
import { pairs, LOOK_MAX, SHAPE_MAX, OUTLINE_MAX } from './lib/similarity.mjs';
const top = +((process.argv.find((a) => a.startsWith('--top=')) || '--top=25').slice(6));
const dir = path.resolve('src/pictures');
const all = loadPictures(dir);
for (const [label, set] of [['GRID', all.filter((p) => p.grid)], ['SHAPES', all.filter((p) => !p.grid)]]) {
  console.log(`\n${label} (${set.length} pictures) - limits: look < ${LOOK_MAX}, shape < ${SHAPE_MAX[label === 'GRID' ? 'grid' : 'shapes']}, outline < ${OUTLINE_MAX[label === 'GRID' ? 'grid' : 'shapes']} (score >= 1 = too similar)`);
  for (const r of pairs(set).slice(0, top)) console.log(`${r.score >= 1 ? 'DUP ' : '    '} score ${r.score.toFixed(2)} look ${r.look.toFixed(2)} shape ${r.shape.toFixed(2)} outline ${r.outline.toFixed(2)}  ${r.a} ~ ${r.b}`);
}
