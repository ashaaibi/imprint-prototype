# IMPRINT — brand promo (Remotion)

A short, cinematic brand film for the IMPRINT packaging marketplace, built with
[Remotion](https://www.remotion.dev/) (animations defined in React, rendered to MP4).

It mirrors the live-site motion: a logo reveal → the **typewriter tagline**
("Where _artists / brands / makers_ meet.") → a real product showcase → a closing CTA.
~18 s, exported in 16:9 (1920×1080) and a 1:1 social cut.

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
