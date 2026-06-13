# IMPRINT Prototype — Agent Handoff

Premium **custom paper-bag configurator** for the GCC market. A static, multi-page
site (no build step, no framework) whose centerpiece is a **Three.js r128** GLB 3D
configurator. Deployed via **GitHub Pages** at `https://ashaaibi.github.io/imprint-prototype/`.

> This file is the single source of truth for a fresh session (local or cloud). The
> conversation history that built this does NOT travel with the repo — read this first.

## Run / preview locally
```bash
python3 -m http.server 7891
# then open http://localhost:7891/configurator.html
```
The dev server's **directory autoindex** is what lets the artist libraries auto-discover
files locally. GitHub Pages has **no autoindex**, so production relies on the committed
`index.json` manifests (see "Artist asset folders" below). `.nojekyll` keeps Pages from
mangling files/folders.

## Page map
- `index.html` — homepage · `products.html` — category grid
- `product.html` — **paper-bag product detail page (PDP)**: pick size/quantity/manufacturer, price breakdown,
  delivery, fake reviews+specs per maker. "Customize" → `configurator.html?size=&qty=&pmul=&mfr=&step=2`
  (lands on Design); "Add to cart" → `setCart()` → `checkout.html`. Manufacturers vary price (`priceMul`) + lead time.
- `configurator.html` — **the 3D configurator (centerpiece, ~2.5 MB)**
- `checkout.html` · `confirmation.html` — order flow
- `admin.html` — testing controls · `factory/` — demo stubs
- `designer/index.html` — **unlisted designer portal** (build/publish templates) · `designer/builder.html` — old stub
- `templates/` — **template JSONs** (`<id>.template.json`) + `index.json` manifest (the template gallery reads it)
- `shared.css` / `shared.js` — header, GCC country/currency state, helpers
- `realism-engine.js` — 3D realism (post-processing, lighting, floor, per-finish PBR)
- `vendor/three128/` — Three r128 post-FX (EffectComposer, SSAO, Bloom, Bokeh, FXAA, RectAreaLight)
- `vendor/pdfjs/` — PDF.js (PDF artwork import)
- `paper_bag/` — GLB model source · `v1/` — archived old snapshot (ignore) · `materials/` — texture maps

