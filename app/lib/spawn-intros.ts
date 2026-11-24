// How each of the 16 fighters enters a fight. Before READY / FIGHT every fighter plays its own entrance:
// how its body appears (offset, fade, squash, a solid tint), the pose it holds, the particle bursts it throws
// and a drawing behind and in front of it. The engine (`arena-engine.ts`) times and plays them; a hybrid,
// a team-attack fighter or a juggernaut uses the entrance of the element it carries.
import type { Power, BossDesign } from "./fighters";
import type { PShape } from "./move-looks";

/** Seconds one entrance lasts. */
export const INTRO_LEN = 1.5;
/** Share of the entrance after which the fighter counts as arrived (health bar and team ring show). */
export const INTRO_ARRIVED = 0.7;

export type IntroPose = "stance" | "air" | "crouch" | "rise" | "flex" | "land" | "guard" | "float";

/** How the body shows at one moment. Offsets and squash are measured from the feet. */
export type IntroBody = {
  dx: number; dy: number; alpha: number; sx: number; sy: number;
  pose: IntroPose;
  /** A flat colour laid over the body (frozen, glowing, shadow, metal) and how strongly. */
  solid?: string; solidA?: number;
  /** Hide anything below the floor line (rising out of the ground). */
  clip?: boolean;
  /** Copies of the body either side, closing in (Chrono). */
  echo?: { spread: number; alpha: number };
};

export type IntroBurst = {
  at: number; n: number; spd: number; shape: PShape; a: string; b: string; grav: number; add: boolean;
  from: "feet" | "body" | "sky";
  /** up: a cone upwards; out: every way; flat: along the floor; in: from a ring, closing on the body. */
  dir: "up" | "out" | "flat" | "in";
  spread?: number; size?: [number, number]; life?: number;
};

export type IntroDraw = {
  ctx: CanvasRenderingContext2D;
  /** Where the fighter will stand, the floor line, its scale, the entrance's progress 0..1, seconds in, facing. */
  x: number; y: number; ground: number; s: number; u: number; t: number; face: number;
  body: IntroBody;
};

export type IntroSpec = {
  /** Seconds this entrance lasts, when it is not the usual `INTRO_LEN` (a boss takes its time). */
  len?: number;
  /** The moment it lands: the entrance sound, screen shake and an optional blast ring. */
  hit: number; shake: number; wave?: [string, string];
  body(u: number, s: number): IntroBody;
  bursts: IntroBurst[];
  /** A steady stream of particles until `until`. */
  trickle?: Omit<IntroBurst, "at" | "n"> & { rate: number; until: number };
  back?(d: IntroDraw): void;
  front?(d: IntroDraw): void;
};

// ---------- helpers ----------
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const seg = (u: number, a: number, b: number) => clamp((u - a) / (b - a), 0, 1);
const easeOut = (k: number) => 1 - Math.pow(1 - k, 3);
const easeIn = (k: number) => k * k;
const easeInOut = (k: number) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const hsla = (h: number, s: number, l: number, a: number) => `hsl(${h} ${s}% ${l}% / ${clamp(a, 0, 1)})`;
const base = (pose: IntroPose, o: Partial<IntroBody> = {}): IntroBody => ({ dx: 0, dy: 0, alpha: 1, sx: 1, sy: 1, pose, ...o });
/** Stable wobble for a seed, so a drawing does not jitter randomly between frames unless it should. */
const wob = (seed: number) => Math.sin(seed * 12.9898) * 0.5 + Math.sin(seed * 4.1414) * 0.5;
/** Rising, ready, then the normal stance: the tail every entrance ends on. */
const settle = (u: number, held: IntroPose, until: number): IntroPose => (u < until ? held : u < 0.86 ? "flex" : "stance");

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, inner: string, outer: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A jagged line from one point to another; `seed` changes the zigzag. */
function jag(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, parts: number, amp: number, seed: number) {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  for (let i = 1; i < parts; i++) {
    const k = i / parts;
    const o = wob(seed + i * 3.7) * amp;
    ctx.lineTo(x0 + dx * k + nx * o, y0 + dy * k + ny * o);
  }
  ctx.lineTo(x1, y1);
}

