// Ten styles added for the Vitral Bíblico project (2026-11-22), on the same rules as the rest:
// the story owns all timing (storyAt), the style owns all looks; deterministic (seeded hash, no Math.random).
// Techniques: SVG turbulence/displacement/lighting filters for textures (felt, oil, pastel, mosaic),
// sampled outlines for light-drawn styles (dots, gold line, constellation), clip-path facets (origami),
// cel + effects timing for sakuga and comic.
import { getLength, getPointAtLength } from "@remotion/paths";
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Paper, Rough, Stage, region } from "../../kit";
import { H, KNOB, P, W, rot, steamPath, storyAt } from "../../story";

type S = ReturnType<typeof storyAt>;
type Pt = { x: number; y: number };
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const kT = (s: S) => `translate(${s.kx.toFixed(1)} ${s.ky.toFixed(1)}) rotate(${s.tilt.toFixed(2)})`;
const toW = (p: Pt, s: S): Pt => {
  const r = rot(p.x, p.y, s.tilt);
  return { x: s.kx + r.x, y: s.ky + r.y };
};

// Outline points of a path, every `step` px (paths are constants, so cache them).
const cache = new Map<string, Pt[]>();
const sample = (d: string, step: number): Pt[] => {
  const key = `${step}|${d}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const len = getLength(d);
  const n = Math.max(2, Math.floor(len / step));
  const pts = Array.from({ length: n }, (_, i) => {
    const p = getPointAtLength(d, (i / n) * len);
    return { x: p?.x ?? 0, y: p?.y ?? 0 };
  });
  cache.set(key, pts);
  return pts;
};
const circlePts = (cx: number, cy: number, r: number, n: number): Pt[] =>
  Array.from({ length: n }, (_, i) => ({ x: cx + r * Math.cos((i / n) * Math.PI * 2), y: cy + r * Math.sin((i / n) * Math.PI * 2) }));

// The kettle's outline parts (local coords) and the cup's (world coords).
const KETTLE_PARTS = [P.kettleBody, P.kettleLid, P.kettleSpout, P.kettleHandle, P.kettleBand];
const CUP_PARTS = [P.kulhadOutline, P.rim];
const kettlePts = (s: S, step: number) => [
  ...KETTLE_PARTS.flatMap((d) => sample(d, step)),
  ...circlePts(KNOB.x, KNOB.y, KNOB.r, 6),
].map((p) => toW(p, s));
const cupPts = (step: number) => CUP_PARTS.flatMap((d) => sample(d, step));

// Is a point inside the cup (below the chai surface)? The kulhad body is a trapezoid 800..1040.
const inCup = (x: number, y: number, top: number) => {
  if (y < top || y > 1040) return false;
  const k = (y - 800) / 240;
  return x > 370 + 55 * k && x < 710 - 55 * k;
};
// The stream as points (for dotted / starry styles).
const streamPts = (s: S, n: number, f: number, speed = 0.25): Pt[] => {
  if (!s.streaming) return [];
  const m = (s.stream.match(/-?\d+(\.\d+)?/g) as string[]).map(Number);
  return Array.from({ length: n }, (_, i) => {
    const t = (i + ((f * speed) % 1)) / n;
    return {
      x: (1 - t) * (1 - t) * m[0] + 2 * (1 - t) * t * m[2] + t * t * m[4],
      y: (1 - t) * (1 - t) * m[1] + 2 * (1 - t) * t * m[3] + t * t * m[5],
    };
  });
};
const lerpHex = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * Math.max(0, Math.min(1, t))).toString(16).padStart(2, "0")).join("")}`;
};
const Liquid: React.FC<{ s: S; fill: string; id: string; extra?: React.ReactNode }> = ({ s, fill, id, extra }) =>
  s.level > 0 ? (
    <g clipPath={`url(#${id})`}>
      <rect x={300} y={s.surface.cy} width={480} height={300} fill={fill} />
      <ellipse cx={s.surface.cx} cy={s.surface.cy} rx={s.surface.rx} ry={s.surface.ry} fill={fill} />
      {extra}
    </g>
  ) : null;

