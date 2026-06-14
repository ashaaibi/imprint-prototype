# Configurator UI/UX Polish Log

A running changelog of small, low-risk UI/UX refinements applied by the `/loop` polish pass.
Each entry is one focused improvement. Newest first.

## 2026-06-14 (batch 17) — Landing hero video loop + in-browser 3D recorder
- **Configurator "● Record clip"** (both studios, Designer bar → `IMPRINT_recordClip`): MediaRecorder
  captures the live WebGL canvas to a muted **WebM** while the product spins a seamless 360° and
  recolours (ends on the original → loops cleanly). Browser-only (the headless sandbox has no WebGL).
  The clip is usable as the hero loop directly, or as the 3D footage for the Remotion promo.
- **Landing hero video loop:** the index hero autoplays `assets/promo/hero.(mp4|webm)` muted + looping
  when present (progressive enhancement — the video loads off-DOM and swaps in only on success, so a
  missing file never breaks the page; phones + reduced-motion keep the lightweight collage).
- **Remotion `HeroLoop` composition:** a 10 s 16:9 muted loop of the 3D customiser — plays the captured
  footage (`public/hero-3d.webm`) with a rotating "Customise _colour / finish / logo / in 3D_" caption +
  wordmark, and a Ken-Burns render fallback so it previews without footage. Typechecks clean.

