// Cute WebAudio sounds (no files). Created lazily on first user gesture; mute toggle supported.
let ctx = null, muted = false, master = null;
const PENTA = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.5, 1568.0, 1760.0, 2093.0];
function ensure() {
  if (muted) return null;
  if (!ctx) { try { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination); } catch (e) { return null; } }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}
function tone(freq, t0, dur, { type = 'sine', vol = 0.25, slide = 0, attack = 0.008 } = {}) {
  const c = ensure(); if (!c) return;
  const t = c.currentTime + t0, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
}
/** Gentle haptic ticks (Android: navigator.vibrate; silently does nothing elsewhere). Follows the sound switch: muted = no buzzing. */
let lastBuzz = 0;
function buzz(pattern, gap = 0) {
  if (muted || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  const now = Date.now(); if (now - lastBuzz < gap) return; lastBuzz = now;
  try { navigator.vibrate(pattern); } catch (e) { /* not allowed (no user gesture yet) */ }
}
const BUZZ = { fill: [12, 60], magic: [[14, 40, 14], 120], brush: [8, 220], done: [[18, 50, 18], 0], win: [[30, 70, 30, 70, 60], 0] };
export const audio = {
  /** haptic(kind): 'fill' | 'magic' | 'brush' (throttled) | 'done' (a colour finished) | 'win' */
  haptic(kind) { const b = BUZZ[kind]; if (b) buzz(b[0], b[1]); },
  unlock() { ensure(); },
  setMuted(m) { muted = m; if (m && ctx && ctx.state === 'running') ctx.suspend().catch(() => {}); },
  isMuted: () => muted,
  tap() { tone(660, 0, 0.07, { type: 'triangle', vol: 0.12 }); },
  select(c) { const f = PENTA[(c - 1) % PENTA.length]; tone(f, 0, 0.16, { type: 'sine', vol: 0.22 }); tone(f * 2, 0.05, 0.12, { type: 'sine', vol: 0.08 }); },
  fill(c) { const f = PENTA[((c || 1) - 1) % PENTA.length]; tone(f, 0, 0.18, { type: 'triangle', vol: 0.2, slide: 1.25 }); tone(f * 1.5, 0.06, 0.14, { type: 'sine', vol: 0.1 }); },
  magic(c, count = 3) { const base = PENTA[((c || 1) - 1) % PENTA.length]; const n = Math.min(7, 3 + Math.floor(count / 3)); for (let i = 0; i < n; i++) tone(base * Math.pow(2, [0, 4, 7, 12, 16, 19, 24][i] / 12), i * 0.055, 0.22, { type: 'sine', vol: 0.15 }); tone(base * 4, n * 0.055, 0.35, { type: 'triangle', vol: 0.06 }); },
  wrong() { tone(300, 0, 0.18, { type: 'sine', vol: 0.12, slide: 0.75 }); tone(250, 0.1, 0.18, { type: 'sine', vol: 0.08, slide: 0.8 }); },
  /** soft little sparkle for the paint brush (call sites throttle it) */
  sparkle(c, n = 1) { const f = PENTA[(((c || 1) - 1) + 5) % PENTA.length] * 2; tone(f, 0, 0.14, { type: 'sine', vol: 0.07 }); if (n > 2) tone(f * 1.5, 0.05, 0.12, { type: 'sine', vol: 0.045 }); },
  /** very quiet "not that number" cue for the brush */
  nudge() { tone(330, 0, 0.12, { type: 'sine', vol: 0.05, slide: 0.85 }); },
  done() { [0, 4, 7, 12].forEach((s, i) => tone(523.25 * Math.pow(2, s / 12), i * 0.07, 0.25, { type: 'triangle', vol: 0.17 })); },
  undo() { tone(520, 0, 0.1, { type: 'triangle', vol: 0.14, slide: 0.6 }); },
  hint() { tone(880, 0, 0.12, { type: 'sine', vol: 0.15 }); tone(1174.66, 0.1, 0.2, { type: 'sine', vol: 0.15 }); },
  win() { const seq = [0, 4, 7, 12, 7, 12, 16, 19, 24]; seq.forEach((s, i) => tone(392 * Math.pow(2, s / 12), i * 0.11, 0.4, { type: 'triangle', vol: 0.2 })); for (let i = 0; i < 12; i++) tone(1400 + Math.random() * 1800, 0.9 + i * 0.07, 0.18, { type: 'sine', vol: 0.05 }); },
};