// ───────────────────────────── 90 Needle felt ─────────────────────────────
// Wool shapes on a felt board: fuzzy edges (displacement), fibres, puffy light. Stepped on twos like stop-motion.
const NF = { board: "#e7d8bd", kettle: "#3d7f8f", lid: "#2c6271", band: "#e2b85a", cup: "#c8683f", rim: "#a9522f", chai: "#7c4220", steam: "#f6f1e7" };
export const NeedleFelt: React.FC = () => {
  const f0 = useCurrentFrame();
  const f = Math.floor(f0 / 2) * 2;
  const s = storyAt(f);
  const wob = (k: number) => (hash(Math.floor(f0 / 2) * 7 + k) - 0.5) * 2;
  return (
    <Stage bg={NF.board} defs={
      <>
        <filter id="nf-felt" {...region}>
          <feTurbulence type="fractalNoise" baseFrequency={0.05} numOctaves={2} seed={3 + (Math.floor(f0 / 2) % 3)} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={9} xChannelSelector="R" yChannelSelector="G" result="d" />
          <feTurbulence type="fractalNoise" baseFrequency={0.75} numOctaves={3} seed={9} result="fib" />
          <feDisplacementMap in="d" in2="fib" scale={9} xChannelSelector="R" yChannelSelector="G" result="fuzzy" />
          <feGaussianBlur in="fuzzy" stdDeviation={5} result="b" />
          <feDiffuseLighting in="b" surfaceScale={5} diffuseConstant={1.05} lightingColor="#ffffff" result="lit">
            <feDistantLight azimuth={235} elevation={52} />
          </feDiffuseLighting>
          <feComposite in="lit" in2="fuzzy" operator="in" result="litc" />
          <feBlend in="fuzzy" in2="litc" mode="multiply" result="sh" />
          <feColorMatrix in="fib" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.6 -0.95" result="hair" />
          <feComposite in="hair" in2="fuzzy" operator="in" result="hairc" />
          <feBlend in="sh" in2="hairc" mode="screen" result="wool" />
          <feDropShadow in="wool" dx={4} dy={9} stdDeviation={5} floodColor="#4a3420" floodOpacity={0.35} />
        </filter>
        <filter id="nf-board" {...region}>
          <feTurbulence type="fractalNoise" baseFrequency={0.9} numOctaves={4} seed={21} />
          <feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.36  0 0 0 0 0.25  0 0 0 0.8 -0.3" />
        </filter>
        <clipPath id="nf-cup"><path d={P.kulhadBody} /></clipPath>
      </>
    }>
      <rect width={W} height={H} filter="url(#nf-board)" />
      <rect x={40} y={40} width={W - 80} height={H - 80} rx={30} fill="none" stroke="#b9a07a" strokeWidth={5} strokeDasharray="18 14" />
      <ellipse cx={540} cy={1075} rx={230} ry={30} fill="#5b4428" opacity={0.18} />
      <g filter="url(#nf-felt)">
        <path d={P.kulhadBody} fill={NF.cup} />
        <Liquid s={s} fill={NF.chai} id="nf-cup" />
        <path d={P.rim} fill="none" stroke={NF.rim} strokeWidth={16} />
        {s.streaming ? <path d={s.stream} fill="none" stroke={NF.chai} strokeWidth={20} strokeLinecap="round" /> : null}
        <g transform={kT(s) + ` translate(${wob(1)} ${wob(2)})`}>
          <path d={P.kettleHandle} fill="none" stroke={NF.lid} strokeWidth={34} strokeLinecap="round" />
          <path d={P.kettleSpout} fill={NF.kettle} />
          <path d={P.kettleBody} fill={NF.kettle} />
          <path d={P.kettleBand} fill="none" stroke={NF.band} strokeWidth={16} strokeLinecap="round" />
          <path d={P.kettleLid} fill={NF.lid} />
          <circle cx={KNOB.x} cy={KNOB.y} r={KNOB.r + 6} fill={NF.band} />
        </g>
        {s.steam.map((p, i) =>
          p > 0 ? <path key={i} d={steamPath(i, p, f * 0.05)} fill="none" stroke={NF.steam} strokeWidth={24} strokeLinecap="round" opacity={0.95} /> : null,
        )}
      </g>
    </Stage>
  );
};

// ───────────────────────────── 91 Origami ─────────────────────────────
// Folded paper: each shape is a polygon split into fan facets, lit from the top left; crease lines; kraft paper.
const ORI = { bg: "#d9c4a0", kettleL: "#3f8fa0", kettleD: "#1f5664", cupL: "#e0784a", cupD: "#9a4426", chaiL: "#9b5a2c", chaiD: "#5a2e14", steamL: "#fbf7ef", steamD: "#d9d0c0" };
const facets = (poly: Pt[], c: Pt, light: string, dark: string, key: string) =>
  poly.map((p, i) => {
    const q = poly[(i + 1) % poly.length];
    const mx = (p.x + q.x) / 2 - c.x;
    const my = (p.y + q.y) / 2 - c.y;
    const tone = 0.5 + 0.5 * Math.cos(Math.atan2(my, mx) - Math.atan2(-1, -0.8)) + (hash(i + key.length) - 0.5) * 0.25;
    return (
      <path key={`${key}${i}`} d={`M${c.x.toFixed(1)},${c.y.toFixed(1)} L${p.x.toFixed(1)},${p.y.toFixed(1)} L${q.x.toFixed(1)},${q.y.toFixed(1)} Z`}
        fill={lerpHex(dark, light, tone)} stroke={lerpHex(dark, light, tone + 0.25)} strokeWidth={1.2} strokeLinejoin="round" />
    );
  });
