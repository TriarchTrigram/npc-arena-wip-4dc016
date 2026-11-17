import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/home";
import { Text, useString, type StringKey } from "~stencil/ui/strings";
import { Button } from "~/components/ui/button";
import {
  PageContainer,
  PageHeader,
  SectionHeading,
  Panel,
  PanelBody,
  StatusBadge,
  EmptyState,
} from "~/components/design";
import { cn } from "~/lib/utils";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "NPC Arena" },
    { name: "description", content: "Watch 16 superpowered NPCs battle it out in a cartoon arena." },
  ];
}

type Power =
  | "pyro" | "cryo" | "electro" | "terra" | "aero" | "hydro" | "umbra" | "lux"
  | "gravi" | "tele" | "vita" | "toxi" | "chrono" | "magneto" | "psy" | "shift";

type FighterDef = { id: Power; name: string; power: string; color: string; glyph: string; hp: number; speed: number; cd: number };

const FIGHTERS: FighterDef[] = [
  { id: "pyro", name: "Pyro", power: "Pyrokinesis", color: "hsl(12 90% 52%)", glyph: "P", hp: 100, speed: 70, cd: 1.1 },
  { id: "cryo", name: "Cryo", power: "Cryokinesis", color: "hsl(200 85% 62%)", glyph: "C", hp: 100, speed: 68, cd: 1.2 },
  { id: "electro", name: "Electro", power: "Electrokinesis", color: "hsl(50 95% 52%)", glyph: "E", hp: 95, speed: 75, cd: 1.4 },
  { id: "terra", name: "Terra", power: "Geokinesis", color: "hsl(28 50% 38%)", glyph: "T", hp: 150, speed: 52, cd: 1.6 },
  { id: "aero", name: "Aero", power: "Aerokinesis", color: "hsl(170 55% 60%)", glyph: "A", hp: 90, speed: 110, cd: 1.0 },
  { id: "hydro", name: "Hydro", power: "Hydrokinesis", color: "hsl(215 85% 50%)", glyph: "H", hp: 105, speed: 68, cd: 1.3 },
  { id: "umbra", name: "Umbra", power: "Shadow manipulation", color: "hsl(275 60% 35%)", glyph: "U", hp: 90, speed: 80, cd: 1.8 },
  { id: "lux", name: "Lux", power: "Light manipulation", color: "hsl(46 100% 72%)", glyph: "L", hp: 95, speed: 72, cd: 1.5 },
  { id: "gravi", name: "Gravi", power: "Gravity control", color: "hsl(240 55% 45%)", glyph: "G", hp: 110, speed: 62, cd: 2.0 },
  { id: "tele", name: "Tele", power: "Teleportation", color: "hsl(310 80% 55%)", glyph: "T", hp: 85, speed: 75, cd: 1.6 },
  { id: "vita", name: "Vita", power: "Healing", color: "hsl(140 60% 42%)", glyph: "V", hp: 110, speed: 66, cd: 1.0 },
  { id: "toxi", name: "Toxi", power: "Poison", color: "hsl(85 80% 48%)", glyph: "X", hp: 100, speed: 68, cd: 2.0 },
  { id: "chrono", name: "Chrono", power: "Time manipulation", color: "hsl(38 95% 50%)", glyph: "C", hp: 100, speed: 70, cd: 2.2 },
  { id: "magneto", name: "Magneto", power: "Magnetism", color: "hsl(0 70% 48%)", glyph: "M", hp: 110, speed: 64, cd: 1.4 },
  { id: "psy", name: "Psy", power: "Telekinesis", color: "hsl(330 85% 68%)", glyph: "Y", hp: 95, speed: 70, cd: 1.9 },
  { id: "shift", name: "Shift", power: "Shapeshifting", color: "hsl(185 85% 48%)", glyph: "S", hp: 100, speed: 72, cd: 1.5 },
];

