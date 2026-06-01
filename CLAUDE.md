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
- `configurator.html` — **the 3D configurator (centerpiece, ~2.5 MB)**
- `checkout.html` · `confirmation.html` — order flow
- `admin.html` — testing controls · `designer/` · `factory/` — demo stubs
- `shared.css` / `shared.js` — header, GCC country/currency state, helpers
- `realism-engine.js` — 3D realism (post-processing, lighting, floor, per-finish PBR)
- `vendor/three128/` — Three r128 post-FX (EffectComposer, SSAO, Bloom, Bokeh, FXAA, RectAreaLight)
- `vendor/pdfjs/` — PDF.js (PDF artwork import)
- `paper_bag/` — GLB model source · `v1/` — archived old snapshot (ignore) · `materials/` — texture maps

## The 3D configurator (`configurator.html` + `realism-engine.js`)
- Three.js r128, **inlined** into the HTML, plus the GLB bag model and the **studio3 HDRI**
  embedded as **base64** (that's most of the file size). Only studio3 is kept (other HDRIs removed to save memory).
- `realism-engine.js` is loaded with a cache-bust query: `<script src="realism-engine.js?v=9">`.
  **Bump `?v=N` whenever you edit realism-engine.js**, or the browser serves a stale copy.
- `REALISM` config object lives in **configurator.html** (~line 3215); the engine reads it as a global.

### Artwork layer system
`BAG.artwork.layers[]`. Layer kinds:
- **Graphic** (internal `kind:'sticker'`, `tiled:false`) and **Pattern** (`kind:'sticker'`, `tiled:true`) — share the upload/cutout/recolor pipeline.
- **Text** — per-layer fonts via the FontFace API.
- Adding a Graphic/Pattern/Text opens an **add-source prompt** (Upload / Choose from artist library; fonts have no AI option).
- **Edit-background modal** (the cutout modal) holds: background removal, a **draggable crop box**, and a **PDF page selector** (multi-page PDFs).
- **Recolor** is an optional toggle in the layer body (default OFF = keep original colors); up to **10** detected colors; neutral-snap default **0**.
- Pattern crop/fade masks the **whole pattern region across all enabled faces as one** (union bbox), not per tile.

## Artist asset folders + manifests  ⚠️ IMPORTANT
`fonts/` (5), `graphics/` (15), `patterns/` (8). The library pickers list these folders.

GitHub Pages serves **no directory listing**, so each folder has a committed
**`index.json`** manifest (an array of filenames). Loaders try the dir-listing first
(local autoindex) then fall back to `index.json` (Pages).

**When you add, rename, or delete files in `fonts/ graphics/ patterns/`, regenerate the
manifests or the new files WON'T appear on the live site** (they'll still work locally):
```bash
python3 - <<'PY'
import json, os
for folder, exts in [('graphics',('.svg','.png','.jpg','.jpeg','.webp','.gif')),
                     ('fonts',('.ttf','.otf','.woff','.woff2')),
                     ('patterns',('.svg','.png','.jpg','.jpeg','.webp','.gif'))]:
    files = sorted(f for f in os.listdir(folder)
                   if f.lower().endswith(exts) and not f.startswith('.'))
    json.dump(files, open(f'{folder}/index.json','w',encoding='utf-8'),
              ensure_ascii=False, indent=0)
    print(folder, len(files))
PY
```

## Testing / admin defaults (current)
- Finishes default to **soft-touch** (ext/int/handles). HDRI env = **studio3**, intensity ~1.10.
- Floor: roughness **1.00**, reflectivity (env) **0.00**. **Bloom OFF, FXAA OFF.**
- "Export current setup as defaults" writes to **localStorage** and overrides the code
  defaults on that browser. If new code defaults don't show, click **Reset Defaults**
  (or clear site data). Fresh visitors always get the code defaults.

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
