// How each quest fighter looks on top of the stickman body. The engine calls this twice per frame:
// behind the limbs ("back") and in front ("front"), like the Story bosses' designs.
// Hexizon: a pitch black stickman with a neon green outline, one glowing green eye, one black-green flare
// for the other eye, and a large bone carried like a monk's staff.
// Parallax: a body of deep space with glowing seams, a visor slit, and wireframe cubes of folded space orbiting him.
import type { Power } from "./fighters";
import type { BossRig } from "./boss-designs";

type Pt = { x: number; y: number };
const TAU = Math.PI * 2;
const HEAD = 11;

/** What the quest fighter is doing this frame, so the staff can follow the move. */
export type QuestAct = { id: string; kind: string; phase: "wind" | "strike" | "after"; u: number };
/** The colours to draw in: its own, or its Nightmare Mode's. */
export type QuestPaint = { glow: string; a: string; b: string; nightmare: boolean };

const al = (c: string, a: number) => c.replace(")", ` / ${Math.max(0, Math.min(1, a))})`);

function strokePath(ctx: CanvasRenderingContext2D, pts: Pt[]) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
}

function glowDot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, c: string, a = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, al(c, a));
  g.addColorStop(1, al(c, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

/** Every limb, the torso and the head as one silhouette stroke, for outlines and rims. */
function silhouette(ctx: CanvasRenderingContext2D, r: BossRig, s: number, w: number, c: string) {
  ctx.strokeStyle = c;
  ctx.lineWidth = w;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const pts of [[r.hip, r.kB, r.fB], [r.shoulder, r.eB, r.hB], [r.hip, r.neck], [r.hip, r.kF, r.fF], [r.shoulder, r.eF, r.hF]]) strokePath(ctx, pts);
  ctx.beginPath();
  ctx.arc(r.head.x, r.head.y, HEAD * s + w / 2 - 1.5 * s, 0, TAU);
  ctx.stroke();
}

// ---------- Hexizon ----------

/** The bone staff: a long bone through both hands, knuckled at each end. Spins on a staff strike. */
function boneStaff(ctx: CanvasRenderingContext2D, r: BossRig, s: number, face: number, t: number, act: QuestAct | undefined, p: QuestPaint) {
  let ang = Math.atan2(r.hF.y - r.hB.y, r.hF.x - r.hB.x);
  if (Math.hypot(r.hF.x - r.hB.x, r.hF.y - r.hB.y) < 8 * s) ang = Math.atan2(r.hF.y - r.eF.y, r.hF.x - r.eF.x);
  let cx = r.hF.x, cy = r.hF.y;
  if (act && act.id === "bone-staff" && act.phase !== "wind") {
    // twirled overhead and brought round in a full turn
    ang += face * (act.phase === "strike" ? act.u * TAU * 1.5 : 0);
  } else if (act && (act.kind === "beam" || act.kind === "projectile")) {
    // levelled at the target like a pointer
    ang = face > 0 ? -0.15 : Math.PI + 0.15;
  } else if (!act) {
    ang += Math.sin(t * 2.2) * 0.04;
  }
  const L = 58 * s, k = 0.38;
  const x0 = cx - Math.cos(ang) * L * (1 - k) * 1.4, y0 = cy - Math.sin(ang) * L * (1 - k) * 1.4;
  const x1 = cx + Math.cos(ang) * L * (1 + k) * 0.7, y1 = cy + Math.sin(ang) * L * (1 + k) * 0.7;
  ctx.save();
  // neon rim behind
  ctx.lineCap = "round";
  ctx.strokeStyle = al(p.glow, 0.55);
  ctx.lineWidth = 10 * s;
  strokePath(ctx, [{ x: x0, y: y0 }, { x: x1, y: y1 }]);
  ctx.strokeStyle = "hsl(45 30% 90%)";
  ctx.lineWidth = 5.5 * s;
  strokePath(ctx, [{ x: x0, y: y0 }, { x: x1, y: y1 }]);
  // the knuckles at each end: two round lobes across the shaft
  const nx = -Math.sin(ang), ny = Math.cos(ang);
  for (const [ex, ey] of [[x0, y0], [x1, y1]] as const) {
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(ex + nx * sd * 4.2 * s, ey + ny * sd * 4.2 * s, 4.6 * s, 0, TAU);
      ctx.fillStyle = "hsl(45 30% 90%)";
      ctx.fill();
      ctx.strokeStyle = "hsl(150 30% 6%)";
      ctx.lineWidth = 1.6 * s;
      ctx.stroke();
    }
  }
  // a smear of green while it spins
  if (act && act.id === "bone-staff" && act.phase === "strike") {
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = al(p.glow, 0.5 * (1 - act.u));
    ctx.lineWidth = 6 * s;
    ctx.beginPath();
    ctx.arc(cx, cy, L * 0.95, ang - face * 1.6, ang, face < 0);
    ctx.stroke();
  }
  ctx.restore();
}

