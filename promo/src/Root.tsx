import React from "react";
import { Composition } from "remotion";
import { Promo } from "./Promo";
import { HeroLoop } from "./HeroLoop";

// HeroLoop = the muted 10s landing-hero loop (the main deliverable). Promo = an 18s
// general brand film (16:9 + 1:1). Pass footage to HeroLoop to play captured 3D footage.
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="HeroLoop"
        component={HeroLoop}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ footage: undefined as string | undefined }}
      />
      <Composition
        id="Promo"
        component={Promo}
        durationInFrames={540}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="PromoSquare"
        component={Promo}
        durationInFrames={540}
        fps={30}
        width={1080}
        height={1080}
      />
    </>
  );
};