const poly = (d: string, n: number) => {
  const len = getLength(d);
  return Array.from({ length: n }, (_, i) => {
    const p = getPointAtLength(d, (i / n) * len);
    return { x: p?.x ?? 0, y: p?.y ?? 0 };
  });
};
export const Origami: React.FC = () => {
  const f = useCurrentFrame();
  const s = storyAt(f);
  const kBody = poly(P.kettleBody, 9);
  const kSpout = poly(P.kettleSpout, 5);
  const kLid = poly(P.kettleLid, 3);
  const cup = poly(P.kulhadBody, 8);
  const surf = s.surface;
  const liquid = s.level > 0 ? Array.from({ length: 6 }, (_, i) => ({ x: surf.cx + surf.rx * 0.92 * Math.cos((i / 6) * Math.PI * 2 + 0.3), y: surf.cy + surf.ry * 0.85 * Math.sin((i / 6) * Math.PI * 2 + 0.3) })) : [];
  return (
    <Stage bg={ORI.bg} defs={
      <>
        <filter id="or-sh" {...region}><feDropShadow dx={8} dy={14} stdDeviation={7} floodColor="#5a4426" floodOpacity={0.35} /></filter>
      </>
    }>
      <Paper id="or-paper" opacity={0.55} freq={0.7} />
      <path d="M0,1080 L1080,1000 L1080,1350 L0,1350 Z" fill="#cbb38c" />
      <g filter="url(#or-sh)">
        {facets(cup, { x: 500, y: 930 }, ORI.cupL, ORI.cupD, "c")}
        {liquid.length ? facets(liquid, { x: surf.cx - 20, y: surf.cy - 4 }, ORI.chaiL, ORI.chaiD, "l") : null}
        {s.streaming ? <path d={s.stream} fill="none" stroke={ORI.chaiD} strokeWidth={14} strokeLinejoin="miter" /> : null}
        <g transform={kT(s)}>
          <path d="M140,-42 L232,-30 L224,70 L140,92" fill="none" stroke={ORI.kettleD} strokeWidth={22} strokeLinejoin="miter" />
          {facets(kSpout, { x: -170, y: -20 }, ORI.kettleL, ORI.kettleD, "s")}
          {facets(kBody, { x: -20, y: 20 }, ORI.kettleL, ORI.kettleD, "k")}
          {facets(kLid, { x: 0, y: -100 }, ORI.cupL, ORI.cupD, "d")}
          <path d={`M${KNOB.x - 18},${KNOB.y + 12} L${KNOB.x},${KNOB.y - 22} L${KNOB.x + 18},${KNOB.y + 12} Z`} fill={ORI.cupD} />
        </g>
        {s.steam.map((p, i) => {
          if (p <= 0) return null;
          const pts = sample(steamPath(i, p, f * 0.04), 46);
          return <polyline key={i} points={pts.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(" ")} fill="none" stroke={i % 2 ? ORI.steamD : ORI.steamL} strokeWidth={18} strokeLinejoin="miter" />;
        })}
      </g>
    </Stage>
  );
};

// ───────────────────────────── 92 Gold dots ─────────────────────────────
// Points of light on navy: outlines become gold dots that twinkle; the chai fills dot by dot.
const GOLD = "#e2b85a";
const Glow: React.FC<{ id: string; r: number }> = ({ id, r }) => (
  <filter id={id} {...region}>
    <feGaussianBlur stdDeviation={r} result="b" />
    <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
  </filter>
);
const sky = (id: string) => (
  <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stopColor="#0b1a33" /><stop offset="100%" stopColor="#050b18" />
  </linearGradient>
);
const STARS = Array.from({ length: 160 }, (_, i) => ({ x: hash(i * 3) * W, y: hash(i * 3 + 1) * H, r: 0.6 + hash(i * 3 + 2) * 1.6 }));
export const GoldDots: React.FC = () => {
  const f = useCurrentFrame();
  const s = storyAt(f);
  const appear = (i: number, n: number, t0: number) => interpolate(f, [t0 + (i / n) * 24, t0 + (i / n) * 24 + 6], [0, 1], clamp);
  const cup = cupPts(13);
  const kettle = kettlePts(s, 13);
  const fill: Pt[] = [];
  if (s.level > 0) for (let y = 1032; y > s.surface.cy; y -= 13) for (let x = 382; x < 700; x += 13) if (inCup(x + ((y / 13) % 2) * 6, y, s.surface.cy)) fill.push({ x: x + ((y / 13) % 2) * 6, y });
  const tw = (i: number) => 0.62 + 0.38 * Math.sin(f * 0.22 + i * 1.7);
  return (
    <Stage bg="#050b18" defs={<>{sky("gd-sky")}<Glow id="gd-glow" r={4} /></>}>
      <rect width={W} height={H} fill="url(#gd-sky)" />
      {STARS.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={p.r} fill="#f0e9da" opacity={0.25 * tw(i)} />)}
      <g filter="url(#gd-glow)">
        {cup.map((p, i) => <circle key={`c${i}`} cx={p.x} cy={p.y} r={4.2} fill={GOLD} opacity={appear(i, cup.length, 0) * tw(i)} />)}
        {fill.map((p, i) => <circle key={`f${i}`} cx={p.x} cy={p.y} r={3.4} fill="#f0d08a" opacity={0.85 * tw(i + 9)} />)}
        {kettle.map((p, i) => <circle key={`k${i}`} cx={p.x} cy={p.y} r={4.4} fill={GOLD} opacity={tw(i + 3)} />)}
        {streamPts(s, 22, f).map((p, i) => <circle key={`s${i}`} cx={p.x} cy={p.y} r={4.6} fill="#f6dc9a" />)}
        {s.steam.map((p, i) => (p > 0 ? sample(steamPath(i, p, f * 0.05), 16).map((q, k) => <circle key={`st${i}-${k}`} cx={q.x} cy={q.y} r={3.2} fill="#f0e9da" opacity={0.75 * tw(k + i * 5)} />) : null))}
      </g>
    </Stage>
  );
};

