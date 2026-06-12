# Configurator UI/UX Polish Log

A running changelog of small, low-risk UI/UX refinements applied by the `/loop` polish pass.
Each entry is one focused improvement. Newest first.

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