function hexizonBack(ctx: CanvasRenderingContext2D, r: BossRig, s: number, t: number, alive: boolean, p: QuestPaint) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  // a soft neon haze, then a crisp outline the black body is drawn over
  silhouette(ctx, r, s, 18 * s, al(p.glow, alive ? 0.16 + 0.05 * Math.sin(t * 5) : 0.06));
  ctx.globalCompositeOperation = "source-over";
  silhouette(ctx, r, s, 13 * s, alive ? p.glow : al(p.glow, 0.45));
  if (p.nightmare && alive) {
    // glitching red copy jumping off the body
    const j = Math.floor(t * 14) % 5 === 0 ? (Math.sin(t * 91) * 6) * s : 0;
    if (j) {
      ctx.save();
      ctx.translate(j, 0);
      silhouette(ctx, r, s, 9 * s, al(p.b, 0.6));
      ctx.restore();
    }
  }
  ctx.restore();
}

function hexizonFront(ctx: CanvasRenderingContext2D, r: BossRig, s: number, face: number, t: number, alive: boolean, act: QuestAct | undefined, p: QuestPaint) {
  boneStaff(ctx, r, s, face, t, act, p);
  if (!alive) return;
  const h = r.head;
  // the glowing green eye, toward the front of the face
  const ex = h.x + face * 5.2 * s, ey = h.y - 1.5 * s;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  glowDot(ctx, ex, ey, 9 * s, p.nightmare ? p.b : p.glow, 0.85);
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(ex, ey, 2.4 * s, 0, TAU);
  ctx.fill();
  // the other eye: a black flame with a green rim, licking up off the head
  const fx = h.x - face * 1.5 * s, fy = h.y - 2 * s;
  const fl = Math.sin(t * 17) * 2.2 * s;
  for (const [w, c] of [[5.4, p.glow], [3.4, "hsl(150 40% 3%)"]] as const) {
    ctx.beginPath();
    ctx.moveTo(fx - w * s, fy + 2 * s);
    ctx.quadraticCurveTo(fx - w * 0.8 * s, fy - 6 * s, fx - face * 3 * s + fl, fy - (12 + w) * s);
    ctx.quadraticCurveTo(fx + w * 0.9 * s, fy - 5 * s, fx + w * s, fy + 2 * s);
    ctx.quadraticCurveTo(fx, fy + 5 * s, fx - w * s, fy + 2 * s);
    ctx.fillStyle = c;
    ctx.fill();
  }
  ctx.globalCompositeOperation = "lighter";
  glowDot(ctx, fx, fy - 4 * s, 7 * s, p.glow, 0.35);
  ctx.restore();
}

// ---------- Parallax ----------

/** A wireframe cube turning in 3D, drawn flat. */
function wireCube(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rx: number, ry: number, c: string, w: number) {
  const pts: Pt[] = [];
  for (const [a, b, d] of [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]) {
    // rotate round y, then x
    const x1 = a * Math.cos(ry) - d * Math.sin(ry), z1 = a * Math.sin(ry) + d * Math.cos(ry);
    const y1 = b * Math.cos(rx) - z1 * Math.sin(rx);
    pts.push({ x: x + x1 * size, y: y + y1 * size });
  }
  ctx.strokeStyle = c;
  ctx.lineWidth = w;
  ctx.beginPath();
  for (const [i, j] of [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]) {
    ctx.moveTo(pts[i].x, pts[i].y);
    ctx.lineTo(pts[j].x, pts[j].y);
  }
  ctx.stroke();
}

