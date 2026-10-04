# Changelog

## 1.8.0 — 2026-10-04
Daytime improve-and-add-pictures run.
- **6 new pictures**: Pumpkin Carriage (Shapes, hard); Treasure Cave, Sleepy Panda and Butterfly Mandala (Shapes, medium); **Volcano Island** (Epic Grid 90×90) and **Castle in the Clouds** (Epic Grid 100×100). Flower Mandala was tried from staged art but skipped (too similar in outline to Ocean Mandala — duplicate check).
- **Progress cheers**: friendly offline toasts at about 50% ("Halfway!") and 90% ("Almost done!"), once per picture — no spam on undo or when reopening a picture already past those points.
- Mode rules unchanged: default remains **One by one**; Magic still needs a numbered region tap; Brush defaults to the smallest size and only paints matching numbers under the stroke.

## 1.7.0 — 2026-10-04
Bug from Gerard (Android Chrome, tall phone, portrait): the top of the home screen took about 70% of the height, so the picture grid showed only about one row.
- **Compact home screen**: one slim header row holds the Shapes / Grid segmented switch (with picture counts), Surprise, Gallery and Sound (icon buttons, 44 px, labels shown only on wider screens). Category and level chips are small single-line scrolling rows (invisible hit area extended for touch). Header and filters stay put; **only the picture area scrolls**.
- **Continue** and **Picture of the day** are slim one-line strips (thumbnail, title, progress) side by side instead of tall cards. My stickers moved below the grid.
- **Grid first**: 2 larger thumbnail columns on phones (320-480 px), 3 up to 700 px, 4+ on tablets/desktop; short landscape phones put the filters on one row and show 5-6 columns. On a 360x640 phone the fixed top block is about 20% of the height and two full rows of pictures are visible even with both strips showing.
- **Layout test** (`npm run test:layout`, part of `npm test`): headless Chromium at 360x640, 360x560, 320x568, 390x844, 412x915, 430x932, 844x390 and 640x360 landscape, tablet and desktop; asserts first row starts above 35% of the height (40% on short landscape), 2 full thumbnail rows on portrait phones, 2 columns on phones, no overlap, no page overflow, sticky header, 44 px touch targets, filters / Surprise / Gallery / Sound still work. Screenshots go to `magic-colour-screens/layout-*.png`.

## 1.6.0 — 2026-10-04
Daytime improve-and-add-pictures run.
- **6 new pictures**: Fox Forest, Sunny Submarine, Fairground Carousel, Lighthouse Bay (Shapes, medium, flat-colour cartoons with ink outlines); **Hot Air Balloon Festival** (Epic Grid 100×100) and **Treehouse Village** (Epic Grid 90×90). Butterfly Mandala was tried from staged art but skipped (could not hit Hard colour count without failing reconstruction).
- **Continue**: on the home screen, if there is an unfinished picture in progress (localStorage), a big friendly Continue card opens that last played picture. Offline-only; no network.
- Mode rules unchanged: default remains **One by one**; Magic still needs a numbered region tap; Brush defaults to the smallest size and only paints matching numbers under the stroke.


## 1.5.1 — 2026-10-04
Request from Gerard: several Grid pictures looked identical in the gallery.
- **Audit**: all 17 Grid and 52 Shapes pictures were compared programmatically (40×40 colour and region signatures, colour-blind outline correlation, mirrored too) and visually via thumbnail sheets. Three Grid pairs were the same art at two sizes: Little Unicorn / Unicorn Dream, Friendly Dino / Giant Dino, Rocket Ship 30×30 / 44×44. No identical Shapes pictures were found (Brick Castle and Dream Castle share a three-tower layout but differ in colours, texture, scenery and detail, so they were left).
- **Replaced with genuinely different pictures** (new ids; the old ids were removed):
  - *Unicorn Dream* (`grid-unicorn`, 40×40 head) → **Unicorn Dream** (`grid-unicorn-dream`, 40×40): a full-body unicorn in a meadow in front of a big rainbow. *Little Unicorn* (head, 24×24) is unchanged.
  - *Giant Dino* (`grid-dino-giant`, 50×50) → **Mighty T-Rex** (`grid-trex`, 50×50): a T-rex with teeth, tiny arms and a volcano scene. *Friendly Dino* (36×36) is unchanged.
  - *Rocket Ship 44×44* (`grid-rocket-44`) → **Rocket in Space** (`grid-space-rocket`, 44×44): a tilted rocket flying past a ringed planet, a blue planet, a moon, a comet and stars. The 30×30 rocket keeps its id (`grid-rocket-30`) and is now simply titled **Rocket Ship** (no size in the title).