// ───────────────────────────── 93 Gold line ─────────────────────────────
// One glowing gold line draws every outline (draw-on with dash offset); the chai fills with gold hatching.
export const GoldLine: React.FC = () => {
  const f = useCurrentFrame();
  const s = storyAt(f);
  const draw = (t0: number, t1: number) => interpolate(f, [t0, t1], [1, 0], clamp);
  const line = { fill: "none", stroke: GOLD, strokeWidth: 5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, pathLength: 1, strokeDasharray: "1 1" };
  const hatch: React.ReactNode[] = [];
  if (s.level > 0) for (let y = 1030; y > s.surface.cy; y -= 16) hatch.push(<path key={y} d={`M360,${y} L720,${y - 8}`} stroke="#f0d08a" strokeWidth={2.4} opacity={0.8} />);
  return (
    <Stage bg="#050b18" defs={<>{sky("gl-sky")}<Glow id="gl-glow" r={6} /><clipPath id="gl-cup"><path d={P.kulhadBody} /></clipPath></>}>
      <rect width={W} height={H} fill="url(#gl-sky)" />
      <g filter="url(#gl-glow)">
        <path d={P.kulhadOutline} {...line} strokeDashoffset={draw(0, 22)} />
        <path d={P.rim} {...line} strokeDashoffset={draw(8, 30)} />
        <g clipPath="url(#gl-cup)">{hatch}</g>
        {s.level > 0 ? <ellipse cx={s.surface.cx} cy={s.surface.cy} rx={s.surface.rx} ry={s.surface.ry} fill="none" stroke={GOLD} strokeWidth={3} /> : null}
        {s.streaming ? <path d={s.stream} fill="none" stroke="#f6dc9a" strokeWidth={6} strokeLinecap="round" /> : null}
        <g transform={kT(s)}>
          {KETTLE_PARTS.map((d, i) => <path key={i} d={d} {...line} strokeDashoffset={draw(i * 3, 20 + i * 3)} />)}
          <circle cx={KNOB.x} cy={KNOB.y} r={KNOB.r} {...line} strokeDashoffset={draw(14, 26)} />
        </g>
        {s.steam.map((p, i) => (p > 0 ? <path key={i} d={steamPath(i, p, f * 0.05)} fill="none" stroke="#f0e9da" strokeWidth={3.5} strokeLinecap="round" opacity={0.85} /> : null))}
      </g>
    </Stage>
  );
};

// ───────────────────────────── 94 Constellation ─────────────────────────────
// Stars sit on the outlines and join up one by one; the chai is a cluster of small stars.
const CUP_STARS = Array.from({ length: 220 }, (_, i) => ({ x: 380 + hash(i * 7 + 1) * 320, y: 790 + hash(i * 7 + 2) * 250, r: 1 + hash(i * 7 + 3) * 2.2 }));
export const Constellation: React.FC = () => {
  const f = useCurrentFrame();
  const s = storyAt(f);
  const cup = cupPts(40);
  const kettle = kettlePts(s, 40);
  const on = (i: number, n: number, t0: number, span = 30) => interpolate(f, [t0 + (i / n) * span, t0 + (i / n) * span + 5], [0, 1], clamp);
  const star = (p: Pt, a: number, key: string, big: boolean) =>
    a > 0 ? (
      <g key={key} opacity={a}>
        <circle cx={p.x} cy={p.y} r={big ? 4.5 : 3} fill="#fff6dc" />
        {big ? <path d={`M${p.x - 14},${p.y} L${p.x + 14},${p.y} M${p.x},${p.y - 14} L${p.x},${p.y + 14}`} stroke="#fff6dc" strokeWidth={1.4} opacity={0.7} /> : null}
      </g>
    ) : null;
  const links = (pts: Pt[], t0: number, key: string) =>
    pts.map((p, i) => {
      const q = pts[(i + 1) % pts.length];
      const k = on(i, pts.length, t0 + 6);
      if (k <= 0 || Math.hypot(q.x - p.x, q.y - p.y) > 90) return null;
      return <path key={`${key}${i}`} d={`M${p.x},${p.y} L${p.x + (q.x - p.x) * k},${p.y + (q.y - p.y) * k}`} stroke="#c9a85a" strokeWidth={1.6} opacity={0.75} />;
    });
  return (
    <Stage bg="#040914" defs={<>{sky("co-sky")}<Glow id="co-glow" r={3} /></>}>
      <rect width={W} height={H} fill="url(#co-sky)" />
      {STARS.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={p.r} fill="#f0e9da" opacity={0.3 + 0.25 * Math.sin(f * 0.15 + i)} />)}
      <g filter="url(#co-glow)">
        {links(cup, 0, "cl")}
        {cup.map((p, i) => star(p, on(i, cup.length, 0), `c${i}`, i % 5 === 0))}
        {CUP_STARS.filter((p) => inCup(p.x, p.y, s.surface.cy) && s.level > 0).map((p, i) => <circle key={`cs${i}`} cx={p.x} cy={p.y} r={p.r} fill="#f0d08a" opacity={0.6 + 0.4 * Math.sin(f * 0.3 + i)} />)}
        {links(kettle, -30, "kl")}
        {kettle.map((p, i) => star(p, 1, `k${i}`, i % 6 === 0))}
        {streamPts(s, 14, f, 0.3).map((p, i) => star(p, 1, `s${i}`, false))}
        {s.steam.map((p, i) => (p > 0 ? sample(steamPath(i, p, f * 0.05), 34).map((q, k) => star(q, 0.8, `st${i}-${k}`, k % 3 === 0)) : null))}
      </g>
    </Stage>
  );
};

