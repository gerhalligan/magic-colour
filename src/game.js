// Pure game logic for one picture (no DOM): palette selection, magic brush vs one-by-one (classic) mode, undo, hint, completion, save/restore.
// In BOTH modes the player must select a colour and then tap a region of that number; magic brush then fills every region of that number at once.
export const MODE_MAGIC = 'magic';
export const MODE_CLASSIC = 'classic';

export function createGame(puzzle, { mode = MODE_CLASSIC } = {}) {
  const regions = puzzle.regions, n = regions.length, K = puzzle.palette.length;
  const filled = new Uint8Array(n);
  const byColour = Array.from({ length: K + 1 }, () => []);
  let toDo = 0;
  regions.forEach((r, i) => { if (r[0] === 0) filled[i] = 1; else { byColour[r[0]].push(i); toDo++; } });
  const doneCount = new Uint16Array(K + 1);
  const undoStack = [];
  const g = {
    puzzle, mode, selected: 0, filled, byColour, undoStack, complete: false, total: toDo, doneCount,
    colourOf: (id) => regions[id][0],
    remaining(c) { return byColour[c].length - doneCount[c]; },
    colourDone(c) { return byColour[c].length > 0 && doneCount[c] === byColour[c].length; },
    filledCount() { let c = 0; for (let c1 = 1; c1 <= K; c1++) c += doneCount[c1]; return c; },
    progress() { return toDo ? g.filledCount() / toDo : 1; },
    isComplete() { return g.filledCount() === toDo; },
    setMode(m) { g.mode = m; },
    _fill(ids, colour) {
      const done = []; for (const id of ids) if (!filled[id]) { filled[id] = 1; doneCount[colour]++; done.push(id); }
      return done;
    },
    /** Choose a palette colour. It only selects it (never fills) in every mode; the player must still tap a matching region. */
    selectColour(c) {
      if (g.complete || c < 1 || c > K) return { type: 'noop' };
      g.selected = c;
      return { type: 'select', colour: c, done: g.colourDone(c) };
    },
    _magic(c) {
      const ids = g._fill(byColour[c], c);
      if (ids.length) undoStack.push({ ids, colour: c });
      return g._result('fill', ids, c, true);
    },
    _result(type, ids, c, magic) {
      const complete = g.isComplete(); if (complete) g.complete = true;
      return { type, ids, colour: c, magic: !!magic, colourDone: g.colourDone(c), complete };
    },
    /** Tap a region. Right number (with that colour selected) = fills (all regions of that number in magic mode, just that region in one-by-one). Wrong number = gentle hint, never a penalty. */
    tapRegion(id) {
      if (g.complete || id < 0 || id >= n) return { type: 'noop' };
      const want = regions[id][0];
      if (want === 0) return { type: 'paper' };
      if (filled[id]) return { type: 'already', id, colour: want };
      const sel = g.selected;
      // nothing selected, or the selected colour is finished: just pick this region's colour (friendly); the next tap paints
      if (sel === 0 || g.colourDone(sel)) {
        g.selected = want;
        return { type: 'select', colour: want, done: false, fromRegion: true, id };
      }
      if (sel !== want) return { type: 'wrong', id, want, selected: sel };
      if (g.mode === MODE_MAGIC) return g._magic(want);
      const ids = g._fill([id], want);
      undoStack.push({ ids, colour: want });
      return g._result('fill', ids, want, false);
    },
    undo() {
      if (g.complete || !undoStack.length) return null;
      const a = undoStack.pop();
      for (const id of a.ids) { filled[id] = 0; doneCount[a.colour]--; }
      g.selected = a.colour;
      return { type: 'undo', ids: a.ids, colour: a.colour };
    },
    canUndo() { return !g.complete && undoStack.length > 0; },
    /** Regions to highlight: remaining ones of the selected colour (or the next unfinished colour, which then becomes selected). */
    hint() {
      if (g.complete) return null;
      let c = g.selected;
      if (!c || g.colourDone(c)) { c = 0; let best = Infinity; for (let k = 1; k <= K; k++) { const r = g.remaining(k); if (r > 0 && r < best) { best = r; c = k; } } if (!c) return null; g.selected = c; }
      return { colour: c, ids: byColour[c].filter((i) => !filled[i]) };
    },
    save() { const ids = []; for (let i = 0; i < n; i++) if (filled[i] && regions[i][0] > 0) ids.push(i); return { f: ids, s: g.selected }; },
    restore(s) {
      if (!s || !Array.isArray(s.f)) return;
      for (const id of s.f) if (id >= 0 && id < n && regions[id][0] > 0 && !filled[id]) { filled[id] = 1; doneCount[regions[id][0]]++; }
      g.selected = s.s > 0 && s.s <= K ? s.s : 0; undoStack.length = 0;
      if (g.isComplete()) g.complete = true;
    },
    reset() { for (let i = 0; i < n; i++) filled[i] = regions[i][0] === 0 ? 1 : 0; doneCount.fill(0); undoStack.length = 0; g.complete = false; g.selected = 0; },
  };
  return g;
}

export function textColourFor(hex) {
  const r = parseInt(hex.slice(1, 3), 16), gg = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return 0.299 * r + 0.587 * gg + 0.114 * b > 150 ? '#2b2d42' : '#ffffff';
}
