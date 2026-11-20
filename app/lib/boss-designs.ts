// How each Story boss looks on top of the stickman body: halos, horns, crowns, capes and weapons.
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

export function drawBossDesign(
  ctx: CanvasRenderingContext2D, design: BossDesign, layer: "back" | "front", p: BossRig,
  s: number, face: number, t: number, alive: boolean, vx: number,
) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const { head, neck, hip, shoulder } = p;
  const mid = { x: (hip.x + head.x) / 2, y: (hip.y + head.y) / 2 };
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
  }
  ctx.restore();
}