// ───────────────────────────── 95 Mosaic ─────────────────────────────
// Small stone and glass tiles with grout, on a gold-leaf ground; each tile a slightly different shade.
const MO = { kettle: "#2f5fa3", kettleD: "#1d3c70", band: "#e2b85a", cup: "#c46a3e", rim: "#8e4424", chai: "#6b3a1c", steam: "#f2ece0" };
export const Mosaic: React.FC = () => {
  const f = useCurrentFrame();
  const s = storyAt(f);
  const T = 16;
  return (
    <Stage bg="#b8913f" defs={
      <>
        <pattern id="mo-shade" width={T * 4} height={T * 4} patternUnits="userSpaceOnUse">
          {Array.from({ length: 16 }, (_, i) => <rect key={i} x={(i % 4) * T} y={Math.floor(i / 4) * T} width={T} height={T} fill={hash(i) > 0.5 ? "#ffffff" : "#000000"} opacity={0.04 + hash(i + 40) * 0.1} />)}
        </pattern>
        <pattern id="mo-grout" width={T} height={T} patternUnits="userSpaceOnUse">
          <rect width={T} height={T} fill="none" stroke="#2a2016" strokeWidth={2.4} />
        </pattern>
        <pattern id="mo-gold" width={T * 4} height={T * 4} patternUnits="userSpaceOnUse">
          {Array.from({ length: 16 }, (_, i) => <rect key={i} x={(i % 4) * T} y={Math.floor(i / 4) * T} width={T} height={T} fill={lerpHex("#a87f2c", "#f0cf7a", hash(i * 3 + 5))} />)}
        </pattern>
        <Rough id="mo-hand" seed={4} freq={0.06} scale={3} />
        <clipPath id="mo-cup"><path d={P.kulhadBody} /></clipPath>
      </>
    }>
      <rect width={W} height={H} fill="url(#mo-gold)" />
      <rect y={1060} width={W} height={290} fill="#5c4630" />
      <path d={P.kulhadBody} fill={MO.cup} />
      <Liquid s={s} fill={MO.chai} id="mo-cup" />
      <path d={P.rim} fill="none" stroke={MO.rim} strokeWidth={18} />
      {s.streaming ? <path d={s.stream} fill="none" stroke={MO.chai} strokeWidth={22} /> : null}
      <g transform={kT(s)}>
        <path d={P.kettleHandle} fill="none" stroke={MO.kettleD} strokeWidth={30} />
        <path d={P.kettleSpout} fill={MO.kettle} />
        <path d={P.kettleBody} fill={MO.kettle} />
        <path d={P.kettleBand} fill="none" stroke={MO.band} strokeWidth={18} />
        <path d={P.kettleLid} fill={MO.kettleD} />
        <circle cx={KNOB.x} cy={KNOB.y} r={KNOB.r + 4} fill={MO.band} />
      </g>
      {s.steam.map((p, i) => (p > 0 ? <path key={i} d={steamPath(i, p, f * 0.05)} fill="none" stroke={MO.steam} strokeWidth={22} /> : null))}
      <rect width={W} height={H} fill="url(#mo-shade)" />
      <rect width={W} height={H} fill="url(#mo-grout)" filter="url(#mo-hand)" opacity={0.85} />
    </Stage>
  );
};

// ───────────────────────────── 96 Comic ─────────────────────────────
// Comic panel: thick ink, flat colour, halftone shadows, speed lines on the entrance and a GLUG! burst on the pour.
const CM = { bg: "#ffd447", ink: "#111111", kettle: "#2fa4c9", cup: "#e8643a", chai: "#7a3b16", steam: "#ffffff" };
export const Comic: React.FC = () => {
  const f = useCurrentFrame();
  const s = storyAt(f);
  const ink = { stroke: CM.ink, strokeWidth: 9, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  const burst = interpolate(f, [46, 52, 88, 94], [0, 1, 1, 0], clamp);
  const pop = 1 + 0.15 * Math.sin(f * 0.6);
  const speed = interpolate(f, [0, 22], [1, 0], clamp);
  return (
    <Stage bg={CM.bg} defs={
      <>
        <pattern id="cm-dots" width={14} height={14} patternUnits="userSpaceOnUse"><circle cx={7} cy={7} r={3.2} fill={CM.ink} /></pattern>
        <pattern id="cm-bgdots" width={22} height={22} patternUnits="userSpaceOnUse"><circle cx={11} cy={11} r={4} fill="#f2a93b" /></pattern>
        <clipPath id="cm-cup"><path d={P.kulhadBody} /></clipPath>
        <clipPath id="cm-kb"><path d={P.kettleBody} /></clipPath>
      </>
    }>
      <rect width={W} height={H} fill="url(#cm-bgdots)" opacity={0.6} />
      <rect x={26} y={26} width={W - 52} height={H - 52} fill="none" stroke={CM.ink} strokeWidth={14} />
      {speed > 0 ? Array.from({ length: 9 }, (_, i) => <path key={i} d={`M${s.kx + 160},${s.ky - 90 + i * 24} L${s.kx + 160 + 380 * speed},${s.ky - 90 + i * 24}`} stroke={CM.ink} strokeWidth={5} />) : null}
      <path d={P.kulhadBody} fill={CM.cup} {...ink} />
      <g clipPath="url(#cm-cup)"><rect x={560} y={780} width={200} height={300} fill="url(#cm-dots)" opacity={0.5} /></g>
      <Liquid s={s} fill={CM.chai} id="cm-cup" />
      <path d={P.rim} fill="none" {...ink} />
      {s.streaming ? <path d={s.stream} fill="none" stroke={CM.chai} strokeWidth={18} strokeLinecap="round" /> : null}
      <g transform={kT(s)}>
        <path d={P.kettleHandle} fill="none" stroke={CM.ink} strokeWidth={34} strokeLinecap="round" />
        <path d={P.kettleSpout} fill={CM.kettle} {...ink} />
        <path d={P.kettleBody} fill={CM.kettle} {...ink} />
        <g clipPath="url(#cm-kb)"><rect x={30} y={-120} width={200} height={300} fill="url(#cm-dots)" opacity={0.45} /></g>
        <path d="M-100,-40 C-118,0 -116,40 -100,70" fill="none" stroke="#ffffff" strokeWidth={10} strokeLinecap="round" />
        <path d={P.kettleLid} fill={CM.cup} {...ink} />
        <circle cx={KNOB.x} cy={KNOB.y} r={KNOB.r} fill={CM.ink} />
      </g>
      {s.steam.map((p, i) => (p > 0 ? <path key={i} d={steamPath(i, p, f * 0.05)} fill="none" stroke={CM.ink} strokeWidth={22} strokeLinecap="round" /> : null))}
      {s.steam.map((p, i) => (p > 0 ? <path key={`w${i}`} d={steamPath(i, p, f * 0.05)} fill="none" stroke={CM.steam} strokeWidth={12} strokeLinecap="round" /> : null))}
      {burst > 0 ? (
        <g transform={`translate(250 520) scale(${burst * pop}) rotate(-8)`}>
          <path d={Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * Math.PI * 2; const r = i % 2 ? 150 : 95; return `${i ? "L" : "M"}${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r * 0.7).toFixed(1)}`; }).join(" ") + " Z"} fill="#ffffff" {...ink} />
          <text x={0} y={22} textAnchor="middle" fontFamily="Impact, Arial Black, sans-serif" fontSize={70} fill={CM.cup} stroke={CM.ink} strokeWidth={4}>GLUG!</text>
        </g>
      ) : null}
    </Stage>
  );
};