## 2026-06-14 (batch 16) — Marketplace motion, template export/import fixes, Remotion promo
- **Native animations (fast, reduced-motion-aware), scoped to the marketplace** (`app.js` + `catalog.css`,
  which don't load on the 3D studios). Everything degrades to the final visible state if JS fails:
  - **Hero typewriter** — the rotating word types → backspaces → types the next (artists/brands/makers)
    with a blinking gold caret. No-JS/reduced-motion keeps the full static headline.
  - **Hero bento crossfade** — each collage tile fades through real product designs (preloads first;
    pauses on hover + off-screen; starts on idle so it never delays load).
  - **Scroll reveals** — section headings + grid cards fade-and-rise on scroll (IntersectionObserver,
    staggered). Uses the `translate` property so card-hover `transform` still composes on top.
  - **Stat count-up**, **page transitions** (fade-out + slim gold top shimmer on internal nav; fade-in on
    load; skips modifier-clicks/new-tab/downloads/hashes/fav-follow-share), **richer card hover** (gold sheen).
  - Hero enhancements run after content renders, wrapped in try/catch so they can't block the page.
- **Template export/import bug fixes (bag + cup):**
  - **Preset colours** (Rose Red, Vivid Red…) were lost — only custom hex survived. `serializeTemplate`
    now bakes each region's colour to an explicit hex (swatchName→Custom) so it restores verbatim (the
    rebuild's `onBagHue` was otherwise re-resolving the swatch from the unsaved hue slider).
  - **Stacked sizes on import** (unlocked): the restore rebuilds for the template's size while the default
    GLB load is still in flight → two bags. Added a **build-sequence guard** (`_bagBuildSeq`/`_mySeq`) so a
    superseded GLB onload drops its result; only the latest build is added.
  - **Finishes** now render (they were the stale stacked bag showing through).
- **Remotion promo** (`promo/`): a runnable Remotion project for a ~18s cinematic brand film (logo →
  typewriter tagline → product showcase → CTA, 16:9 + 1:1). Render locally (`npm i && npx remotion render`);
  can't render in the headless sandbox (no Chrome/ffmpeg).

## 2026-06-14 (batch 15) — Stuck-loader fix, cup lid finish, per-step cameras, tablet padding
- **CRITICAL — stuck configurator loader:** both studios could hang forever on the loader while the
  designer bar still showed. Cause: `GLTFLoader.js`/`RGBELoader.js` were the only Three add-ons still
  loaded from a **CDN** (`cdn.jsdelivr.net`) — when that request fails (CSP/blocker/policy/CDN hiccup),
  `THREE.GLTFLoader` is undefined and `buildPaperBagMesh()` throws before `finishConfigLoading()`.
  **Vendored both locally** into `vendor/three128/` (same-origin per CLAUDE.md) + repointed both
  configurators. Added two **defensive guards**: bail-with-cleared-loader if `THREE.GLTFLoader` is
  missing, and a **try/catch around the whole GLB onload** so any exception still clears the loader.
- **Cup material finishes — lid (rivet) now works:** the lid is its own mesh but no region wired its
  finish. Added `rivet` to `BAG_PBR`, to `onBagRoughness`/`onBagMetalness` (applies straight to
  `bagRivetRef`) and to `tickFinishTweens`; removed the bag-leftover ribbon→rivet finish tie so base &
  lid are independent; lid finish is applied on load. Cup-only (bag has no Lid step).
- **Cup per-step camera angles (Testing):** new **STEP_CAM** table + Testing → *"Step camera angles"*
  with **X (tilt) / Y (turn)** sliders for each of **Cup / Sleeve / Base / Lid**. `applyStepCamera` reads
  STEP_CAM; edits **preview live** when you're on that step. Defaults reproduce the old hardcoded views.
- **Client handle finish nudge:** added `_nudgeHandleFinish(3)` on the client template-load path (bag +
  cup) — re-presses the handle/base finish **3×, staggered**, so the default **Soft-Touch** handle finish
  definitely renders (uses the restored finish, so chosen finishes are respected).
- **Artisan Coffee Cup template replaced** with the uploaded design (a real v1 snapshot — the old file
  was a stub with no `snapshot` and couldn't load as a client). Fixed the gallery render path to the real
  file (`coffee-cup-1.jpg`); renders otherwise unchanged.
- **Tablet padding:** the mobile edge-padding treatment now extends to **tablets (641–1024px)** site-wide —
  content/nav/footer get 40px side padding and the sticky header lines up with them.

## 2026-06-13 (batch 14) — Perf, PDP parity, configurator fixes, new artists, cup duplicate
- **Image performance (#1–7):** responsive **WebP** pipeline in `build_catalog.py` (sm 480 / lg 1200, q80) +
  `IMP.img` srcset/sizes/width/height/lazy + eager hero LCP. Image payload ~36 MB → ~6 MB.
- **All product PDPs now match the Honeyloom layout** via shared `pdp.css` + a rewritten `product.js`
  (gallery, sizes, quantity tiers, manufacturer picker, live price, artist+Follow, specs, "You may also
  like"). Placeholders keep **all sizes unlocked** and a **"Customise — soon"** CTA ("not available yet").
- **Honeyloom PDP:** size-lock now survives re-renders (changing maker/qty no longer unlocks sizes), added
  the artist + Follow + "You may also like".
- **Configurator:** client template load no longer flashes the Start step (full-screen loader held until it
  lands on Design); template bar no longer overflows the viewport (fits all screen sizes). Favicon added to
  every page + generated stub.
- **Artists replaced** with 9 new ones, named to match the photos (gender/region/look); collections + products
  re-mapped to their styles, balanced 4–7 each. New cup renders (5).
- **Cup configurator** rebuilt as a **full duplicate** of the bag studio with only the model swapped
  (material-rename trick → cup flows through the bag's atlas pipeline). Unverified in-browser — see CLAUDE.md.

## 2026-06-13 (batch 13) — Marketplace + cup studio + configurator fixes
- **Turned the site into a three-sided marketplace** (artists · brands · manufacturers), driven by a
  generated `catalog.js` (`tools/build_catalog.py`): 50 products, 13 artists, 6 manufacturers, 25
  collections from the curated asset zips. New/rewritten pages: landing, products (by category),
  per-product **clean-URL** PDPs (`/<slug>/`), artists + profiles, manufacturers + profiles, search
  (full filters), collections, favourites, account, orders. New `catalog.css` + `app.js` (nav/footer,
  favourites/follow/share) + `product.js` (lean PDP). Tags (hot/trending/new/foil/eco…) throughout.
- **Honeyloom Gift Bag** moved to its own clean URL `/honeyloom-gift-bag/` (rich PDP, template gallery
  removed); `product.html` redirects there. **Minimal Wordmark template deleted.** PDP now mirrors the
  template's **size lock**.
- **Configurator**: wayfinding **pulse OFF by default** (+ Testing toggle); **finish nudge on load** fixes
  the handle/ribbon finish not rendering until clicked.
- **Artisan Coffee Cup**: new product + render + **lean cup 3D studio** (`configurator-cup.html`, 4
  materials, lid print-area hidden, sizes, designer/export, template) + designer-portal builder. v1 —
  needs live browser verification (no WebGL in the headless build).

## 2026-06-13 (batch 12)
- **Fixed super-slow template loading.** A sticker-heavy client template (e.g. Honeyloom Gift Bag — logo +
  two foil graphics) was baking the bag **4–5×** on load: `_restoreState` baked once, then every recolored
  sticker re-baked async, then a final bake — and batch 11 had quadrupled each bake's cost by defaulting the
  finish/PBR maps to 2048. Two changes:
  - **Coalesced the load to one bake.** `_finishTpl` now sets `window._tplRestoring` while it restores +
    rebuilds each sticker (threading a completion callback through `_rebuildStickerCutAndRecolor` →
    `applyStickerRecolor`); `drawBagTexture` swallows the intermediate bakes and does a single full bake once
    all stickers settle (with a 4 s safety net).
  - **Reverted the finish/emboss default to 1024** (`PBR_SIZE`/`BUMP_SIZE`) for fast loads. The Testing
    "Finish & emboss quality" slider still reaches 2048/4096 for crisp foil on hero render captures.

## 2026-06-13 (batch 11)
- **Foil / finish quality fix + Testing controls.** The material-finish maps (roughness / metalness /
  finish-mask + emboss) were baked at **1024²**, half the 2048² colour atlas — so **foil & gloss looked
  low-resolution**. Raised the defaults to **2048** (`PBR_SIZE` / `BUMP_SIZE` / `EMB_SIZE`) so the finish
  is now 1:1 with the colour map. Added a **Testing → 3D Quality** group:
  - **Finish & emboss quality** (`onFinishQuality`) — slider is a 2ⁿ exponent (512 → 4096); re-creates the
    PBR + bump canvases at the new size and does a full live re-bake.
  - **3D render quality** (`onRenderQuality`) — supersamples the whole 3D view via
    `T.renderer.setPixelRatio(base × mul)` (clamped ≤ 3) for crisper edges & metallic highlights. The
    EffectComposer auto-syncs the new pixel ratio each frame via realism's `_rlmSyncSize()` — **no
    `realism-engine.js` change or `?v=` bump required.**

## 2026-06-13 (batch 10)
- **Material finish restored for Graphic & Background layers.** The finish grid (gloss/matte/soft-touch/foil)
  + Advanced PBR is now its own `_finishHTML` shown on **all** layer types; Emboss/Deboss + Layout
  (`_embossLayoutHTML`) stay Logo & Text only. (The per-layer finish was already supported by
  `overlayArtworkPBR` — it was just hidden in the UI for those two types.)

## 2026-06-13 (batch 9)
- **Template + designer system.** New unlisted `designer/` portal → opens the configurator in **designer mode**
  (`?designer=1`): full studio + Testing panel + a Designer bar (Locks / Capture render / Export template) +
  a Locks panel to choose what clients may change. **Testing is now hidden for everyone except designer mode.**
- **Export** serializes the design (`_snapshotState` + embedded layer images) + locks + meta to a
  `<id>.template.json`; **Capture render** downloads a PNG of the 3D view. Commit both to `templates/` and add
  to `templates/index.json` to publish.
- **Clients** open `configurator.html?template=<id>` → the design is restored and **locks enforced** (locked
  sizes/steps/controls hidden; designer layers get a minimal panel with only the allowed text/colour/social
  edits; geometry locked). Safety invariant: `LOCKS` null ⇒ the normal configurator is byte-for-byte unchanged
  (enforcement is via monkey-patches + `_tplLock` guards).
- **Template gallery** ("Start from a template") on the product page reads `templates/index.json`; seeded with a
  "Minimal Wordmark" sample. Designer-captured renders replace the placeholder thumbnails when provided.

## 2026-06-13 (batch 8)
- **New product detail page (`product.html`)** — the Paper-bag card now opens a PDP instead of jumping
  straight to the configurator. Styled SVG mockup gallery (kraft / white / colour / dark studio / spec
  sheet), tags (Trending · Eco · rated), **size + quantity-tier + manufacturer pickers**, live price
  breakdown (base + VAT + total, in the user's currency), estimated delivery, and per-manufacturer
  **specs + fake reviews**. Four manufacturers (Imprint featured; Gulf Print, Najm, Levant) each vary
  **price (`priceMul`) and lead time**.
- **Two CTAs**: "Customize design" → `configurator.html?size=&qty=&pmul=&mfr=&step=2` (configurator reads
  the params, loads that size, pre-selects the quantity, applies the manufacturer price multiplier, and
  lands on the **Design** step; Start still lets you change size/qty). "Add to cart" → `setCart()` →
  `checkout.html`.
- **Reviews**: ~13 per manufacturer (52 total). Some include vector photo placeholders (`miniBagSVG`),
  with a subset framed as **Ordered / Received** pairs (`pics` / `compare` fields). A "Show all reviews"
  toggle keeps the section tidy; the header review-count sums the makers' counts.

## 2026-06-13 (batch 7)
- **Tiled-layer colour fix**: `_drawTiledCell` now caps the staging-canvas area (~2048²). A whole-bag-fit
  tile at full scale made it ~4k²+, which renders BLANK past Safari/iPad's canvas limit — the tiled
  logo/text colour vanished while the half-size finish mask still drew. Tile count/layout unchanged.
- **Default drop position**: new Text/Graphic/Logo layers land in the **lower half of the front** (≈28% up
  from the base edge), centred horizontally, per size (`addLayer` `_fp`, from `BAG_FACES.exterior.front`).
- **Step order**: **Design is now 2nd** (Start · Design · Exterior · Interior · Handles · Review) — pills,
  section `data-cstep`, `STEP_PART`, and `applyStepCamera` remapped.
- **Undo/redo**: removed from the viewport by default (⌘Z/⇧⌘Z still work) with a Testing → UI toggle to
  show it; swapped places with the 3D/2D toggle — **3D/2D now top-right, undo/redo (when shown) top-left**.

## 2026-06-13 (batch 6)
- **Slider FPS overhaul** — a new `PERF` system (Testing → "Performance") cuts the per-`oninput` bake cost
  while a range slider is dragged; `_sliderDragging` is detected globally and `_endSliderDrag` does one
  full-quality bake on release. Toggles (each in Testing): coalesce bakes to 1/frame (#1, default on),
  skip finish/bump/emboss while dragging (#2, on), Opacity/Hue/Saturation skip finish&bump (#3, on),
  throttle 3D render rate while dragging (#4, on, `PERF.dragFps`), debounce recolor (#5, on), reduce
  post-FX SSAO/DOF/Bloom while dragging (#9, on), cache static bag base (#6, experimental off),
  event throttle ~16ms (#10, off). `_lightBake()` gates only the heavy passes; face/handle-hide stays correct.

## 2026-06-13 (batch 5)
- **Background preset thumbnails square-cropped** (`object-fit:cover`, full-bleed) so a rectangular
  background doesn't look rectangular in the picker. Graphic/text thumbs stay `contain`.
- Added the **Arabesque** background collection (5 SVGs).
- **Emboss/Deboss now visibly works on matte paper**: a normal bump map is nearly invisible under soft
  studio light, so `overlayArtworkEmboss` also bakes a directional highlight/shadow **bevel into the
  albedo** (3D only, after the 2D clean snapshot). Cheap when nothing is embossed.
- **Finish now syncs with tiled grids**: roughness/metalness + finish-mask resolution raised 512→1024
  (`PBR_SIZE`) so a dense full-bag grid resolves and the finish lines up with the visible pattern.

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