function parallaxBack(ctx: CanvasRenderingContext2D, r: BossRig, s: number, t: number, alive: boolean, act: QuestAct | undefined, p: QuestPaint) {
  if (!alive) return;
  const cx = (r.hip.x + r.head.x) / 2, cy = (r.hip.y + r.head.y) / 2;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  // a pane of bent space behind him: a warped grid that ripples harder while he casts
  const k = act ? (act.phase === "strike" ? 1 : 0.5) : 0.25;
  ctx.strokeStyle = al(p.glow, 0.12 + 0.12 * k);
  ctx.lineWidth = 1.2 * s;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    for (let j = -4; j <= 4; j++) {
      const yy = cy + j * 13 * s;
      const xx = cx + i * 13 * s + Math.sin(t * 3 + j * 0.8 + i) * 3 * s * k;
      j === -4 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy);
    }
    ctx.stroke();
  }
  // three cubes of folded space orbiting him, the far ones behind the body
  for (let i = 0; i < 3; i++) {
    const a = t * 1.3 + (i * TAU) / 3;
    if (Math.sin(a) > 0) continue;
    wireCube(ctx, cx + Math.cos(a) * 44 * s, cy - 20 * s + Math.sin(a * 2) * 10 * s, (6 + i * 1.5) * s, t * 1.7 + i, t * 2.1 + i, al(i === 1 ? p.b : p.glow, 0.8), 1.6 * s);
  }
  ctx.restore();
}

function parallaxFront(ctx: CanvasRenderingContext2D, r: BossRig, s: number, face: number, t: number, alive: boolean, p: QuestPaint) {
  ctx.save();
  // glowing seams down the middle of every limb: the body is a window onto open space
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.strokeStyle = al(p.glow, alive ? 0.7 : 0.25);
  ctx.lineWidth = 1.6 * s;
  for (const pts of [[r.hip, r.kF, r.fF], [r.shoulder, r.eF, r.hF], [r.hip, r.neck]]) strokePath(ctx, pts);
  // stars inside the head
  for (let i = 0; i < 5; i++) {
    const a = i * 2.4 + 0.6, d = (3 + (i % 3) * 2.4) * s;
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 3 + i * 1.7));
    ctx.fillStyle = al(i % 2 ? p.b : "hsl(0 0% 100%)", tw * (alive ? 1 : 0.4));
    ctx.fillRect(r.head.x + Math.cos(a) * d - face * 2 * s, r.head.y + Math.sin(a) * d, 1.6 * s, 1.6 * s);
  }
  if (alive) {
    // the visor: a bright slit across the front of the face
    const ex = r.head.x + face * 4 * s, ey = r.head.y - 1.5 * s;
    ctx.strokeStyle = p.b;
    ctx.lineWidth = 2.6 * s;
    ctx.beginPath();
    ctx.moveTo(ex - face * 4 * s, ey);
    ctx.lineTo(ex + face * 6 * s, ey - 0.6 * s);
    ctx.stroke();
    glowDot(ctx, ex + face * 2 * s, ey, 9 * s, p.b, 0.6);
    // the near cubes, in front of the body
    const cx = (r.hip.x + r.head.x) / 2, cy = (r.hip.y + r.head.y) / 2;
    for (let i = 0; i < 3; i++) {
      const a = t * 1.3 + (i * TAU) / 3;
      if (Math.sin(a) <= 0) continue;
      wireCube(ctx, cx + Math.cos(a) * 44 * s, cy - 20 * s + Math.sin(a * 2) * 10 * s, (6 + i * 1.5) * s, t * 1.7 + i, t * 2.1 + i, i === 1 ? p.b : p.glow, 1.8 * s);
    }
    // a crack in space at the front hand
    if (p.nightmare || Math.sin(t * 2) > 0.3) {
      ctx.strokeStyle = al(p.b, 0.8);
      ctx.lineWidth = 1.4 * s;
      ctx.beginPath();
      ctx.moveTo(r.hF.x - 6 * s, r.hF.y - 8 * s);
      ctx.lineTo(r.hF.x - 1 * s, r.hF.y - 2 * s);
      ctx.lineTo(r.hF.x + 3 * s, r.hF.y - 5 * s);
      ctx.lineTo(r.hF.x + 7 * s, r.hF.y + 4 * s);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function drawQuestDesign(
  ctx: CanvasRenderingContext2D, id: Power, layer: "back" | "front", r: BossRig, s: number, face: number, t: number,
  alive: boolean, act: QuestAct | undefined, p: QuestPaint,
) {
  if (id === "hexizon") return layer === "back" ? hexizonBack(ctx, r, s, t, alive, p) : hexizonFront(ctx, r, s, face, t, alive, act, p);
  if (id === "spatio") return layer === "back" ? parallaxBack(ctx, r, s, t, alive, act, p) : parallaxFront(ctx, r, s, face, t, alive, p);
}
