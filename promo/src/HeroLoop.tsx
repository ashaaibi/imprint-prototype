import React from "react";
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { COLORS, SHOWCASE } from "./theme";

const { fontFamily } = loadFont();

// Loop-safe fallback used when no captured 3D footage is supplied: a slow Ken-Burns
// cross-dissolve through the brand renders (modular maths keeps frame 0 == frame N).
const Fallback: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const n = SHOWCASE.length;
  const seg = durationInFrames / n;
  const mod = (x: number) => ((x % durationInFrames) + durationInFrames) % durationInFrames;
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.ink }}>
      {SHOWCASE.map((p, i) => {
        const center = i * seg + seg / 2;
        const d = Math.abs(mod(frame - center + durationInFrames / 2) - durationInFrames / 2);
        const opacity = interpolate(d, [seg / 2 - 16, seg / 2 + 16], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const local = mod(frame - i * seg) / seg; // 0..1 within this image's cycle
        const scale = 1.06 + local * 0.1;
        return (
          <Img
            key={p.src}
            src={staticFile(p.src)}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity, transform: `scale(${scale})` }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

// Muted, seamless-looping hero clip. Pass `footage` (a file in ./public, e.g. the
// configurator's "● Record clip" WebM saved as hero-3d.webm) to play the real 3D spin;
// without it, the Fallback renders so the Studio always previews.
export const HeroLoop: React.FC<{ footage?: string }> = ({ footage }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const words = ["colour.", "the finish.", "your logo.", "in 3D."];
  const seg = durationInFrames / words.length;
  const idx = Math.floor(frame / seg) % words.length;
  const local = frame % seg;
  const capOpacity = interpolate(local, [0, 9, seg - 9, seg], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.ink, fontFamily }}>
      {footage ? (
        <OffthreadVideo src={staticFile(footage)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <Fallback />
      )}

      {/* legibility scrims */}
      <AbsoluteFill style={{ background: "linear-gradient(to top, rgba(10,8,6,0.74), transparent 40%)" }} />

      {/* wordmark */}
      <div style={{ position: "absolute", top: 52, left: 64, fontSize: 40, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>
        IMPRINT<span style={{ color: COLORS.gold }}>®</span>
      </div>

      {/* rotating caption */}
      <div style={{ position: "absolute", left: 64, bottom: 60, color: "#fff" }}>
        <div style={{ fontSize: 30, color: COLORS.fgOnInk, fontWeight: 500 }}>Customise</div>
        <div style={{ fontSize: 78, fontWeight: 800, letterSpacing: "-0.03em", height: 96, lineHeight: "96px" }}>
          <span style={{ opacity: capOpacity, color: COLORS.gold }}>{words[idx]}</span>
        </div>
        <div style={{ fontSize: 25, color: COLORS.fgOnInk, letterSpacing: "0.04em" }}>
          Real-time 3D · auto-routed to vetted makers
        </div>
      </div>
    </AbsoluteFill>
  );
};
