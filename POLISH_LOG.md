# Configurator UI/UX Polish Log

A running changelog of small, low-risk UI/UX refinements applied by the `/loop` polish pass.
Each entry is one focused improvement. Newest first.

## 2026-06-13 (batch 4)
- **Text** layer control order is now Scale → Rotation → Opacity → Text Color → Move → Areas →
  (Finish/Emboss/Layout). `_transformHTML(id, L, rotFirst)` gained a rotation-first mode for text.
- Picking a **Layout** on a Text or Logo layer now treats it like a background: `_fitTiledBoxToBag`
  fits the box to the whole bag (exterior + interior + handles) and the layer is **move-locked** (can't be
  dragged in the 2D editor; resize/crop handles + panel controls still work). "None" restores box + lock.
  Move-lock generalised from `isBackground` to `isBackground || tiled` (`_moveLockOnly`).
- **Background collections**: added **Florals** + **Autumn**; **Summer** replaced with the new set.
- **Graphic collections**: added **Eid_Al_Fitr**, **Ramadan**, **Positivity** (GCC-relevant SVG sets).
- Manifests regenerated (Essentials first, then A→Z).

## 2026-06-13 (batch 3)
- **Hue/Saturation split out of Recolor** into a standalone, always-visible **Adjust** section for image
  layers — visual tracks (rainbow Hue, gray→colour Saturation) applied as a global `hue-rotate()`/`saturate()`
  filter (`L.imgHue`/`L.imgSat`, `_layerColorFilter`). Works without extracting colours. Recolor's old
  per-cluster Hue/Sat sliders removed (wheel + count + shuffle/reset remain).
- **SVG colour extraction from the vector source** (`extractSvgColors`) before rasterizing → exact colours.
  Raster extraction tuned (coverage gate 2%→0.5%, merge 50→40) so busy/colourful images no longer collapse
  to a single detected colour.
- **Emboss/Deboss now visible**: `bumpScale` 0.04→0.3 (configurator + `realism-engine.js?v=16`) + sharper
  1px bump edges. The depth slider still scales the effect.
- **Finish & emboss follow tiled Layouts**: `_drawTiledCell` now scales tile size by `ms`, so the
  finish/bump masks (drawn at reduced scale) tile at the SAME density as the visible colour map.
- **Neutral snap is now per layer type** (Text / Logo / Graphic / Background) in Testing (`NEUTRAL_SNAP`).
- **Collections renamed**: `System_Presets`→**Essentials**, `Artists_Collection_1`→**Display** (text) /
  **Illustrations** (graphic), `Super_Nova_Collection`→**Cosmic**, `Spring_Collection`/`Summer_Collection`→
  **Spring**/**Summer**. Manifests regenerated (Essentials first); legacy `pattern_N` path updated.

## 2026-06-13 (batch 2)
- Text/Logo tile layouts: when a Layout other than None is active, **Scale & Rotation lock**
  (disabled + not-allowed cursor) and the Layout section gains an **Opacity** slider synced to the
  transform Opacity (`opacity2` ↔ `onLayerProp`).
- Tiled-layout defaults split by type: **text** density 20× / gap 40, **logo** density 20× / gap 50.
- **Adding a layer now auto-expands it** and collapses the others (accordion via `data-expanded`).
- **Per-layer accent colours**: each layer row gets a distinct colour (`layerAccent`/`_LAYER_ACCENTS`)
  — a left strip, a tinted expanded header, and a scoped `--imp-accent` so its controls are colour-coded,
  making it obvious which layer you're editing.

## 2026-06-13
- Layer panel control order changed to **Scale → Opacity → Rotation → Move → Areas → Colour/Recolor**
  (Finish/Emboss/Layout still last, Logo & Text only). `_transformHTML` now outputs Scale/Opacity/Rotation.
- **Recolor now defaults ON** for Graphic/Logo/Background layers (`recolorOn:true` at creation).
- **Handles** area toggle added (off by default for every layer) in both the layer panel Areas section and
  the 2D-editor Handles pill; wired into `drawArtworkOnBag` via `L.faceHide.handles` (erases `bagHandleClip`).
- **Background panel**: Gap control removed (`_bgTiledControlsHTML`); order is now Density/Feather → Opacity
  → Areas → Recolor.
- `duplicateLayer` now deep-copies `faceHide` so area/handle toggles don't cross-link the duplicate.

## 2026-06-12
- Removed dead `.add-layer-menu` / `.add-layer-item` CSS (the old Add-Layer dropdown was
  replaced by the popup window).
- Added Arabic (RTL) translations for the new layer-panel labels: Scale, Layout, Areas, Move,
  "Move in 2D editor", Logo Color, Logo Finish.
- Esc now closes the Add-Layer and Add-Source popups (keyboard accessibility); backdrop-click
  already closed them.

## 2026-06-12 (batch)
- 2D-editor drag perf: pause 3D render while in 2D mode; coalesce atlas re-bake to one per
  animation frame; idle-only cached/pre-filtered 2D backdrop; cache canvas rect during drag.
- Removed "2D editor resolution" and "Atlas edge padding" testing controls.
- Backgrounds/patterns start locked; in the 2D editor a click-drag on a locked layer pans,
  a plain click selects + unlocks it.
- Graphic System Presets reordered (square, circle, line first) and regenerated with tight
  auto-cropped viewBoxes so the layer bounding box hugs each shape.
- Shift while resizing a graphic = non-proportional (independent width/height) resize.
