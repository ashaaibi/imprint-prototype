import React from "react";
import { Composition } from "remotion";
import { Promo } from "./Promo";

// 18s @ 30fps. A 16:9 master plus a 1:1 cut for social.
export const RemotionRoot: React.FC = () => {
  return (
    <>
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
