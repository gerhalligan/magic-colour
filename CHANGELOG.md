# Changelog

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