- **Saved progress**: ids that stay (`grid-unicorn-small`, `grid-dino`, `grid-rocket-30`, everything else) keep their progress and finished marks. Saved data for the three removed ids is ignored (the gallery skips unknown ids, opening them does nothing, no errors); smoke test added.
- **Default brush = smallest size** (it used to be medium). A size the player picks later is remembered (`brushChosen`); the old auto-saved default is reset to small.
- **New Epic difficulty tier (★★★★)** for Grid pictures, with its own filter chip (shown only where pictures exist): **14 full-page scenes from 70×70 to 120×120** (4 900–14 400 squares each, up to 24 colours): Unicorn Castle, Rainbow Valley, Fire Dragon, Coral Reef, Galaxy Voyage, Jungle Friends, Grand Mandala, City Lights, Happy Farm, Fairy Garden, Snowy Village, Pirate Bay, Dino Valley, Candy Land. Much longer to finish.
- **Big-grid performance** (low-end Android): grid files are stored compactly (`cells` string) and expanded only for the picture being played; numbers are drawn only for squares on screen and only when zoomed enough to read (none at fit zoom, one font setting, no scan of all squares); multi-square fills use one canvas upload; progress is saved as ranges instead of a 14 000-number list; a hint zooms to a readable level and pans to the squares. Smoke test opens a 120×120 picture and checks open time, draw time, brush frames, numbers, hint pan, saving and completion.
- Shapes pictures: no new pictures this release (the Hard limit is 420 regions; bigger Shapes scenes need hand-made source art – see README guidance for the routine).
- **New automatic duplicate test** `tests/duplicates.mjs` (part of `npm test`, `npm run audit` lists the closest pairs): fails if two pictures of a type are too similar or share a title, or a title carries a size. Documented in the README so the scheduled routine cannot add duplicates.

## 1.5.0 — 2026-10-04
Request from Gerard: a paint brush, and numbered square grids.
- **Third mode: Brush.** Top bar now has three big-icon buttons (Magic, One by one, Brush) that fit a 360 px phone. Pick a colour, drag across the picture: only areas with the selected number fill (others untouched; gentle throttled wiggle over a different number; nothing selected = friendly message). Four brush sizes (small/medium/large/huge) with a circle cursor/preview, shown only in Brush mode; radius scales gently with zoom. Strokes are interpolated (fast swipes never skip areas), hit-tested against the label map and repainted once per animation frame; a whole stroke is one undo step; progress saved at the end of each stroke; soft throttled sparkle sound; celebration when the last area is painted. Mode and brush size are remembered.
- **Zoom/pan coexist with the brush:** one finger paints, two fingers pinch/pan; on desktop the wheel zooms, and Space+drag or right/middle-drag pans.
- **New picture type: Grid.** A Shapes / Grid switch on the home screen (own categories and levels per type). 17 square-grid pixel pictures from 16×16 (easy) to 50×50 (hard): heart, sun, fish, ice cream, butterfly, flower, rainbow, cat, dog, robot, rocket (two sizes), unicorn (two sizes), fairy castle, dinosaur (two sizes). Every cell is its own numbered square with a grey start colour; all three modes work on them. Existing Shapes pictures are unchanged.
- New tooling: `tools/pixel-grid.mjs` (ASCII file or built-in designs -> grid puzzle), grid validation; README explains how to add both kinds.
- Tests: brush unit tests (radius, interpolation, hit-testing vs a pixel oracle, matching-number-only rule, stroke undo), game logic, every picture solved in all three modes, browser smoke tests incl. simulated brush drags at 390×844, 844×390, 360×640 and 1280×800.

## 1.4.0 — 2026-10-04
Daytime improve run.
- **5 new pictures** (mostly hard for bigger kids): Coral City (hard, underwater fantasy), Peacock Parade (hard), Dino Explorer (hard), Pirate Ship (hard), Snowflake Mandala (medium, intricate). Candy Kingdom was skipped (numbers baked into the JPG); Coral City and Peacock Parade were flattened slightly so the colour pipeline could validate.
- **Completion stickers**: finishing a picture awards a category-themed sticker (localStorage only). Earned stickers collect in a **My stickers** row on the home screen; the win card shows the sticker (with a “New sticker!” highlight the first time).
- Mode rules unchanged: default remains **One by one**; Magic brush still needs a numbered region tap (palette alone never fills).

## 1.3.0 — 2026-10-04
Daytime improve run.
- **6 new pictures** (all hard for bigger kids): Ocean Mandala, Dragon Castle, Mermaid Lagoon, Robot Workshop, Autumn Forest, Space Carnival.
- **Picture of the day** pin on the home screen: a stable Dublin-day featured picture with a sunny label and pin badge above the gallery grid (respects category/difficulty filters).
- Difficulty filter chips were already present (Easy / Medium / Hard / Any level); left unchanged.
- Mode rules unchanged: default remains **One by one**; Magic brush still needs a numbered region tap (palette alone never fills).

