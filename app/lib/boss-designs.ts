// How each Story boss looks on top of the stickman body: halos, horns, crowns, capes, hoods and weapons.
// The engine calls this twice per boss per frame: once behind the limbs ("back") and once in front ("front").
import type { BossDesign } from "./fighters";

type Pt = { x: number; y: number };
export type BossRig = { hip: Pt; neck: Pt; shoulder: Pt; head: Pt; kF: Pt; fF: Pt; kB: Pt; fB: Pt; eF: Pt; hF: Pt; eB: Pt; hB: Pt };

const TAU = Math.PI * 2;
const HEAD = 11;
const INK = "hsl(250 32% 14%)";

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, inner: string, outer: string) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

function jagLine(ctx: CanvasRenderingContext2D, pts: Pt[], amp: number, seed: number) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    for (let k = 1; k <= 3; k++) {
      const u = k / 3;
      const off = k < 3 ? Math.sin(seed * 13.7 + i * 5.1 + k * 2.3) * amp : 0;
      ctx.lineTo(a.x + (b.x - a.x) * u - (b.y - a.y) * 0.05 * off, a.y + (b.y - a.y) * u + (b.x - a.x) * 0.05 * off);
    }
  }
  ctx.stroke();
}

/** What the boss is doing this frame, so its weapon and body can follow the move. */
export type BossAct = { kind: string; id: string; phase: "wind" | "strike" | "after"; u: number };

const ease = (u: number) => 1 - Math.pow(1 - u, 3);
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

/** A small licking flame, pointing up. */
function flame(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: string) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.quadraticCurveTo(x - w * 0.6, y - h * 0.6, x, y - h);
  ctx.quadraticCurveTo(x + w * 0.6, y - h * 0.6, x + w, y);
  ctx.quadraticCurveTo(x, y + w * 0.6, x - w, y);
  ctx.fill();
}