// ---------- the 16 entrances ----------
export const INTROS: Record<Power, IntroSpec> = {
  // Pyro: a column of fire roars up and Pyro steps out of it, still white-hot.
  pyro: {
    hit: 0.45, shake: 7, wave: ["hsl(14 95% 55%)", "hsl(45 100% 65%)"],
    body: (u) => base(settle(u, "rise", 0.62), { alpha: seg(u, 0.18, 0.42), solid: "hsl(42 100% 72%)", solidA: 1 - seg(u, 0.42, 0.72) }),
    bursts: [
      { at: 0, n: 12, spd: 220, shape: "ember", a: "hsl(22 95% 55%)", b: "hsl(45 100% 62%)", grav: -200, add: true, from: "feet", dir: "up" },
      { at: 0.45, n: 34, spd: 560, shape: "ember", a: "hsl(14 95% 55%)", b: "hsl(48 100% 66%)", grav: -160, add: true, from: "body", dir: "out" },
      { at: 0.45, n: 14, spd: 320, shape: "dot", a: "hsl(30 100% 60%)", b: "hsl(52 100% 80%)", grav: -260, add: true, from: "feet", dir: "flat" },
    ],
    trickle: { rate: 45, until: 0.75, spd: 260, shape: "ember", a: "hsl(20 95% 55%)", b: "hsl(46 100% 64%)", grav: -300, add: true, from: "feet", dir: "up", spread: 30 },
    back: ({ ctx, x, ground, s, u, t }) => {
      const grow = easeOut(seg(u, 0, 0.32));
      const fade = 1 - seg(u, 0.5, 0.9);
      if (grow <= 0 || fade <= 0) return;
      const h = 290 * s * grow;
      const w = 44 * s * (1 + 0.35 * seg(u, 0.38, 0.5)) * (0.4 + 0.6 * fade);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      glow(ctx, x, ground + 2, w * 2.4, 14 * s, hsla(30, 100, 60, 0.7 * fade), hsla(14, 95, 50, 0));
      for (const [k, h0, l] of [[1, 14, 52], [0.55, 44, 70]] as const) {
        const ww = w * k;
        ctx.beginPath();
        ctx.moveTo(x - ww, ground);
        for (let i = 1; i <= 8; i++) {
          const yy = ground - (h * i) / 8;
          ctx.lineTo(x - ww * (1 - (i / 8) * 0.7) + Math.sin(t * 22 + i * 1.7) * 6 * s, yy);
        }
        ctx.lineTo(x + Math.sin(t * 30) * 8 * s, ground - h * 1.08);
        for (let i = 8; i >= 1; i--) {
          const yy = ground - (h * i) / 8;
          ctx.lineTo(x + ww * (1 - (i / 8) * 0.7) + Math.sin(t * 19 + i * 2.3) * 6 * s, yy);
        }
        ctx.lineTo(x + ww, ground);
        ctx.closePath();
        const g = ctx.createLinearGradient(0, ground, 0, ground - h);
        g.addColorStop(0, hsla(h0, 100, l, 0.95 * fade));
        g.addColorStop(0.7, hsla(h0 + 20, 100, l + 8, 0.6 * fade));
        g.addColorStop(1, hsla(h0 + 30, 100, l + 15, 0));
        ctx.fillStyle = g;
        ctx.fill();
      }
      ctx.restore();
    },
  },

  // Cryo: an ice crystal grows around Cryo, cracks and shatters.
  cryo: {
    hit: 0.55, shake: 6, wave: ["hsl(195 85% 75%)", "hsl(0 0% 100%)"],
    body: (u) => base(u < 0.55 ? "guard" : settle(u, "flex", 0.75), { alpha: seg(u, 0.1, 0.3), solid: "hsl(195 85% 86%)", solidA: u < 0.55 ? 0.65 : 0 }),
    bursts: [
      { at: 0, n: 14, spd: 160, shape: "flake", a: "hsl(195 85% 80%)", b: "hsl(0 0% 100%)", grav: -40, add: false, from: "feet", dir: "up" },
      { at: 0.55, n: 38, spd: 600, shape: "shard", a: "hsl(198 80% 72%)", b: "hsl(190 100% 94%)", grav: 700, add: false, from: "body", dir: "out" },
      { at: 0.55, n: 18, spd: 300, shape: "flake", a: "hsl(195 85% 85%)", b: "hsl(0 0% 100%)", grav: 60, add: false, from: "body", dir: "out" },
    ],
    back: ({ ctx, x, ground, s, u }) => {
      const k = easeOut(seg(u, 0, 0.3)) * (1 - seg(u, 0.7, 1));
      if (k <= 0) return;
      glow(ctx, x, ground + 3, 80 * s * k, 12 * s, hsla(195, 90, 92, 0.75 * k), hsla(200, 80, 80, 0));
    },
    front: ({ ctx, x, ground, s, u, t }) => {
      if (u >= 0.55) return;
      const h = 132 * s * easeOut(seg(u, 0, 0.36));
      if (h <= 1) return;
      const pts: [number, number][] = [[-36, 0], [-42, 0.68], [-14, 1], [18, 0.93], [42, 0.6], [34, 0]];
      ctx.save();
      ctx.beginPath();
      pts.forEach(([px, py], i) => (i ? ctx.lineTo(x + px * s, ground - py * h) : ctx.moveTo(x + px * s, ground - py * h)));
      ctx.closePath();
      const g = ctx.createLinearGradient(x - 40 * s, ground - h, x + 40 * s, ground);
      g.addColorStop(0, hsla(190, 100, 95, 0.55));
      g.addColorStop(1, hsla(205, 80, 70, 0.4));
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = hsla(0, 0, 100, 0.9);
      ctx.lineWidth = 2.5 * s;
      ctx.stroke();
      // facets
      ctx.strokeStyle = hsla(190, 100, 96, 0.6);
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.moveTo(x - 14 * s, ground - h); ctx.lineTo(x - 4 * s, ground);
      ctx.moveTo(x + 18 * s, ground - 0.93 * h); ctx.lineTo(x + 12 * s, ground);
      ctx.stroke();
      // side crystals
      for (const [ox, hh, lean] of [[-50, 0.45, -0.3], [48, 0.36, 0.3]] as const) {
        ctx.beginPath();
        ctx.moveTo(x + (ox - 9) * s, ground);
        ctx.lineTo(x + (ox + lean * 40) * s, ground - hh * h);
        ctx.lineTo(x + (ox + 9) * s, ground);
        ctx.closePath();
        ctx.fillStyle = hsla(198, 85, 82, 0.6);
        ctx.fill();
        ctx.stroke();
      }
      // cracks just before it breaks
      const c = seg(u, 0.4, 0.55);
      if (c > 0) {
        ctx.strokeStyle = hsla(0, 0, 100, 0.95);
        ctx.lineWidth = 2 * s;
        for (let i = 0; i < 4; i++) {
          const a = i * 1.6 + 0.4;
          const len = 46 * s * c;
          jag(ctx, x, ground - h * 0.55, x + Math.cos(a) * len, ground - h * 0.55 + Math.sin(a) * len, 4, 5 * s, i);
          ctx.stroke();
        }
      }
      ctx.restore();
    },
  },

  // Electro: a lightning bolt strikes the spot and Electro is crouched in the flash.
  electro: {
    hit: 0.3, shake: 11, wave: ["hsl(52 100% 58%)", "hsl(0 0% 100%)"],
    body: (u) => base(u < 0.62 ? "land" : settle(u, "flex", 0.8), { alpha: u < 0.3 ? 0 : 1, solid: "hsl(0 0% 100%)", solidA: 1 - seg(u, 0.32, 0.5) }),
    bursts: [
      { at: 0.3, n: 32, spd: 640, shape: "spark", a: "hsl(52 100% 60%)", b: "hsl(0 0% 100%)", grav: 0, add: true, from: "feet", dir: "out" },
      { at: 0.3, n: 14, spd: 380, shape: "bolt", a: "hsl(50 100% 58%)", b: "hsl(58 100% 88%)", grav: 0, add: true, from: "body", dir: "out" },
    ],
    trickle: { rate: 40, until: 0.28, spd: 200, shape: "spark", a: "hsl(52 100% 60%)", b: "hsl(58 100% 90%)", grav: 0, add: true, from: "feet", dir: "up", spread: 26 },
    back: ({ ctx, x, ground, s, u, t }) => {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      if (u < 0.3) {
        // charge crackling on the floor
        const k = seg(u, 0, 0.3);
        glow(ctx, x, ground, 50 * s * k, 10 * s, hsla(55, 100, 80, 0.6 * k), hsla(50, 100, 60, 0));
        ctx.strokeStyle = hsla(55, 100, 80, 0.8 * k);
        ctx.lineWidth = 2 * s;
        const seed = Math.floor(t * 24);
        for (let i = 0; i < 2; i++) {
          jag(ctx, x - 40 * s, ground - 4, x + 40 * s, ground - 4 - 20 * s * (i + 1) * k, 6, 9 * s, seed + i * 11);
          ctx.stroke();
        }
      }
      const strike = 1 - seg(u, 0.3, 0.52);
      if (u >= 0.27 && strike > 0) {
        const seed = Math.floor(t * 30);
        const top = -20;
        ctx.strokeStyle = hsla(50, 100, 60, 0.8 * strike);
        ctx.lineWidth = 22 * s * strike;
        jag(ctx, x + 40 * s, top, x, ground - 10 * s, 9, 26 * s, seed);
        ctx.stroke();
        ctx.strokeStyle = hsla(0, 0, 100, strike);
        ctx.lineWidth = 7 * s;
        ctx.stroke();
        // a branch
        ctx.lineWidth = 3 * s;
        jag(ctx, x + 30 * s, (ground + top) * 0.4, x - 70 * s, ground * 0.62, 5, 14 * s, seed + 5);
        ctx.stroke();
        glow(ctx, x, ground - 20 * s, 130 * s, 70 * s, hsla(55, 100, 92, 0.7 * strike), hsla(50, 100, 60, 0));
      }
      ctx.restore();
    },
    front: ({ ctx, x, y, s, u, t }) => {
      const k = seg(u, 0.3, 0.35) * (1 - seg(u, 0.6, 0.95));
      if (k <= 0) return;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = hsla(55, 100, 82, 0.9 * k);
      ctx.lineWidth = 2.2 * s;
      const seed = Math.floor(t * 18);
      for (let i = 0; i < 3; i++) {
        const a0 = wob(seed + i) * Math.PI, a1 = a0 + 1.4;
        const cy = y - 55 * s;
        jag(ctx, x + Math.cos(a0) * 34 * s, cy + Math.sin(a0) * 46 * s, x + Math.cos(a1) * 34 * s, cy + Math.sin(a1) * 46 * s, 4, 8 * s, seed * 3 + i);
        ctx.stroke();
      }
      ctx.restore();
    },
  },

  // Terra: the floor cracks, rock spikes burst up and Terra climbs out of the ground.
  terra: {
    hit: 0.3, shake: 13,
    body: (u, s) => base(settle(u, "rise", 0.66), { clip: true, alpha: u < 0.3 ? 0 : 1, dy: (1 - easeOut(seg(u, 0.3, 0.56))) * 125 * s }),
    bursts: [
      { at: 0.04, n: 10, spd: 160, shape: "dust", a: "hsl(34 30% 55%)", b: "hsl(40 40% 75%)", grav: -20, add: false, from: "feet", dir: "flat" },
      { at: 0.3, n: 30, spd: 660, shape: "chunk", a: "hsl(28 40% 38%)", b: "hsl(36 40% 62%)", grav: 1400, add: false, from: "feet", dir: "up" },
      { at: 0.3, n: 18, spd: 300, shape: "dust", a: "hsl(34 30% 55%)", b: "hsl(40 45% 78%)", grav: -30, add: false, from: "feet", dir: "flat" },
    ],
    back: ({ ctx, x, ground, s, u }) => {
      const k = easeOut(seg(u, 0, 0.3));
      const fade = 1 - seg(u, 0.75, 1);
      if (k <= 0 || fade <= 0) return;
      ctx.save();
      ctx.strokeStyle = hsla(28, 45, 16, 0.85 * fade);
      ctx.lineWidth = 3 * s;
      ctx.lineCap = "round";
      for (let i = 0; i < 6; i++) {
        const dir = i % 2 ? 1 : -1;
        const len = (60 + (i % 3) * 30) * s * k;
        const yy = ground + 4 + (i % 3) * 14;
        jag(ctx, x, ground + 2, x + dir * len, yy + (i > 2 ? 10 : 0), 5, 5 * s, i * 7);
        ctx.stroke();
      }
      ctx.restore();
    },
    front: ({ ctx, x, ground, s, u }) => {
      const up = easeOut(seg(u, 0.3, 0.42)) * (1 - seg(u, 0.74, 1));
      if (up <= 0) return;
      ctx.save();
      for (const [ox, hh, w] of [[-58, 52, 16], [-30, 76, 18], [34, 70, 17], [60, 46, 14], [-4, 34, 12]] as const) {
        const h = hh * s * up;
        ctx.beginPath();
        ctx.moveTo(x + (ox - w) * s, ground + 4);
        ctx.lineTo(x + (ox + w * 0.2) * s, ground - h);
        ctx.lineTo(x + (ox + w) * s, ground + 4);
        ctx.closePath();
        const g = ctx.createLinearGradient(0, ground - h, 0, ground);
        g.addColorStop(0, "hsl(34 35% 58%)");
        g.addColorStop(1, "hsl(24 40% 30%)");
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = "hsl(250 32% 14%)";
        ctx.lineWidth = 3 * s;
        ctx.stroke();
      }
      ctx.restore();
    },
  },

  // Aero: rides a whirlwind down from the sky and lands lightly.
  aero: {
    hit: 0.55, shake: 3,
    body: (u, s) => base(u < 0.55 ? "air" : settle(u, "crouch", 0.7), { alpha: seg(u, 0, 0.15), dy: -(1 - easeOut(seg(u, 0, 0.55))) * 290 * s }),
    bursts: [
      { at: 0.55, n: 26, spd: 420, shape: "dust", a: "hsl(170 40% 80%)", b: "hsl(0 0% 100%)", grav: -20, add: false, from: "feet", dir: "flat" },
      { at: 0.55, n: 12, spd: 300, shape: "leaf", a: "hsl(150 45% 55%)", b: "hsl(90 50% 60%)", grav: 80, add: false, from: "feet", dir: "out" },
    ],
    trickle: { rate: 30, until: 0.55, spd: 220, shape: "leaf", a: "hsl(150 45% 55%)", b: "hsl(170 60% 80%)", grav: -60, add: false, from: "feet", dir: "up", spread: 60 },
    back: ({ ctx, x, ground, s, u, t }) => {
      const fade = seg(u, 0, 0.12) * (1 - seg(u, 0.55, 0.88));
      if (fade <= 0) return;
      ctx.save();
      ctx.lineCap = "round";
      for (let i = 0; i < 11; i++) {
        const yy = ground - i * 30 * s;
        const rx = (10 + i * i * 0.75) * s;
        const ox = Math.sin(t * 7 + i * 0.6) * (4 + i) * s;
        const spin = t * 14 + i;
        ctx.strokeStyle = hsla(168, 55, 78 + (i % 2) * 12, 0.55 * fade);
        ctx.lineWidth = (2 + (i % 3)) * s;
        ctx.beginPath();
        ctx.ellipse(x + ox, yy, rx, rx * 0.22 + 3, 0, spin % (Math.PI * 2), (spin % (Math.PI * 2)) + Math.PI * 1.3);
        ctx.stroke();
      }
      ctx.restore();
    },
  },

  // Hydro: a whirlpool opens, a geyser shoots up and Hydro rides it out, splashing down.
  hydro: {
    hit: 0.25, shake: 5,
    body: (u, s) => {
      const dy = u < 0.45 ? lerp(70, -175, easeOut(seg(u, 0.25, 0.45))) : -175 * (1 - easeIn(seg(u, 0.45, 0.7)));
      return base(u < 0.7 ? "air" : settle(u, "crouch", 0.8), { clip: true, alpha: u < 0.25 ? 0 : 1, dy: dy * s });
    },
    bursts: [
      { at: 0.25, n: 30, spd: 720, shape: "drop", a: "hsl(205 90% 58%)", b: "hsl(195 100% 88%)", grav: 1400, add: false, from: "feet", dir: "up" },
      { at: 0.7, n: 26, spd: 440, shape: "drop", a: "hsl(210 90% 55%)", b: "hsl(195 100% 85%)", grav: 1100, add: false, from: "feet", dir: "flat" },
    ],
    trickle: { rate: 26, until: 0.25, spd: 90, shape: "bubble", a: "hsl(205 90% 70%)", b: "hsl(190 100% 92%)", grav: -120, add: false, from: "feet", dir: "up", spread: 40 },
    back: ({ ctx, x, ground, s, u, t }) => {
      const pool = easeOut(seg(u, 0, 0.22)) * (1 - seg(u, 0.75, 1));
      ctx.save();
      if (pool > 0) {
        ctx.fillStyle = hsla(210, 85, 45, 0.7 * pool);
        ctx.beginPath();
        ctx.ellipse(x, ground + 3, 62 * s * pool, 12 * s * pool, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = hsla(195, 100, 85, 0.8 * pool);
        ctx.lineWidth = 2 * s;
        for (let i = 0; i < 3; i++) {
          const a = t * 9 + i * 2.1;
          ctx.beginPath();
          ctx.ellipse(x, ground + 3, (20 + i * 14) * s * pool, (4 + i * 2.6) * s * pool, 0, a, a + 2.2);
          ctx.stroke();
        }
      }
      const col = seg(u, 0.24, 0.32) * (1 - seg(u, 0.5, 0.68));
      if (col > 0) {
        const h = 240 * s * easeOut(seg(u, 0.24, 0.42));
        const w = 26 * s * col;
        const g = ctx.createLinearGradient(0, ground, 0, ground - h);
        g.addColorStop(0, hsla(212, 90, 48, 0.9));
        g.addColorStop(0.8, hsla(198, 95, 70, 0.85));
        g.addColorStop(1, hsla(190, 100, 92, 0.2));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x - w, ground);
        ctx.quadraticCurveTo(x - w * 0.6 + Math.sin(t * 20) * 4 * s, ground - h * 0.5, x - w * 0.8, ground - h);
        ctx.lineTo(x + w * 0.8, ground - h);
        ctx.quadraticCurveTo(x + w * 0.6 + Math.sin(t * 17) * 4 * s, ground - h * 0.5, x + w, ground);
        ctx.closePath();
        ctx.fill();
        // foam crown
        ctx.fillStyle = hsla(195, 100, 94, 0.9 * col);
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath();
          ctx.arc(x + i * 11 * s, ground - h - Math.abs(Math.sin(t * 16 + i)) * 10 * s, (9 - Math.abs(i) * 1.5) * s, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    },
  },

  // Umbra: a pool of shadow spreads and Umbra rises out of it as a silhouette, then takes colour.
  umbra: {
    hit: 0.58, shake: 2,
    body: (u, s) => base(settle(u, "crouch", 0.62), { clip: true, alpha: u < 0.18 ? 0 : 1, dy: (1 - easeOut(seg(u, 0.18, 0.56))) * 125 * s, solid: "hsl(268 50% 9%)", solidA: 1 - seg(u, 0.58, 0.82) }),
    bursts: [
      { at: 0.58, n: 24, spd: 340, shape: "smoke", a: "hsl(275 55% 20%)", b: "hsl(285 75% 58%)", grav: -60, add: false, from: "body", dir: "out" },
    ],
    trickle: { rate: 40, until: 0.72, spd: 120, shape: "smoke", a: "hsl(270 60% 14%)", b: "hsl(285 70% 45%)", grav: -90, add: false, from: "feet", dir: "up", spread: 50 },
    back: ({ ctx, x, ground, s, u, t }) => {
      const k = easeOut(seg(u, 0, 0.2)) * (1 - seg(u, 0.72, 1));
      if (k <= 0) return;
      ctx.save();
      glow(ctx, x, ground + 3, 80 * s * k, 16 * s * k, hsla(285, 80, 55, 0.5 * k), hsla(275, 60, 30, 0));
      ctx.fillStyle = hsla(268, 55, 7, 0.9 * k);
      ctx.beginPath();
      ctx.ellipse(x, ground + 3, 64 * s * k, 12 * s * k, 0, 0, Math.PI * 2);
      ctx.fill();
      // tendrils curling up out of the pool
      ctx.strokeStyle = hsla(270, 55, 12, 0.85 * k);
      ctx.lineCap = "round";
      for (let i = 0; i < 5; i++) {
        const bx = x + (i - 2) * 24 * s;
        const h = (40 + (i % 2) * 30) * s * k;
        ctx.lineWidth = (6 - Math.abs(i - 2)) * s;
        ctx.beginPath();
        ctx.moveTo(bx, ground);
        ctx.quadraticCurveTo(bx + Math.sin(t * 6 + i) * 18 * s, ground - h * 0.6, bx + Math.sin(t * 4 + i * 2) * 12 * s, ground - h);
        ctx.stroke();
      }
      ctx.restore();
    },
  },

  // Lux: a beam of light comes down and Lux forms inside it, glowing, then lands.
  lux: {
    hit: 0.18, shake: 2,
    body: (u, s) => base(settle(u, "rise", 0.62), { alpha: seg(u, 0.15, 0.4), dy: -(1 - easeOut(seg(u, 0.15, 0.6))) * 95 * s, solid: "hsl(52 100% 96%)", solidA: 1 - seg(u, 0.5, 0.78) }),
    bursts: [
      { at: 0.55, n: 28, spd: 440, shape: "star", a: "hsl(48 100% 70%)", b: "hsl(0 0% 100%)", grav: 0, add: true, from: "body", dir: "out" },
    ],
    trickle: { rate: 34, until: 0.55, spd: 60, shape: "star", a: "hsl(50 100% 75%)", b: "hsl(0 0% 100%)", grav: 260, add: true, from: "sky", dir: "out", spread: 34, life: 1.2 },
    back: ({ ctx, x, ground, s, u, t }) => {
      const w = 74 * s * easeOut(seg(u, 0, 0.18)) * (1 - seg(u, 0.55, 0.92));
      if (w <= 0.5) return;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const g = ctx.createLinearGradient(x - w, 0, x + w, 0);
      g.addColorStop(0, hsla(50, 100, 70, 0));
      g.addColorStop(0.35, hsla(50, 100, 78, 0.4));
      g.addColorStop(0.5, hsla(55, 100, 96, 0.85));
      g.addColorStop(0.65, hsla(50, 100, 78, 0.4));
      g.addColorStop(1, hsla(50, 100, 70, 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - w, -20, w * 2, ground + 20);
      ctx.strokeStyle = hsla(0, 0, 100, 0.5);
      ctx.lineWidth = 1.5 * s;
      for (let i = 0; i < 4; i++) {
        const ox = Math.sin(t * 3 + i * 1.9) * w * 0.7;
        ctx.beginPath();
        ctx.moveTo(x + ox, -20);
        ctx.lineTo(x + ox, ground);
        ctx.stroke();
      }
      glow(ctx, x, ground + 2, w * 1.8, 14 * s, hsla(52, 100, 90, 0.8), hsla(50, 100, 70, 0));
      ctx.restore();
    },
  },

  // Gravi: drops from far above like a meteor and lands in a crater.
  gravi: {
    hit: 0.35, shake: 15, wave: ["hsl(250 80% 62%)", "hsl(250 90% 85%)"],
    body: (u, s) => {
      const fall = seg(u, 0, 0.35);
      const squash = u >= 0.35 && u < 0.45 ? 1 - Math.sin(seg(u, 0.35, 0.45) * Math.PI) * 0.18 : 1;
      return base(u < 0.35 ? "air" : settle(u, "land", 0.72), {
        alpha: u < 0.01 ? 0 : 1, dy: -(1 - easeIn(fall)) * 640 * s,
        sx: u < 0.35 ? 0.88 : 2 - squash, sy: u < 0.35 ? 1.18 : squash,
      });
    },
    bursts: [
      { at: 0.35, n: 30, spd: 620, shape: "chunk", a: "hsl(250 20% 30%)", b: "hsl(250 30% 55%)", grav: 1300, add: false, from: "feet", dir: "up" },
      { at: 0.35, n: 16, spd: 360, shape: "ring", a: "hsl(245 80% 65%)", b: "hsl(250 90% 85%)", grav: 0, add: true, from: "feet", dir: "flat" },
    ],
    back: ({ ctx, x, y, ground, s, u, body }) => {
      ctx.save();
      if (u < 0.35 && u > 0.01) {
        // a falling streak and warped rings around the body
        const by = y + body.dy;
        ctx.globalCompositeOperation = "lighter";
        const g = ctx.createLinearGradient(0, by - 260 * s, 0, by - 60 * s);
        g.addColorStop(0, hsla(250, 90, 70, 0));
        g.addColorStop(1, hsla(250, 90, 75, 0.7));
        ctx.fillStyle = g;
        ctx.fillRect(x - 16 * s, by - 260 * s, 32 * s, 200 * s);
        ctx.strokeStyle = hsla(250, 90, 80, 0.6);
        ctx.lineWidth = 2.5 * s;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.ellipse(x, by - (20 + i * 34) * s, (30 + i * 8) * s, 7 * s, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      const crater = seg(u, 0.35, 0.4) * (1 - seg(u, 0.8, 1));
      if (crater > 0) {
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = hsla(250, 40, 10, 0.75 * crater);
        ctx.beginPath();
        ctx.ellipse(x, ground + 4, 80 * s, 14 * s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = hsla(250, 80, 70, 0.7 * crater);
        ctx.lineWidth = 2.5 * s;
        ctx.stroke();
      }
      ctx.restore();
    },
  },

  // Tele: a portal opens and Tele flickers through it, glitching into place.
  tele: {
    hit: 0.3, shake: 4,
    body: (u, s) => {
      const glitch = u >= 0.3 && u < 0.55;
      return base(u < 0.55 ? "guard" : settle(u, "flex", 0.75), {
        alpha: u < 0.3 ? 0 : glitch ? (Math.sin(u * 190) > -0.2 ? 1 : 0.15) : 1,
        dx: glitch ? Math.sin(u * 97) * 10 * s : 0,
        solid: "hsl(300 100% 88%)", solidA: 1 - seg(u, 0.45, 0.7),
      });
    },
    bursts: [
      { at: 0.02, n: 22, spd: 0, shape: "pixel", a: "hsl(312 80% 62%)", b: "hsl(300 100% 88%)", grav: 0, add: true, from: "body", dir: "in", spread: 140, life: 0.4 },
      { at: 0.55, n: 24, spd: 400, shape: "pixel", a: "hsl(312 80% 62%)", b: "hsl(280 90% 80%)", grav: 0, add: true, from: "body", dir: "out" },
    ],
    back: ({ ctx, x, y, s, u, t }) => {
      const open = easeOut(seg(u, 0, 0.25)) * (1 - seg(u, 0.55, 0.75));
      if (open <= 0) return;
      const cy = y - 55 * s;
      ctx.save();
      glow(ctx, x, cy, 34 * s * open, 78 * s * open, hsla(285, 60, 12, 0.85), hsla(300, 80, 40, 0.1));
      ctx.globalCompositeOperation = "lighter";
      ctx.lineWidth = 4 * s;
      for (let i = 0; i < 3; i++) {
        const a = t * (6 + i * 3) * (i % 2 ? -1 : 1);
        ctx.strokeStyle = hsla(305 - i * 15, 100, 70 + i * 8, 0.8 * open);
        ctx.beginPath();
        ctx.ellipse(x, cy, (36 + i * 6) * s * open, (80 + i * 8) * s * open, 0, a, a + Math.PI * 1.4);
        ctx.stroke();
      }
      ctx.restore();
    },
    front: ({ ctx, x, y, s, u, t }) => {
      if (u < 0.3 || u >= 0.55) return;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.fillStyle = hsla(300, 100, 80, 0.5);
      const seed = Math.floor(t * 25);
      for (let i = 0; i < 4; i++) {
        const yy = y - (10 + ((wob(seed + i) + 1) / 2) * 100) * s;
        ctx.fillRect(x - 30 * s + wob(seed * 2 + i) * 12 * s, yy, 60 * s, 3 * s);
      }
      ctx.restore();
    },
  },

  // Vita: a sprout grows into a closed bud that blooms open around Vita.
  vita: {
    hit: 0.5, shake: 1,
    body: (u) => base(settle(u, "rise", 0.7), { alpha: seg(u, 0.4, 0.5) }),
    bursts: [
      { at: 0.5, n: 26, spd: 400, shape: "petal", a: "hsl(330 80% 75%)", b: "hsl(345 90% 88%)", grav: 120, add: false, from: "body", dir: "out" },
      { at: 0.5, n: 14, spd: 320, shape: "leaf", a: "hsl(140 58% 44%)", b: "hsl(110 70% 65%)", grav: 160, add: false, from: "body", dir: "out" },
      { at: 0.55, n: 10, spd: 160, shape: "plus", a: "hsl(140 70% 60%)", b: "hsl(110 80% 80%)", grav: -140, add: false, from: "feet", dir: "up" },
    ],
    back: ({ ctx, x, ground, s, u, t }) => {
      const grow = easeOut(seg(u, 0, 0.3));
      const fade = 1 - seg(u, 0.55, 0.85);
      if (grow <= 0 || fade <= 0) return;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.strokeStyle = "hsl(130 50% 34%)";
      ctx.lineCap = "round";
      ctx.lineWidth = 5 * s;
      const h = 70 * s * grow;
      ctx.beginPath();
      ctx.moveTo(x, ground);
      ctx.bezierCurveTo(x - 20 * s, ground - h * 0.3, x + 20 * s + Math.sin(t * 3) * 3 * s, ground - h * 0.7, x, ground - h);
      ctx.stroke();
      ctx.fillStyle = "hsl(125 55% 45%)";
      for (const [ox, oy, a] of [[-14, 0.35, -0.9], [14, 0.62, 0.9]] as const) {
        ctx.save();
        ctx.translate(x + ox * s * grow, ground - h * oy);
        ctx.rotate(a);
        ctx.beginPath();
        ctx.ellipse(0, -10 * s * grow, 6 * s, 13 * s * grow, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    },
    front: ({ ctx, x, ground, s, u }) => {
      const grow = easeOut(seg(u, 0.18, 0.42));
      const open = easeOut(seg(u, 0.45, 0.68));
      const fade = 1 - seg(u, 0.6, 0.9);
      if (grow <= 0 || fade <= 0) return;
      ctx.save();
      ctx.globalAlpha = fade;
      for (let i = 0; i < 6; i++) {
        const off = i - 2.5;
        const a = off * (0.1 + 0.6 * open);
        const len = 64 * s * grow;
        ctx.save();
        ctx.translate(x + off * 6 * s, ground + 2);
        ctx.rotate(a);
        ctx.beginPath();
        ctx.ellipse(0, -len * 0.55, 15 * s, len * 0.6, 0, 0, Math.PI * 2);
        const g = ctx.createLinearGradient(0, 0, 0, -len);
        g.addColorStop(0, "hsl(135 50% 40%)");
        g.addColorStop(0.45, "hsl(330 75% 70%)");
        g.addColorStop(1, "hsl(345 90% 88%)");
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = "hsl(250 32% 14% / 0.5)";
        ctx.lineWidth = 2 * s;
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    },
  },

  // Toxi: a bubbling puddle belches a green cloud and Toxi steps out as it clears.
  toxi: {
    hit: 0.5, shake: 2,
    body: (u) => base(settle(u, "crouch", 0.68), { alpha: seg(u, 0.3, 0.55) }),
    bursts: [
      { at: 0.5, n: 26, spd: 320, shape: "bubble", a: "hsl(86 78% 46%)", b: "hsl(80 100% 72%)", grav: -100, add: false, from: "body", dir: "out" },
      { at: 0.5, n: 12, spd: 260, shape: "ring", a: "hsl(95 70% 40%)", b: "hsl(80 100% 65%)", grav: -60, add: false, from: "feet", dir: "flat" },
    ],
    trickle: { rate: 34, until: 0.5, spd: 110, shape: "bubble", a: "hsl(86 78% 46%)", b: "hsl(80 100% 72%)", grav: -160, add: false, from: "feet", dir: "up", spread: 46 },
    back: ({ ctx, x, ground, s, u }) => {
      const k = easeOut(seg(u, 0, 0.18)) * (1 - seg(u, 0.75, 1));
      if (k <= 0) return;
      ctx.save();
      ctx.fillStyle = hsla(95, 70, 28, 0.8 * k);
      ctx.beginPath();
      ctx.ellipse(x, ground + 3, 60 * s * k, 11 * s * k, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = hsla(80, 100, 60, 0.5 * k);
      ctx.beginPath();
      ctx.ellipse(x - 10 * s, ground + 1, 30 * s * k, 4 * s * k, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },
    front: ({ ctx, x, ground, s, u, t }) => {
      const grow = easeOut(seg(u, 0.1, 0.36));
      const clear = seg(u, 0.48, 0.9);
      const a = 0.82 * (1 - clear);
      if (grow <= 0 || a <= 0) return;
      ctx.save();
      for (let i = 0; i < 10; i++) {
        const ang = i * 0.63 + 0.3;
        const dist = (18 + (i % 3) * 14) * s * (1 + clear * 1.6);
        const r = (24 + (i % 3) * 8) * s * grow * (1 + clear * 0.5);
        const cx = x + Math.cos(ang) * dist + Math.sin(t * 2 + i) * 4 * s;
        const cy = ground - 55 * s + Math.sin(ang) * dist * 0.8 - clear * 30 * s;
        ctx.fillStyle = i % 3 === 0 ? hsla(100, 60, 26, a) : hsla(86, 70, 42 + (i % 2) * 10, a * 0.9);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    },
  },

  // Chrono: a clock face spins backwards while echoes of Chrono close in to one body.
  chrono: {
    hit: 0.5, shake: 3, wave: ["hsl(38 94% 55%)", "hsl(45 100% 82%)"],
    body: (u, s) => base(settle(u, "rise", 0.66), {
      alpha: seg(u, 0.12, 0.5),
      echo: { spread: 70 * s * (1 - easeOut(seg(u, 0.08, 0.5))), alpha: 0.4 * seg(u, 0, 0.12) * (1 - seg(u, 0.42, 0.52)) },
    }),
    bursts: [
      { at: 0.5, n: 22, spd: 380, shape: "glyph", a: "hsl(38 94% 55%)", b: "hsl(45 100% 80%)", grav: 0, add: true, from: "body", dir: "out" },
    ],
    trickle: { rate: 20, until: 0.5, spd: 70, shape: "glyph", a: "hsl(38 94% 55%)", b: "hsl(45 100% 80%)", grav: -80, add: true, from: "feet", dir: "up", spread: 50 },
    back: ({ ctx, x, y, s, u, t }) => {
      const open = easeOut(seg(u, 0, 0.2)) * (1 - seg(u, 0.7, 0.95));
      if (open <= 0) return;
      const cx = x, cy = y - 62 * s, r = 88 * s * open;
      ctx.save();
      ctx.fillStyle = hsla(40, 80, 50, 0.12 * open);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = hsla(42, 100, 65, 0.85 * open);
      ctx.lineWidth = 3 * s;
      ctx.stroke();
      ctx.lineWidth = 2 * s;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const r0 = r * (i % 3 === 0 ? 0.8 : 0.88);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        ctx.lineTo(cx + Math.cos(a) * r * 0.96, cy + Math.sin(a) * r * 0.96);
        ctx.stroke();
      }
      // hands race backwards, then stop at twelve when Chrono arrives
      const run = 1 - seg(u, 0.38, 0.5);
      const m = -Math.PI / 2 - t * 22 * run - (1 - run) * Math.PI * 2;
      const h = -Math.PI / 2 - t * 4 * run;
      ctx.lineCap = "round";
      ctx.lineWidth = 4 * s;
      ctx.beginPath();
      ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(m) * r * 0.75, cy + Math.sin(m) * r * 0.75);
      ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(h) * r * 0.5, cy + Math.sin(h) * r * 0.5);
      ctx.stroke();
      ctx.restore();
    },
  },

  // Magneto: shards of metal fly in from every side and lock together into Magneto.
  magneto: {
    hit: 0.45, shake: 5,
    body: (u) => base(u < 0.45 ? "guard" : settle(u, "flex", 0.72), { alpha: seg(u, 0.15, 0.45), solid: "hsl(210 14% 72%)", solidA: 1 - seg(u, 0.45, 0.7) }),
    bursts: [
      { at: 0, n: 26, spd: 0, shape: "shard", a: "hsl(210 15% 70%)", b: "hsl(0 70% 55%)", grav: 0, add: false, from: "body", dir: "in", spread: 230, life: 0.4 },
      { at: 0.15, n: 22, spd: 0, shape: "shard", a: "hsl(210 20% 82%)", b: "hsl(0 70% 50%)", grav: 0, add: false, from: "body", dir: "in", spread: 170, life: 0.35 },
      { at: 0.45, n: 22, spd: 460, shape: "spark", a: "hsl(0 70% 55%)", b: "hsl(210 20% 90%)", grav: 0, add: true, from: "body", dir: "out" },
    ],
    back: ({ ctx, x, y, s, u, t }) => {
      const k = seg(u, 0, 0.15) * (1 - seg(u, 0.6, 0.9));
      if (k <= 0) return;
      const cy = y - 55 * s;
      ctx.save();
      ctx.lineWidth = 2.5 * s;
      ctx.setLineDash([10 * s, 8 * s]);
      ctx.lineDashOffset = -t * 120;
      for (let i = 1; i <= 3; i++) {
        ctx.strokeStyle = i % 2 ? hsla(0, 70, 55, 0.7 * k) : hsla(210, 20, 85, 0.7 * k);
        ctx.beginPath();
        ctx.ellipse(x, cy, (40 + i * 22) * s, (18 + i * 18) * s, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    },
  },

  // Psy: floats down cross-legged with stones orbiting, then plants both feet.
  psy: {
    hit: 0.62, shake: 2, wave: ["hsl(330 84% 66%)", "hsl(320 100% 88%)"],
    body: (u, s) => base(u < 0.62 ? "float" : settle(u, "flex", 0.75), {
      alpha: seg(u, 0, 0.25),
      dy: (-(1 - easeInOut(seg(u, 0, 0.62))) * 130 - (u < 0.62 ? 14 : 0) * (1 - seg(u, 0.5, 0.62)) - Math.sin(u * 14) * 4 * (1 - seg(u, 0.5, 0.62))) * s,
    }),
    bursts: [
      { at: 0.62, n: 22, spd: 380, shape: "ring", a: "hsl(330 84% 66%)", b: "hsl(320 100% 88%)", grav: 0, add: true, from: "body", dir: "out" },
    ],
    trickle: { rate: 14, until: 0.6, spd: 60, shape: "star", a: "hsl(330 84% 70%)", b: "hsl(320 100% 90%)", grav: -40, add: true, from: "body", dir: "out" },
    back: ({ ctx, x, y, s, u, t, body }) => {
      const k = seg(u, 0, 0.2) * (1 - seg(u, 0.62, 0.9));
      if (k <= 0) return;
      const by = y + body.dy;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 3; i++) {
        const p = (t * 1.6 + i / 3) % 1;
        ctx.strokeStyle = hsla(325, 100, 75, 0.7 * k * (1 - p));
        ctx.lineWidth = 3 * s;
        ctx.beginPath();
        ctx.ellipse(x, by, (20 + p * 60) * s, (5 + p * 14) * s, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
      // stones circling, dropping when Psy lands
      const drop = easeIn(seg(u, 0.62, 0.85));
      for (let i = 0; i < 4; i++) {
        const a = t * 2.6 + (i * Math.PI) / 2;
        const sx = x + Math.cos(a) * 54 * s;
        const sy = by - 60 * s + Math.sin(a) * 14 * s + drop * 80 * s;
        ctx.fillStyle = hsla(28, 30, 40 + (i % 2) * 12, k + drop * 0.2);
        ctx.strokeStyle = "hsl(250 32% 14%)";
        ctx.lineWidth = 2 * s;
        ctx.beginPath();
        ctx.moveTo(sx - 7 * s, sy);
        ctx.lineTo(sx - 2 * s, sy - 7 * s);
        ctx.lineTo(sx + 7 * s, sy - 3 * s);
        ctx.lineTo(sx + 5 * s, sy + 6 * s);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    },
  },

  // Shift: a puddle of colour stretches and wobbles up, cycling through forms, and snaps into Shift.
  shift: {
    hit: 0.5, shake: 3,
    body: (u) => {
      const k = easeOut(seg(u, 0, 0.48));
      const morph = u < 0.5;
      return base(morph ? "guard" : settle(u, "flex", 0.72), {
        alpha: seg(u, 0, 0.1),
        sx: morph ? lerp(1.9, 1, k) + Math.sin(u * 42) * 0.14 * (1 - k) : 1,
        sy: morph ? lerp(0.12, 1, k) + Math.cos(u * 42) * 0.14 * (1 - k) : 1,
        solid: `hsl(${Math.round((u * 1100) % 360)} 85% 60%)`,
        solidA: 1 - seg(u, 0.48, 0.58),
      });
    },
    bursts: [
      { at: 0.5, n: 30, spd: 460, shape: "dot", a: "hsl(186 84% 50%)", b: "hsl(300 90% 70%)", grav: 0, add: true, from: "body", dir: "out" },
      { at: 0.5, n: 12, spd: 300, shape: "star", a: "hsl(46 100% 66%)", b: "hsl(180 100% 82%)", grav: 0, add: true, from: "body", dir: "out" },
    ],
    back: ({ ctx, x, ground, s, u }) => {
      const k = seg(u, 0, 0.08) * (1 - seg(u, 0.45, 0.65));
      if (k <= 0) return;
      ctx.save();
      ctx.fillStyle = `hsl(${Math.round((u * 1100) % 360)} 80% 50% / ${0.6 * k})`;
      ctx.beginPath();
      ctx.ellipse(x, ground + 3, 56 * s, 10 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    },
  },
};

// ---------- the 7 Story bosses ----------
// A boss never borrows an element's entrance: each has its own, longer one.
const BOSS_LEN = 2.2;
/** A colour string "hsl(h s% l%)" with an alpha added. */
const withA = (hsl: string, a: number) => hsl.replace(")", ` / ${clamp(a, 0, 1)})`);

export const BOSS_INTROS: Record<BossDesign, IntroSpec> = {
  // Nullshade: a point of antimatter opens in the air, swallows the light around it, and turns inside out into the boss.
  antimatter: {
    len: BOSS_LEN, hit: 0.42, shake: 10, wave: ["hsl(186 100% 70%)", "hsl(268 60% 30%)"],
    body: (u, s) => base(u < 0.42 ? "float" : settle(u, "guard", 0.66), {
      alpha: u < 0.4 ? 0 : 1,
      sx: 0.08 + 0.92 * easeOut(seg(u, 0.4, 0.6)),
      dy: -(1 - easeOut(seg(u, 0.4, 0.72))) * 40 * s,
      solid: "hsl(186 100% 88%)", solidA: 1 - seg(u, 0.52, 0.84),
    }),
    bursts: [
      { at: 0.42, n: 34, spd: 560, shape: "spark", a: "hsl(186 100% 72%)", b: "hsl(0 0% 100%)", grav: 0, add: true, from: "body", dir: "out" },
      { at: 0.44, n: 18, spd: 260, shape: "smoke", a: "hsl(268 45% 12%)", b: "hsl(270 60% 28%)", grav: -40, add: false, from: "body", dir: "out" },
    ],
    trickle: { rate: 55, until: 0.4, spd: 0, shape: "dot", a: "hsl(186 100% 76%)", b: "hsl(275 80% 70%)", grav: 0, add: true, from: "body", dir: "in", spread: 150, life: 0.7 },
    back: ({ ctx, x, y, s, u, t }) => {
      const cy = y - 55 * s;
      const open = easeOut(seg(u, 0.02, 0.32)) * (1 - easeIn(seg(u, 0.32, 0.44)));
      ctx.save();
      if (open > 0.01) {
        const r = 38 * s * open;
        glow(ctx, x, cy, r * 4, r * 4, hsla(268, 50, 6, 0.55 * open), hsla(268, 50, 6, 0));
        ctx.globalCompositeOperation = "lighter";
        for (let i = 0; i < 3; i++) {
          ctx.strokeStyle = i % 2 ? hsla(275, 90, 70, 0.6 * open) : hsla(186, 100, 75, 0.8 * open);
          ctx.lineWidth = (3 - i) * s;
          ctx.beginPath();
          ctx.ellipse(x, cy, r * (1.9 + i * 0.35), r * (0.5 + i * 0.1), -0.25 + Math.sin(t * 2 + i) * 0.05, t * (4 + i), t * (4 + i) + Math.PI * 1.6);
          ctx.stroke();
        }
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "hsl(268 60% 3%)";
        ctx.beginPath();
        ctx.arc(x, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = hsla(186, 100, 85, open);
        ctx.lineWidth = 2 * s;
        ctx.stroke();
      }
      // the inversion: a cyan shell flung outward when it turns inside out
      const k = seg(u, 0.42, 0.72);
      if (k > 0 && k < 1) {
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = hsla(186, 100, 75, 1 - k);
        ctx.lineWidth = 6 * s * (1 - k);
        ctx.beginPath();
        ctx.arc(x, cy, 30 * s + 200 * s * easeOut(k), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    },
  },

  // Maelstrom: a whirlpool spins open in the floor, a waterspout lifts the boss high, then it crashes down in a wave.
  maelstrom: {
    len: BOSS_LEN, hit: 0.62, shake: 13, wave: ["hsl(200 90% 55%)", "hsl(186 100% 85%)"],
    body: (u, s) => base(u < 0.55 ? "float" : u < 0.72 ? "land" : u < 0.86 ? "flex" : "stance", {
      alpha: seg(u, 0.32, 0.45),
      dy: u < 0.55 ? -(170 + Math.sin(u * 30) * 6) * s * seg(u, 0.2, 0.4) : -170 * s * (1 - easeIn(seg(u, 0.55, 0.62))),
      solid: "hsl(192 90% 82%)", solidA: 1 - seg(u, 0.5, 0.8),
    }),
    bursts: [
      { at: 0.25, n: 20, spd: 420, shape: "drop", a: "hsl(200 85% 55%)", b: "hsl(188 100% 82%)", grav: 900, add: false, from: "feet", dir: "up" },
      { at: 0.62, n: 40, spd: 620, shape: "drop", a: "hsl(205 85% 50%)", b: "hsl(186 100% 85%)", grav: 1000, add: false, from: "feet", dir: "up" },
      { at: 0.62, n: 18, spd: 380, shape: "bubble", a: "hsl(195 90% 70%)", b: "hsl(0 0% 100%)", grav: -60, add: false, from: "feet", dir: "flat" },
    ],
    trickle: { rate: 60, until: 0.72, spd: 40, shape: "drop", a: "hsl(205 70% 70%)", b: "hsl(190 80% 88%)", grav: 1100, add: false, from: "sky", dir: "out", spread: 220, life: 1 },
    back: ({ ctx, x, ground, s, u, t }) => {
      const k = easeOut(seg(u, 0, 0.22)) * (1 - seg(u, 0.7, 1));
      if (k <= 0) return;
      ctx.save();
      // storm-dark sky
      ctx.fillStyle = hsla(215, 50, 10, 0.32 * k);
      ctx.fillRect(-400, -400, 2000, 1200);
      // the whirlpool, rings turning faster toward the middle
      glow(ctx, x, ground + 4, 120 * s * k, 22 * s * k, hsla(200, 80, 40, 0.7 * k), hsla(205, 80, 30, 0));
      for (let i = 0; i < 5; i++) {
        const r = (110 - i * 20) * s * k;
        ctx.strokeStyle = i % 2 ? hsla(188, 100, 85, 0.75 * k) : hsla(205, 85, 55, 0.8 * k);
        ctx.lineWidth = 3 * s;
        const a0 = t * (3 + i * 2.2);
        ctx.beginPath();
        ctx.ellipse(x, ground + 4, r, r * 0.18, 0, a0, a0 + Math.PI * 1.3);
        ctx.stroke();
      }
      // the waterspout
      const h = 250 * s * easeOut(seg(u, 0.18, 0.4)) * (1 - easeIn(seg(u, 0.55, 0.66)));
      if (h > 2) {
        const w0 = 26 * s, w1 = 60 * s;
        ctx.beginPath();
        ctx.moveTo(x - w0, ground);
        for (let i = 1; i <= 10; i++) ctx.lineTo(x - w0 - (w1 - w0) * (i / 10) + Math.sin(t * 14 + i) * 7 * s, ground - (h * i) / 10);
        for (let i = 10; i >= 1; i--) ctx.lineTo(x + w0 + (w1 - w0) * (i / 10) + Math.sin(t * 12 + i * 1.7) * 7 * s, ground - (h * i) / 10);
        ctx.lineTo(x + w0, ground);
        ctx.closePath();
        const g = ctx.createLinearGradient(x - w1, 0, x + w1, 0);
        g.addColorStop(0, hsla(205, 85, 45, 0.25));
        g.addColorStop(0.5, hsla(190, 100, 80, 0.85));
        g.addColorStop(1, hsla(205, 85, 45, 0.25));
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = hsla(0, 0, 100, 0.55);
        ctx.lineWidth = 2 * s;
        for (let i = 0; i < 5; i++) {
          const yy = ground - ((t * 260 + i * 60 * s) % h);
          const ww = w0 + (w1 - w0) * ((ground - yy) / h);
          ctx.beginPath();
          ctx.ellipse(x, yy, ww * 0.9, 5 * s, 0, 0, Math.PI);
          ctx.stroke();
        }
      }
      ctx.restore();
    },
  },

  // Magmaw: glowing cracks race across the floor, the ground bursts and the volcano climbs out of the lava.
  magmaw: {
    len: BOSS_LEN, hit: 0.42, shake: 20, wave: ["hsl(18 100% 50%)", "hsl(42 100% 62%)"],
    body: (u, s) => base(settle(u, "rise", 0.68), {
      clip: true, alpha: u < 0.42 ? 0 : 1,
      dy: (1 - easeOut(seg(u, 0.42, 0.6))) * 175 * s,
      solid: "hsl(26 100% 56%)", solidA: 1 - seg(u, 0.55, 0.85),
    }),
    bursts: [
      { at: 0.08, n: 14, spd: 180, shape: "dust", a: "hsl(20 20% 30%)", b: "hsl(30 30% 50%)", grav: -20, add: false, from: "feet", dir: "flat" },
      { at: 0.42, n: 36, spd: 760, shape: "chunk", a: "hsl(14 30% 18%)", b: "hsl(24 90% 48%)", grav: 1400, add: false, from: "feet", dir: "up" },
      { at: 0.42, n: 30, spd: 620, shape: "ember", a: "hsl(16 100% 52%)", b: "hsl(46 100% 64%)", grav: -120, add: true, from: "feet", dir: "up" },
      { at: 0.46, n: 16, spd: 220, shape: "smoke", a: "hsl(15 15% 18%)", b: "hsl(20 15% 30%)", grav: -90, add: false, from: "feet", dir: "up", spread: 40 },
    ],
    trickle: { rate: 45, until: 0.42, spd: 200, shape: "ember", a: "hsl(18 100% 52%)", b: "hsl(44 100% 64%)", grav: -200, add: true, from: "feet", dir: "up", spread: 80 },
    back: ({ ctx, x, ground, s, u, t }) => {
      const k = easeOut(seg(u, 0, 0.4));
      const fade = 1 - seg(u, 0.72, 1);
      if (k <= 0 || fade <= 0) return;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      glow(ctx, x, ground + 4, 140 * s * k, 20 * s * k, hsla(28, 100, 55, 0.75 * fade), hsla(10, 100, 40, 0));
      ctx.lineCap = "round";
      for (let i = 0; i < 8; i++) {
        const dir = i % 2 ? 1 : -1;
        const len = (90 + (i % 4) * 35) * s * k;
        const yy = ground + 3 + (i % 4) * 10;
        ctx.strokeStyle = hsla(30 + (i % 3) * 8, 100, 58, 0.9 * fade);
        ctx.lineWidth = (4 - (i % 3)) * s;
        jag(ctx, x, ground + 2, x + dir * len, yy, 6, 6 * s, i * 11);
        ctx.stroke();
      }
      // the lava fountain once it breaks through
      const f2 = seg(u, 0.4, 0.46) * (1 - seg(u, 0.55, 0.85));
      if (f2 > 0) {
        const h = 230 * s * f2;
        const g = ctx.createLinearGradient(0, ground, 0, ground - h);
        g.addColorStop(0, hsla(18, 100, 52, 0.95));
        g.addColorStop(0.6, hsla(38, 100, 60, 0.6));
        g.addColorStop(1, hsla(48, 100, 70, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x - 50 * s, ground);
        ctx.quadraticCurveTo(x - 20 * s + Math.sin(t * 20) * 6 * s, ground - h * 0.6, x, ground - h);
        ctx.quadraticCurveTo(x + 20 * s + Math.sin(t * 17) * 6 * s, ground - h * 0.6, x + 50 * s, ground);
        ctx.fill();
      }
      ctx.restore();
    },
    front: ({ ctx, x, ground, s, u }) => {
      const up = easeOut(seg(u, 0.42, 0.52)) * (1 - seg(u, 0.78, 1));
      if (up <= 0) return;
      ctx.save();
      for (const [ox, hh, w] of [[-70, 58, 18], [-38, 84, 20], [40, 78, 19], [72, 52, 16], [-6, 40, 14]] as const) {
        const h = hh * s * up;
        ctx.beginPath();
        ctx.moveTo(x + (ox - w) * s, ground + 4);
        ctx.lineTo(x + (ox + w * 0.2) * s, ground - h);
        ctx.lineTo(x + (ox + w) * s, ground + 4);
        ctx.closePath();
        const g = ctx.createLinearGradient(0, ground - h, 0, ground);
        g.addColorStop(0, "hsl(14 25% 16%)");
        g.addColorStop(0.7, "hsl(16 50% 22%)");
        g.addColorStop(1, "hsl(24 100% 48%)");
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = "hsl(28 100% 55%)";
        ctx.lineWidth = 2 * s;
        ctx.stroke();
      }
      ctx.restore();
    },
  },

  // Everwinter: a blizzard sweeps in, a great clock face of ice runs backwards and stops, and the frozen boss cracks free.
  everwinter: {
    len: BOSS_LEN, hit: 0.62, shake: 9, wave: ["hsl(195 90% 75%)", "hsl(44 90% 72%)"],
    body: (u) => base(u < 0.62 ? "guard" : settle(u, "flex", 0.66), {
      alpha: seg(u, 0.1, 0.35),
      solid: "hsl(196 85% 90%)", solidA: u < 0.62 ? 0.85 : 1 - seg(u, 0.62, 0.74),
    }),
    bursts: [
      { at: 0.62, n: 38, spd: 560, shape: "shard", a: "hsl(196 90% 78%)", b: "hsl(0 0% 100%)", grav: 700, add: false, from: "body", dir: "out" },
      { at: 0.62, n: 20, spd: 300, shape: "flake", a: "hsl(190 100% 92%)", b: "hsl(44 90% 78%)", grav: 40, add: false, from: "body", dir: "out" },
    ],
    trickle: { rate: 70, until: 0.7, spd: 120, shape: "flake", a: "hsl(200 60% 92%)", b: "hsl(0 0% 100%)", grav: 160, add: false, from: "sky", dir: "out", spread: 260, life: 1.4 },
    back: ({ ctx, x, y, s, u, t }) => {
      const k = easeOut(seg(u, 0, 0.22)) * (1 - seg(u, 0.72, 1));
      if (k <= 0) return;
      const cx = x, cy = y - 78 * s, r = 96 * s * k;
      ctx.save();
      glow(ctx, cx, cy, r * 1.5, r * 1.5, hsla(196, 90, 85, 0.35 * k), hsla(196, 90, 85, 0));
      ctx.strokeStyle = hsla(44, 90, 72, 0.9 * k);
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = hsla(196, 80, 90, 0.8 * k);
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.86, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const r0 = r * (i % 3 === 0 ? 0.7 : 0.78);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        ctx.lineTo(cx + Math.cos(a) * r * 0.86, cy + Math.sin(a) * r * 0.86);
        ctx.stroke();
      }
      // the hands run backwards, slowing, and stop dead when the ice breaks
      const run = 1 - easeOut(seg(u, 0.1, 0.62));
      const spin = -(t * 9 * run + (1 - run) * 6.2);
      ctx.strokeStyle = hsla(44, 90, 75, k);
      ctx.lineCap = "round";
      for (const [len, w, m] of [[0.75, 3, 1], [0.5, 5, 1 / 12]] as const) {
        const a = spin * m - Math.PI / 2;
        ctx.lineWidth = w * s;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * r * len, cy + Math.sin(a) * r * len);
        ctx.stroke();
      }
      ctx.restore();
    },
    front: ({ ctx, x, y, s, u }) => {
      const k = seg(u, 0.15, 0.35);
      if (k <= 0 || u > 0.66) return;
      const crack = seg(u, 0.5, 0.62);
      ctx.save();
      const cy = y - 55 * s;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        ctx.lineTo(x + Math.cos(a) * 52 * s, cy + Math.sin(a) * 78 * s);
      }
      ctx.closePath();
      ctx.fillStyle = hsla(196, 90, 85, 0.22 * k);
      ctx.fill();
      ctx.strokeStyle = hsla(0, 0, 100, 0.8 * k);
      ctx.lineWidth = 2 * s;
      ctx.stroke();
      if (crack > 0) {
        for (let i = 0; i < 5; i++) {
          const a = i * 1.3;
          jag(ctx, x, cy, x + Math.cos(a) * 60 * s * crack, cy + Math.sin(a) * 80 * s * crack, 4, 6 * s, i * 5);
          ctx.stroke();
        }
      }
      ctx.restore();
    },
  },

  // The Riftmaker: reality tears open down the middle and the boss squeezes out through the slit; mirror shards orbit it.
  riftmaker: {
    len: BOSS_LEN, hit: 0.36, shake: 11, wave: ["hsl(318 100% 70%)", "hsl(186 100% 80%)"],
    body: (u) => base(u < 0.5 ? "guard" : settle(u, "flex", 0.66), {
      alpha: seg(u, 0.34, 0.5),
      sx: 0.15 + 0.85 * easeOut(seg(u, 0.34, 0.6)),
      solid: "hsl(318 100% 82%)", solidA: 1 - seg(u, 0.5, 0.8),
    }),
    bursts: [
      { at: 0.36, n: 26, spd: 420, shape: "glyph", a: "hsl(318 100% 72%)", b: "hsl(186 100% 80%)", grav: 0, add: true, from: "body", dir: "out" },
      { at: 0.7, n: 24, spd: 520, shape: "shard", a: "hsl(300 80% 85%)", b: "hsl(0 0% 100%)", grav: 500, add: false, from: "body", dir: "out" },
    ],
    trickle: { rate: 36, until: 0.36, spd: 0, shape: "glyph", a: "hsl(318 100% 72%)", b: "hsl(260 90% 75%)", grav: 0, add: true, from: "body", dir: "in", spread: 140, life: 0.6 },
    back: ({ ctx, x, y, s, u, t }) => {
      const w = 46 * s * easeOut(seg(u, 0.04, 0.34)) * (1 - easeIn(seg(u, 0.6, 0.76)));
      if (w < 0.5) return;
      const top = y - 190 * s, bot = y + 2;
      ctx.save();
      // the tear: a jagged lens of another sky, starry and violet
      ctx.beginPath();
      ctx.moveTo(x, top);
      for (let i = 1; i < 12; i++) {
        const k = i / 12;
        ctx.lineTo(x - w * Math.sin(k * Math.PI) + wob(i * 2.1) * 6 * s, top + (bot - top) * k);
      }
      ctx.lineTo(x, bot);
      for (let i = 11; i >= 1; i--) {
        const k = i / 12;
        ctx.lineTo(x + w * Math.sin(k * Math.PI) + wob(i * 3.3) * 6 * s, top + (bot - top) * k);
      }
      ctx.closePath();
      const g = ctx.createLinearGradient(0, top, 0, bot);
      g.addColorStop(0, "hsl(262 70% 10%)");
      g.addColorStop(0.5, "hsl(300 70% 22%)");
      g.addColorStop(1, "hsl(240 70% 12%)");
      ctx.fillStyle = g;
      ctx.fill();
      ctx.shadowColor = "hsl(318 100% 70%)";
      ctx.shadowBlur = 18 * s;
      ctx.strokeStyle = "hsl(318 100% 82%)";
      ctx.lineWidth = 3 * s;
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "hsl(0 0% 100% / 0.85)";
      for (let i = 0; i < 14; i++) {
        const k = (i * 0.37 + t * 0.15) % 1;
        ctx.fillRect(x + wob(i * 5.7) * w * 0.5, top + (bot - top) * k, 2 * s, 2 * s);
      }
      ctx.restore();
    },
    front: ({ ctx, x, y, s, u, t }) => {
      const k = seg(u, 0.36, 0.5) * (1 - seg(u, 0.66, 0.72));
      if (k <= 0) return;
      ctx.save();
      const cy = y - 55 * s;
      for (let i = 0; i < 8; i++) {
        const a = t * 2.4 + (i / 8) * Math.PI * 2;
        const px = x + Math.cos(a) * 80 * s, py = cy + Math.sin(a) * 34 * s;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(a * 1.5);
        ctx.beginPath();
        ctx.moveTo(0, -10 * s); ctx.lineTo(7 * s, 6 * s); ctx.lineTo(-6 * s, 8 * s);
        ctx.closePath();
        ctx.fillStyle = hsla(i % 2 ? 318 : 186, 90, 85, 0.75 * k);
        ctx.fill();
        ctx.strokeStyle = hsla(0, 0, 100, k);
        ctx.lineWidth = 1.2 * s;
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    },
  },

  // The Hollow King: graves rise in a green fog, a ring of runes burns on the floor and the king rises slowly with souls circling.
  hollow: {
    len: BOSS_LEN, hit: 0.72, shake: 8, wave: ["hsl(140 80% 50%)", "hsl(150 60% 80%)"],
    body: (u, s) => base(settle(u, "rise", 0.74), {
      clip: true, alpha: u < 0.28 ? 0 : 1,
      dy: (1 - easeInOut(seg(u, 0.28, 0.72))) * 150 * s,
      solid: "hsl(140 70% 45%)", solidA: 0.7 * (1 - seg(u, 0.62, 0.88)),
    }),
    bursts: [
      { at: 0.28, n: 18, spd: 220, shape: "smoke", a: "hsl(150 40% 18%)", b: "hsl(140 60% 35%)", grav: -60, add: false, from: "feet", dir: "up", spread: 50 },
      { at: 0.72, n: 30, spd: 420, shape: "smoke", a: "hsl(140 80% 55%)", b: "hsl(150 60% 85%)", grav: -40, add: true, from: "body", dir: "out" },
    ],
    trickle: { rate: 45, until: 0.72, spd: 140, shape: "smoke", a: "hsl(150 30% 16%)", b: "hsl(140 70% 40%)", grav: -80, add: false, from: "feet", dir: "up", spread: 90 },
    back: ({ ctx, x, ground, s, u, t }) => {
      const k = easeOut(seg(u, 0, 0.25)) * (1 - seg(u, 0.78, 1));
      if (k <= 0) return;
      ctx.save();
      ctx.fillStyle = hsla(160, 40, 6, 0.3 * k);
      ctx.fillRect(-400, -400, 2000, 1200);
      glow(ctx, x, ground, 150 * s, 40 * s, hsla(140, 80, 40, 0.45 * k), hsla(140, 80, 30, 0));
      // headstones rise out of the ground on both sides
      for (const [ox, hh, w] of [[-120, 46, 20], [-80, 34, 16], [96, 50, 22], [136, 30, 14]] as const) {
        const h = hh * s * easeOut(seg(u, 0.02, 0.22)) * (1 - easeIn(seg(u, 0.8, 1)));
        if (h <= 0) continue;
        const bx = x + ox * s;
        ctx.fillStyle = "hsl(160 10% 22%)";
        ctx.beginPath();
        ctx.moveTo(bx - w * s * 0.5, ground);
        ctx.lineTo(bx - w * s * 0.5, ground - h + w * s * 0.5);
        ctx.arc(bx, ground - h + w * s * 0.5, w * s * 0.5, Math.PI, 0);
        ctx.lineTo(bx + w * s * 0.5, ground);
        ctx.fill();
        ctx.strokeStyle = hsla(140, 70, 50, 0.6 * k);
        ctx.lineWidth = 1.5 * s;
        ctx.stroke();
      }
      // the rune ring burning on the floor
      ctx.globalCompositeOperation = "lighter";
      const rr = 90 * s * easeOut(seg(u, 0.08, 0.3));
      ctx.strokeStyle = hsla(140, 90, 55, 0.85 * k);
      ctx.lineWidth = 2.5 * s;
      ctx.beginPath();
      ctx.ellipse(x, ground + 3, rr, rr * 0.2, 0, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + t * 0.8;
        const px = x + Math.cos(a) * rr * 0.85, py = ground + 3 + Math.sin(a) * rr * 0.17;
        ctx.fillStyle = hsla(140, 90, 65, 0.8 * k);
        ctx.fillRect(px - 2 * s, py - 4 * s, 4 * s, 8 * s);
      }
      ctx.restore();
    },
    front: ({ ctx, x, y, s, u, t }) => {
      const k = seg(u, 0.3, 0.45) * (1 - seg(u, 0.75, 0.9));
      if (k <= 0) return;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 5; i++) {
        const a = t * 3 + (i / 5) * Math.PI * 2;
        const climb = ((t * 0.6 + i * 0.2) % 1);
        const px = x + Math.cos(a) * 58 * s, py = y - (10 + climb * 120) * s;
        const front = Math.sin(a) > 0;
        const r = (front ? 9 : 6) * s;
        glow(ctx, px, py, r * 2.2, r * 2.2, hsla(140, 90, 70, 0.55 * k), hsla(140, 90, 50, 0));
        ctx.fillStyle = hsla(150, 70, 88, 0.85 * k);
        ctx.beginPath();
        ctx.arc(px, py, r * 0.7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = hsla(160, 50, 10, 0.9 * k);
        ctx.fillRect(px - r * 0.35, py - r * 0.15, r * 0.2, r * 0.25);
        ctx.fillRect(px + r * 0.15, py - r * 0.15, r * 0.2, r * 0.25);
      }
      ctx.restore();
    },
  },

  // The Black Sun: the sky goes dark, a black sun with a gold corona sinks, and the boss descends in front of it.
  blacksun: {
    len: BOSS_LEN, hit: 0.7, shake: 15, wave: ["hsl(44 100% 60%)", "hsl(30 30% 8%)"],
    body: (u, s) => base(u < 0.7 ? "float" : u < 0.78 ? "land" : u < 0.88 ? "flex" : "stance", {
      alpha: seg(u, 0.18, 0.38),
      dy: -(1 - easeOut(seg(u, 0.18, 0.7))) * 270 * s,
      solid: "hsl(44 100% 72%)", solidA: 1 - seg(u, 0.55, 0.82),
    }),
    bursts: [
      { at: 0.7, n: 32, spd: 520, shape: "star", a: "hsl(44 100% 62%)", b: "hsl(0 0% 100%)", grav: 0, add: true, from: "body", dir: "out" },
      { at: 0.7, n: 18, spd: 360, shape: "dust", a: "hsl(30 20% 25%)", b: "hsl(40 30% 45%)", grav: -20, add: false, from: "feet", dir: "flat" },
    ],
    trickle: { rate: 30, until: 0.7, spd: 160, shape: "spark", a: "hsl(44 100% 65%)", b: "hsl(36 100% 55%)", grav: 0, add: true, from: "body", dir: "out", life: 0.5 },
    back: ({ ctx, x, y, s, u, t }) => {
      const dark = easeOut(seg(u, 0, 0.2)) * (1 - seg(u, 0.75, 1));
      if (dark <= 0) return;
      ctx.save();
      ctx.fillStyle = hsla(30, 30, 4, 0.5 * dark);
      ctx.fillRect(-400, -400, 2000, 1200);
      const cy = y - 85 * s - (1 - easeOut(seg(u, 0.1, 0.7))) * 220 * s;
      const r = 70 * s;
      ctx.globalCompositeOperation = "lighter";
      glow(ctx, x, cy, r * 2.4, r * 2.4, hsla(44, 100, 60, 0.55 * dark), hsla(36, 100, 50, 0));
      ctx.strokeStyle = hsla(44, 100, 68, 0.7 * dark);
      ctx.lineCap = "round";
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 + t * 0.6;
        const len = (i % 2 ? 40 : 70) * s;
        ctx.lineWidth = (i % 2 ? 2 : 3.5) * s;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * r * 1.05, cy + Math.sin(a) * r * 1.05);
        ctx.lineTo(x + Math.cos(a) * (r + len), cy + Math.sin(a) * (r + len));
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "hsl(30 30% 3%)";
      ctx.beginPath();
      ctx.arc(x, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = hsla(48, 100, 80, dark);
      ctx.lineWidth = 2.5 * s;
      ctx.stroke();
      ctx.restore();
    },
  },
};

// ---------- hybrids ----------
/**
 * A hybrid's own entrance: both parents' entrances play side by side, drawn in from either side, while two orbs of
 * their colours circle in and meet; at the moment they touch the hybrid bursts into being in both colours.
 * `ca` and `cb` are each parent's [colour, glow].
 */
export function fusionIntro(a: Power, b: Power, ca: [string, string], cb: [string, string]): IntroSpec {
  const A = INTROS[a], B = INTROS[b];
  const FUSE = 0.5;
  const sub = (u: number) => clamp(u / FUSE, 0, 1) * 0.78;
  const off = (u: number, s: number) => 120 * s * (1 - easeInOut(seg(u, 0.1, FUSE)));
  const parents = (which: "back" | "front", d: IntroDraw) => {
    const fade = 1 - seg(d.u, FUSE - 0.06, FUSE + 0.06);
    const su = sub(d.u);
    if (fade <= 0 || su <= 0) return;
    for (const [spec, side] of [[A, -1], [B, 1]] as const) {
      const fn = spec[which];
      if (!fn) continue;
      d.ctx.save();
      d.ctx.globalAlpha = fade;
      fn({ ...d, x: d.x + side * off(d.u, d.s), u: su, t: su * INTRO_LEN, body: spec.body(su, d.s) });
      d.ctx.restore();
    }
  };
  return {
    len: 1.8, hit: FUSE, shake: 11, wave: [ca[1], cb[1]],
    body: (u, s) => u < FUSE
      ? base("guard", { alpha: 0, echo: { spread: off(u, s), alpha: 0.8 * seg(u, 0.08, 0.28) }, solid: "hsl(0 0% 100%)", solidA: 0.85 })
      : base(settle(u, "land", 0.64), { solid: "hsl(0 0% 100%)", solidA: 1 - seg(u, FUSE, FUSE + 0.22) }),
    bursts: [
      { at: FUSE, n: 26, spd: 560, shape: "spark", a: ca[0], b: ca[1], grav: 0, add: true, from: "body", dir: "out" },
      { at: FUSE, n: 26, spd: 480, shape: "star", a: cb[0], b: cb[1], grav: 0, add: true, from: "body", dir: "out" },
      { at: FUSE, n: 12, spd: 300, shape: "dust", a: "hsl(250 15% 60%)", b: "hsl(250 15% 80%)", grav: -20, add: false, from: "feet", dir: "flat" },
    ],
    back: (d) => parents("back", d),
    front: (d) => {
      parents("front", d);
      const { ctx, x, y, s, u, t } = d;
      const cy = y - 55 * s;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      if (u < FUSE) {
        const k = seg(u, 0.04, 0.2);
        const o = off(u, s);
        const orbs = [[-1, ca], [1, cb]] as const;
        for (const [side, c] of orbs) {
          const a = t * 9 + (side > 0 ? Math.PI : 0);
          const px = x + side * o + Math.cos(a) * 16 * s * (o / (120 * s) + 0.2);
          const py = cy + Math.sin(a) * 12 * s;
          glow(ctx, px, py, 26 * s, 26 * s, withA(c[1], 0.9 * k), withA(c[0], 0));
          ctx.fillStyle = withA("hsl(0 0% 100%)", k);
          ctx.beginPath();
          ctx.arc(px, py, 5 * s, 0, Math.PI * 2);
          ctx.fill();
        }
        // the two powers reach for each other as they close in
        if (u > 0.3) {
          const reach = seg(u, 0.3, FUSE);
          ctx.lineWidth = 2.5 * s;
          for (let i = 0; i < 2; i++) {
            ctx.strokeStyle = withA(i ? cb[1] : ca[1], 0.8 * reach);
            jag(ctx, x - o, cy, x + o, cy, 7, 10 * s, Math.floor(t * 24) + i * 9);
            ctx.stroke();
          }
        }
      } else {
        const k = seg(u, FUSE, FUSE + 0.32);
        if (k < 1) {
          for (const [c, d0] of [[ca, 0], [cb, 0.06]] as const) {
            const kk = clamp(k - d0, 0, 1);
            ctx.strokeStyle = withA(c[1], 1 - kk);
            ctx.lineWidth = 7 * s * (1 - kk);
            ctx.beginPath();
            ctx.arc(x, cy, 20 * s + 190 * s * easeOut(kk), 0, Math.PI * 2);
            ctx.stroke();
          }
          glow(ctx, x, cy, 90 * s * (1 - k * 0.5), 90 * s * (1 - k * 0.5), withA("hsl(0 0% 100%)", 0.7 * (1 - k)), withA("hsl(0 0% 100%)", 0));
        }
      }
      ctx.restore();
    },
  };
}