const DEF_BY_ID = Object.fromEntries(FIGHTERS.map((f) => [f.id, f])) as Record<Power, FighterDef>;

const W = 960;
const H = 600;
const R = 18;

type Fighter = {
  key: number;
  def: FighterDef;
  x: number; y: number; vx: number; vy: number;
  hp: number; maxHp: number;
  cd: number; dashCd: number;
  alive: boolean; kills: number;
  slowUntil: number; burnUntil: number; poisonUntil: number; blindUntil: number; stunUntil: number;
  cdSlowUntil: number;
  copied: Power | null;
  wander: number;
};

type Projectile = {
  x: number; y: number; vx: number; vy: number; r: number;
  owner: number; power: Power; dmg: number; color: string; life: number;
};

type Effect =
  | { kind: "ring"; x: number; y: number; r: number; color: string; life: number; max: number }
  | { kind: "line"; pts: [number, number][]; color: string; width: number; life: number; max: number }
  | { kind: "cloud"; x: number; y: number; r: number; owner: number; life: number; max: number }
  | { kind: "text"; x: number; y: number; text: string; color: string; life: number; max: number };

type FeedItem = { id: number; killer: string | null; victim: string };
type Status = "ready" | "running" | "paused" | "finished";
type Mode = "duel" | "ffa";

