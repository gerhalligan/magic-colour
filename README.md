# Magic Colour ✨

Ad-free colour-by-numbers for young children (≈4–9). No ads, no tracking, no network calls at runtime, works offline.

* **Play**: open `dist-single/Magic-Colour.html` (one self-contained file), or the GitHub Pages build (installable PWA).
* **Two kinds of pictures** (big switch at the top of the home screen, each with its own categories and levels):
  * **Shapes** – the original irregular-region pictures (animals, unicorns, dinosaurs, …).
  * **Grid** – pixel-art style pictures made of square numbered cells (16×16 easy … 50×50 hard, plus an **Epic ★★★★ tier of 70×70 … 120×120 full-page scenes**): heart, rainbow, unicorn, cat, dog, rocket, robot, castle, T-rex, dinosaur and more. Uncoloured squares are grey, the picture appears as you colour.
* **Three colouring modes** (top bar, big icons, work on both kinds):
  * **Magic** – pick a colour, then tap **one** area with that number: *every* area with that number is coloured at once. (Picking a colour in the palette only selects it and softly glows the matching spots; it never fills anything.)
  * **One by one** (default) – pick a colour, then tap each area yourself.
  * **Brush** – pick a colour, then **drag** a finger/mouse across the picture like painting. The brush colours **only** the areas it passes over that have the selected number (other numbers are untouched; a gentle, throttled wiggle shows when you brush over a different number). Brush size: 4 big buttons (small/medium/large/huge) with a circle preview; the radius grows gently when you zoom in. A whole stroke is one undo step. Keys: `[` / `]` change brush size.
* **Zoom & pan**: pinch / two-finger drag on touch (one finger paints in Brush mode, pans in the other modes); on desktop mouse wheel zooms, and in Brush mode hold **Space** + drag, or **right/middle-button drag**, to pan (left-drag paints).
* Wrong number? A gentle wiggle and a hint, never a penalty.
* Hint, undo, auto-save per picture, celebration + category stickers, "My gallery", save/share PNG, cute WebAudio sounds (soft sparkle while brushing, throttled) with mute.

## Develop

```bash
npm install
npm run pictures   # (re)generate the procedural source art + convert all pictures to puzzles (src/pictures/*.json)
npm test           # unit + picture validation + build + headless-browser smoke tests (screenshots -> /workspace/magic-colour-screens/)
npm run build      # vite -> dist/app.js, tools/inline.mjs -> dist-single/Magic-Colour.html (+ docs/ for GitHub Pages, + /workspace/magic-colour-share/)
```

Brush: the **smallest** size is the default; a size the player picks is remembered (`brushChosen` in settings).

Layout: `src/` game (`game.js` pure logic, `brush.js` brush radius / stroke interpolation / hit-testing, `view.js` canvas + gestures, `main.js` UI, `audio.js`, `export.js`, `confetti.js`), `tools/` picture pipeline, `art/` source images + manifest + thumbnails, `tests/`, `docs/` Pages build, `public/` PWA files.

## Guidance for the scheduled routine: make pictures BIGGER and LONGER

Gerard's daughter finishes small pictures too quickly. **Future runs should add bigger, more detailed pictures, not more small ones**:

* Prefer **Epic grid pictures** (60×60 up to 120×120, full-page scenes, 16–24 colours, 4 900–14 400 squares) – the Epic tier already has 14 (unicorn castle, rainbow valley, fire dragon, coral reef, galaxy voyage, jungle friends, grand mandala, city lights, happy farm, fairy garden, snowy village, pirate bay, dino valley, candy land). Add new ones to `tools/art/pixel-big.mjs` (sprite helper `L(g, x, y, scale)`, `bands`, `hill`, `speckle`, `rng`; colours are reduced to 24 automatically) and run `npm run pictures`. A new Epic picture needs a **new subject and a different layout** (the duplicate test enforces it).
* For Shapes pictures aim for the top of the Hard range (about 300–420 regions; the validator limit is 420) instead of Easy ones. With AI ink-outline art, `--ink --ink-split --size 896 --k 20 --merge-de 10 --min-area 50 --min-r 4.5` roughly doubles the region count (1.10.0 pictures: 130–310 regions); simple art (big plain fields) stays lower.
* Do not add Easy/Medium pictures unless a category has none. Never re-use art at another size.
* Big grids are stored compactly (`cells` string, regions/outline rebuilt on first use), draw numbers only for squares that are on screen and zoomed enough to read, and save progress as ranges – keep it that way (the smoke test opens a 120×120 picture and checks speed, hint pan, saving and completion).

## No duplicate pictures (automatic check)

