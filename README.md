# Magic Colour ✨

Ad-free colour-by-numbers for young children (≈4–9). No ads, no tracking, no network calls at runtime, works offline.

* **Play**: open `dist-single/Magic-Colour.html` (one self-contained file), or the GitHub Pages build (installable PWA).
* **One by one** (default): pick a colour, then tap each region yourself.
* **Magic brush**: pick a colour, then tap **one** region with that number — *every* region with that number is coloured at once. (Picking a colour in the palette only selects it and softly glows the matching spots; it never fills anything.)
* Wrong number in either mode? A gentle wiggle and a hint, never a penalty.
* Pinch/drag/wheel zoom, hint, undo, auto-save per picture, celebration, "My gallery", save/share PNG, cute WebAudio sounds with mute.

## Develop

```bash
npm install
npm run pictures   # (re)generate the procedural source art + convert all pictures to puzzles (src/pictures/*.json)
npm test           # unit + picture validation + build + headless-browser smoke tests (screenshots -> /workspace/magic-colour-screens/)
npm run build      # vite -> dist/app.js, tools/inline.mjs -> dist-single/Magic-Colour.html (+ docs/ for GitHub Pages, + /workspace/magic-colour-share/)
```

Layout: `src/` game (`game.js` pure logic, `view.js` canvas + gestures, `main.js` UI, `audio.js`, `export.js`, `confetti.js`), `tools/` picture pipeline, `art/` source images + manifest + thumbnails, `tests/`, `docs/` Pages build, `public/` PWA files.

## Adding more pictures

1. Get a **flat-colour cartoon illustration**: simple bold shapes, solid colours, no gradients, no text, white or light background, centred subject, limited palette (AI image generators do this well — prompt for exactly that). PNG/JPG/WebP/SVG.
2. Run
   ```bash
   node tools/make-picture.mjs path/to/dragon.png --name "Friendly Dragon" --cat fantasy --diff hard
   #   --ink            image has black outlines between colour fields (dissolved into the fields)
   #   --k 12           max colours   --min-area 120 --min-r 6   merge smaller regions / labels
   #   --id my-id       --bg ffffff   background used for transparent images
   ```
   The script quantises the colours, removes noise, segments regions, merges tiny ones, finds label positions (pole of inaccessibility via an exact distance transform), traces smooth outlines, validates the result (every region numbered, labels inside regions, region/colour counts, finished picture ≈ source) and writes `src/pictures/<id>.json`. Difficulty is **graded from the result** (≤25 regions & ≤8 colours = Easy, ≤84 = Medium, more = Hard); use `--min-area` to make a picture simpler.
3. `npm test && npm run build`, commit `art/`, `src/pictures*`, `docs/`.

Procedural launch art lives in `tools/art/{easy,medium,hard}.mjs` (tiny SVG helpers in `lib.mjs`); `npm run pictures` re-renders and rebuilds everything deterministically.

## Deploy

GitHub Pages serves `docs/` from `main`. `npm run build` refreshes `docs/index.html` (byte-identical to `dist-single/Magic-Colour.html`), `sw.js` (cache name carries the build hash), manifest and icons.
