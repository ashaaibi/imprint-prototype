import React from "react";
import {
  AbsoluteFill,
  Img,
  Series,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { COLORS, ROTATING_WORDS, SHOWCASE } from "./theme";

const { fontFamily } = loadFont();

// ─── Deterministic typewriter (no timers — must be a pure function of frame so
//     every rendered frame is reproducible). Returns the visible substring. ───
const PER_CHAR = 4; // frames to type one char
const HOLD = 34; // frames to hold the full word
const PER_DEL = 2; // frames to delete one char
function typed(frame: number, words: string[]): string {
  const segs = words.map((w) => ({
    w,
    type: w.length * PER_CHAR,
    del: w.length * PER_DEL,
  }));
  const cycle = segs.reduce((s, x) => s + x.type + HOLD + x.del, 0);
  let f = ((frame % cycle) + cycle) % cycle;
  for (const s of segs) {
    if (f < s.type) return s.w.slice(0, Math.min(s.w.length, Math.floor(f / PER_CHAR) + 1));
    f -= s.type;
    if (f < HOLD) return s.w;
    f -= HOLD;
    if (f < s.del) return s.w.slice(0, Math.max(0, s.w.length - (Math.floor(f / PER_DEL) + 1)));
    f -= s.del;
  }
  return "";
}

const wrap: React.CSSProperties = {
  fontFamily,
  justifyContent: "center",
  alignItems: "center",
  textAlign: "center",
};

// ─── Scene 1 — logo reveal ───
const SceneLogo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 200, mass: 0.7 } });
  const eyebrow = interpolate(frame, [18, 40], [0, 1], { extrapolateRight: "clamp" });
  const line = interpolate(frame, [26, 60], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ ...wrap, backgroundColor: COLORS.ink, flexDirection: "column" }}>
      <div
        style={{
          fontSize: 150,
          fontWeight: 800,
          letterSpacing: "-0.04em",
          color: "#fff",
          transform: `scale(${interpolate(pop, [0, 1], [0.82, 1])})`,
          opacity: pop,
        }}
      >
        IMPRINT<span style={{ color: COLORS.gold }}>®</span>
      </div>
      <div
        style={{
          height: 3,
          width: interpolate(line, [0, 1], [0, 360]),
          background: `linear-gradient(90deg, transparent, ${COLORS.gold}, transparent)`,
          marginTop: 14,
        }}
      />
      <div
        style={{
          marginTop: 22,
          fontSize: 24,
          letterSpacing: "0.42em",
          textTransform: "uppercase",
          color: COLORS.fgOnInk,
          opacity: eyebrow,
        }}
      >
        The packaging marketplace
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 2 — typewriter tagline ───
const SceneTagline: React.FC = () => {
  const frame = useCurrentFrame();
  const word = typed(frame, ROTATING_WORDS);
  const caret = Math.floor(frame / 14) % 2 === 0 ? 1 : 0;
  const intro = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ ...wrap, backgroundColor: COLORS.paper, flexDirection: "column" }}>
      <div style={{ opacity: intro, fontSize: 72, fontWeight: 700, letterSpacing: "-0.02em", color: COLORS.ink }}>
        Where{" "}
        <span style={{ color: COLORS.ink }}>{word}</span>
        <span
          style={{
            display: "inline-block",
            width: 5,
            height: 64,
            background: COLORS.goldBright,
            transform: "translateY(10px)",
            marginLeft: 4,
            opacity: caret,
          }}
        />{" "}
        meet.
      </div>
      <div style={{ opacity: intro, marginTop: 26, fontSize: 26, color: COLORS.fgOnPaper, maxWidth: 900, lineHeight: 1.5 }}>
        One platform connecting independent artists, the brands who love their work, and vetted makers.
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 3 — product showcase (staggered, Ken-Burns) ───
const ShowcaseCard: React.FC<{ src: string; label: string; index: number }> = ({ src, label, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, delay: 8 + index * 8, config: { damping: 200 } });
  const kb = interpolate(frame, [0, 150], [1.12, 1.0], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        flex: 1,
        height: 620,
        borderRadius: 22,
        overflow: "hidden",
        position: "relative",
        boxShadow: "0 30px 60px rgba(0,0,0,0.28)",
        transform: `translateY(${interpolate(enter, [0, 1], [60, 0])}px)`,
        opacity: enter,
      }}
    >
      <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${kb})` }} />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: "40px 22px 20px",
          background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)",
          color: "#fff",
          fontSize: 22,
          fontWeight: 600,
        }}
      >
        {label}
      </div>
    </div>
  );
};

const SceneShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const head = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ ...wrap, backgroundColor: COLORS.paper, flexDirection: "column", padding: 80 }}>
      <div style={{ opacity: head, fontSize: 44, fontWeight: 700, color: COLORS.ink, marginBottom: 40, letterSpacing: "-0.02em" }}>
        Designer templates, ready to customise in <span style={{ color: COLORS.goldBright }}>real-time 3D</span>.
      </div>
      <div style={{ display: "flex", gap: 26, width: "100%" }}>
        {SHOWCASE.map((p, i) => (
          <ShowcaseCard key={p.src} src={p.src} label={p.label} index={i} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 4 — closing ───
const word3: React.CSSProperties = { fontSize: 86, fontWeight: 800, letterSpacing: "-0.03em" };
const SceneClose: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = ["Artists.", "Brands.", "Makers."];
  const tail = interpolate(frame, [70, 95], [0, 1], { extrapolateRight: "clamp" });
  const cta = spring({ frame, fps, delay: 100, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ ...wrap, backgroundColor: COLORS.ink, flexDirection: "column" }}>
      <div style={{ display: "flex", gap: 26 }}>
        {words.map((w, i) => {
          const a = interpolate(frame, [i * 14, i * 14 + 18], [0, 1], { extrapolateRight: "clamp" });
          return (
            <span key={w} style={{ ...word3, color: i === 1 ? COLORS.gold : "#fff", opacity: a, transform: `translateY(${interpolate(a, [0, 1], [24, 0])}px)` }}>
              {w}
            </span>
          );
        })}
      </div>
      <div style={{ opacity: tail, fontSize: 40, color: COLORS.fgOnInk, marginTop: 18, fontWeight: 500 }}>
        One seamless flow — design to doorstep.
      </div>
      <div style={{ opacity: cta, transform: `scale(${interpolate(cta, [0, 1], [0.9, 1])})`, marginTop: 54, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div style={{ fontSize: 64, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em" }}>
          IMPRINT<span style={{ color: COLORS.gold }}>®</span>
        </div>
        <div style={{ fontSize: 26, color: COLORS.goldBright, letterSpacing: "0.04em" }}>
          Customise in 3D · ashaaibi.github.io/imprint-prototype
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const Promo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.ink }}>
      <Series>
        <Series.Sequence durationInFrames={90}>
          <SceneLogo />
        </Series.Sequence>
        <Series.Sequence durationInFrames={150}>
          <SceneTagline />
        </Series.Sequence>
        <Series.Sequence durationInFrames={150}>
          <SceneShowcase />
        </Series.Sequence>
        <Series.Sequence durationInFrames={150}>
          <SceneClose />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