## 1.2.0 — 2026-10-04
Daytime improve run.
- **4 new pictures** (mostly hard for bigger kids): Mandala Garden (hard, intricate), Dino Jungle (hard), Unicorn Meadow (hard), Pumpkin Party (medium). Fairy Village and Space Station were tried but skipped after validation failed (soft shading / near-greyscale sources).
- **NEW sparkle badge** on freshly added pictures for about 7 days (`added` ISO date on picture JSON); unfinished new art sorts to the front of the home grid. Finished tick badge is unchanged.
- Hard difficulty limits widened slightly for older-kid art (up to ~420 regions, 8–24 colours) so intricate scenes can validate.
- Mode rules unchanged: default remains **One by one**; Magic brush still needs a numbered region tap (palette alone never fills).
- Hard region/colour limits updated in the picture pipeline validators.

## 1.1.0 — 2026-10-04
Feedback from Gerard.
- **One by one is now the default mode** for new players and on first load. A mode the player really picks later is still remembered (`modeChosen` flag); the mode that 1.0.0 silently auto-saved as its default is reset to One by one.
- **Magic brush is harder (less automatic).** Selecting a colour in the palette now only *selects* it (matching spots glow softly for a moment); it no longer colours anything. The player must tap a numbered region with the correct colour selected, and that single tap colours **all** regions with that number at once. Tapping a region with nothing selected just picks its colour. Wrong-colour taps still give the gentle wiggle + hint.
- Updated toasts, button label and README; hint, undo, progress saving and celebration unchanged.
- Tests: game logic (default mode, palette-only never fills, magic tap fills all, wrong tap, undo, save/restore), per-picture solve in both modes (select + tap), smoke tests (default mode, palette-tap-fills-nothing, one-tap-fills-all, settings migration), all four viewports.

## 1.0.0 — 2026-10-04
First release of **Magic Colour**, an ad-free, tracking-free, offline colour-by-numbers game for young children (about 4–9).
- **37 pictures** in 8 categories (animals, unicorns, dinosaurs, vehicles, space, fantasy, food, nature), graded **Easy** (8–25 regions, 5–8 colours), **Medium** (20–84 regions) and **Hard** (75–158 regions, 11–16 colours).
- **Two modes with big icons**: **Magic brush** (default, wand): tapping colour *N* — or any region numbered *N* — colours **all** regions with that number at once, with a ripple of sparkles. **One by one** (finger): pick a colour, then tap each region yourself.
- Wrong number = gentle hint only (soft wiggle + glow on the spot, the right palette colour bounces, friendly toast, soft "boop"). Never a penalty.
- Hint button (glows the remaining spots of the selected colour and pans/zooms to them), undo, progress ring + tick on finished colours, % progress bar.
- Pinch-zoom / two-finger pan / drag-pan on touch, mouse wheel + drag on desktop, +/−/fit buttons; tap vs drag is separated by a movement slop; numbers are drawn in screen space and stay 9–30 px at any zoom.
- Progress auto-saved per picture in localStorage; mode + sound remembered; Android back button returns to the gallery.
- Celebration: confetti cannons, outline fades and a sparkle sweep reveals the finished picture, fanfare. **My gallery** of finished pictures (thumbnails), **Save / Share PNG** (Web Share with files where supported, else download).
- WebAudio sounds (pentatonic pop per colour, magic arpeggio, tick, fanfare), mute toggle.
- Canvas rendering: fill layer painted from a run-length-encoded label map (dirty-rect updates), one `Path2D` outline layer (cached bitmap while panning on heavy pictures), safe-area insets, portrait + landscape layouts, 44 px+ touch targets.
- PWA: `manifest.webmanifest`, icons, service worker (cache-first) for fully offline play when served over http(s). Single-file build `dist-single/Magic-Colour.html` works from a file with no network at all.
- **Picture pipeline** (`tools/`): image → k-means colour quantisation (weighted histogram, Lab) → thin-structure/noise removal → connected regions → small-region merge → exact distance-transform label positions → outline tracing to smooth SVG path → compact JSON + thumbnail, with automatic validation and difficulty grading. `node tools/make-picture.mjs image.png --name … --cat …` adds a picture.
- Launch artwork is hand-authored procedural vector art (`tools/art/*.mjs`, rendered with sharp) because no image-generation tool was available when this was built; the pipeline accepts AI-generated PNGs unchanged (`--ink` for pictures with black outlines).
- Tests: segmentation unit tests, game logic (magic vs classic, wrong taps, undo, hint, completion, save/restore), per-picture validation + solve in both modes, headless-browser smoke tests at phone portrait / landscape / small phone / desktop, offline PWA test.
