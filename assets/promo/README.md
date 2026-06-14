# Landing hero video

Drop a muted, looping hero clip here and the landing page will autoplay it in the hero
(falling back to the product collage on phones / reduced-motion, or if no file is present).

The page looks for these, in order:
- `hero.mp4`   ← the polished Remotion render (preferred)
- `hero.webm`  ← the raw clip from the configurator's "● Record clip" button (works as-is)

How to make one:
1. Open the configurator in designer mode and click **● Record clip** in the Designer bar.
   It records a seamless 360° spin + live recolour to a `.webm`.
2. Either drop that `.webm` here as `hero.webm` (done — instant 3D hero loop), OR
3. Polish it with Remotion: put it in `promo/public/hero-3d.webm`, render the `HeroLoop`
   composition (`cd promo && npx remotion render HeroLoop out/hero.mp4`), and drop the
   result here as `hero.mp4`.