## The 3D configurator (`configurator.html` + `realism-engine.js`)
- Three.js r128, **inlined** into the HTML, plus the GLB bag model and the **studio3 HDRI**
  embedded as **base64** (that's most of the file size). Only studio3 is kept (other HDRIs removed to save memory).
- `realism-engine.js` is loaded with a cache-bust query: `<script src="realism-engine.js?v=15">`.
  **Bump `?v=N` whenever you edit realism-engine.js**, or the browser serves a stale copy.
- `REALISM` config object lives in **configurator.html** (~line 3215); the engine reads it as a global.

### Artwork layer system
`BAG.artwork.layers[]`. **Add Layer** opens a centered **popup modal** (`openAddLayerModal`) — Text /
Logo / Graphic / Background cards (no dropdown, no "AI" option). Layer kinds (all `kind` plus flags):
> The layer list (`renderLayersList`) is an **accordion** — `data-expanded` on `#layers-list` holds the
> single open layer id. **Adding a layer auto-expands it** (and collapses the rest). Each row gets a
> **per-layer accent colour** keyed by id (`layerAccent`/`_LAYER_ACCENTS`): a left strip, a tinted expanded
> header, and a scoped `--imp-accent`/`--imp-accent-weak` so that layer's controls are colour-coded.
- **Text** (`kind:'text'`) — per-layer fonts via FontFace API. Default fontSize **45**, font **inter**.
- **Logo** (`kind:'sticker', isLogo:true`) — single upload, keeps full Finish/Emboss/Layout.
- **Graphic** (`kind:'sticker'`) — upload or shape presets.
- **Background** (`kind:'sticker', isBackground:true, tiled:true`) — a tiled pattern.
- Adding Graphic/Logo/Text/Background opens the **add-source prompt** (Upload / Presets; fonts no AI).
- **Edit-background modal** (cutout): bg removal, **draggable crop box**, **PDF page selector**.
- Image layers (Graphic/Logo/Background) have a standalone **Adjust** section — **Hue** (rainbow track)
  + **Saturation** (gray→colour track) — applied as a global `hue-rotate()`/`saturate()` filter in
  `drawLayerContent` (`L.imgHue`/`L.imgSat`, via `_layerColorFilter`). It's **independent of Recolor**
  (no colour extraction needed). The old per-cluster Hue/Sat sliders inside Recolor were removed.
- **Recolor** = optional toggle, **default ON** for Graphic/Logo/Background (`recolorOn:true` at creation;
  Text uses a hue picker, not recolor). SVG layers extract their palette from the **vector source**
  (`extractSvgColors`, before rasterizing); rasters via `extractStickerColors` (`_extractLayerColors` picks).
  Recolor keeps the colour-count selector + wheel + shuffle/reset. Layer body order: kind controls →
  **Scale/Opacity/Rotation** → **Move** → **Areas** → **Adjust/Recolor** → **Finish** (all layer types) →
  (Emboss/Deboss + Layout only on Logo & Text).

**Per-layer transform & per-face visibility**
- `_transformHTML` = Scale (font-size for text) / Opacity / Rotation sliders. `onLayerScale` maps Scale.
  When a tile **Layout** is active (`L.tiled`), Scale & Rotation **lock** (disabled + not-allowed cursor)
  and the Layout/tiled section adds an **Opacity** slider (id `…-opacity2`) synced to the transform
  Opacity via `onLayerProp`. Tiled defaults: **text** density 20×/gap 40, **logo** 20×/50 (set in `onLayerLayout`).
- **Move** section = a button that opens the full 2D editor focused on the layer (no embedded mini-editor).
- **Areas** = per-face show/hide via `L.faceHide` (`{region}_{face}`, region=exterior|interior, faces from
  `BAG_FACES`). UI = collapsible **Outside/Inside** sections with **isometric cube icons** (`_faceCubeSVG`)
  + an "All" toggle (`onLayerAreaGroup`). `toggleLayerArea` flips one face. **Collapsed by default.**
  Plus a **Handles** on/off toggle (`L.faceHide.handles`, `toggleLayerHandles`) — **off by default** for
  every layer (set at creation). The handle hide is applied in `drawArtworkOnBag` by erasing `bagHandleClip`
  (skipped mid 2D-drag → settles on release). Also on the **2D-editor Handles pill** (`facetoggle` region
  `'handles'`). The handle clip is its own UV island, NOT in `BAG_FACES`.
- **2D editor resize**: hold **Shift** = non-proportional (graphics/logos via `L.freeAspect`+scaleH; text via
  `L.stretchX`). Min size = `MIN_LAYER_SCALE` (Testing, default 0.5%).
- **Emboss/Deboss** (`L.extrude`) and the finish's paper-grain share the material's ONE bump slot. Emboss
  claims it when active via `window._embossActive` (set in `overlayArtworkBump`); `realism-engine.js`
  `applyFinishCustomMaps` respects it. Without this, the finish hides emboss.

**Background specifics**
- Created with grid layout (`patStack:'vertical'`), density **3** / gap **0**, box covering the
  **exterior+interior union**, **Inside faces hidden by default** (toggle on → no resize needed).
- Panel order: **Density/Feather → Opacity → Areas → Recolor → Finish** (via `_bgTiledControlsHTML`; **Gap
  removed**; no Scale/Rotation/Move/Emboss/Layout — but material **Finish** is now offered). `L.gap` stays 0 so tiles pack tight.
- **Locked by default. Background "lock" = MOVE-LOCK ONLY** — resize/crop handles, duplicate, delete and all
  panel controls still work; only body drag is blocked (pans instead). Other layer types = full lock.
- Pattern crop/fade masks the **whole pattern region across enabled faces as one** (union bbox), not per tile.

### Social-media text templates
The Text preset picker injects a synthetic **"Social Media"** collection (after the artist collections).
Picking a platform sets `L.social={platform}` + a starter handle; the text renderer draws the platform glyph
left of the handle. Icons + example placeholders live in `SOCIAL_ICONS` / `SOCIAL_PLACEHOLDER` in
`configurator.html` (trademark-safe marks — swap in real brand SVGs there). WhatsApp/Phone placeholder = `9123 4567`.

### Config steps (left panel)
6 steps: **Start · Design · Exterior · Interior · Handles · Review** (`CONFIG_STEP_COUNT=6`, `goConfigStep`,
`applyStepCamera`, `STEP_PART`). Step number is the source of truth — pills (`data-cstep-pill`), sections
(`data-cstep`), `STEP_PART` and `applyStepCamera` must all agree. The active pill auto-centers in the row.

### Templates & designer mode (configurator)
A self-contained block at the **end of `configurator.html`** (after `</body>`'s last script) adds the template
system. **Invariant: `LOCKS` is null in normal/designer use, so the core configurator is unchanged unless a
client opens a template.** It monkey-patches the render fns (e.g. `_layoutPickerHTML`, `buildLayerBodyHTML`)
so they return original output when `LOCKS` is null.
- **Designer mode** = `?designer=1` (reached only via the unlisted `designer/` portal). Shows the **Testing
  panel** (hidden for everyone else — `#testing-panel{display:none}` + `body.imp-designer`), a **Designer bar**
  (`🔒 Locks` / `📷 Render` / `⬇ Export template`), and the **Locks panel** (`LK`).
- **Export** (`IMPRINT_exportTemplate`) = `_snapshotState()` (layer images serialized to `_imgSrc`/`_srcImgSrc`)
  + `locks` + `meta` → downloaded `<id>.template.json`. `📷 Render` (`IMPRINT_captureRender`) downloads a PNG of
  the 3D canvas. Commit both to `templates/` + add to `templates/index.json`.
- **Client** = `?template=<id>` → fetch `templates/<id>.template.json` → rebuild layer images → `_restoreState`
  → mark layers `_tplLock` → `_applyLocks()` (hide locked sizes/steps/add-layer + lock layers) → land on Design.
  `_tplLock` layers get a **minimal panel** (`_clientPanel`: only the designer-allowed text / colour / social);
  geometry is locked via the `_tplLock` guards in `_aDown`/`_hitHandle`. Clients **never** see Testing.

## Presets folders + manifests  ⚠️ IMPORTANT
The "Presets" picker reads three TYPE folders, each holding COLLECTION sub-folders:
```
text/        graphic/        background/      ← layer types
  Essentials/       …          …             ← collections (UI name = folder, "_"→" ")
  Display/                     …
  index.json                                  ← manifest (REQUIRED on Pages)
```
- Collection UI name = folder name with `_`→` `. **Underscores only, no apostrophes/spaces.**
- File types: `text/`=fonts (.ttf/.otf/.woff/.woff2); `graphic/` & `background/`=images
  (.svg/.png/.jpg/.webp/.gif). Keep image files small (faster thumbnails).
- Picker shows **3 designs per collection**, then "Show more" reveals **+6** each time,
  loading thumbnails left-to-right with a skeleton placeholder.
- Collection order: `Essentials` first (special-cased), then the rest A→Z.
- Each TYPE folder has a `README.txt` with the same instructions.

**Current collections (regenerate manifests after any change):**
- `text/`: **Essentials** = 9 basic fonts (Inter, Roboto, Montserrat, Lora, Playfair Display, Oswald,
  Poppins, Merriweather, Dancing Script); **Display** = display/script fonts. ("Social Media" is
  synthetic — NOT a folder; see SOCIAL_ICONS.) Preset font labels show `_`→space.
- `graphic/`: **Essentials** = 30 solid-colour shapes (square, circle, line, then the rest), each SVG
  with a **tight auto-cropped viewBox** so the layer bounding box hugs the shape; **Illustrations** = stock art;
  **Eid_Al_Fitr** + **Ramadan** + **Positivity** = themed SVG sets (GCC-relevant).
- `background/`: **Essentials** (basic patterns + the legacy `pattern_N.svg`) + **Arabesque** + **Cosmic**
  + **Florals** + **Spring** + **Summer** + **Autumn**. Background preset thumbnails are **square-cropped**
  (`object-fit:cover`, full-bleed) so rectangular patterns don't look rectangular; graphic/text thumbs stay `contain`.

**When you add/rename/delete any file or collection, regenerate the manifests** (Pages has
no directory listing, so the picker reads `text|graphic|background/index.json`):
```bash
python3 - <<'PY'
import json, os
TYPES={'text':('.ttf','.otf','.woff','.woff2'),
       'graphic':('.svg','.png','.jpg','.jpeg','.webp','.gif'),
       'background':('.svg','.png','.jpg','.jpeg','.webp','.gif')}
key=lambda n:(0,'') if n=='Essentials' else (1,n.lower())
for typ,exts in TYPES.items():
    if not os.path.isdir(typ): continue
    cols=[]
    for col in sorted([d for d in os.listdir(typ) if os.path.isdir(typ+'/'+d) and not d.startswith('.')], key=key):
        files=sorted(f for f in os.listdir(typ+'/'+col) if f.lower().endswith(exts) and not f.startswith('.'))
        if files: cols.append({'name':col,'files':files})
    json.dump(cols, open(typ+'/index.json','w',encoding='utf-8'), ensure_ascii=False, indent=0)
    print(typ,[(c['name'],len(c['files'])) for c in cols])
PY
```
(The legacy region-pattern feature still reads `background/Essentials/pattern_N.svg`.)

## 2D-editor performance (important)
The 2D editor shows the flat bag; the 3D view shrinks to a small **"Live preview"** (bottom-right).
- The 3D scene (incl. post-FX) is **throttled while in 2D**, NOT paused — `animate()` re-renders it every
  `A2D.previewInterval` s (Testing "Live preview update", default **0.5s**; 0 = real-time). This is what keeps
  drag FPS high while the preview still updates/rotates. **Don't revert to a full pause** (froze the preview).
- During a drag: the atlas re-bake is **coalesced to one per rAF** (`a2d._bakeDirty` consumed in the 2D loop),
  finishes/bump/history are skipped (`_a2dDragging`), the filtered backdrop is cached when idle, and the canvas
  rect is cached (`a2d._rect`).

### Slider performance (`PERF`, Testing → "Performance")
Every slider `oninput` triggers a full `drawBagTexture()`. The **`PERF`** config (defined just above
`drawBagTexture`) cuts the cost while a range `<input>` is dragged — `_sliderDragging` is set by a global
pointerdown/up on range inputs, and `_endSliderDrag` does one full-quality bake on release. Toggles:
- **coalesce** (#1) — `drawBagTexture` self-coalesces to one bake per rAF while dragging (also one GPU upload).
- **skipHeavy** (#2) — finish/bump/emboss/history skipped while dragging, via `_lightBake()`.
- **colorOnly** (#3) — Opacity/Hue/Saturation handlers set `_colorOnlyEdit` → skip finish/bump (shape unchanged).
- **throttleRender** (#4) — `animate()` caps the 3D render to `PERF.dragFps` while dragging.
- **debounceRecolor** (#5) · **reducePostFX** (#9, saves/restores SSAO/DOF/Bloom) · **cacheBase** (#6, experimental,
  off) · **eventThrottle** (#10, off). `_lightBake()` gates ONLY the heavy passes — face/handle-hide stays correct.

## Testing / admin defaults (current)
- Finishes default to **soft-touch** (ext/int/handles). HDRI env = **studio3**, intensity ~1.10.
- Floor: roughness **1.00**, reflectivity (env) **0.00**. **Bloom OFF, FXAA OFF.**
- **Finish/emboss map resolution = 1024 by default** (`PBR_SIZE`/`BUMP_SIZE`/`EMB_SIZE`). 2048 is **1:1 with
  the colour atlas** (crisper foil/gloss) but **4× the bake cost**, so it's kept at 1024 so templates/clients
  load fast; raise it for hero render captures. Testing → **3D Quality** has two controls:
  *"Finish & emboss quality"* (`onFinishQuality`, slider value = 2ⁿ exponent 9–12 → 512…4096; re-inits the
  PBR + bump maps and re-bakes) and *"3D render quality"* (`onRenderQuality`, supersamples via
  `T.renderer.setPixelRatio(base×mul)`, clamped ≤3; the EffectComposer auto-syncs each frame through
  realism's `_rlmSyncSize()`, so **no `realism-engine.js` edit / `?v=` bump is needed**).
- **Template load coalesces bakes**: `_finishTpl` sets `window._tplRestoring` while it restores state +
  rebuilds each sticker's cutout/recolor (all async), so `drawBagTexture` swallows those intermediate bakes
  and does **one** full bake when every sticker has settled. Without this a sticker-heavy template baked 4–5×.
- 2D-editor labels: **Label size 16**, **Sub-label size 12**, **Sub-label opacity 60%** (`A2D.subLabelOpacity`).
  Sub-labels sit at each face's bottom-centre. Removed controls: 2D-editor resolution, Atlas edge padding,
  Label/Sub-label bold. Added: **Min layer size** (`MIN_LAYER_SCALE`), **Live preview update** (`previewInterval`),
  **Sub-label opacity**.
- **UI sound**: `_uiSoundOn` (default on), `playUISound`, optional uploaded `_sfx` samples; broad click feedback
  via `_sfxHoverSel` + canvas sub-label/face-toggle clicks.
- "Export current setup as defaults" writes to **localStorage** and overrides the code
  defaults on that browser. If new code defaults don't show, click **Reset Defaults**
  (or clear site data). Fresh visitors always get the code defaults.
- **`POLISH_LOG.md`** = running changelog of small UI/UX polish passes.

## Gotchas (read before editing)
- **`configurator.html` is multi-MB** → the Read tool fails on it. Use `grep -n` and
  `awk 'NR>=A && NR<=B'` with line ranges. The inlined Three.js is one **megabyte-long
  line (~2592)**, which breaks macOS `awk` NR counting — don't trust line numbers derived
  from awk over that line; anchor edits on unique text instead.
- **r128 shares ONE uv transform across all texture maps** (from `map`); per-map `.repeat`
  is ignored. Tiling is done by baking into a canvas via `ctx.createPattern` + scale.
  `onBeforeCompile` shader patches are unreliable (program caching) — avoid.
- **Headless / software-WebGL is slow** (~10 s scene init); NOT representative of a real
  GPU. Don't treat preview-harness load time as the user's experience.
- **Deploy lesson:** a past commit referenced `realism-engine.js` + `vendor/` but never
  committed them → the live site hung forever. Always confirm runtime files are tracked
  before pushing.
- Canvas taint: artwork/HDRI base64 is embedded partly to avoid `file://` canvas taint.
  Same-origin files (dev server / Pages) don't taint, so external assets are fine there.

## Verify a change
Serve locally (above), open `configurator.html`, and confirm the loader clears and the bag
renders with no console errors. The Claude Preview MCP (when available) can drive this; in
the cloud, open the GitHub Pages URL in a browser to review visually.

## Deploy
Push to `main` → GitHub Pages rebuilds in ~1–2 min. Repo: `github.com/ashaaibi/imprint-prototype`.
End commit messages with:
`Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`