Every picture must be genuinely different: the same art re-used at a bigger size, in other colours or mirrored is **not** allowed (a "harder" version of a subject needs a new, more detailed design, or a different subject). `npm test` runs `tests/duplicates.mjs`, which renders every picture to a 40×40 signature and fails when two pictures of the same type (Shapes / Grid) are too similar (look-alike colours, same region layout, or same outline; mirrored copies included). It also fails for duplicate titles or titles carrying a size like "30×30" (the app shows the size itself). Run `npm run audit` to list the closest pairs and their scores (score ≥ 1 = fails). **The scheduled routine and anyone adding art must keep `npm test` green; never "fix" a failure by raising the limits in `tools/lib/similarity.mjs`.** Picture ids that people already have in localStorage (progress, finished list) must never be reused for different art: when replacing a picture give it a **new id** and delete the old one (the app ignores saved data for ids that no longer exist).

## Adding more SHAPES pictures

1. Get a **flat-colour cartoon illustration**: simple bold shapes, solid colours, no gradients, no text, white or light background, centred subject, limited palette (AI image generators do this well — prompt for exactly that). PNG/JPG/WebP/SVG.
2. Run
   ```bash
   node tools/make-picture.mjs path/to/dragon.png --name "Friendly Dragon" --cat fantasy --diff hard
   #   --ink            image has black outlines between colour fields (dissolved into the fields)
   #   --k 12           max colours   --min-area 120 --min-r 6   merge smaller regions / labels
   #   --id my-id       --bg ffffff   background used for transparent images
   #   --ink-split      keep fields that the ink lines separate as separate regions (many more areas: every shingle, pumpkin, leaf)
   #   --size 896       bigger working size (default 640 for hard) for detailed wide art   --ink-l 40  darker-than threshold for ink
   #   --merge-de 10    keep more similar shades apart   --added 2026-10-05  date for the NEW badge
   ```
   The script quantises the colours, removes noise, segments regions, merges tiny ones, finds label positions (pole of inaccessibility via an exact distance transform), traces smooth outlines, validates the result (every region numbered, labels inside regions, region/colour counts, finished picture ≈ source) and writes `src/pictures/<id>.json`. Difficulty is **graded from the result** (≤25 regions & ≤8 colours = Easy, ≤84 = Medium, more = Hard); use `--min-area` to make a picture simpler.
3. `npm test && npm run build`, commit `art/`, `src/pictures*`, `docs/`.

Procedural launch art lives in `tools/art/{easy,medium,hard}.mjs` (tiny SVG helpers in `lib.mjs`); `npm run pictures` re-renders and rebuilds everything deterministically.

## Adding more GRID pictures

Grid pictures are tiny pixel-art images where every cell becomes its own numbered square (neighbouring cells with the same number are separate squares, so the number shows in every cell). The app computes the cell map itself, so a grid picture is just a small JSON file.

**From an ASCII file (easiest)** – make a text file like `frog.txt`:

```
# legend: one "character=#rrggbb" per line, then a line with ---, then one row of characters per grid row
g=#51cf66
d=#2b8a3e
w=#ffffff
k=#22223b
---
....kkkk....
...kggggk...
..kgwkgwkg..
```

(`.` = empty paper, not numbered; rows may have any length up to ~60; use 3–16 colours; 16×16 is easy, ≤32 medium, bigger hard). Then

```bash
node tools/pixel-grid.mjs frog.txt --name "Cute Frog" --cat animals   # --diff easy|medium|hard to override, --id to choose the id
node tools/build-pictures.mjs                                           # refresh the picture index
npm test && npm run build
```

**From code** – built-in designs live in `tools/art/pixel.mjs`. A design is drawn with simple shapes (`disc`, `ell`, `rect`, `poly`, `line`, `px`, `outline`, `mirrored`) in *native* cell units and can be built at several sizes, e.g. `add('grid-dino', 'Friendly Dino', 'dinosaurs', 36, 36, draw)` produces a 36×36 puzzle. (Building one design at several sizes is possible but the duplicate test will reject the result – draw a new design per size instead.) `node tools/pixel-grid.mjs` rebuilds them all (also part of `npm run pictures`); `art/pixel/<id>.txt` has an editable ASCII copy of each. The validator (`tools/lib/validate.mjs`) checks every cell/label/colour and `tests/pictures.mjs` plays every picture to completion in all three modes.

## Deploy

GitHub Pages serves `docs/` from `main`. `npm run build` refreshes `docs/index.html` (byte-identical to `dist-single/Magic-Colour.html`), `sw.js` (cache name carries the build hash), manifest and icons.
