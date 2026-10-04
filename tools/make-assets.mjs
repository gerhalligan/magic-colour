// Regenerates SEO / share assets in public/ : favicon.svg/.ico, apple-touch-icon.png, og-image.png (1200x630).
// (icon-192/512/maskable come from tools/make-icons.mjs). Usage: node tools/make-assets.mjs  (needs Chrome + sharp)
import fs from 'node:fs';
import sharp from 'sharp';
import { launch, FILE } from '../tests/launch.mjs';
const pub = new URL('../public/', import.meta.url).pathname;
const inner = `<circle cx="180" cy="190" r="82" fill="#ffd93d"/><circle cx="332" cy="190" r="82" fill="#ff6fa5"/><circle cx="256" cy="330" r="82" fill="#4cc9f0"/><path d="M256 60l14 34 36 4-27 24 8 36-31-19-31 19 8-36-27-24 36-4z" fill="#fff"/><text x="256" y="372" font-family="Trebuchet MS,Arial,sans-serif" font-weight="900" font-size="120" text-anchor="middle" fill="#fff">1</text>`;
const svg = (rx, scale = 1) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="${rx}" fill="#7b5cff"/><g transform="translate(256 256) scale(${scale}) translate(-256 -256)">${inner}</g></svg>`;
fs.writeFileSync(pub + 'favicon.svg', svg(110));
const png = (s, size) => sharp(Buffer.from(s), { density: 300 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
fs.writeFileSync(pub + 'apple-touch-icon.png', await png(svg(0, 0.82), 180));
const sizes = [16, 32, 48]; const imgs = await Promise.all(sizes.map((s) => png(svg(110), s)));
const head = Buffer.alloc(6); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
let off = 6 + 16 * sizes.length; const dir = [];
imgs.forEach((b, i) => { const e = Buffer.alloc(16); e[0] = sizes[i]; e[1] = sizes[i]; e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6); e.writeUInt32LE(b.length, 8); e.writeUInt32LE(off, 12); off += b.length; dir.push(e); });
fs.writeFileSync(pub + 'favicon.ico', Buffer.concat([head, ...dir, ...imgs]));

// og-image: real gallery + a coloured-in picture screenshot in a branded layout
const b = await launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto(FILE); await page.waitForSelector('.pic'); await page.waitForTimeout(1500);
const gallery = await page.screenshot();
await page.locator('#grid .pic').first().click(); await page.waitForTimeout(1500);
const play = await page.screenshot();
const icon = (await png(svg(110), 200)).toString('base64');
const p2 = await (await b.newContext({ viewport: { width: 1200, height: 630 } })).newPage();
const img = (buf, css) => `<img src="data:image/png;base64,${buf.toString('base64')}" style="position:absolute;border-radius:22px;border:8px solid #fff;box-shadow:0 14px 30px rgba(43,45,66,.35);${css}">`;
await p2.setContent(`<body style="margin:0;width:1200px;height:630px;position:relative;overflow:hidden;font-family:'Comic Relief','Trebuchet MS',sans-serif;background:radial-gradient(circle at 10% 0,#ffd6ea 0,transparent 45%),radial-gradient(circle at 100% 100%,#cfeaff 0,transparent 50%),#fff1d6">
${img(gallery, 'left:640px;top:48px;width:520px;transform:rotate(3deg)')}
${img(play, 'left:560px;top:300px;width:440px;transform:rotate(-4deg)')}
<img src="data:image/png;base64,${icon}" style="position:absolute;left:56px;top:50px;width:110px;border-radius:26px;box-shadow:0 8px 18px rgba(43,45,66,.3)">
<div style="position:absolute;left:56px;top:176px;font-size:92px;line-height:.95;font-weight:900;color:#5b3fe0;text-shadow:0 5px 0 #fff">Magic<br><span style="background:linear-gradient(90deg,#ff6fa5,#ffb02e,#1fb6a6,#4cc9f0);-webkit-background-clip:text;color:transparent;text-shadow:none">Colour</span></div>
<div style="position:absolute;left:58px;top:400px;font-size:34px;font-weight:700;color:#2b2d42;width:520px;line-height:1.2">Colour-by-numbers for kids</div>
<div style="position:absolute;left:56px;top:478px;display:flex;gap:10px;flex-wrap:wrap;width:540px">
${['Free', 'No ads', 'No tracking', 'Works offline'].map((t, i) => `<span style="background:${['#ff6fa5', '#ff9e2e', '#1fb6a6', '#7b5cff'][i]};color:#fff;font-weight:700;font-size:25px;padding:7px 18px;border-radius:30px;border:4px solid #fff;box-shadow:0 4px 0 rgba(43,45,66,.3)">${t}</span>`).join('')}
</div></body>`);
await p2.waitForTimeout(400);
const full = await p2.screenshot();
await b.close();
const out = await sharp(full).png({ palette: true, quality: 85, effort: 10, colours: 200 }).toBuffer();
fs.writeFileSync(pub + 'og-image.png', out);
console.log('og-image', (out.length / 1024).toFixed(0) + ' KB');