// ───────────────────────────── 97 Sakuga ─────────────────────────────
// Anime cel with effects animation: smear trail on the entrance, a 3-frame impact frame when the pour starts,
// speed lines from the spout, a ring burst when the cup is full and kira sparkles that shrink (never fade).
const SK = { line: "#1b1630", kettle: "#7d96d6", kettleS: "#4f62a8", hl: "#e8efff", cup: "#e47b4f", cupS: "#a84e2c", chai: "#6e3517", steam: "#fff1f8" };
export const Sakuga: React.FC = () => {
  const f = useCurrentFrame();
  const s = storyAt(f);
  const impact = f >= 42 && f < 45;
  const line = { stroke: impact ? "#ffffff" : SK.line, strokeWidth: 6, strokeLinejoin: "round" as const };
  const c = (col: string) => (impact ? "#000000" : col);
  const lines = interpolate(f, [45, 75], [1, 0], clamp);
  const ring = interpolate(f, [100, 118], [0, 1], clamp);
  const kettle = (dx: number, op: number, key: string) => (
    <g key={key} transform={`translate(${dx} 0) ` + kT(s)} opacity={op}>
      <path d={P.kettleHandle} fill="none" stroke={impact ? "#ffffff" : SK.line} strokeWidth={30} strokeLinecap="round" />
      <path d={P.kettleSpout} fill={c(SK.kettleS)} {...line} />
      <path d={P.kettleBody} fill={c(SK.kettle)} {...line} />
      {!impact ? <g clipPath="url(#sk-kb)"><path d={P.kettleBody} fill={SK.kettleS} transform="translate(60 26)" /></g> : null}
      {!impact ? <path d="M-104,-46 C-122,-6 -120,30 -106,60" fill="none" stroke={SK.hl} strokeWidth={12} strokeLinecap="round" /> : null}
      <path d={P.kettleLid} fill={c(SK.cup)} {...line} />
      <circle cx={KNOB.x} cy={KNOB.y} r={KNOB.r} fill={c(SK.cupS)} {...line} />
    </g>
  );
  const smear = f < 22 ? [1, 2, 3].map((k) => kettle(k * 38 * (1 - f / 22), 0.25 / k, `sm${k}`)) : null;
  return (
    <Stage bg={impact ? "#ffffff" : "#2a1f4e"} defs={
      <>
        <linearGradient id="sk-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a1f4e" /><stop offset="55%" stopColor="#b2507a" /><stop offset="100%" stopColor="#f2a65e" />
        </linearGradient>
        <clipPath id="sk-kb"><path d={P.kettleBody} /></clipPath>
        <clipPath id="sk-cup"><path d={P.kulhadBody} /></clipPath>
      </>
    }>
      <rect width={W} height={H} fill={impact ? "#ffffff" : "url(#sk-sky)"} />
      {!impact ? <rect y={1070} width={W} height={280} fill="#3a2a52" /> : null}
      {lines > 0 ? Array.from({ length: 28 }, (_, i) => {
        const a = (i / 28) * Math.PI * 2 + hash(i) * 0.2;
        const r0 = 80 + hash(i + 3) * 60;
        const r1 = r0 + (200 + hash(i + 9) * 380) * lines;
        return <path key={i} d={`M${s.tip.x + Math.cos(a) * r0},${s.tip.y + Math.sin(a) * r0} L${s.tip.x + Math.cos(a) * r1},${s.tip.y + Math.sin(a) * r1}`} stroke="#ffffff" strokeWidth={3 + 4 * lines} strokeLinecap="round" />;
      }) : null}
      <path d={P.kulhadBody} fill={c(SK.cup)} {...line} />
      {!impact ? <g clipPath="url(#sk-cup)"><rect x={580} y={780} width={200} height={300} fill={SK.cupS} /></g> : null}
      {!impact ? <Liquid s={s} fill={SK.chai} id="sk-cup" /> : null}
      <path d={P.rim} fill="none" {...line} />
      {s.streaming ? <path d={s.stream} fill="none" stroke={impact ? "#ffffff" : SK.chai} strokeWidth={14} strokeLinecap="round" /> : null}
      {smear}
      {kettle(0, 1, "k")}
      {s.steam.map((p, i) => (p > 0 ? <path key={i} d={steamPath(i, p, f * 0.05)} fill="none" stroke={SK.steam} strokeWidth={26 * (1 - 0.3 * p)} strokeLinecap="round" opacity={0.9} /> : null))}
      {ring > 0 && ring < 1 ? <ellipse cx={540} cy={800} rx={170 + 420 * ring} ry={42 + 110 * ring} fill="none" stroke="#ffe6a0" strokeWidth={18 * (1 - ring)} /> : null}
      {Array.from({ length: 7 }, (_, i) => {
        const t0 = 104 + i * 5;
        const k = interpolate(f, [t0, t0 + 14], [1, 0], clamp);
        if (f < t0 || k <= 0) return null;
        const x = 420 + hash(i * 5) * 240;
        const y = 700 + hash(i * 5 + 1) * 120;
        const r = 26 * k;
        return <path key={`kira${i}`} d={`M${x},${y - r} Q${x},${y} ${x + r},${y} Q${x},${y} ${x},${y + r} Q${x},${y} ${x - r},${y} Q${x},${y} ${x},${y - r} Z`} fill="#fff7d6" />;
      })}
    </Stage>
  );
};

