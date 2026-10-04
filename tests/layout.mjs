// Home-screen layout test: the picture grid must be the focus on every phone size. Screenshots -> /workspace/magic-colour-screens/layout-*.png
import { launch, FILE, SHOTS } from './launch.mjs';
import { test, done, assert } from './harness.mjs';

const browser = await launch();
// [name, w, h, touch, phonePortrait]
const VIEWPORTS = [
  ['360x640', 360, 640, true, true],
  ['360x560-chrome', 360, 560, true, true],
  ['320x568', 320, 568, true, true],
  ['390x844', 390, 844, true, true],
  ['412x915', 412, 915, true, true],
  ['430x932', 430, 932, true, true],
  ['844x390-landscape', 844, 390, true, false],
  ['640x360-landscape', 640, 360, true, false],
  ['tablet-768x1024', 768, 1024, true, false],
  ['desktop-1280x800', 1280, 800, false, false],
];
const measure = (page) => page.evaluate(() => {
  const R = (el) => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
  const q = (s) => document.querySelector(s);
  const vis = (el) => el && !el.hidden && el.getClientRects().length > 0;
  const cards = [...document.querySelectorAll('#grid .pic')].map((c) => ({ id: c.dataset.id, ...R(c), img: R(c.querySelector('img')) }));
  const rowTops = [...new Set(cards.map((c) => Math.round(c.t)))].sort((a, b) => a - b);
  const header = R(q('#home .top')), filters = R(q('#filters'));
  const strips = vis(q('#strips')) ? R(q('#strips')) : null;
  const scroller = q('#hscroll');
  const touchTargets = [...document.querySelectorAll('#home .top button, #types .type')].map((b) => ({ n: b.id || b.dataset.type, ...R(b) }));
  const chips = [...document.querySelectorAll('#catChips .chip, #diffChips .chip')].map(R);
  const names = ['#home .top', '#filters', '#strips', '#grid'].map((s) => [s, q(s)]).filter(([, e]) => vis(e)).map(([s, e]) => [s, R(e)]);
  return {
    iw: innerWidth, ih: innerHeight, sw: document.documentElement.scrollWidth, cards, rowTops, header, filters, strips,
    topBlockBottom: Math.max(header.b, filters.b), scrollerTop: R(scroller).t, scrollerScrolls: scroller.scrollHeight > scroller.clientHeight,
    cols: new Set(cards.map((c) => Math.round(c.l))).size, touchTargets, chips, names,
    chipsOk: [...document.querySelectorAll('#catChips, #diffChips')].every((c) => c.scrollWidth >= c.clientWidth),
    bodyScroll: document.documentElement.scrollHeight > innerHeight + 1,
  };
});

