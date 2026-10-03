// Full-screen confetti burst on its own canvas (pointer-events: none).
export function confetti(canvas, ms = 4200) {
  const ctx = canvas.getContext('2d'); const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = canvas.width = Math.round(innerWidth * dpr), H = canvas.height = Math.round(innerHeight * dpr);
  const cols = ['#ff5d8f', '#ffd93d', '#4cc9f0', '#8ac926', '#b983ff', '#ff9f1c', '#ffffff'];
  const ps = []; const N = Math.min(220, Math.round(innerWidth / 5));
  for (let i = 0; i < N; i++) {
    const left = i % 2; ps.push({ x: (left ? 0.1 : 0.9) * W, y: H * 0.75, vx: (left ? 1 : -1) * (300 + Math.random() * 700) * dpr, vy: -(900 + Math.random() * 900) * dpr, r: (5 + Math.random() * 7) * dpr, c: cols[(Math.random() * cols.length) | 0], a: Math.random() * 6.28, va: (Math.random() - 0.5) * 14, sh: Math.random() < 0.3 ? 'c' : 'r', t: Math.random() * 0.25 });
  }
  const t0 = performance.now(); let last = t0, stop = false;
  const tick = (now) => {
    const dt = Math.min(0.04, (now - last) / 1000); last = now; ctx.clearRect(0, 0, W, H);
    const age = now - t0; let alive = 0;
    for (const p of ps) {
      if (age / 1000 < p.t) { alive++; continue; }
      p.vy += 1600 * dpr * dt; p.vx *= 0.992; p.x += p.vx * dt; p.y += p.vy * dt; p.a += p.va * dt;
      if (p.y < H + 40) alive++;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.globalAlpha = Math.max(0, Math.min(1, 1 - (age - ms + 800) / 800));
      if (p.sh === 'c') { ctx.beginPath(); ctx.arc(0, 0, p.r * 0.6, 0, 6.28); ctx.fill(); } else ctx.fillRect(-p.r, -p.r * 0.45, p.r * 2, p.r * 0.9);
      ctx.restore();
    }
    if (!stop && alive && age < ms) requestAnimationFrame(tick); else ctx.clearRect(0, 0, W, H);
  };
  requestAnimationFrame(tick);
  return () => { stop = true; };
}
