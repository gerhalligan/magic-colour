// Render the finished picture (true colours) to a canvas / PNG blob for saving + sharing.
import { mapOf, hexToRgb, rgb32 } from './codec.js';
export function renderFinal(puzzle, size = 1080, { caption = true, outline = true } = {}) {
  const { w, h } = puzzle, map = mapOf(puzzle);
  const fc = document.createElement('canvas'); fc.width = w; fc.height = h; const fx = fc.getContext('2d'), img = fx.createImageData(w, h), i32 = new Uint32Array(img.data.buffer);
  const pal = puzzle.palette.map((c) => { const [r, g, b] = hexToRgb(c); return rgb32(r, g, b); });
  const rc = puzzle.regions.map((r) => (r[0] > 0 ? pal[r[0] - 1] : rgb32(255, 255, 255)));
  for (let p = 0; p < map.length; p++) i32[p] = rc[map[p]];
  fx.putImageData(img, 0, 0);
  const pad = Math.round(size * 0.05), cap = caption ? Math.round(size * 0.07) : 0, W = size + pad * 2, H = size + pad * 2 + cap;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
  c.fillStyle = '#fffaf0'; c.fillRect(0, 0, W, H);
  const k = size / Math.max(w, h), ox = pad + (size - w * k) / 2, oy = pad + (size - h * k) / 2;
  c.save(); c.translate(ox, oy); c.scale(k, k); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; c.drawImage(fc, 0, 0);
  if (outline) { c.strokeStyle = '#3b3f58'; c.lineWidth = 1.6; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(new Path2D(puzzle.outline)); c.strokeRect(0, 0, w, h); }
  c.restore();
  if (caption) {
    c.fillStyle = '#6a5acd'; c.font = `800 ${Math.round(cap * 0.55)}px "Trebuchet MS", system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('\u2728 ' + puzzle.name + ' \u2013 coloured with Magic Colour \u2728', W / 2, H - cap / 2 - pad * 0.15);
  }
  return cv;
}
export function canvasToBlob(cv) { return new Promise((res) => cv.toBlob((b) => res(b), 'image/png')); }
export async function saveOrShare(puzzle, share) {
  const cv = renderFinal(puzzle, 1080), blob = await canvasToBlob(cv), name = 'magic-colour-' + puzzle.id + '.png';
  if (share && navigator.canShare && typeof File !== 'undefined') {
    try { const file = new File([blob], name, { type: 'image/png' }); if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: puzzle.name, text: 'I coloured ' + puzzle.name + ' in Magic Colour!' }); return 'shared'; } } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
  }
  const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000); return 'saved';
}
export const canShareFiles = () => { try { return !!(navigator.canShare && typeof File !== 'undefined' && navigator.canShare({ files: [new File([new Blob(['x'])], 'a.png', { type: 'image/png' })] })); } catch (e) { return false; } };