/** A robe or skirt from the waist down past the knees, its hem torn and swaying. */
function robe(ctx: CanvasRenderingContext2D, hip: Pt, fF: Pt, fB: Pt, s: number, t: number, fill: string, trim: string) {
  const hemY = Math.min(fF.y, fB.y) - 10 * s;
  const l = Math.min(fF.x, fB.x, hip.x - 10 * s) - 6 * s, r = Math.max(fF.x, fB.x, hip.x + 10 * s) + 6 * s;
  ctx.fillStyle = fill;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4 * s;
  ctx.beginPath();
  ctx.moveTo(hip.x - 8 * s, hip.y - 6 * s);
  ctx.lineTo(hip.x + 8 * s, hip.y - 6 * s);
  ctx.lineTo(r, hemY);
  const n = 7;
  for (let i = 1; i <= n; i++) {
    const x = r + ((l - r) * i) / n;
    ctx.lineTo(x, hemY - (i % 2 ? 7 : 0) * s + Math.sin(t * 4 + i * 1.3) * 2 * s);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = trim;
  ctx.lineWidth = 1.6 * s;
  ctx.beginPath();
  ctx.moveTo(hip.x - 8 * s, hip.y - 4 * s);
  ctx.lineTo(hip.x + 8 * s, hip.y - 4 * s);
  ctx.stroke();
}

/** Motes drifting through a box above (x, y): embers, snow, souls or stars. Stateless: placed by time. */
function motes(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, t: number, n: number, col: string, size: number, rise = 1) {
  ctx.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const k = (t * 0.35 * (0.7 + (i % 3) * 0.2) + i / n) % 1;
    const px = x + (Math.sin(i * 12.9898) * 0.5) * w + Math.sin(t * 2 + i) * 4;
    const py = y - (rise > 0 ? k : 1 - k) * h;
    ctx.globalAlpha = Math.sin(k * Math.PI);
    ctx.beginPath();
    ctx.arc(px, py, size * (0.6 + (i % 2) * 0.5), 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** A rounded shoulder plate. */
function pauldron(ctx: CanvasRenderingContext2D, sh: Pt, face: number, s: number, fill: string, edge: string, spikes = 0) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6 * s;
  ctx.beginPath();
  ctx.ellipse(sh.x - face * 2 * s, sh.y + 1 * s, 10 * s, 6.5 * s, -face * 0.25, Math.PI, TAU);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.4 * s;
  ctx.beginPath();
  ctx.ellipse(sh.x - face * 2 * s, sh.y + 1 * s, 7 * s, 4 * s, -face * 0.25, Math.PI * 1.1, TAU * 0.95);
  ctx.stroke();
  for (let i = 0; i < spikes; i++) {
    const bx = sh.x - face * (6 - i * 6) * s, by = sh.y - 4 * s;
    ctx.fillStyle = fill;
    ctx.strokeStyle = INK;
    ctx.beginPath();
    ctx.moveTo(bx - 2.5 * s, by + 1 * s);
    ctx.lineTo(bx - face * 2 * s, by - 9 * s);
    ctx.lineTo(bx + 2.5 * s, by + 1 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

/**
 * The Hollow King's scythe through each move. Angles are in the facing-right frame: -PI/2 is straight up,
 * 0 points forward, PI/2 straight down. `from` is where this swing's smear starts.
 */
function scytheSwing(act: BossAct | undefined, p: BossRig, s: number, t: number) {
  const lean = Math.max(-1, Math.min(1, (p.hF.x - p.eF.x) / (14 * s)));
  const rest = -Math.PI / 2 - 0.15 + lean * 0.12;
  const pivot = p.hF;
  let a = rest, from = rest, smear = 0, charge = 0;
  if (act) {
    const u = act.u;
    const swing = (back: number, end: number, k = 1) => {
      if (act.phase === "wind") { a = lerp(rest, back, ease(u)); charge = u * 0.6; }
      else if (act.phase === "strike") {
        const e = ease(Math.min(1, u * 1.6));
        a = lerp(back, end, e);
        from = Math.max(back, a - 2.2);
        smear = (1 - u) * k;
        charge = 1 - u;
      } else a = lerp(end, rest, ease(u));
    };
    switch (act.kind) {
      case "melee": swing(-Math.PI - 0.35, 1.0); break; // Reaper's Scythe: over the shoulder and down through the target
      case "pull": swing(-Math.PI / 2 - 0.9, -0.15, 0.6); break; // Soul Chains: hooked out in front
      case "eruption": swing(-Math.PI / 2 - 1.1, 1.35, 0.8); break; // Grave Hands: slammed point-first into the ground
      case "projectile": swing(-Math.PI + 0.1, 0.35, 0.9); break; // Wailing Souls: a flat sweep that throws the souls
      case "zone": // Graveyard: twirled like a baton, then raised high
        if (act.phase === "wind") { a = rest + ease(u) * TAU * 2; charge = u; }
        else if (act.phase === "strike") { a = -Math.PI / 2 - 0.05; charge = 1 - u * 0.5; }
        else a = lerp(-Math.PI / 2, rest, ease(u));
        break;
      case "burst": // Soul Harvest: spun overhead, then one huge reap
        if (act.phase === "wind") { a = rest - ease(u) * (TAU * 2 + rest + Math.PI + 0.6); charge = u; }
        else swing(-Math.PI - 0.6, 1.2, 1.3);
        break;
      default: swing(-Math.PI / 2 - 0.6, 0.2, 0.6);
    }
  }
  return { pivot, a, from, smear, charge: Math.min(1, charge + (act ? 0 : 0.15 + 0.1 * Math.sin(t * 3))) };
}

/** A green crescent behind the blade's path, fading toward where the swing began. */
function drawSmear(ctx: CanvasRenderingContext2D, pv: Pt, a0: number, a1: number, face: number, s: number, k: number) {
  if (a1 - a0 < 0.05) return;
  const w = (x: number) => (face > 0 ? x : Math.PI - x);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const steps = 10;
  for (let i = 0; i < steps; i++) {
    const s0 = a0 + ((a1 - a0) * i) / steps, s1 = a0 + ((a1 - a0) * (i + 1)) / steps;
    const al = Math.min(1, k) * ((i + 1) / steps);
    ctx.fillStyle = `hsl(152 92% ${60 + i * 2}% / ${0.55 * al})`;
    ctx.beginPath();
    ctx.arc(pv.x, pv.y, 60 * s, w(s0), w(s1), face < 0);
    ctx.arc(pv.x, pv.y, (34 + 18 * (1 - i / steps)) * s, w(s1), w(s0), face > 0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = `hsl(150 100% 92% / ${0.9 * Math.min(1, k)})`;
  ctx.lineWidth = 2.4 * s;
  ctx.beginPath();
  ctx.arc(pv.x, pv.y, 59 * s, w(Math.max(a0, a1 - 1.2)), w(a1), face < 0);
  ctx.stroke();
  ctx.restore();
}

/** The scythe itself: a bone-ringed shaft through the hand, a long curved blade with a soul-green edge. */
function drawScythe(ctx: CanvasRenderingContext2D, pv: Pt, a: number, face: number, s: number, alive: boolean, charge: number, t: number) {
  const ux = Math.cos(a) * face, uy = Math.sin(a);
  const nx = face * -uy, ny = face * ux;
  const P = (along: number, side: number) => ({ x: pv.x + ux * along * s + nx * side * s, y: pv.y + uy * along * s + ny * side * s });
  const top = P(48, 0), butt = P(-38, 0);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5.5 * s;
  ctx.beginPath();
  ctx.moveTo(butt.x, butt.y); ctx.lineTo(top.x, top.y);
  ctx.stroke();
  ctx.strokeStyle = "hsl(30 18% 30%)";
  ctx.lineWidth = 3 * s;
  ctx.stroke();
  // bone rings on the shaft and a skull-knob at the butt
  ctx.strokeStyle = "hsl(44 30% 80%)";
  ctx.lineWidth = 2 * s;
  for (const k of [-24, 22, 40]) {
    const d = P(k, 3.5), e = P(k, -3.5);
    ctx.beginPath();
    ctx.moveTo(d.x, d.y); ctx.lineTo(e.x, e.y);
    ctx.stroke();
  }
  ctx.fillStyle = "hsl(44 30% 82%)";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.3 * s;
  ctx.beginPath();
  ctx.arc(butt.x, butt.y, 4 * s, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // blade
  const b0 = P(50, -1), c1 = P(66, 32), tip = P(36, 50), c2 = P(54, 26), b1 = P(43, 0);
  ctx.fillStyle = "hsl(180 10% 80%)";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.7 * s;
  ctx.beginPath();
  ctx.moveTo(b0.x, b0.y);
  ctx.quadraticCurveTo(c1.x, c1.y, tip.x, tip.y);
  ctx.quadraticCurveTo(c2.x, c2.y, b1.x, b1.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // a darker spine along the back of the blade
  ctx.strokeStyle = "hsl(180 8% 48%)";
  ctx.lineWidth = 1.6 * s;
  const sp1 = P(60, 22), sp2 = P(44, 42);
  ctx.beginPath();
  ctx.moveTo(b0.x, b0.y);
  ctx.quadraticCurveTo(sp1.x, sp1.y, sp2.x, sp2.y);
  ctx.stroke();
  if (alive) {
    ctx.globalCompositeOperation = "lighter";
    const e1 = P(46, 3), ec = P(55, 26), e2 = P(37, 47);
    ctx.strokeStyle = `hsl(152 92% ${66 + charge * 20}% / ${0.6 + charge * 0.4})`;
    ctx.lineWidth = (1.6 + charge * 2.4) * s;
    ctx.beginPath();
    ctx.moveTo(e1.x, e1.y);
    ctx.quadraticCurveTo(ec.x, ec.y, e2.x, e2.y);
    ctx.stroke();
    if (charge > 0.3) glow(ctx, tip.x, tip.y, (8 + 10 * charge + Math.sin(t * 20) * 2) * s, `hsl(152 100% 80% / ${charge})`, "hsl(152 92% 60% / 0)");
    ctx.globalCompositeOperation = "source-over";
  }
}

export function drawBossDesign(
  ctx: CanvasRenderingContext2D, design: BossDesign, layer: "back" | "front", p: BossRig,
  s: number, face: number, t: number, alive: boolean, vx: number, act?: BossAct,
) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const { head, neck, hip, shoulder } = p;
  const mid = { x: (hip.x + head.x) / 2, y: (hip.y + head.y) / 2 };
  if (layer === "back") drawBossExtras(ctx, design, layer, p, s, face, t, alive, vx, act);
  switch (design) {
    // ----- Nullshade: matter and antimatter -----
    case "antimatter": {
      if (layer === "back") {
        if (alive) {
          ctx.globalCompositeOperation = "source-over";
          glow(ctx, mid.x, mid.y, 78 * s, "hsl(268 60% 8% / 0.55)", "hsl(268 60% 8% / 0)");
          ctx.globalCompositeOperation = "lighter";
          ctx.strokeStyle = "hsl(186 100% 72% / 0.35)";
          ctx.lineWidth = 2 * s;
          ctx.beginPath();
          ctx.arc(mid.x, mid.y, (58 + Math.sin(t * 3) * 3) * s, 0, TAU);
          ctx.stroke();
        }
        // a cracked white halo behind the head
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = "hsl(0 0% 96%)";
        ctx.lineWidth = 3 * s;
        const hx = head.x - face * 4 * s, hy = head.y - 2 * s;
        for (const [a0, a1] of [[0.2, 1.9], [2.15, 3.6], [3.85, 5.95]]) {
          ctx.beginPath();
          ctx.ellipse(hx, hy, 21 * s, 21 * s, 0, a0 + t * 0.4, a1 + t * 0.4);
          ctx.stroke();
        }
      } else {
        // cyan veins down the body
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = "hsl(186 100% 70% / 0.85)";
        ctx.lineWidth = 1.6 * s;
        jagLine(ctx, [neck, mid, hip], 30, 1);
        jagLine(ctx, [shoulder, p.eF, p.hF], 24, 2);
        // matter and antimatter orbiting the head, passing in front and behind
        if (alive) {
          for (let i = 0; i < 2; i++) {
            const an = t * 3.2 + i * Math.PI;
            const ox = head.x + Math.cos(an) * 30 * s, oy = head.y - 6 * s + Math.sin(an) * 9 * s;
            ctx.globalCompositeOperation = i === 0 ? "lighter" : "source-over";
            if (i === 0) {
              glow(ctx, ox, oy, 11 * s, "hsl(0 0% 100%)", "hsl(186 100% 80% / 0)");
            } else {
              ctx.fillStyle = "hsl(268 70% 6%)";
              ctx.beginPath();
              ctx.arc(ox, oy, 5.5 * s, 0, TAU);
              ctx.fill();
              ctx.strokeStyle = "hsl(186 100% 72%)";
              ctx.lineWidth = 2 * s;
              ctx.stroke();
            }
          }
        }
        // eye: a white ring with a black core, the inverse of everyone else
        ctx.globalCompositeOperation = "source-over";
        const ex = head.x + face * 5 * s, ey = head.y - 1.5 * s;
        if (alive) {
          ctx.fillStyle = "hsl(186 100% 82%)";
          ctx.beginPath();
          ctx.arc(ex, ey, 4.4 * s, 0, TAU);
          ctx.fill();
          ctx.fillStyle = "hsl(268 70% 6%)";
          ctx.beginPath();
          ctx.arc(ex + face * 1.2 * s, ey, 2.2 * s, 0, TAU);
          ctx.fill();
        }
      }
      break;
    }
    // ----- Maelstrom: a waterspout body, lightning crown, trident -----
    case "maelstrom": {
      if (layer === "back") {
        // waterspout spinning around the legs
        for (let i = 0; i < 6; i++) {
          const u = i / 5;
          const y = hip.y + (p.fF.y - hip.y + 6 * s) * u;
          const rx = (14 + u * 22) * s;
          ctx.strokeStyle = i % 2 ? "hsl(190 100% 78% / 0.8)" : "hsl(210 80% 45% / 0.85)";
          ctx.lineWidth = 3 * s;
          ctx.beginPath();
          ctx.ellipse(hip.x, y, rx, rx * 0.28, 0, t * 9 + i, t * 9 + i + 4);
          ctx.stroke();
        }
        // storm-cloud mantle off the shoulders
        const back = -face;
        ctx.fillStyle = "hsl(215 28% 26% / 0.92)";
        for (let i = 0; i < 4; i++) {
          const bx = shoulder.x + back * (8 + i * 9) * s + Math.sin(t * 4 + i) * 2 * s;
          const by = shoulder.y + i * 9 * s;
          ctx.beginPath();
          ctx.arc(bx, by, (11 - i) * s, 0, TAU);
          ctx.fill();
        }
      } else {
        // trident in the front hand, pointing the way the forearm does
        const dx = p.hF.x - p.eF.x, dy = p.hF.y - p.eF.y;
        const L = Math.hypot(dx, dy) || 1;
        const ux = dx / L, uy = dy / L;
        const tip = { x: p.hF.x + ux * 36 * s, y: p.hF.y + uy * 36 * s };
        const butt = { x: p.hF.x - ux * 30 * s, y: p.hF.y - uy * 30 * s };
        ctx.strokeStyle = INK;
        ctx.lineWidth = 5 * s;
        ctx.beginPath();
        ctx.moveTo(butt.x, butt.y); ctx.lineTo(tip.x, tip.y);
        ctx.stroke();
        ctx.strokeStyle = "hsl(44 70% 62%)";
        ctx.lineWidth = 2.6 * s;
        ctx.stroke();
        ctx.strokeStyle = "hsl(186 90% 80%)";
        ctx.lineWidth = 2.6 * s;
        ctx.beginPath();
        const nx = -uy, ny = ux;
        for (const k of [-1, 0, 1]) {
          ctx.moveTo(tip.x + nx * k * 7 * s, tip.y + ny * k * 7 * s);
          ctx.lineTo(tip.x + nx * k * 7 * s + ux * 12 * s, tip.y + ny * k * 7 * s + uy * 12 * s);
        }
        ctx.moveTo(tip.x - nx * 7 * s, tip.y - ny * 7 * s);
        ctx.lineTo(tip.x + nx * 7 * s, tip.y + ny * 7 * s);
        ctx.stroke();
        // crown of three lightning bolts
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = "hsl(54 100% 70%)";
        ctx.lineWidth = 2.4 * s;
        for (const k of [-1, 0, 1]) {
          const bx = head.x + k * 7 * s, by = head.y - (HEAD - 1) * s;
          const flick = Math.sin(t * 20 + k) * 2 * s;
          ctx.beginPath();
          ctx.moveTo(bx, by);
          ctx.lineTo(bx + k * 3 * s + flick, by - 7 * s);
          ctx.lineTo(bx + k * 1 * s - flick, by - 10 * s);
          ctx.lineTo(bx + k * 5 * s, by - (k === 0 ? 20 : 15) * s);
          ctx.stroke();
        }
      }
      break;
    }
    // ----- Magmaw: horns, molten cracks, a jaw of magma -----
    case "magmaw": {
      if (layer === "back") {
        if (alive) {
          // smoke rising off the shoulders
          for (let i = 0; i < 4; i++) {
            const k = ((t * 0.5 + i / 4) % 1);
            ctx.fillStyle = `hsl(20 8% 22% / ${0.5 * (1 - k)})`;
            ctx.beginPath();
            ctx.arc(shoulder.x - face * 6 * s + Math.sin(i * 2 + t) * 6 * s, shoulder.y - 10 * s - k * 60 * s, (6 + k * 12) * s, 0, TAU);
            ctx.fill();
          }
          glow(ctx, mid.x, mid.y, 60 * s, "hsl(24 100% 50% / 0.25)", "hsl(24 100% 50% / 0)");
        }
      } else {
        // molten cracks
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = alive ? `hsl(${28 + Math.sin(t * 6) * 6} 100% 58%)` : "hsl(20 60% 30%)";
        ctx.lineWidth = 2.2 * s;
        jagLine(ctx, [neck, mid, hip], 40, 3);
        jagLine(ctx, [hip, p.kF, p.fF], 30, 4);
        jagLine(ctx, [shoulder, p.eF, p.hF], 30, 5);
        ctx.globalCompositeOperation = "source-over";
        // two obsidian horns sweeping back
        for (const side of [1, -1]) {
          const bx = head.x + face * side * 4 * s, by = head.y - 7 * s;
          const tipx = bx - face * (14 + side * 4) * s, tipy = by - (18 + side * 4) * s;
          ctx.fillStyle = "hsl(260 12% 12%)";
          ctx.strokeStyle = INK;
          ctx.lineWidth = 1.5 * s;
          ctx.beginPath();
          ctx.moveTo(bx - 4 * s, by + 2 * s);
          ctx.quadraticCurveTo(bx + face * 6 * s, by - 16 * s, tipx, tipy);
          ctx.quadraticCurveTo(bx - face * 2 * s, by - 6 * s, bx + 4 * s, by + 2 * s);
          ctx.fill();
          ctx.stroke();
          glow(ctx, tipx, tipy, 4 * s, "hsl(36 100% 70%)", "hsl(20 100% 50% / 0)");
        }
        // the maw: a glowing jaw full of teeth
        const mx = head.x + face * 5 * s, my = head.y + 4 * s;
        ctx.fillStyle = alive ? "hsl(30 100% 58%)" : "hsl(20 40% 28%)";
        ctx.beginPath();
        ctx.ellipse(mx, my, 6.5 * s, 3.6 * s, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "hsl(40 30% 92%)";
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath();
          ctx.moveTo(mx + i * 2.4 * s - 1 * s, my - 3 * s);
          ctx.lineTo(mx + i * 2.4 * s + 1 * s, my - 3 * s);
          ctx.lineTo(mx + i * 2.4 * s, my - 0.5 * s);
          ctx.fill();
        }
        // eyes burn orange
        if (alive) glow(ctx, head.x + face * 5 * s, head.y - 2 * s, 5 * s, "hsl(48 100% 75%)", "hsl(20 100% 50% / 0)");
      }
      break;
    }
    // ----- Everwinter: frost cape, clock halo, icicle crown -----
    case "everwinter": {
      if (layer === "back") {
        // clock-face halo, its hands turning backwards
        const cx = head.x - face * 6 * s, cy = head.y - 4 * s, r = 24 * s;
        ctx.globalCompositeOperation = "lighter";
        glow(ctx, cx, cy, r * 1.3, "hsl(44 90% 72% / 0.3)", "hsl(44 90% 72% / 0)");
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = "hsl(44 85% 66%)";
        ctx.lineWidth = 2.4 * s;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, TAU);
        ctx.stroke();
        ctx.lineWidth = 1.6 * s;
        ctx.beginPath();
        for (let i = 0; i < 12; i++) {
          const an = (i / 12) * TAU;
          ctx.moveTo(cx + Math.cos(an) * r * 0.8, cy + Math.sin(an) * r * 0.8);
          ctx.lineTo(cx + Math.cos(an) * r * 0.95, cy + Math.sin(an) * r * 0.95);
        }
        const h1 = -t * 0.8, h2 = -t * 3;
        ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(h1) * r * 0.75, cy + Math.sin(h1) * r * 0.75);
        ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(h2) * r * 0.55, cy + Math.sin(h2) * r * 0.55);
        ctx.stroke();
        // frost cape flowing behind, hem jagged like ice
        const back = -face;
        const sway = Math.sin(t * 3) * 4 * s + Math.min(18, Math.abs(vx) * 0.04) * s;
        const hemY = hip.y + 34 * s;
        const gr = ctx.createLinearGradient(0, shoulder.y, 0, hemY);
        gr.addColorStop(0, "hsl(205 70% 80% / 0.95)");
        gr.addColorStop(1, "hsl(200 90% 94% / 0.75)");
        ctx.fillStyle = gr;
        ctx.strokeStyle = "hsl(205 60% 52%)";
        ctx.lineWidth = 1.6 * s;
        ctx.beginPath();
        ctx.moveTo(shoulder.x, shoulder.y);
        ctx.quadraticCurveTo(shoulder.x + back * 20 * s, mid.y, hip.x + back * (30 * s + sway), hemY);
        for (let i = 1; i <= 5; i++) {
          const x = hip.x + back * (30 * s + sway) - back * i * 7 * s;
          ctx.lineTo(x + back * 3 * s, hemY - (i % 2 ? 0 : 9) * s);
        }
        ctx.lineTo(hip.x, hip.y + 4 * s);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        // crown of icicles
        ctx.fillStyle = "hsl(195 90% 92%)";
        ctx.strokeStyle = "hsl(205 60% 50%)";
        ctx.lineWidth = 1.4 * s;
        for (let i = -2; i <= 2; i++) {
          const an = -Math.PI / 2 + i * 0.36;
          const bx = head.x + Math.cos(an) * HEAD * s, by = head.y + Math.sin(an) * HEAD * s;
          const len = (i === 0 ? 17 : Math.abs(i) === 1 ? 12 : 8) * s;
          ctx.beginPath();
          ctx.moveTo(bx - Math.sin(an) * 3 * s, by + Math.cos(an) * 3 * s);
          ctx.lineTo(bx + Math.cos(an) * len, by + Math.sin(an) * len);
          ctx.lineTo(bx + Math.sin(an) * 3 * s, by - Math.cos(an) * 3 * s);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }
      break;
    }
    // ----- The Riftmaker: reality splitting around it -----
    case "riftmaker": {
      if (layer === "back") {
        // the body seen twice, shifted in magenta and cyan, as if reality cannot hold it in one place
        if (alive) {
          ctx.globalCompositeOperation = "lighter";
          const j = (2.5 + Math.sin(t * 7) * 1.5) * s;
          for (const [dx, col] of [[-j, "hsl(318 100% 62% / 0.55)"], [j, "hsl(186 100% 60% / 0.55)"]] as const) {
            ctx.strokeStyle = col;
            ctx.lineWidth = 6 * s;
            ctx.beginPath();
            for (const seg of [[hip, neck], [hip, p.kF, p.fF], [hip, p.kB, p.fB], [shoulder, p.eF, p.hF], [shoulder, p.eB, p.hB]]) {
              ctx.moveTo(seg[0].x + dx, seg[0].y);
              for (const q of seg.slice(1)) ctx.lineTo(q.x + dx, q.y);
            }
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(head.x + dx, head.y, HEAD * s, 0, TAU);
            ctx.stroke();
          }
          ctx.globalCompositeOperation = "source-over";
        }
        // a halo of broken mirror shards turning behind the head
        for (let i = 0; i < 7; i++) {
          const an = t * 0.9 + (i / 7) * TAU;
          const r = (30 + Math.sin(t * 2 + i) * 3) * s;
          const x = head.x + Math.cos(an) * r, y = head.y - 4 * s + Math.sin(an) * r * 0.8;
          ctx.fillStyle = i % 2 ? "hsl(318 90% 70% / 0.9)" : "hsl(186 90% 72% / 0.9)";
          ctx.strokeStyle = "hsl(0 0% 100% / 0.9)";
          ctx.lineWidth = 1.2 * s;
          ctx.beginPath();
          ctx.moveTo(x + Math.cos(an * 3) * 6 * s, y + Math.sin(an * 3) * 6 * s);
          ctx.lineTo(x + Math.cos(an * 3 + 2.3) * 4 * s, y + Math.sin(an * 3 + 2.3) * 4 * s);
          ctx.lineTo(x + Math.cos(an * 3 + 4.1) * 5 * s, y + Math.sin(an * 3 + 4.1) * 5 * s);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      } else {
        // a third eye: a split diamond on the forehead
        const ex = head.x + face * 1 * s, ey = head.y - 7 * s;
        if (alive) glow(ctx, ex, ey, 9 * s, "hsl(318 100% 80% / 0.9)", "hsl(318 100% 60% / 0)");
        ctx.fillStyle = "hsl(0 0% 100%)";
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.2 * s;
        ctx.beginPath();
        ctx.moveTo(ex, ey - 4 * s); ctx.lineTo(ex + 3 * s, ey); ctx.lineTo(ex, ey + 4 * s); ctx.lineTo(ex - 3 * s, ey);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "hsl(318 100% 50%)";
        ctx.beginPath();
        ctx.arc(ex, ey, 1.4 * s, 0, TAU);
        ctx.fill();
      }
      break;
    }
    // ----- The Hollow King: a tattered cloak, a hood with no face, a bone crown and a scythe -----
    case "hollow": {
      // where the scythe points this frame, and whether its swing leaves a smear
      const sw = scytheSwing(act, p, s, t);
      if (layer === "back") {
        // ragged cloak streaming behind
        const back = -face;
        const sway = Math.sin(t * 2.6) * 5 * s + Math.min(20, Math.abs(vx) * 0.05) * s;
        const hemY = hip.y + 44 * s;
        const gr = ctx.createLinearGradient(0, shoulder.y, 0, hemY);
        gr.addColorStop(0, "hsl(170 18% 12% / 0.96)");
        gr.addColorStop(1, "hsl(165 20% 18% / 0.7)");
        ctx.fillStyle = gr;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.6 * s;
        ctx.beginPath();
        ctx.moveTo(neck.x, neck.y - 4 * s);
        ctx.quadraticCurveTo(shoulder.x + back * 26 * s, mid.y, hip.x + back * (36 * s + sway), hemY);
        for (let i = 1; i <= 8; i++) {
          const x = hip.x + back * (36 * s + sway) - back * i * 7 * s;
          const tear = (i % 2 ? 15 : 2) + Math.sin(t * 5 + i * 1.7) * 3;
          ctx.lineTo(x, hemY - tear * s);
        }
        ctx.lineTo(hip.x - back * 6 * s, hip.y + 10 * s);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // a torn robe hanging from the waist to the shins
        robe(ctx, hip, p.fF, p.fB, s, t, "hsl(170 18% 11% / 0.95)", "hsl(152 70% 40% / 0.7)");
        // souls circling the reaper; while he reaps, they stream toward the blade
        if (alive) {
          ctx.globalCompositeOperation = "lighter";
          const n = act?.kind === "burst" || act?.kind === "zone" ? 6 : 3;
          for (let i = 0; i < n; i++) {
            const an = t * (act ? 4 : 1.8) + (i / n) * TAU;
            const rr = (act?.phase === "wind" ? 40 - 20 * act.u : 40) * s;
            const ox = mid.x + Math.cos(an) * rr, oy = mid.y + Math.sin(an) * rr * 0.4 - 10 * s;
            glow(ctx, ox, oy, 10 * s, "hsl(152 92% 70% / 0.9)", "hsl(152 92% 60% / 0)");
            for (let j = 1; j < 4; j++) {
              const aj = an - j * 0.16;
              glow(ctx, mid.x + Math.cos(aj) * rr, mid.y + Math.sin(aj) * rr * 0.4 - 10 * s, (6 - j) * s, "hsl(152 92% 60% / 0.5)", "hsl(152 92% 60% / 0)");
            }
          }
          ctx.globalCompositeOperation = "source-over";
        }
      } else {
        // ribs showing through the dark body, and a sash of soul light
        ctx.strokeStyle = "hsl(44 30% 82%)";
        ctx.lineWidth = 1.5 * s;
        for (let i = 0; i < 3; i++) {
          const k = 0.2 + i * 0.16;
          const rx = neck.x + (hip.x - neck.x) * k, ry = neck.y + (hip.y - neck.y) * k;
          ctx.beginPath();
          ctx.moveTo(rx - 6 * s, ry + 2 * s);
          ctx.quadraticCurveTo(rx, ry - 2 * s, rx + 6 * s, ry + 2 * s);
          ctx.stroke();
        }
        if (alive) {
          ctx.globalCompositeOperation = "lighter";
          ctx.strokeStyle = "hsl(152 92% 60% / 0.8)";
          ctx.lineWidth = 2.4 * s;
          ctx.beginPath();
          ctx.moveTo(hip.x - 9 * s, hip.y - 4 * s);
          ctx.lineTo(hip.x + 9 * s, hip.y - 7 * s);
          ctx.stroke();
          ctx.globalCompositeOperation = "source-over";
        }
        // the scythe, swung through its arc; a green crescent follows the blade
        if (sw.smear) drawSmear(ctx, sw.pivot, sw.from, sw.a, face, s, sw.smear);
        drawScythe(ctx, sw.pivot, sw.a, face, s, alive, sw.charge, t);
        // the hood, and nothing inside it but two eyes
        const hx = head.x - face * 2.5 * s, hy = head.y - 1.5 * s;
        ctx.fillStyle = "hsl(170 18% 12%)";
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.8 * s;
        ctx.beginPath();
        ctx.moveTo(hx - face * 15 * s, hy + 14 * s);
        ctx.quadraticCurveTo(hx - face * 18 * s, hy - 16 * s, hx + face * 2 * s, hy - 16 * s);
        ctx.quadraticCurveTo(hx + face * 16 * s, hy - 12 * s, hx + face * 15 * s, hy + 9 * s);
        ctx.lineTo(hx + face * 6 * s, hy + 14 * s);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "hsl(170 40% 3%)";
        ctx.beginPath();
        ctx.ellipse(head.x + face * 3.5 * s, head.y + 1 * s, 7 * s, 8.5 * s, 0, 0, TAU);
        ctx.fill();
        if (alive) {
          ctx.globalCompositeOperation = "lighter";
          const flare = act ? 1.4 : 1;
          for (const k of [0, 1]) glow(ctx, head.x + face * (1.5 + k * 5) * s, head.y - 0.5 * s, 3.4 * s * flare, "hsl(152 100% 80%)", "hsl(152 92% 60% / 0)");
          ctx.globalCompositeOperation = "source-over";
        }
        // a crown of bone points on the hood, each tipped with a soul flame
        ctx.fillStyle = "hsl(44 30% 82%)";
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.3 * s;
        for (let i = -2; i <= 2; i++) {
          const cx = hx + face * 1 * s + i * 4.6 * s, cy = hy - 14 * s + Math.abs(i) * 1.2 * s;
          const tall = (i === 0 ? 12 : Math.abs(i) === 1 ? 9 : 6) * s;
          ctx.beginPath();
          ctx.moveTo(cx - 2.6 * s, cy + 2 * s);
          ctx.lineTo(cx + i * 0.6 * s, cy - tall);
          ctx.lineTo(cx + 2.6 * s, cy + 2 * s);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          if (alive) {
            ctx.globalCompositeOperation = "lighter";
            flame(ctx, cx + i * 0.6 * s, cy - tall, 3 * s, (5 + Math.sin(t * 9 + i) * 1.5) * s, "hsl(152 100% 70% / 0.85)");
            ctx.globalCompositeOperation = "source-over";
            ctx.fillStyle = "hsl(44 30% 82%)";
          }
        }
      }
      break;
    }
    // ----- The Black Sun: a dead sun behind its head, a mantle of dark fire, a golden mask -----
    case "blacksun": {
      const cx = head.x - face * 7 * s, cy = head.y - 6 * s;
      if (layer === "back") {
        if (alive) {
          ctx.globalCompositeOperation = "lighter";
          glow(ctx, cx, cy, 64 * s, "hsl(40 100% 62% / 0.55)", "hsl(24 100% 50% / 0)");
          // corona flares licking out around the disc
          ctx.fillStyle = "hsl(36 100% 58% / 0.85)";
          for (let i = 0; i < 14; i++) {
            const an = (i / 14) * TAU + t * 0.5;
            const len = (34 + 9 * Math.sin(t * 5 + i * 2.1) + (i % 2 ? 0 : 8)) * s;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(an - 0.13) * 22 * s, cy + Math.sin(an - 0.13) * 22 * s);
            ctx.quadraticCurveTo(cx + Math.cos(an + 0.12) * len * 0.8, cy + Math.sin(an + 0.12) * len * 0.8, cx + Math.cos(an) * len, cy + Math.sin(an) * len);
            ctx.lineTo(cx + Math.cos(an + 0.13) * 22 * s, cy + Math.sin(an + 0.13) * 22 * s);
            ctx.fill();
          }
          ctx.globalCompositeOperation = "source-over";
        }
        // the dead sun itself
        ctx.fillStyle = "hsl(250 40% 5%)";
        ctx.strokeStyle = alive ? "hsl(44 100% 74%)" : "hsl(30 30% 40%)";
        ctx.lineWidth = 2.4 * s;
        ctx.beginPath();
        ctx.arc(cx, cy, 23 * s, 0, TAU);
        ctx.fill();
        ctx.stroke();
        // a mantle of dark fire off the shoulders
        const back = -face;
        for (let i = 0; i < 3; i++) {
          const bx = shoulder.x + back * (4 + i * 7) * s, by = shoulder.y + (2 + i * 10) * s;
          const len = (30 - i * 5 + Math.sin(t * 9 + i) * 5) * s;
          const ang = Math.atan2(-0.5, back) + Math.sin(t * 6 + i) * 0.12;
          const tip = { x: bx + Math.cos(ang) * len, y: by + Math.sin(ang) * len };
          ctx.fillStyle = i % 2 ? "hsl(14 70% 22% / 0.92)" : "hsl(24 90% 40% / 0.9)";
          ctx.beginPath();
          ctx.moveTo(bx, by - 7 * s);
          ctx.quadraticCurveTo(bx + back * len * 0.4, by - 12 * s, tip.x, tip.y);
          ctx.quadraticCurveTo(bx + back * len * 0.5, by + 6 * s, bx, by + 7 * s);
          ctx.closePath();
          ctx.fill();
        }
      } else {
        // golden mask: a crescent across the face
        const mx = head.x + face * 3 * s, my = head.y;
        ctx.fillStyle = "hsl(42 90% 58%)";
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.3 * s;
        ctx.beginPath();
        ctx.arc(mx, my, 9 * s, -Math.PI / 2, Math.PI / 2, face < 0);
        ctx.quadraticCurveTo(mx + face * 3 * s, my, mx, my - 9 * s);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        if (alive) {
          ctx.globalCompositeOperation = "lighter";
          glow(ctx, head.x + face * 6 * s, head.y - 2 * s, 5 * s, "hsl(48 100% 85%)", "hsl(30 100% 55% / 0)");
          ctx.globalCompositeOperation = "source-over";
        }
        ctx.fillStyle = "hsl(250 40% 6%)";
        ctx.beginPath();
        ctx.ellipse(head.x + face * 6 * s, head.y - 2 * s, 1.8 * s, 1.2 * s, 0, 0, TAU);
        ctx.fill();
        // a circlet of short gold rays
        ctx.strokeStyle = "hsl(44 100% 66%)";
        ctx.lineWidth = 2 * s;
        ctx.beginPath();
        for (let i = -3; i <= 3; i++) {
          const an = -Math.PI / 2 + i * 0.32;
          ctx.moveTo(head.x + Math.cos(an) * (HEAD + 1) * s, head.y + Math.sin(an) * (HEAD + 1) * s);
          ctx.lineTo(head.x + Math.cos(an) * (HEAD + (i % 2 ? 5 : 9)) * s, head.y + Math.sin(an) * (HEAD + (i % 2 ? 5 : 9)) * s);
        }
        ctx.stroke();
      }
      break;
    }
  }
  ctx.restore();
  if (layer === "front") drawBossExtras(ctx, design, layer, p, s, face, t, alive, vx, act);
}

/**
 * Armour, capes, robes and drifting motes layered onto each boss: behind everything on the "back" pass,
 * over everything on the "front" pass. The signature pieces (halos, horns, crowns, weapons) are in drawBossDesign.
 */
function drawBossExtras(
  ctx: CanvasRenderingContext2D, design: BossDesign, layer: "back" | "front", p: BossRig,
  s: number, face: number, t: number, alive: boolean, vx: number, act?: BossAct,
) {
  const { head, hip, shoulder, neck } = p;
  const mid = { x: (hip.x + head.x) / 2, y: (hip.y + head.y) / 2 };
  const back = -face;
  const casting = !!act && act.phase !== "after";
  /** A cape off the shoulders, its hem cut into points. */
  const cape = (len: number, fill: string, edge: string, points = 5) => {
    const sway = Math.sin(t * 3) * 4 * s + Math.min(18, Math.abs(vx) * 0.04) * s;
    const hemY = hip.y + len * s;
    ctx.fillStyle = fill;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(neck.x, neck.y);
    ctx.quadraticCurveTo(shoulder.x + back * 22 * s, mid.y, hip.x + back * (28 * s + sway), hemY);
    for (let i = 1; i <= points; i++) {
      const x = hip.x + back * (28 * s + sway) - back * i * (30 / points) * s;
      ctx.lineTo(x, hemY - (i % 2 ? 8 : 0) * s);
    }
    ctx.lineTo(hip.x, hip.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1.6 * s;
    ctx.beginPath();
    ctx.moveTo(neck.x, neck.y);
    ctx.quadraticCurveTo(shoulder.x + back * 22 * s, mid.y, hip.x + back * (28 * s + sway), hemY);
    ctx.stroke();
  };
  /** Power gathered in both fists while a move charges. */
  const fists = (inner: string, outer: string) => {
    if (!alive) return;
    const r = (casting ? 11 : 6) * s + Math.sin(t * 14) * s;
    ctx.globalCompositeOperation = "lighter";
    glow(ctx, p.hF.x, p.hF.y, r, inner, outer);
    glow(ctx, p.hB.x, p.hB.y, r * 0.75, inner, outer);
    ctx.globalCompositeOperation = "source-over";
  };
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  switch (design) {
    case "antimatter":
      if (layer === "back") {
        cape(30, "hsl(268 55% 10% / 0.95)", "hsl(186 100% 70% / 0.8)");
        if (alive) {
          ctx.globalCompositeOperation = "lighter";
          motes(ctx, mid.x, hip.y + 20 * s, 60 * s, 110 * s, t, 8, "hsl(186 100% 75%)", 1.8 * s);
          ctx.globalCompositeOperation = "source-over";
        }
      } else {
        // an accretion ring of matter and antimatter round the waist, tilted
        if (alive) {
          for (let i = 0; i < 10; i++) {
            const an = t * 2.4 + (i / 10) * TAU;
            if (Math.sin(an) < 0) continue; // only the near half passes in front
            const x = hip.x + Math.cos(an) * 26 * s, y = hip.y - 10 * s + Math.sin(an) * 6 * s;
            ctx.fillStyle = i % 2 ? "hsl(0 0% 100%)" : "hsl(268 70% 8%)";
            ctx.strokeStyle = "hsl(186 100% 72%)";
            ctx.lineWidth = 1 * s;
            ctx.beginPath();
            ctx.arc(x, y, 2.4 * s, 0, TAU);
            ctx.fill();
            ctx.stroke();
          }
        }
        fists("hsl(186 100% 85%)", "hsl(186 100% 60% / 0)");
      }
      break;
    case "maelstrom":
      if (layer === "back") {
        cape(36, "hsl(205 75% 30% / 0.92)", "hsl(186 100% 88% / 0.95)", 6);
        if (alive) motes(ctx, mid.x, hip.y - 40 * s, 70 * s, 90 * s, t * 2.2, 10, "hsl(195 90% 80% / 0.9)", 1.6 * s, -1);
      } else {
        pauldron(ctx, shoulder, face, s, "hsl(176 45% 34%)", "hsl(186 90% 80%)", 2);
        fists("hsl(190 100% 85%)", "hsl(205 100% 55% / 0)");
        if (alive) glow(ctx, head.x + face * 5 * s, head.y - 1.5 * s, 5 * s, "hsl(190 100% 85% / 0.9)", "hsl(190 100% 60% / 0)");
      }
      break;
    case "magmaw":
      if (layer === "back") {
        if (alive) {
          ctx.globalCompositeOperation = "lighter";
          motes(ctx, mid.x, hip.y, 60 * s, 130 * s, t * 1.4, 10, "hsl(30 100% 62%)", 1.8 * s);
          ctx.globalCompositeOperation = "source-over";
        }
      } else {
        // a cracked rock breastplate and an obsidian shoulder with spikes
        const cx = neck.x + (hip.x - neck.x) * 0.35, cy = neck.y + (hip.y - neck.y) * 0.35;
        ctx.fillStyle = "hsl(18 14% 18%)";
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.5 * s;
        ctx.beginPath();
        ctx.moveTo(cx - 9 * s, cy - 6 * s);
        ctx.lineTo(cx + 9 * s, cy - 7 * s);
        ctx.lineTo(cx + 7 * s, cy + 9 * s);
        ctx.lineTo(cx, cy + 13 * s);
        ctx.lineTo(cx - 7 * s, cy + 8 * s);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = alive ? "hsl(30 100% 58%)" : "hsl(20 50% 30%)";
        ctx.lineWidth = 1.4 * s;
        ctx.beginPath();
        ctx.moveTo(cx - 4 * s, cy - 5 * s); ctx.lineTo(cx + 1 * s, cy + 2 * s); ctx.lineTo(cx - 1 * s, cy + 10 * s);
        ctx.moveTo(cx + 1 * s, cy + 2 * s); ctx.lineTo(cx + 6 * s, cy + 4 * s);
        ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
        pauldron(ctx, shoulder, face, s, "hsl(260 12% 14%)", "hsl(28 100% 55%)", 2);
        fists("hsl(44 100% 75%)", "hsl(16 100% 50% / 0)");
      }
      break;
    case "everwinter":
      if (layer === "back") {
        if (alive) motes(ctx, mid.x, hip.y - 50 * s, 90 * s, 100 * s, t * 0.8, 12, "hsl(200 100% 96%)", 1.7 * s, -1);
      } else {
        pauldron(ctx, shoulder, face, s, "hsl(200 70% 86%)", "hsl(205 60% 50%)", 3);
        fists("hsl(195 100% 92%)", "hsl(200 100% 70% / 0)");
        // frost breath
        if (alive) {
          const k = (t * 0.8) % 1;
          ctx.fillStyle = `hsl(200 80% 96% / ${0.5 * (1 - k)})`;
          ctx.beginPath();
          ctx.arc(head.x + face * (12 + k * 14) * s, head.y + 4 * s - k * 4 * s, (2 + k * 5) * s, 0, TAU);
          ctx.fill();
        }
      }
      break;
    case "riftmaker":
      if (layer === "back") {
        // a tear in reality hanging behind it, stars showing through
        const rx = mid.x + back * 12 * s, ry = mid.y - 8 * s, rh = 70 * s;
        const wob = Math.sin(t * 3) * 2 * s;
        ctx.fillStyle = "hsl(262 70% 6% / 0.92)";
        ctx.strokeStyle = "hsl(318 100% 70%)";
        ctx.lineWidth = 2 * s;
        ctx.beginPath();
        ctx.moveTo(rx, ry - rh / 2);
        for (let i = 1; i <= 6; i++) ctx.lineTo(rx + (i % 2 ? 9 : 4) * s + wob, ry - rh / 2 + (rh * i) / 6);
        for (let i = 5; i >= 1; i--) ctx.lineTo(rx - (i % 2 ? 9 : 4) * s - wob, ry - rh / 2 + (rh * i) / 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "white";
        for (let i = 0; i < 6; i++) {
          const sx = rx + Math.sin(i * 7.1) * 4 * s, sy = ry - rh / 2 + ((i * 0.17 + t * 0.05) % 1) * rh;
          ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 5 + i);
          ctx.fillRect(sx, sy, 1.6 * s, 1.6 * s);
        }
        ctx.globalAlpha = 1;
        cape(26, "hsl(262 50% 14% / 0.92)", "hsl(186 100% 70% / 0.85)");
      } else {
        pauldron(ctx, shoulder, face, s, "hsl(262 40% 22%)", "hsl(318 100% 70%)", 0);
        fists("hsl(318 100% 85%)", "hsl(186 100% 60% / 0)");
      }
      break;
    case "hollow":
      break;
    case "blacksun":
      if (layer === "back") {
        robe(ctx, hip, p.fF, p.fB, s, t, "hsl(10 55% 16% / 0.95)", "hsl(44 100% 62%)");
        if (alive) {
          ctx.globalCompositeOperation = "lighter";
          motes(ctx, mid.x, hip.y, 70 * s, 120 * s, t, 9, "hsl(38 100% 62%)", 1.7 * s);
          ctx.globalCompositeOperation = "source-over";
        }
      } else {
        pauldron(ctx, shoulder, face, s, "hsl(42 85% 52%)", "hsl(30 80% 30%)", 3);
        fists("hsl(48 100% 80%)", "hsl(24 100% 50% / 0)");
      }
      break;
  }
  ctx.restore();
}
