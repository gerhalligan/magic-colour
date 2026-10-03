# Changelog

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
