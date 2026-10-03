// localStorage persistence (per picture progress, finished pictures, settings). Safe if storage is unavailable.
const P = 'mc1.';
let mem = {};
const ls = (() => { try { const k = '__t'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return localStorage; } catch (e) { return null; } })();
const get = (k) => { try { const v = ls ? ls.getItem(P + k) : mem[k]; return v ? JSON.parse(v) : null; } catch (e) { return null; } };
const set = (k, v) => { try { const s = JSON.stringify(v); if (ls) ls.setItem(P + k, s); else mem[k] = s; } catch (e) { /* storage full */ } };
const del = (k) => { try { if (ls) ls.removeItem(P + k); else delete mem[k]; } catch (e) { /* ignore */ } };
export const store = {
  settings() { return Object.assign({ mode: 'magic', sound: true }, get('settings') || {}); },
  saveSettings(s) { set('settings', s); },
  progress(id) { return get('p.' + id); },
  saveProgress(id, data) { set('p.' + id, data); },
  clearProgress(id) { del('p.' + id); },
  done() { return get('done') || {}; },
  markDone(id) { const d = store.done(); d[id] = d[id] || Date.now(); set('done', d); },
  unmarkDone(id) { const d = store.done(); delete d[id]; set('done', d); },
  pct(id, total) { const p = get('p.' + id); if (!p) return 0; return total ? Math.min(1, p.f.length / total) : 0; },
};
