// localStorage persistence (per picture progress, finished pictures, settings). Safe if storage is unavailable.
const P = 'mc1.';
let mem = {};
const ls = (() => { try { const k = '__t'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return localStorage; } catch (e) { return null; } })();
const get = (k) => { try { const v = ls ? ls.getItem(P + k) : mem[k]; return v ? JSON.parse(v) : null; } catch (e) { return null; } };
const set = (k, v) => { try { const s = JSON.stringify(v); if (ls) ls.setItem(P + k, s); else mem[k] = s; } catch (e) { /* storage full */ } };
const del = (k) => { try { if (ls) ls.removeItem(P + k); else delete mem[k]; } catch (e) { /* ignore */ } };
/** big grid pictures can have 10 000+ filled cells: save the filled ids as ranges ("5-90,100,102-4000") instead of a huge number list */
const pack = (ids) => { const a = [...ids].sort((x, y) => x - y), out = []; for (let i = 0; i < a.length;) { let j = i; while (j + 1 < a.length && a[j + 1] === a[j] + 1) j++; out.push(j > i ? a[i] + '-' + a[j] : '' + a[i]); i = j + 1; } return out.join(','); };
const unpack = (s) => { const out = []; for (const part of s.split(',')) { if (!part) continue; const [a, b] = part.split('-').map(Number); if (!(a >= 0)) continue; for (let k = a; k <= (b >= a ? b : a); k++) out.push(k); } return out; };
export const store = {
  // Default mode is 'classic' (One by one). A saved mode is only honoured if the player really picked it (modeChosen);
  // v1.0.0 saved the old 'magic' default into settings without a choice, so those are reset to the new default.
  settings() {
    const s = Object.assign({ mode: 'classic', sound: true, brushSize: 0, type: 'shapes' }, get('settings') || {});
    if (!s.modeChosen || !['magic', 'classic', 'brush'].includes(s.mode)) s.mode = 'classic';
    // default brush = smallest; an earlier auto-saved default (v1.5.0 saved 'medium' without a choice) is reset, a real choice (brushChosen) is kept
    s.brushSize = s.brushChosen ? Math.min(3, Math.max(0, Math.round(+s.brushSize) || 0)) : 0;
    if (s.type !== 'grid') s.type = 'shapes';
    return s;
  },
  saveSettings(s) { set('settings', s); },
  progress(id) { const p = get('p.' + id); return p && typeof p.fr === 'string' ? Object.assign({}, p, { f: unpack(p.fr), fr: undefined }) : p; },
  saveProgress(id, data) { set('p.' + id, data && data.f && data.f.length > 200 ? { s: data.s, fr: pack(data.f) } : data); },
  clearProgress(id) { del('p.' + id); },
  done() { return get('done') || {}; },
  markDone(id) { const d = store.done(); d[id] = d[id] || Date.now(); set('done', d); },
  unmarkDone(id) { const d = store.done(); delete d[id]; set('done', d); },
  pct(id, total) { const p = store.progress(id); if (!p || !p.f) return 0; return total ? Math.min(1, p.f.length / total) : 0; },
  /** Category stickers earned by finishing pictures (local only). */
  stickers() { return get('stickers') || {}; },
  /** Award the sticker for a category. Returns { cat, emoji, fresh } where fresh means newly earned. */
  earnSticker(cat) {
    if (!cat) return null;
    const s = store.stickers();
    const fresh = !s[cat];
    if (fresh) { s[cat] = Date.now(); set('stickers', s); }
    return { cat, fresh, at: s[cat] };
  },
};