type Game = {
  t: number;
  fighters: Fighter[];
  projectiles: Projectile[];
  effects: Effect[];
  feed: FeedItem[];
  over: boolean;
  winner: string | null;
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

function newGame(ids: Power[]): Game {
  const n = ids.length;
  const fighters: Fighter[] = ids.map((id, i) => {
    const def = DEF_BY_ID[id];
    const ang = (i / n) * Math.PI * 2;
    return {
      key: i, def,
      x: W / 2 + Math.cos(ang) * (W / 2 - 80), y: H / 2 + Math.sin(ang) * (H / 2 - 70),
      vx: 0, vy: 0, hp: def.hp, maxHp: def.hp,
      cd: rand(0.3, def.cd), dashCd: rand(1, 3),
      alive: true, kills: 0,
      slowUntil: 0, burnUntil: 0, poisonUntil: 0, blindUntil: 0, stunUntil: 0, cdSlowUntil: 0,
      copied: null, wander: rand(0, Math.PI * 2),
    };
  });
  return { t: 0, fighters, projectiles: [], effects: [], feed: [], over: false, winner: null };
}

let feedId = 0;

function damage(g: Game, target: Fighter, amount: number, attacker: Fighter | null, power: Power | null) {
  if (!target.alive) return;
  if (target.def.id === "tele" && attacker && Math.random() < 0.25) {
    g.effects.push({ kind: "text", x: target.x, y: target.y - 30, text: "dodge", color: target.def.color, life: 0.6, max: 0.6 });
    return;
  }
  target.hp -= amount;
  if (target.def.id === "shift" && power && power !== "shift") target.copied = power;
  if (target.hp <= 0) {
    target.hp = 0;
    target.alive = false;
    if (attacker && attacker !== target) attacker.kills += 1;
    g.feed.unshift({ id: ++feedId, killer: attacker && attacker !== target ? attacker.def.name : null, victim: target.def.name });
    g.effects.push({ kind: "ring", x: target.x, y: target.y, r: 50, color: target.def.color, life: 0.6, max: 0.6 });
  }
}

function nearestEnemy(g: Game, f: Fighter, except?: Fighter) {
  let best: Fighter | null = null;
  let bd = Infinity;
  for (const o of g.fighters) {
    if (!o.alive || o === f || o === except) continue;
    const d = dist(f, o);
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}

function shoot(g: Game, f: Fighter, target: Fighter, power: Power, speed: number, dmg: number, r: number, spread = 0) {
  const a = Math.atan2(target.y - f.y, target.x - f.x) + spread;
  g.projectiles.push({ x: f.x, y: f.y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r, owner: f.key, power, dmg, color: DEF_BY_ID[power].color, life: 2.5 });
}

function castAbility(g: Game, f: Fighter, target: Fighter) {
  const power: Power = f.def.id === "shift" ? f.copied ?? "psy" : f.def.id;
  const blind = f.blindUntil > g.t;
  const d = dist(f, target);
  const hitChance = blind ? 0.35 : 1;
  const lands = () => Math.random() < hitChance;
  switch (power) {
    case "pyro": shoot(g, f, target, power, 320, 12, 8); break;
    case "cryo": shoot(g, f, target, power, 380, 9, 6); break;
    case "hydro": for (const s of [-0.15, 0, 0.15]) shoot(g, f, target, power, 300, 5, 7, s); break;
    case "magneto": for (const s of [-0.25, 0, 0.25]) shoot(g, f, target, power, 360, 5, 5, s); break;
    case "toxi": {
      g.effects.push({ kind: "cloud", x: target.x, y: target.y, r: 60, owner: f.key, life: 3, max: 3 });
      break;
    }
    case "electro": {
      if (d > 260) return false;
      const second = nearestEnemy(g, target, f);
      const pts: [number, number][] = [[f.x, f.y], [target.x, target.y]];
      if (lands()) damage(g, target, 13, f, power);
      if (second && dist(target, second) < 180) {
        pts.push([second.x, second.y]);
        if (lands()) damage(g, second, 8, f, power);
      }
      g.effects.push({ kind: "line", pts, color: DEF_BY_ID.electro.color, width: 4, life: 0.25, max: 0.25 });
      break;
    }
    case "lux": {
      if (d > 320) return false;
      g.effects.push({ kind: "line", pts: [[f.x, f.y], [target.x, target.y]], color: DEF_BY_ID.lux.color, width: 8, life: 0.3, max: 0.3 });
      if (lands()) { damage(g, target, 11, f, power); target.blindUntil = g.t + 1.5; }
      break;
    }
    case "terra": {
      if (d > 110) return false;
      g.effects.push({ kind: "ring", x: f.x, y: f.y, r: 110, color: DEF_BY_ID.terra.color, life: 0.4, max: 0.4 });
      for (const o of g.fighters) {
        if (!o.alive || o === f) continue;
        const od = dist(f, o);
        if (od < 110) {
          damage(g, o, 16, f, power);
          o.vx += ((o.x - f.x) / (od || 1)) * 380;
          o.vy += ((o.y - f.y) / (od || 1)) * 380;
        }
      }
      break;
    }
    case "aero": {
      if (d > 170) return false;
      g.effects.push({ kind: "line", pts: [[f.x, f.y], [target.x, target.y]], color: DEF_BY_ID.aero.color, width: 14, life: 0.25, max: 0.25 });
      if (lands()) {
        damage(g, target, 7, f, power);
        target.vx += ((target.x - f.x) / (d || 1)) * 520;
        target.vy += ((target.y - f.y) / (d || 1)) * 520;
      }
      break;
    }
    case "umbra": {
      const a = Math.atan2(target.y - f.y, target.x - f.x);
      g.effects.push({ kind: "ring", x: f.x, y: f.y, r: 26, color: DEF_BY_ID.umbra.color, life: 0.3, max: 0.3 });
      f.x = target.x + Math.cos(a) * 34;
      f.y = target.y + Math.sin(a) * 34;
      if (lands()) {
        const crit = Math.random() < 0.4;
        damage(g, target, crit ? 26 : 13, f, power);
        if (crit) g.effects.push({ kind: "text", x: target.x, y: target.y - 30, text: "crit", color: DEF_BY_ID.umbra.color, life: 0.6, max: 0.6 });
      }
      break;
    }
    case "gravi": {
      if (d > 280) return false;
      g.effects.push({ kind: "ring", x: f.x, y: f.y, r: 280, color: DEF_BY_ID.gravi.color, life: 0.5, max: 0.5 });
      for (const o of g.fighters) {
        if (!o.alive || o === f) continue;
        const od = dist(f, o);
        if (od < 280) {
          o.vx -= ((o.x - f.x) / (od || 1)) * 260;
          o.vy -= ((o.y - f.y) / (od || 1)) * 260;
          if (od < 140) damage(g, o, 10, f, power);
        }
      }
      break;
    }
    case "tele": {
      g.effects.push({ kind: "ring", x: f.x, y: f.y, r: 24, color: DEF_BY_ID.tele.color, life: 0.3, max: 0.3 });
      f.x = rand(R + 10, W - R - 10);
      f.y = rand(R + 10, H - R - 10);
      g.effects.push({ kind: "ring", x: f.x, y: f.y, r: 24, color: DEF_BY_ID.tele.color, life: 0.3, max: 0.3 });
      shoot(g, f, target, power, 360, 10, 6);
      break;
    }
    case "vita": {
      for (const o of [f]) o.hp = Math.min(o.maxHp, o.hp + 9);
      g.effects.push({ kind: "ring", x: f.x, y: f.y, r: 34, color: DEF_BY_ID.vita.color, life: 0.5, max: 0.5 });
      shoot(g, f, target, power, 300, 5, 5);
      break;
    }
    case "chrono": {
      g.effects.push({ kind: "ring", x: f.x, y: f.y, r: 200, color: DEF_BY_ID.chrono.color, life: 0.6, max: 0.6 });
      for (const o of g.fighters) if (o.alive && o !== f && dist(f, o) < 200) o.cdSlowUntil = g.t + 3;
      shoot(g, f, target, power, 320, 8, 6);
      break;
    }
    case "psy":
    case "shift": {
      if (d > 240) return false;
      g.effects.push({ kind: "line", pts: [[f.x, f.y], [target.x, target.y]], color: DEF_BY_ID.psy.color, width: 3, life: 0.3, max: 0.3 });
      if (lands()) {
        damage(g, target, 12, f, power);
        target.vx += ((target.x - f.x) / (d || 1)) * 450;
        target.vy += ((target.y - f.y) / (d || 1)) * 450;
        target.stunUntil = g.t + 0.8;
      }
      break;
    }
  }
  return true;
}

function step(g: Game, dt: number) {
  g.t += dt;
  const alive = g.fighters.filter((f) => f.alive);
  for (const f of alive) {
    // damage over time
    if (f.burnUntil > g.t) damage(g, f, 6 * dt, null, "pyro");
    if (f.poisonUntil > g.t) damage(g, f, 5 * dt, null, "toxi");
    if (f.def.id === "vita" && f.alive) f.hp = Math.min(f.maxHp, f.hp + 2.5 * dt);
    if (!f.alive) continue;
    const target = nearestEnemy(g, f);
    const stunned = f.stunUntil > g.t;
    let speed = f.def.speed * (f.slowUntil > g.t ? 0.5 : 1);
    if (stunned) speed = 0;
    if (target) {
      const d = dist(f, target);
      const ang = Math.atan2(target.y - f.y, target.x - f.x);
      const ranged = !["terra", "umbra", "psy", "aero"].includes(f.def.id);
      const want = ranged ? 190 : 60;
      f.wander += rand(-1.5, 1.5) * dt;
      let mx = Math.cos(f.wander) * 0.5;
      let my = Math.sin(f.wander) * 0.5;
      if (d > want + 20) { mx += Math.cos(ang); my += Math.sin(ang); }
      else if (d < want - 20) { mx -= Math.cos(ang); my -= Math.sin(ang); }
      else { mx += Math.cos(ang + Math.PI / 2); my += Math.sin(ang + Math.PI / 2); }
      const m = Math.hypot(mx, my) || 1;
      f.x += (mx / m) * speed * dt;
      f.y += (my / m) * speed * dt;
      f.dashCd -= dt;
      if (f.dashCd <= 0 && !stunned) {
        f.dashCd = rand(2, 4);
        f.vx += (mx / m) * 300;
        f.vy += (my / m) * 300;
      }
      const cdRate = f.cdSlowUntil > g.t ? 0.5 : 1;
      f.cd -= dt * cdRate;
      if (f.cd <= 0 && !stunned) {
        if (castAbility(g, f, target)) f.cd = f.def.cd;
        else f.cd = 0.2;
      }
    }
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.vx *= Math.pow(0.02, dt);
    f.vy *= Math.pow(0.02, dt);
    f.x = Math.max(R, Math.min(W - R, f.x));
    f.y = Math.max(R, Math.min(H - R, f.y));
  }
  // separation
  for (let i = 0; i < alive.length; i++) {
    for (let j = i + 1; j < alive.length; j++) {
      const a = alive[i], b = alive[j];
      const d = dist(a, b);
      if (d > 0 && d < R * 2) {
        const push = (R * 2 - d) / 2;
        const nx = (b.x - a.x) / d, ny = (b.y - a.y) / d;
        a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push;
      }
    }
  }
  // projectiles
  const magnetos = g.fighters.filter((f) => f.alive && f.def.id === "magneto");
  for (const p of g.projectiles) {
    for (const m of magnetos) {
      if (m.key === p.owner) continue;
      const d = dist(p, m);
      if (d < 90 && d > 0) {
        p.vx += ((p.x - m.x) / d) * 900 * dt;
        p.vy += ((p.y - m.y) / d) * 900 * dt;
      }
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.x < 0 || p.x > W || p.y < 0 || p.y > H) p.life = 0;
    if (p.life <= 0) continue;
    for (const f of g.fighters) {
      if (!f.alive || f.key === p.owner) continue;
      if (dist(p, f) < R + p.r) {
        const owner = g.fighters[p.owner];
        if (owner.blindUntil > g.t && Math.random() < 0.65) { p.life = 0; break; }
        damage(g, f, p.dmg, owner, p.power);
        if (p.power === "pyro") f.burnUntil = g.t + 2;
        if (p.power === "cryo") f.slowUntil = g.t + 2;
        p.life = 0;
        break;
      }
    }
  }
  g.projectiles = g.projectiles.filter((p) => p.life > 0);
  // effects
  for (const e of g.effects) {
    e.life -= dt;
    if (e.kind === "cloud") {
      const owner = g.fighters[e.owner];
      for (const f of g.fighters) {
        if (f.alive && f.key !== e.owner && dist(e, f) < e.r) {
          damage(g, f, 4 * dt, owner, "toxi");
          f.poisonUntil = g.t + 1.5;
        }
      }
    }
  }
  g.effects = g.effects.filter((e) => e.life > 0);
  const left = g.fighters.filter((f) => f.alive);
  if (left.length <= 1) {
    g.over = true;
    g.winner = left[0]?.def.name ?? null;
  }
}

function draw(ctx: CanvasRenderingContext2D, g: Game, fg: string, floor: string, line: string) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = floor;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = line;
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 12]);
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, 120, 0, Math.PI * 2);
  ctx.moveTo(W / 2, 0);
  ctx.lineTo(W / 2, H);
  ctx.stroke();
  ctx.setLineDash([]);

  for (const e of g.effects) {
    const a = Math.max(0, e.life / e.max);
    ctx.globalAlpha = e.kind === "cloud" ? 0.35 * a + 0.1 : a;
    if (e.kind === "ring") {
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r * (1.1 - a * 0.4), 0, Math.PI * 2);
      ctx.stroke();
    } else if (e.kind === "line") {
      ctx.strokeStyle = e.color;
      ctx.lineWidth = e.width;
      ctx.lineCap = "round";
      ctx.beginPath();
      e.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    } else if (e.kind === "cloud") {
      ctx.fillStyle = DEF_BY_ID.toxi.color;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = e.color;
      ctx.font = "700 16px Nunito, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(e.text, e.x, e.y - (1 - a) * 20);
    }
  }
  ctx.globalAlpha = 1;

  for (const p of g.projectiles) {
    ctx.fillStyle = p.color;
    ctx.strokeStyle = fg;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  for (const f of g.fighters) {
    if (!f.alive) {
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = f.def.color;
      ctx.beginPath();
      ctx.arc(f.x, f.y, R * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      continue;
    }
    if (f.slowUntil > g.t || f.stunUntil > g.t || f.blindUntil > g.t) {
      ctx.strokeStyle = f.stunUntil > g.t ? DEF_BY_ID.psy.color : f.blindUntil > g.t ? DEF_BY_ID.lux.color : DEF_BY_ID.cryo.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(f.x, f.y, R + 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = f.def.id === "shift" && f.copied ? DEF_BY_ID[f.copied].color : f.def.color;
    ctx.strokeStyle = fg;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(f.x, f.y, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = fg;
    ctx.font = "700 18px Fredoka, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(f.def.glyph, f.x, f.y + 1);
    // hp bar
    const bw = 44;
    ctx.fillStyle = line;
    ctx.fillRect(f.x - bw / 2, f.y - R - 14, bw, 7);
    ctx.fillStyle = f.hp / f.maxHp > 0.5 ? "hsl(140 65% 42%)" : f.hp / f.maxHp > 0.25 ? "hsl(40 95% 50%)" : "hsl(0 80% 52%)";
    ctx.fillRect(f.x - bw / 2, f.y - R - 14, (bw * f.hp) / f.maxHp, 7);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(f.x - bw / 2, f.y - R - 14, bw, 7);
    ctx.font = "700 14px Nunito, sans-serif";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(f.def.name, f.x, f.y + R + 18);
  }
}

type Snapshot = { alive: { key: number; name: string; color: string; hp: number; maxHp: number; kills: number }[]; feed: FeedItem[] };

const SPEEDS = [1, 2, 4] as const;

export default function Home() {
  const [mode, setMode] = useState<Mode>("ffa");
  const [picked, setPicked] = useState<Power[]>(FIGHTERS.map((f) => f.id));
  const [status, setStatus] = useState<Status>("ready");
  const [speed, setSpeed] = useState<number>(1);
  const [snap, setSnap] = useState<Snapshot>({ alive: [], feed: [] });
  const [winner, setWinner] = useState<string | null>(null);
  const canvasAria = useString("arena.canvasAria");
  const speedAria = useString("arena.controls.speedAria");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const statusRef = useRef<Status>("ready");
  const speedRef = useRef(1);
  statusRef.current = status;
  speedRef.current = speed;

  const valid = mode === "duel" ? picked.length === 2 : picked.length >= 3 && picked.length <= 16;

  const readSnap = useCallback((g: Game): Snapshot => ({
    alive: g.fighters
      .filter((f) => f.alive)
      .sort((a, b) => b.hp / b.maxHp - a.hp / a.maxHp)
      .map((f) => ({ key: f.key, name: f.def.name, color: f.def.color, hp: Math.ceil(f.hp), maxHp: f.maxHp, kills: f.kills })),
    feed: g.feed.slice(0, 12),
  }), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const css = getComputedStyle(canvas);
    const fg = css.color;
    const floor = css.backgroundColor;
    const line = css.borderTopColor;
    let raf = 0;
    let last = performance.now();
    let snapTimer = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const g = gameRef.current;
      if (g && statusRef.current === "running") {
        const sub = speedRef.current;
        for (let i = 0; i < sub && !g.over; i++) step(g, dt);
        snapTimer += dt;
        if (snapTimer > 0.2 || g.over) {
          snapTimer = 0;
          setSnap(readSnap(g));
        }
        if (g.over) {
          setWinner(g.winner);
          setStatus("finished");
        }
      }
      if (g) draw(ctx, g, fg, floor, line);
      else draw(ctx, { t: 0, fighters: [], projectiles: [], effects: [], feed: [], over: false, winner: null }, fg, floor, line);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [readSnap]);

  const start = () => {
    if (!valid) return;
    const g = newGame(picked);
    gameRef.current = g;
    setWinner(null);
    setSnap(readSnap(g));
    setStatus("running");
  };

  const restart = () => {
    gameRef.current = null;
    setWinner(null);
    setSnap({ alive: [], feed: [] });
    setStatus("ready");
  };

  const toggle = (id: Power) => {
    if (status === "running" || status === "paused") return;
    setPicked((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (mode === "duel") return [...cur.slice(-1), id];
      return [...cur, id];
    });
  };

  const switchMode = (m: Mode) => {
    if (status === "running" || status === "paused") return;
    setMode(m);
    setPicked(m === "duel" ? ["pyro", "cryo"] : FIGHTERS.map((f) => f.id));
  };

  const locked = status === "running" || status === "paused";
  const tone = status === "running" ? "success" : status === "paused" ? "warning" : status === "finished" ? "info" : "neutral";

  return (
    <PageContainer>
      <nav className="mb-6 flex items-center gap-2">
        <Text id="common.appName" className="mr-auto font-display text-lg" />
        <Button asChild variant="secondary" size="sm"><Link to="/"><Text id="common.arena" /></Link></Button>
        <Button asChild variant="ghost" size="sm"><Link to="/roster"><Text id="common.fighters" /></Link></Button>
      </nav>

      <PageHeader
        eyebrow={<Text id="arena.eyebrow" />}
        title={<Text id="arena.title" />}
        subtitle={<Text id="arena.subtitle" />}
        actions={<StatusBadge tone={tone}><Text id={`arena.status.${status}` as StringKey} /></StatusBadge>}
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex flex-col gap-6">
          <Panel>
            <PanelBody className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {status === "ready" && (
                  <Button onClick={start} disabled={!valid}><Text id="arena.controls.start" /></Button>
                )}
                {status === "running" && (
                  <Button variant="secondary" onClick={() => setStatus("paused")}><Text id="arena.controls.pause" /></Button>
                )}
                {status === "paused" && (
                  <Button onClick={() => setStatus("running")}><Text id="arena.controls.resume" /></Button>
                )}
                {status !== "ready" && (
                  <Button variant="outline" onClick={restart}><Text id="arena.controls.restart" /></Button>
                )}
                <div className="ml-auto flex items-center gap-2" role="group" aria-label={speedAria}>
                  <Text id="arena.controls.speed" className="text-sm text-muted-foreground" />
                  {SPEEDS.map((s) => (
                    <Button key={s} size="sm" variant={speed === s ? "default" : "outline"} onClick={() => setSpeed(s)} className="tabular-nums">
                      {`${s}x`}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  width={W}
                  height={H}
                  aria-label={canvasAria}
                  role="img"
                  className="block h-auto w-full rounded-xl border-4 border-border bg-background-secondary text-foreground"
                />
                {status === "ready" && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                    <Text id="arena.idle" as="p" className="rounded-full bg-card px-6 py-3 text-center font-display text-lg text-foreground" />
                  </div>
                )}
                {status === "finished" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
                    <div className="rounded-2xl border-4 border-foreground bg-card px-8 py-6 text-center">
                      {winner ? (
                        <Text id="arena.winner.title" vars={{ name: winner }} as="p" className="font-display text-3xl text-foreground" />
                      ) : (
                        <Text id="arena.winner.draw" as="p" className="font-display text-3xl text-foreground" />
                      )}
                      <Button className="mt-4" onClick={start}><Text id="arena.winner.again" /></Button>
                    </div>
                  </div>
                )}
              </div>
            </PanelBody>
          </Panel>

          <section>
            <SectionHeading
              title={<Text id="arena.pick.title" />}
              action={
                <div className="flex gap-2">
                  {mode === "ffa" && (
                    <Button size="sm" variant="ghost" disabled={locked} onClick={() => setPicked(FIGHTERS.map((f) => f.id))}><Text id="arena.pick.all" /></Button>
                  )}
                  <Button size="sm" variant="ghost" disabled={locked} onClick={() => setPicked([])}><Text id="arena.pick.clear" /></Button>
                </div>
              }
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="flex gap-2" role="group">
                <Text id="arena.mode.label" className="sr-only" />
                {(["duel", "ffa"] as const).map((m) => (
                  <Button key={m} size="sm" variant={mode === m ? "default" : "outline"} disabled={locked} onClick={() => switchMode(m)}>
                    <Text id={`arena.mode.${m}` as StringKey} />
                  </Button>
                ))}
              </div>
              <Text id={mode === "duel" ? "arena.pick.duelHint" : "arena.pick.ffaHint"} className={cn("text-sm", valid ? "text-muted-foreground" : "text-error")} />
              <Text id="arena.pick.count" vars={{ count: picked.length }} className="ml-auto text-sm text-muted-foreground tabular-nums" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
              {FIGHTERS.map((f) => (
                <FighterChip key={f.id} def={f} on={picked.includes(f.id)} disabled={locked} onClick={() => toggle(f.id)} />
              ))}
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <section>
            <SectionHeading title={<Text id="arena.alive.title" />} />
            <Panel className="mt-3">
              <PanelBody>
                {snap.alive.length === 0 ? (
                  <Text id="arena.alive.empty" as="p" className="text-sm text-muted-foreground" />
                ) : (
                  <ul className="flex flex-col gap-3">
                    {snap.alive.map((a) => (
                      <li key={a.key} className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="size-3 shrink-0 rounded-full border-2 border-foreground" style={{ background: a.color }} />
                          <span className="font-semibold text-foreground">{a.name}</span>
                          <Text id="arena.alive.kills" vars={{ count: a.kills }} className="ml-auto text-muted-foreground tabular-nums" />
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full" style={{ width: `${(a.hp / a.maxHp) * 100}%`, background: a.color }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </PanelBody>
            </Panel>
          </section>
          <section>
            <SectionHeading title={<Text id="arena.feed.title" />} />
            <div className="mt-3">
              {snap.feed.length === 0 ? (
                <EmptyState title={<Text id="arena.feed.emptyTitle" />} body={<Text id="arena.feed.emptyBody" />} />
              ) : (
                <Panel>
                  <PanelBody>
                    <ul className="flex flex-col gap-2 text-sm text-foreground">
                      {snap.feed.map((k) => (
                        <li key={k.id}>
                          {k.killer ? (
                            <Text id="arena.feed.ko" vars={{ killer: k.killer, victim: k.victim }} />
                          ) : (
                            <Text id="arena.feed.fell" vars={{ victim: k.victim }} />
                          )}
                        </li>
                      ))}
                    </ul>
                  </PanelBody>
                </Panel>
              )}
            </div>
          </section>
        </aside>
      </div>
    </PageContainer>
  );
}

function FighterChip({ def, on, disabled, onClick }: { def: FighterDef; on: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      className={cn(
        "flex min-h-10 items-center gap-2 rounded-xl border-2 px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-surface-hover active:bg-surface-active disabled:opacity-60",
        on ? "border-foreground bg-card font-semibold text-foreground" : "border-border bg-background text-muted-foreground",
      )}
    >
      <span className="size-5 shrink-0 rounded-full border-2 border-foreground" style={{ background: def.color }} />
      <span className="truncate">{def.name}</span>
    </button>
  );
}
