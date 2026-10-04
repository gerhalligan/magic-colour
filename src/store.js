// localStorage persistence (per picture progress, finished pictures, settings). Safe if storage is unavailable.
const P = 'mc1.';
let mem = {};
const ls = (() => { try { const k = '__t'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return localStorage; } catch (e) { return null; } })();
const get = (k) => { try { const v = ls ? ls.getItem(P + k) : mem[k]; return v ? JSON.parse(v) : null; } catch (e) { return null; } };
const set = (k, v) => { try { const s = JSON.stringify(v); if (ls) ls.setItem(P + k, s); else mem[k] = s; } catch (e) { /* storage full */ } };
const del = (k) => { try { if (ls) ls.removeItem(P + k); else delete mem[k]; } catch (e) { /* ignore */ } };
export const store = {
  // Default mode is 'classic' (One by one). A saved mode is only honoured if the player really picked it (modeChosen);
  // v1.0.0 saved the old 'magic' default into settings without a choice, so those are reset to the new default.
  settings() {
    const s = Object.assign({ mode: 'classic', sound: true, brushSize: 1, type: 'shapes' }, get('settings') || {});
    if (!s.modeChosen || !['magic', 'classic', 'brush'].includes(s.mode)) s.mode = 'classic';
    s.brushSize = Math.min(3, Math.max(0, Math.round(+s.brushSize) || (s.brushSize === 0 ? 0 : 1)));
    if (s.type !== 'grid') s.type = 'shapes';
    return s;
  },
  saveSettings(s) { set('settings', s); },
  progress(id) { return get('p.' + id); },
  saveProgress(id, data) { set('p.' + id, data); },
  clearProgress(id) { del('p.' + id); },
  done() { return get('done') || {}; },
  markDone(id) { const d = store.done(); d[id] = d[id] || Date.now(); set('done', d); },
  unmarkDone(id) { const d = store.done(); delete d[id]; set('done', d); },
  pct(id, total) { const p = get('p.' + id); if (!p) return 0; return total ? Math.min(1, p.f.length / total) : 0; },
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

