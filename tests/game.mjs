// Game logic: magic brush vs classic mode, wrong taps, undo, hints, completion, save/restore.
import { test, done, assert } from './harness.mjs';
import { createGame, MODE_MAGIC, MODE_CLASSIC } from '../src/game.js';

// regions: [colour, lx, ly, r, area]; colour 0 = paper (pre-filled)
const puzzle = () => ({ id: 't', palette: ['#ff0000', '#00ff00', '#0000ff'], regions: [[0, 0, 0, 9, 9], [1, 1, 1, 9, 9], [1, 2, 2, 9, 9], [2, 3, 3, 9, 9], [1, 4, 4, 9, 9], [3, 5, 5, 9, 9], [2, 6, 6, 9, 9]] });

console.log('game logic');
await test('setup: paper is pre-filled, totals per colour', () => {
  const g = createGame(puzzle()); assert.equal(g.total, 6); assert.equal(g.filled[0], 1); assert.equal(g.filledCount(), 0);
  assert.equal(g.remaining(1), 3); assert.equal(g.remaining(2), 2); assert.equal(g.remaining(3), 1);
});
await test('default mode is One by one (classic)', () => { assert.equal(createGame(puzzle()).mode, MODE_CLASSIC); });
await test('MAGIC: selecting colour N only selects it - nothing is filled by the palette alone', () => {
  const g = createGame(puzzle(), { mode: MODE_MAGIC }); const r = g.selectColour(1);
  assert.equal(r.type, 'select'); assert.equal(g.selected, 1); assert.equal(g.filledCount(), 0); assert.equal(g.undoStack.length, 0);
  for (let c = 1; c <= 3; c++) { assert.equal(g.selectColour(c).type, 'select'); assert.equal(g.filledCount(), 0); }
});
await test('MAGIC: tapping a region with the correct colour selected colours ALL regions of that number at once', () => {
  const g = createGame(puzzle(), { mode: MODE_MAGIC }); g.selectColour(1); const r = g.tapRegion(2);
  assert.equal(r.type, 'fill'); assert.deepEqual(r.ids.sort(), [1, 2, 4]); assert.ok(r.colourDone); assert.ok(r.magic);
  assert.deepEqual([1, 2, 4].map((i) => g.filled[i]), [1, 1, 1]); assert.equal(g.filled[3], 0);
});
await test('MAGIC: wrong colour tap = gentle wrong result, nothing changes', () => {
  const g = createGame(puzzle(), { mode: MODE_MAGIC }); g.selectColour(2);
  const r = g.tapRegion(1); assert.equal(r.type, 'wrong'); assert.equal(r.want, 1); assert.equal(g.filledCount(), 0); assert.equal(g.selected, 2); assert.equal(g.undoStack.length, 0);
});
await test('MAGIC: tapping a region with nothing selected just selects its colour; a second tap then fills all', () => {
  const g = createGame(puzzle(), { mode: MODE_MAGIC }); let r = g.tapRegion(3);
  assert.equal(r.type, 'select'); assert.equal(r.colour, 2); assert.equal(g.selected, 2); assert.equal(g.filledCount(), 0);
  r = g.tapRegion(3); assert.equal(r.type, 'fill'); assert.deepEqual(r.ids.sort(), [3, 6]);
});
await test('CLASSIC: selecting a colour only selects; each region must be tapped', () => {
  const g = createGame(puzzle(), { mode: MODE_CLASSIC }); let r = g.selectColour(1);
  assert.equal(r.type, 'select'); assert.equal(g.filledCount(), 0);
  r = g.tapRegion(1); assert.equal(r.type, 'fill'); assert.deepEqual(r.ids, [1]); assert.ok(!r.magic); assert.equal(g.filledCount(), 1); assert.ok(!r.colourDone);
  g.tapRegion(2); r = g.tapRegion(4); assert.ok(r.colourDone); assert.equal(g.filledCount(), 3);
});
await test('CLASSIC: wrong colour = gentle "wrong" result, nothing changes, no penalty', () => {
  const g = createGame(puzzle(), { mode: MODE_CLASSIC }); g.selectColour(2);
  const r = g.tapRegion(1); assert.equal(r.type, 'wrong'); assert.equal(r.want, 1); assert.equal(g.filledCount(), 0); assert.equal(g.selected, 2);
  assert.equal(g.undoStack.length, 0);
});
await test('CLASSIC: tapping a region with no colour picked selects its colour (friendly), without filling', () => {
  const g = createGame(puzzle(), { mode: MODE_CLASSIC }); const r = g.tapRegion(5);
  assert.equal(r.type, 'select'); assert.equal(r.colour, 3); assert.equal(g.filledCount(), 0);
  assert.equal(g.tapRegion(5).type, 'fill');
});
await test('CLASSIC: after a colour is finished, tapping another colour region switches colour instead of scolding', () => {
  const g = createGame(puzzle(), { mode: MODE_CLASSIC }); g.selectColour(3); g.tapRegion(5);
  const r = g.tapRegion(1); assert.equal(r.type, 'select'); assert.equal(g.selected, 1);
});
await test('already filled and paper regions are harmless', () => {
  const g = createGame(puzzle(), { mode: MODE_CLASSIC }); g.selectColour(1); g.tapRegion(1);
  assert.equal(g.tapRegion(1).type, 'already'); assert.equal(g.tapRegion(0).type, 'paper'); assert.equal(g.tapRegion(99).type, 'noop');
});
await test('undo reverts the last action (whole colour in magic, single region in classic)', () => {
  let g = createGame(puzzle(), { mode: MODE_MAGIC }); g.selectColour(1); g.tapRegion(1); g.selectColour(2); g.tapRegion(3);
  let u = g.undo(); assert.equal(u.colour, 2); assert.equal(g.remaining(2), 2); assert.equal(g.remaining(1), 0);
  u = g.undo(); assert.equal(g.remaining(1), 3); assert.equal(g.undo(), null);
  g = createGame(puzzle(), { mode: MODE_CLASSIC }); g.selectColour(1); g.tapRegion(1); g.tapRegion(2); g.undo(); assert.equal(g.filledCount(), 1); assert.ok(g.canUndo());
});
await test('mode can be switched mid-picture', () => {
  const g = createGame(puzzle(), { mode: MODE_CLASSIC }); g.selectColour(1); g.tapRegion(1); g.setMode(MODE_MAGIC);
  g.selectColour(2); assert.equal(g.filledCount(), 1); const r = g.tapRegion(3); assert.equal(r.type, 'fill'); assert.equal(r.ids.length, 2);
  g.setMode(MODE_CLASSIC); g.selectColour(1); g.tapRegion(2); assert.equal(g.remaining(1), 1);
});
await test('hint lists remaining regions of the selected colour; with no selection it picks the next colour', () => {
  const g = createGame(puzzle(), { mode: MODE_CLASSIC }); g.selectColour(1); g.tapRegion(1);
  let h = g.hint(); assert.equal(h.colour, 1); assert.deepEqual(h.ids, [2, 4]);
  const g2 = createGame(puzzle(), { mode: MODE_CLASSIC }); h = g2.hint(); assert.equal(h.colour, 3); assert.equal(g2.selected, 3); assert.deepEqual(h.ids, [5]);
});
await test('completion is detected exactly when the last region is filled; actions then stop', () => {
  const g = createGame(puzzle(), { mode: MODE_CLASSIC }); let last;
  for (const [c, ids] of [[1, [1, 2, 4]], [2, [3, 6]], [3, [5]]]) { g.selectColour(c); for (const i of ids) { assert.ok(!g.complete); last = g.tapRegion(i); } }
  assert.ok(last.complete && g.complete && g.isComplete()); assert.equal(g.progress(), 1);
  assert.equal(g.tapRegion(1).type, 'noop'); assert.equal(g.undo(), null); assert.equal(g.hint(), null);
});
await test('magic mode completes in two taps per colour (select + one region tap)', () => {
  const g = createGame(puzzle(), { mode: MODE_MAGIC }); let r; for (const [c, id] of [[1, 1], [2, 3], [3, 5]]) { g.selectColour(c); r = g.tapRegion(id); } assert.ok(r.complete && g.complete);
});
await test('save / restore round trip (JSON), including a finished picture', () => {
  const g = createGame(puzzle(), { mode: MODE_CLASSIC }); g.selectColour(1); g.tapRegion(1); g.tapRegion(4);
  const saved = JSON.parse(JSON.stringify(g.save()));
  const g2 = createGame(puzzle()); g2.restore(saved);
  assert.equal(g2.filledCount(), 2); assert.equal(g2.selected, 1); assert.equal(g2.filled[1], 1); assert.equal(g2.filled[2], 0); assert.equal(g2.remaining(1), 1);
  const g3 = createGame(puzzle(), { mode: MODE_MAGIC }); [[1, 1], [2, 3], [3, 5]].forEach(([c, id]) => { g3.selectColour(c); g3.tapRegion(id); });
  const g4 = createGame(puzzle()); g4.restore(JSON.parse(JSON.stringify(g3.save()))); assert.ok(g4.complete);
});
await test('restore ignores garbage safely', () => {
  const g = createGame(puzzle()); g.restore(null); g.restore({ f: [999, -1, 0, 'x'], s: 77 }); assert.equal(g.filledCount(), 0); assert.equal(g.selected, 0);
});
await test('selecting an invalid or finished colour never fills twice', () => {
  const g = createGame(puzzle(), { mode: MODE_MAGIC }); g.selectColour(1); g.tapRegion(1); assert.equal(g.tapRegion(1).type, 'already'); assert.equal(g.selectColour(1).done, true); assert.equal(g.selectColour(9).type, 'noop'); assert.equal(g.filledCount(), 3);
});
done('game tests');
