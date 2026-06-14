# IMPRINT — brand promo (Remotion)

Brand films for the IMPRINT packaging marketplace, built with
[Remotion](https://www.remotion.dev/) (animations defined in React, rendered to MP4).

Compositions:
- **`HeroLoop`** — the landing-page hero loop (**the main deliverable**): a muted, seamless 10 s
  16:9 clip of the **3D customiser** — a product spinning while it recolours — with a rotating
  "Customise _colour / the finish / your logo / in 3D_" caption. Plays the **real 3D footage** you
  capture in the configurator; falls back to a Ken-Burns render dissolve so it always previews.
- **`Promo`** / **`PromoSquare`** — an 18 s general brand film (logo → typewriter tagline →
  product showcase → CTA), 16:9 + 1:1.

## Landing hero loop — the pipeline
The live 3D can't be rendered in CI (no WebGL/GPU), so the 3D footage is captured in a real
browser, then Remotion composites the polish on top:

1. Open the configurator in **designer mode** (`configurator.html?designer=1`) and click
   **● Record clip** in the Designer bar → downloads a seamless 360° spin + recolour as `.webm`.
2. **Quick path:** drop that file straight into the site as `assets/promo/hero.webm` — the landing
   hero autoplays it immediately (no Remotion needed).
3. **Polished path:** save it here as `public/hero-3d.webm`, then render the `HeroLoop` with the
   footage wired in:
   ```bash
   npx remotion render HeroLoop out/hero.mp4 --props='{"footage":"hero-3d.webm"}'
   ```
   Drop `out/hero.mp4` into the site as `assets/promo/hero.mp4` (preferred over the raw webm).

> **Why a separate project?** Remotion renders *video files*, which are heavy to autoplay on a
> fast marketplace. So the live site uses lightweight CSS/JS animations, and this folder produces
> a polished promo clip you can drop into a pitch deck, the hero, or social — rendered on demand.

## Prerequisites
- Node 18+ (this repo's environment has Node 22).
- Remotion downloads a headless browser + bundles ffmpeg automatically on first render — so you
  just need Node. (That's also why this can't be rendered in the headless CI sandbox; render it
  on your machine or a CI runner that allows the Chromium download.)

## Use it
```bash
cd promo
npm install

# Preview + scrub in the browser studio:
npm run dev            # opens Remotion Studio at http://localhost:3000

# Render to MP4:
npm run render         # → out/imprint-promo.mp4   (1920×1080)
npm run render:square  # → out/imprint-promo-square.mp4  (1080×1080, for social)

# Grab a poster frame:
npm run still          # → out/poster.png
```

## Customise
- **`src/theme.ts`** — brand colours, the rotating words, and the showcase images/labels.
- **`src/Promo.tsx`** — the four scenes (`SceneLogo`, `SceneTagline`, `SceneShowcase`, `SceneClose`).
  Durations live in `Promo`'s `<Series>` (90 + 150 + 150 + 150 = 540 frames @ 30 fps).
- **`public/`** — the brand renders shown in the showcase (copied from the site's assets). Swap in
  3D captures from the configurator's **📷 Render** button for the freshest hero shots.
- **`src/Root.tsx`** — composition sizes/durations (add more aspect ratios here, e.g. 9:16 reels).

If Remotion reports a version mismatch after install, run `npm run upgrade` to align all
`remotion` / `@remotion/*` packages to one version.
