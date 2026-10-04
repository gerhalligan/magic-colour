// Reads every src/pictures/*.json (expanding the compact grid files) - shared by the tests and the audit tool.
import fs from 'node:fs';
import path from 'node:path';
import { hydrate } from '../../src/codec.js';
export const loadPictures = (dir = path.resolve('src/pictures')) => fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => hydrate(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))));
