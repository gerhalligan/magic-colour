// Generates PWA icons into public/ (run once; committed).
import sharp from 'sharp';
const svg = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="${pad ? 0 : 110}" fill="#7b5cff"/><g transform="translate(256 256) scale(${pad ? 0.8 : 1}) translate(-256 -256)"><circle cx="180" cy="190" r="82" fill="#ffd93d"/><circle cx="332" cy="190" r="82" fill="#ff6fa5"/><circle cx="256" cy="330" r="82" fill="#4cc9f0"/><path d="M256 60l14 34 36 4-27 24 8 36-31-19-31 19 8-36-27-24 36-4z" fill="#fff"/><text x="256" y="372" font-family="Trebuchet MS,Arial" font-weight="900" font-size="120" text-anchor="middle" fill="#fff">1</text></g></svg>`;
await sharp(Buffer.from(svg(false))).resize(512).png().toFile('public/icon-512.png');
await sharp(Buffer.from(svg(false))).resize(192).png().toFile('public/icon-192.png');
await sharp(Buffer.from(svg(true))).resize(512).png().toFile('public/icon-maskable-512.png');
console.log('icons ok');
