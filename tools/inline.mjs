// dist/app.js + src/style.css + index.html -> dist-single/Magic-Colour.html (one self-contained file)
// and docs/ (GitHub Pages: index.html identical to the single file + manifest + service worker + icons).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/style.css'), 'utf8').replace(/\/\*[^*]*\*+([^/*][^*]*\*+)*\//g, '').replace(/\s*\n\s*/g, '\n');
let js = fs.readFileSync(path.join(root, 'dist/app.js'), 'utf8');
js = js.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
const out = html.replace('<style>/*CSS*/</style>', () => '<style>' + css + '</style>').replace('<script>/*APP*/</script>', () => '<script>' + js + '</script>');
fs.mkdirSync(path.join(root, 'dist-single'), { recursive: true });
const dest = path.join(root, 'dist-single/Magic-Colour.html');
fs.writeFileSync(dest, out);
const bad = [];
if (/type\s*=\s*["']module/.test(out)) bad.push('type=module');
if (/import\.meta/.test(out)) bad.push('import.meta');
if (/new\s+Worker\s*\(/.test(out)) bad.push('Worker');
if (/\b(src|href)\s*=\s*["']https?:/i.test(out)) bad.push('external src/href');
if (/<link[^>]+stylesheet/i.test(out)) bad.push('external css');
if (/\b(fetch|XMLHttpRequest|WebSocket|sendBeacon)\s*\(/.test(js)) bad.push('network call');
console.log('wrote', dest, (out.length / 1024).toFixed(0) + ' KB', bad.length ? 'PROBLEMS: ' + bad.join(',') : 'OK (classic, self-contained, no network calls)');
const sha = crypto.createHash('sha256').update(out).digest('hex');
// share copy
fs.mkdirSync('/workspace/magic-colour-share', { recursive: true });
fs.copyFileSync(dest, '/workspace/magic-colour-share/Magic-Colour.html');
// GitHub Pages bundle
const docs = path.join(root, 'docs'); fs.mkdirSync(docs, { recursive: true });
fs.copyFileSync(dest, path.join(docs, 'index.html'));
for (const f of fs.readdirSync(path.join(root, 'public'))) if (f !== 'sw.js') fs.copyFileSync(path.join(root, 'public', f), path.join(docs, f));
fs.writeFileSync(path.join(docs, 'sw.js'), fs.readFileSync(path.join(root, 'public/sw.js'), 'utf8').replace('__VERSION__', pkg.version + '-' + sha.slice(0, 10)));
fs.writeFileSync(path.join(docs, '.nojekyll'), '');
console.log('docs/ ready, sha256', sha);
if (bad.length) process.exit(1);