// ───────────────────────────── 98 Oil paint ─────────────────────────────
// Painted with thick strokes: every shape is filled with short strokes clipped to it (colour jitter),
// strokes re-laid every 3 frames like paint-on-glass, canvas weave and impasto light on top.
const OIL = { bg: ["#2b2a3a", "#3b3550", "#4a3a3a", "#22263a"], kettle: ["#3d6fa0", "#2c5582", "#5a8fc0", "#24456a"], cup: ["#c8683f", "#a85230", "#e08a5a", "#8a3e22"], chai: ["#7a4220", "#5a2e14", "#9a5a2c"], steam: ["#f2ece0", "#d8d0c4"] };
const strokes = (n: number, x0: number, y0: number, w: number, h: number, ang: number, cols: string[], seed: number, len = 46, wid = 16) =>
  Array.from({ length: n }, (_, i) => {
    const x = x0 + hash(seed + i * 3) * w;
    const y = y0 + hash(seed + i * 3 + 1) * h;
    const a = ang + (hash(seed + i * 3 + 2) - 0.5) * 0.6;
    const l = len * (0.6 + hash(seed + i * 5) * 0.8);
    return <path key={i} d={`M${(x - Math.cos(a) * l / 2).toFixed(1)},${(y - Math.sin(a) * l / 2).toFixed(1)} Q${(x + Math.sin(a) * 6).toFixed(1)},${(y - Math.cos(a) * 6).toFixed(1)} ${(x + Math.cos(a) * l / 2).toFixed(1)},${(y + Math.sin(a) * l / 2).toFixed(1)}`}
      stroke={cols[Math.floor(hash(seed + i * 7) * cols.length)]} strokeWidth={wid * (0.7 + hash(seed + i * 11) * 0.6)} strokeLinecap="round" fill="none" />;
  });
export const OilPaint: React.FC = () => {
  const f = useCurrentFrame();
  const s = storyAt(f);
  const boil = Math.floor(f / 3) * 13;
  return (
    <Stage bg={OIL.bg[0]} defs={
      <>
        <filter id="oil-impasto" {...region}>
          <feTurbulence type="fractalNoise" baseFrequency={0.035} numOctaves={3} seed={5} result="n" />
          <feDiffuseLighting in="n" surfaceScale={2.2} lightingColor="#ffffff" result="l0"><feDistantLight azimuth={230} elevation={58} /></feDiffuseLighting>
          <feComposite in="l0" in2="SourceGraphic" operator="in" result="l" />
          <feBlend in="SourceGraphic" in2="l" mode="multiply" />
        </filter>
        <clipPath id="oil-kb"><path d={P.kettleBody} /></clipPath>
        <clipPath id="oil-sp"><path d={P.kettleSpout} /></clipPath>
        <clipPath id="oil-cup"><path d={P.kulhadBody} /></clipPath>
        <clipPath id="oil-liq"><path d={P.kulhadBody} /></clipPath>
      </>
    }>
      <g filter="url(#oil-impasto)">
        <rect width={W} height={H} fill={OIL.bg[1]} />
        {strokes(260, -40, -40, W + 80, 1120, -0.5, OIL.bg, 3 + boil, 120, 34)}
        {strokes(90, -40, 1040, W + 80, 340, 0.1, ["#4a3424", "#5c4630", "#3a2a1c"], 77 + boil, 140, 30)}
        <g clipPath="url(#oil-cup)">{strokes(110, 360, 780, 360, 280, 1.3, OIL.cup, 11 + boil, 50, 18)}</g>
        {s.level > 0 ? <g clipPath="url(#oil-liq)">
          <g clipPath={undefined}>{strokes(70, 370, s.surface.cy - 20, 340, 1060 - s.surface.cy, 0.05, OIL.chai, 19 + boil, 50, 16).filter((_, i) => true)}</g>
        </g> : null}
        <path d={P.rim} fill="none" stroke="#e8a070" strokeWidth={10} strokeLinecap="round" opacity={0.8} />
        {s.streaming ? <path d={s.stream} fill="none" stroke={OIL.chai[0]} strokeWidth={16} strokeLinecap="round" /> : null}
        <g transform={kT(s)}>
          <path d={P.kettleHandle} fill="none" stroke={OIL.kettle[3]} strokeWidth={30} strokeLinecap="round" />
          <g clipPath="url(#oil-sp)">{strokes(30, -270, -90, 150, 140, -0.4, OIL.kettle, 23 + boil, 40, 16)}</g>
          <g clipPath="url(#oil-kb)">{strokes(140, -180, -110, 360, 260, 1.2, OIL.kettle, 31 + boil, 48, 18)}</g>
          <path d="M-104,-46 C-122,-6 -120,30 -106,60" fill="none" stroke="#c8dcf0" strokeWidth={12} strokeLinecap="round" opacity={0.8} />
          <path d={P.kettleLid} fill={OIL.cup[1]} />
          <circle cx={KNOB.x} cy={KNOB.y} r={KNOB.r} fill={OIL.cup[3]} />
        </g>
        {s.steam.map((p, i) => (p > 0 ? <path key={i} d={steamPath(i, p, f * 0.05)} fill="none" stroke={OIL.steam[i % 2]} strokeWidth={20} strokeLinecap="round" opacity={0.75} /> : null))}
      </g>
    </Stage>
  );
};