for (const [name, w, h, touch, portraitPhone] of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: touch ? 2 : 1, hasTouch: touch, isMobile: touch });
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(FILE); await page.waitForSelector('#grid .pic');
  await page.evaluate(() => { const m = window.__MC; const p = m.pictures.find((x) => x.id === 'sunny-flower') || m.pictures.find((x) => !x.grid); const ids = []; for (let i = 0; i < p.regions.length && ids.length < 4; i++) if (p.regions[i][0] > 0) ids.push(i); m.store.saveProgress(p.id, { f: ids, s: 1 }); m.settings.lastId = p.id; m.store.saveSettings(m.settings); m.renderContinue(); });
  await page.waitForTimeout(200);

  await test(`${name}: grid is the focus of the home screen (Continue + Picture of the day both showing)`, async () => {
    const m = await measure(page);
    assert.ok(m.strips && !(await page.$eval('#potd', (e) => e.hidden)) && !(await page.$eval('#continue', (e) => e.hidden)), 'both strips visible for the worst case');
    assert.ok(m.sw <= m.iw && !m.bodyScroll, 'no page overflow / only the picture area scrolls');
    assert.ok(m.scrollerScrolls, 'picture area scrolls on its own');
    assert.ok(m.header.t >= 0 && m.header.b <= m.topBlockBottom + 1 && m.topBlockBottom < m.scrollerTop + 1, 'header and filters stay above the scrolling area');
    const first = m.rowTops[0], lim = w > h && h < 520 ? 0.4 : 0.35; // short landscape phones keep the whole top block + Continue/Picture-of-the-day strips in ~40%
    assert.ok(first < m.ih * lim, `first grid row starts at ${first}px = ${(100 * first / m.ih).toFixed(0)}% of ${m.ih}`);
    assert.ok(m.topBlockBottom < m.ih * 0.3 || !portraitPhone && m.topBlockBottom < m.ih * 0.34, `fixed top block ${m.topBlockBottom}px = ${(100 * m.topBlockBottom / m.ih).toFixed(0)}% of height`);
    if (portraitPhone) {
      assert.equal(m.cols, 2, '2 columns of larger thumbnails on phones, got ' + m.cols);
      const rows = [...new Set(m.cards.map((c) => Math.round(c.t)))].sort((a, b) => a - b);
      const second = m.cards.filter((c) => Math.round(c.t) === rows[1]);
      assert.ok(second.length === 2 && second.every((c) => c.img.b <= m.ih), `2 full rows of thumbnails visible without scrolling (row 2 thumbnail bottom ${second.map((c) => Math.round(c.img.b))} <= ${m.ih})`);
      assert.ok(m.cards[0].img.w >= (w - 40) / 2 - 20, 'thumbnails stay large: ' + m.cards[0].img.w);
    } else {
      assert.ok(m.cols >= 3, '3+ columns on wide / landscape screens, got ' + m.cols);
    }
    // no overlap: header/filters/strips/grid cards are vertically ordered; cards do not overlap each other or the fixed top block
    for (let i = 0; i < m.cards.length; i++) {
      const a = m.cards[i];
      if (a.t < m.scrollerTop && a.b > m.scrollerTop) continue; // clipped by the scroll area, never drawn over the header
      for (let j = i + 1; j < m.cards.length; j++) { const b = m.cards[j]; const ox = Math.min(a.r, b.r) - Math.max(a.l, b.l), oy = Math.min(a.b, b.b) - Math.max(a.t, b.t); assert.ok(!(ox > 1 && oy > 1), `cards overlap ${a.id}/${b.id}`); }
    }
    const rects = await page.evaluate(() => ['#catChips', '#diffChips', '#continue', '#potd', '#types'].map((s) => { const e = document.querySelector(s); const r = e.getBoundingClientRect(); return [s, !e.hidden && r.height > 0, r.left, r.top, r.right, r.bottom]; }).filter((x) => x[1]));
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) { const a = rects[i], b = rects[j]; const ox = Math.min(a[4], b[4]) - Math.max(a[2], b[2]), oy = Math.min(a[5], b[5]) - Math.max(a[3], b[3]); assert.ok(!(ox > 1 && oy > 1), `overlap ${a[0]} / ${b[0]}`); }
    await page.screenshot({ path: `${SHOTS}/layout-${name}.png` });
  });

  await test(`${name}: touch targets, header controls and all features present`, async () => {
    const m = await measure(page);
    for (const t of m.touchTargets) { assert.ok(t.l >= 0 && t.r <= m.iw + 0.5, t.n + ' on screen'); assert.ok(t.h >= 44 && t.w >= 44, `${t.n} touch target ${t.w}x${t.h}`); }
    for (const id of ['hSurprise', 'hGallery', 'hSound']) assert.ok(await page.$eval('#' + id, (e) => e.getBoundingClientRect().width > 0), id + ' visible');
    assert.ok(m.chips.length >= 8 && m.chips.every((c) => c.h >= 28), 'filter chips present and tappable (hit area extends beyond the drawn chip)');
    const counts = await page.$$eval('#types small', (e) => e.map((x) => +x.textContent)); assert.ok(counts.length === 2 && counts.every((n) => n > 5), 'picture counts shown ' + counts);
    const potd = await page.$eval('#potd .potd-label', (e) => ({ t: e.textContent, clipped: e.scrollWidth > e.clientWidth + 1 })); assert.ok(/Picture of the day/.test(potd.t));
    // scrolling the grid keeps the header and filters in place
    const before = await page.$eval('#home .top', (e) => e.getBoundingClientRect().top);
    await page.evaluate(() => { document.querySelector('#hscroll').scrollTop = 500; });
    const after = await page.$eval('#home .top', (e) => e.getBoundingClientRect().top); assert.equal(after, before, 'header sticky while the grid scrolls');
    const chipTop = await page.$eval('#catChips', (e) => e.getBoundingClientRect().top); assert.ok(chipTop < h * 0.2, 'filters stay visible');
    await page.evaluate(() => { document.querySelector('#hscroll').scrollTop = 0; });
    // tapping a chip through its extended hit area filters; Surprise + Gallery + Sound still work
    if (touch) await page.locator('#catChips [data-cat="space"]').tap(); else await page.click('#catChips [data-cat="space"]');
    const sp = await page.$$eval('#grid .pic', (e) => e.length); assert.ok(sp >= 2 && sp < 40, 'category filter works ' + sp);
    await page.click('#catChips [data-cat="all"]');
    const snd = await page.evaluate(() => window.__MC.settings.sound); await page.click('#hSound'); assert.equal(await page.evaluate(() => window.__MC.settings.sound), !snd); await page.click('#hSound');
    await page.click('#hGallery'); await page.waitForSelector('#gallery.on'); await page.screenshot({ path: `${SHOTS}/layout-${name}-gallery.png` }); await page.click('#gBack'); await page.waitForSelector('#home.on');
    await page.click('#types [data-type="grid"]'); const m2 = await measure(page); assert.ok(m2.rowTops[0] < h * (w > h && h < 520 ? 0.4 : 0.35), 'Grid type: first row also near the top');
    await page.screenshot({ path: `${SHOTS}/layout-${name}-grid.png` });
    await page.click('#types [data-type="shapes"]');
    assert.deepEqual(errors, []);
  });
  await ctx.close();
}
await browser.close();
done('layout tests');