// ───────────────────────────── 99 Chalk pastel ─────────────────────────────
// Soft pastel on dark blue paper: grainy strokes (the paper tooth breaks them), hatched fills, smudged steam.
const PA = { paper: "#1d2a44", line: "#f3ead6", kettle: "#8fd0d8", kettleD: "#5aa3b2", cup: "#f2a37c", cupD: "#c97350", chai: "#b8794a", steam: "#f3ead6" };
export const ChalkPastel: React.FC = () => {
  const f = useCurrentFrame();
  const s = storyAt(f);
  const draw = (t0: number, t1: number) => interpolate(f, [t0, t1], [1, 0], clamp);
  const hatch = (x0: number, y0: number, w: number, h: number, col: string, gap: number, key: string) =>
    Array.from({ length: Math.ceil((w + h) / gap) }, (_, i) => <path key={`${key}${i}`} d={`M${x0 + i * gap},${y0} L${x0 + i * gap - h * 0.7},${y0 + h}`} stroke={col} strokeWidth={7} strokeLinecap="round" />);
  return (
    <Stage bg={PA.paper} defs={
      <>
        <filter id="pa-chalk" {...region}>
          <feTurbulence type="fractalNoise" baseFrequency={0.9} numOctaves={2} seed={8} result="tooth" />
          <feColorMatrix in="tooth" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.5 1.5" result="mask" />
          <feTurbulence type="fractalNoise" baseFrequency={0.04} numOctaves={2} seed={2} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={6} xChannelSelector="R" yChannelSelector="G" result="d" />
          <feComposite in="d" in2="mask" operator="in" />
        </filter>
        <filter id="pa-smudge" {...region}><feGaussianBlur stdDeviation={9} /></filter>
        <clipPath id="pa-cup"><path d={P.kulhadBody} /></clipPath>
        <clipPath id="pa-kb"><path d={P.kettleBody} /></clipPath>
      </>
    }>
      <Paper id="pa-paper" opacity={0.35} freq={0.6} />
      <g filter="url(#pa-chalk)">
        <g clipPath="url(#pa-cup)" opacity={interpolate(f, [10, 30], [0, 1], clamp)}>{hatch(360, 780, 360, 280, PA.cup, 14, "c")}{hatch(600, 780, 140, 280, PA.cupD, 10, "cd")}</g>
        {s.level > 0 ? <g clipPath="url(#pa-cup)">{hatch(360, s.surface.cy - 10, 360, 1060 - s.surface.cy, PA.chai, 9, "l")}</g> : null}
        <path d={P.kulhadOutline} fill="none" stroke={PA.line} strokeWidth={7} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={draw(0, 24)} />
        <path d={P.rim} fill="none" stroke={PA.line} strokeWidth={6} pathLength={1} strokeDasharray="1 1" strokeDashoffset={draw(6, 28)} />
        {s.streaming ? <path d={s.stream} fill="none" stroke={PA.chai} strokeWidth={13} strokeLinecap="round" /> : null}
        <g transform={kT(s)}>
          <path d={P.kettleHandle} fill="none" stroke={PA.kettleD} strokeWidth={24} strokeLinecap="round" />
          <path d={P.kettleSpout} fill={PA.kettleD} />
          <g clipPath="url(#pa-kb)">{hatch(-180, -110, 360, 260, PA.kettle, 12, "k")}{hatch(40, -110, 160, 260, PA.kettleD, 9, "kd")}</g>
          <path d={P.kettleBody} fill="none" stroke={PA.line} strokeWidth={6} />
          <path d={P.kettleLid} fill={PA.cup} stroke={PA.line} strokeWidth={5} />
          <circle cx={KNOB.x} cy={KNOB.y} r={KNOB.r} fill={PA.cupD} />
        </g>
      </g>
      <g filter="url(#pa-smudge)" opacity={0.75}>
        {s.steam.map((p, i) => (p > 0 ? <path key={i} d={steamPath(i, p, f * 0.05)} fill="none" stroke={PA.steam} strokeWidth={20} strokeLinecap="round" /> : null))}
      </g>
    </Stage>
  );
};
