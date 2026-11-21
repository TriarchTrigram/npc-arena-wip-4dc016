// Side-view stickman fight engine for the arena canvas. Runs entirely in the browser.
import { DEF_BY_ID, juggernautOf, rosterIdOf, type Anim, type FighterDef, type Move, type Power, type StatusEffect } from "./fighters";
import type { Sfx } from "./arena-sound";
import { INTROS, INTRO_LEN, INTRO_ARRIVED, type IntroBurst, type IntroPose } from "./spawn-intros";
import { LOOKS, setLookTint, drawFx, drawSpark, drawShotLook, drawBeamLook, drawEruptionLook, drawZoneLook, drawRushLook, drawAnnihilation, eruptionColors, type Fx, type PShape } from "./move-looks";
import { drawBossDesign } from "./boss-designs";

export const W = 960;
export const H = 600;
export const GROUND = 538;
const GRAV = 1900;
const INK = "hsl(250 32% 14%)";

// ---------- small helpers ----------
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const pick = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];

function shade(hsl: string, dl: number, alpha = 1) {
  const m = hsl.match(/hsl\(([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\)/);
  if (!m) return hsl;
  const l = clamp(Number(m[3]) + dl, 0, 100);
  return alpha < 1 ? `hsl(${m[1]} ${m[2]}% ${l}% / ${alpha})` : `hsl(${m[1]} ${m[2]}% ${l}%)`;
}

// ---------- poses ----------
// Angles in radians. Limbs: 0 = straight down, +PI/2 = forward, PI = straight up, negative = backward.
// Torso: 0 = upright, positive leans forward.
type Pose = { t: number; aF1: number; aF2: number; aB1: number; aB2: number; lF1: number; lF2: number; lB1: number; lB2: number };
const POSE_KEYS = ["t", "aF1", "aF2", "aB1", "aB2", "lF1", "lF2", "lB1", "lB2"] as const;

const STANCE: Pose = { t: 0.12, aF1: 0.75, aF2: 2.35, aB1: 0.35, aB2: 1.95, lF1: 0.4, lF2: 0.02, lB1: -0.32, lB2: -0.14 };
const AIR: Pose = { t: 0.2, aF1: 2.1, aF2: 2.6, aB1: -0.7, aB2: -0.2, lF1: 1.3, lF2: 0.15, lB1: 0.45, lB2: -0.65 };
const HURT: Pose = { t: -0.45, aF1: -0.35, aF2: 0.5, aB1: -0.9, aB2: -0.4, lF1: 0.35, lF2: 0.1, lB1: -0.25, lB2: -0.1 };
const DAZED: Pose = { t: 0.45, aF1: 0.15, aF2: 0.05, aB1: -0.1, aB2: -0.15, lF1: 0.3, lF2: -0.2, lB1: -0.2, lB2: -0.45 };
const KO: Pose = { t: -1.52, aF1: -1.35, aF2: -1.75, aB1: -1.75, aB2: -1.45, lF1: 1.55, lF2: 1.6, lB1: 1.4, lB2: 1.62 };
// forward dash: leaning in, arms streaming back
const DASH: Pose = { t: 0.62, aF1: -0.95, aF2: -0.6, aB1: -1.15, aB2: -0.85, lF1: 0.95, lF2: 0.3, lB1: -0.75, lB2: -0.95 };
// back dash: guard up, leaning away
const BACKDASH: Pose = { t: -0.28, aF1: 0.95, aF2: 2.0, aB1: 0.55, aB2: 1.7, lF1: 0.65, lF2: 0.2, lB1: -0.4, lB2: -0.2 };
// thrown back by a clash, arms crossed in guard
const CLASHED: Pose = { t: -0.38, aF1: 1.25, aF2: 2.65, aB1: 1.0, aB2: 2.45, lF1: 0.75, lF2: 0.0, lB1: -0.2, lB2: -0.55 };
// down on one knee, catching breath
/** Hovering on wings: legs trailing, guard up. */
const FLY: Pose = { t: 0.24, aF1: 0.75, aF2: 2.3, aB1: 0.4, aB2: 1.9, lF1: 0.2, lF2: -0.25, lB1: -0.2, lB2: -0.6 };
const KNEEL: Pose = { t: 0.38, aF1: 0.95, aF2: 0.3, aB1: 0.15, aB2: 0.05, lF1: 1.4, lF2: 0.02, lB1: 0.1, lB2: -1.5 };

// entrance poses (see spawn-intros.ts)
const RISE: Pose = { t: -0.12, aF1: 2.65, aF2: 2.95, aB1: 3.55, aB2: 3.3, lF1: 0.3, lF2: 0.05, lB1: -0.3, lB2: -0.1 };
const FLEX: Pose = { t: 0.18, aF1: 1.35, aF2: 2.75, aB1: 0.5, aB2: 2.3, lF1: 0.55, lF2: 0.05, lB1: -0.45, lB2: -0.2 };
const CROUCH: Pose = { t: 0.5, aF1: 0.9, aF2: 2.2, aB1: 0.3, aB2: 1.7, lF1: 1.2, lF2: -0.2, lB1: -0.3, lB2: -1.0 };
const LAND: Pose = { t: 0.6, aF1: 0.15, aF2: 0.0, aB1: -1.7, aB2: -1.4, lF1: 1.45, lF2: 0.1, lB1: 0.2, lB2: -1.45 };
const GUARD: Pose = { t: 0.1, aF1: 1.4, aF2: 3.3, aB1: 1.2, aB2: 3.0, lF1: 0.5, lF2: 0.1, lB1: -0.5, lB2: -0.15 };
const FLOAT: Pose = { t: 0.0, aF1: 0.9, aF2: 0.25, aB1: 0.6, aB2: 0.1, lF1: 1.55, lF2: -1.4, lB1: 1.35, lB2: -1.6 };
const INTRO_POSES: Record<IntroPose, Pose> = { stance: STANCE, air: AIR, crouch: CROUCH, rise: RISE, flex: FLEX, land: LAND, guard: GUARD, float: FLOAT };

const DASH_TIME = 0.17;
/** Juggernaut cruising height (feet above the floor) and swooping height for close fighting. */
const HOVER_HIGH = 120;
const HOVER_LOW = 26;
/** One fighter against five: the juggernaut hits harder and recharges faster. */
const JUGG_DMG = 3;
const JUGG_CD = 0.4;
const DASH_DIST = 150;
const DASH_CD = 0.85;
const IFRAMES = 0.13;
const KNEEL_TIME = 1.0;
/** Personality: how readily each kind of fighter presses in, counters and dashes. */
const AGGRO: Record<FighterDef["role"], number> = { attacker: 0.85, trickster: 0.75, tank: 0.6, support: 0.4, control: 0.35 };

const ANIMS: Record<Anim, { wind: Partial<Pose>; strike: Partial<Pose> }> = {
  jab: {
    wind: { t: 0, aF1: 0.3, aF2: 1.9, aB1: 0.5, aB2: 2.1 },
    strike: { t: 0.32, aF1: 1.57, aF2: 1.57, aB1: 0.2, aB2: 1.7, lF1: 0.62, lB1: -0.5 },
  },
  kick: {
    wind: { t: -0.05, lF1: 1.45, lF2: 0.25, aF1: 0.9, aB1: -0.4 },
    strike: { t: -0.38, lF1: 1.68, lF2: 1.62, lB1: -0.08, lB2: -0.05, aF1: 0.95, aF2: 1.9, aB1: -0.7, aB2: -0.3 },
  },
  cast: {
    wind: { t: -0.12, aF1: -0.5, aF2: 0.4, aB1: -0.65, aB2: 0.3 },
    strike: { t: 0.25, aF1: 1.6, aF2: 1.6, aB1: 1.45, aB2: 1.55, lF1: 0.58, lB1: -0.48 },
  },
  thrust: {
    wind: { t: -0.05, aF1: -0.2, aF2: 1.2 },
    strike: { t: 0.3, aF1: 1.62, aF2: 1.75, aB1: -0.4, aB2: 0.6, lF1: 0.62, lB1: -0.5 },
  },
  raise: {
    wind: { t: 0.15, aF1: 1.9, aF2: 2.4, aB1: 1.8, aB2: 2.4 },
    strike: { t: -0.12, aF1: 2.85, aF2: 3.05, aB1: 2.7, aB2: 2.95, lF1: 0.3, lB1: -0.3 },
  },
  slam: {
    wind: { t: -0.2, aF1: 2.9, aF2: 3.0, aB1: 2.75, aB2: 3.0, lF1: 0.25, lB1: -0.2 },
    strike: { t: 0.75, aF1: 0.9, aF2: 0.45, aB1: 0.8, aB2: 0.35, lF1: 1.0, lF2: -0.35, lB1: -0.55, lB2: -1.25 },
  },
  uppercut: {
    wind: { t: 0.35, aF1: 0.2, aF2: 0.8, lF1: 0.85, lF2: -0.25, lB1: -0.45, lB2: -1.05 },
    strike: { t: -0.12, aF1: 2.9, aF2: 3.0, lF1: 0.2, lB1: -0.2 },
  },
  spin: {
    wind: { t: 0.1, aF1: 1.3, aF2: 1.4, aB1: -1.3, aB2: -1.4 },
    strike: { t: 0, aF1: 1.57, aF2: 1.6, aB1: -1.57, aB2: -1.6, lF1: 0.3, lF2: 0.2, lB1: -0.3, lB2: -0.2 },
  },
  lunge: {
    wind: { t: -0.1, aF1: -0.45, aF2: 0.6 },
    strike: { t: 0.65, aF1: 1.72, aF2: 1.65, aB1: -0.75, aB2: -0.5, lF1: 1.05, lF2: 0.3, lB1: -0.85, lB2: -0.6 },
  },
};

// ---------- element looks ----------
const FX: Record<Power, { shape: PShape; add: boolean; grav: number }> = {
  pyro: { shape: "dot", add: true, grav: -260 },
  cryo: { shape: "shard", add: false, grav: 320 },
  electro: { shape: "spark", add: true, grav: 0 },
  terra: { shape: "chunk", add: false, grav: 1000 },
  aero: { shape: "spark", add: false, grav: -40 },
  hydro: { shape: "dot", add: false, grav: 800 },
  umbra: { shape: "smoke", add: false, grav: -50 },
  lux: { shape: "spark", add: true, grav: 0 },
  gravi: { shape: "ring", add: true, grav: 0 },
  tele: { shape: "ring", add: true, grav: 0 },
  vita: { shape: "plus", add: false, grav: -140 },
  toxi: { shape: "ring", add: false, grav: -110 },
  chrono: { shape: "ring", add: true, grav: 0 },
  magneto: { shape: "shard", add: false, grav: 700 },
  psy: { shape: "ring", add: true, grav: -20 },
  shift: { shape: "dot", add: true, grav: 0 },
};

// ---------- Rage Mode ----------
/** Pushed below a third of their health, Pyro, Electro and Aero snap once: a cutscene pauses the match, then they fight on recoloured and stronger. */
type Rage = {
  body: string; glow: string;
  /** Their moves' new colour and highlight. */
  a: string; b: string;
  /** Electro's black lightning. */
  dark?: string;
  title: string;
  dmg: number; kb: number; cd: number; speed: number; act: number;
};
const RAGE: Partial<Record<Power, Rage>> = {
  pyro: { body: "hsl(218 88% 56%)", glow: "hsl(195 100% 74%)", a: "hsl(222 100% 58%)", b: "hsl(190 100% 80%)", title: "BLUE FLAME", dmg: 1.3, kb: 1.1, cd: 0.8, speed: 1.1, act: 1.1 },
  electro: { body: "hsl(0 0% 97%)", glow: "hsl(0 0% 100%)", a: "hsl(0 0% 100%)", b: "hsl(215 40% 94%)", dark: "hsl(265 45% 7%)", title: "BLACK LIGHTNING", dmg: 1.15, kb: 1, cd: 0.45, speed: 1.6, act: 1.45 },
  aero: { body: "hsl(168 78% 36%)", glow: "hsl(150 100% 80%)", a: "hsl(166 88% 34%)", b: "hsl(146 100% 82%)", title: "STORM FURY", dmg: 1.5, kb: 1.7, cd: 0.8, speed: 1.15, act: 1.1 },
};
const RAGE_AT = 0.34;
const CUT_TIME = 2.7;
const RAGE_POSE: Pose = { t: -0.22, aF1: 0.5, aF2: 0.2, aB1: -0.5, aB2: -0.2, lF1: 0.5, lF2: 0.22, lB1: -0.5, lB2: -0.22 };
const ROAR_POSE: Pose = { ...RAGE_POSE, t: -0.3, ...ANIMS.raise.strike };
const rageOf = (f?: Fighter | null) => (f?.rage ? RAGE[f.def.id] ?? null : null);
/** Rage only belongs to the pure fighters, not to a hybrid carrying their power. */
const canRage = (f: Fighter) => !!RAGE[f.def.id] && !f.def.parents && !f.def.boss && !f.rage;
/** Whose rage colours new particles and effects take while a fighter acts. */
let paint: Rage | null = null;

// ---------- game state ----------
type Action = { id: number; move: Move; power: Power; t: number; fired: boolean; target: number; hits: number[]; label: string; landed: boolean };
type Ghost = { x: number; y: number; pose: Pose; face: number; life: number };

export type Fighter = {
  key: number;
  def: FighterDef;
  x: number; y: number; vx: number; vy: number;
  facing: 1 | -1;
  onGround: boolean;
  scale: number;
  hp: number; maxHp: number; hpTrail: number;
  alive: boolean; kills: number; koT: number;
  cds: Record<string, number>;
  act: Action | null;
  think: number; prefRange: number; prefT: number;
  walk: number; walkDir: number;
  hurtT: number; flash: number;
  status: Record<StatusEffect, number>;
  lastHitBy: Power | null; lastAttacker: number | null;
  pose: Pose;
  // dashing
  dashT: number; dashDir: number; dashCd: number; iframeT: number; airDashed: boolean;
  ghosts: Ghost[]; ghostT: number;
  // clashes
  clashAir: boolean; kneelT: number;
  // brain
  aggro: number; targetKey: number | null; reacted: number; comboT: number;
  // team fights: -1 means everyone is an opponent
  team: number;
  // juggernaut: always flying on wings, holding at hoverY
  jugg: boolean; hoverY: number;
  // Rage Mode: on for the rest of the fight once it fires; rageT times Aero's gusts
  rage: boolean; rageT: number;
  /** Seconds into the entrance phase when this fighter's own entrance starts. */
  spawnAt: number;
};

type Projectile = {
  x: number; y: number; vx: number; vy: number; r: number; grav: number; rot: number;
  owner: number; power: Power; move: Move; life: number; hits: number[]; shape: NonNullable<Move["shape"]>;
};
type Beam = { owner: number; power: Power; x: number; y: number; ang: number; len: number; width: number; life: number; max: number; jag: boolean; clash?: boolean; look?: string };
type Eruption = { owner: number; power: Power; move: Move; x: number; t: number; fired: boolean };
type Zone = { owner: number; power: Power; move: Move; x: number; life: number; max: number };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; shape: PShape; grav: number; add: boolean; rot: number };
type Pop = { x: number; y: number; text: string; color: string; life: number; max: number; size: number };
type Wave = { x: number; y: number; r: number; life: number; max: number; a: string; b: string };

export type FeedItem = { id: number; killer: string | null; victim: string };

// ---------- realms (The Riftmaker's Reality Warp) ----------
export type Realm = "moon" | "desert";
const REALMS: Realm[] = ["moon", "desert"];
const REALM_TIME = 11;
const REALM_FADE = 0.45;
/** How strongly things fall in each realm. */
const REALM_GRAV: Record<Realm, number> = { moon: 0.36, desert: 1 };
const REALM_NAME: Record<Realm, string> = { moon: "THE MOON", desert: "THE DESERT" };
/** Gravity now, set each frame from the realm the fight is in. */
let gravK = 1;
/** Matter and antimatter closing in on a spot before they cancel out. */
type Anni = { owner: number; power: Power; move: Move; x: number; y: number; t: number; done: boolean };
const ANNI_TIME = 0.6;
const ECLIPSE_TIME = 6;

export type Game = {
  t: number;
  fighters: Fighter[];
  projectiles: Projectile[];
  beams: Beam[];
  eruptions: Eruption[];
  zones: Zone[];
  particles: Particle[];
  pops: Pop[];
  waves: Wave[];
  /** Each move's own cast and impact effects. */
  fx: Fx[];
  feed: FeedItem[];
  /** Sounds queued this frame; the arena screen plays and clears them. */
  sfx: Sfx[];
  shake: number;
  hitstop: number;
  ending: number;
  over: boolean;
  winner: string | null;
  preview: boolean;
  duel: boolean;
  teamMode: boolean;
  /** The winner's roster id: a power id, or a hybrid's pair key. */
  winnerId: string | null;
  winnerTeam: number | null;
  /** A rage cutscene in progress: the match holds still until it ends. */
  cut: { key: number; t: number; max: number } | null;
  /** Entrances before READY / FIGHT: the match holds until every fighter has arrived. */
  intro: { t: number; max: number } | null;
  /** Where reality has been moved to, for how long, and who moved it. */
  realm: { id: Realm; t: number; left: number; by: number; heat: number } | null;
  /** A realm just ended: the old one fades out over the arena. */
  realmOut: { id: Realm; t: number } | null;
  annis: Anni[];
  /** Everwinter's Time Stop: the arena stays grey and still until this time. */
  stopUntil: number;
  /** The Black Sun's Total Eclipse: the sky stays dark until this time. */
  eclipseUntil: number;
  /** White flash over everything, in seconds left. */
  flash: number;
};

let feedId = 0;

/** Team colours, in team order. Names live in the screen's copy. */
export const TEAM_COLORS = ["hsl(0 82% 60%)", "hsl(212 90% 62%)", "hsl(46 100% 58%)", "hsl(138 62% 50%)"] as const;

/** Opponents: everyone in free for all, only the other teams in a team fight. */
const foe = (a: Fighter | undefined, b: Fighter | undefined) => !!a && !!b && a !== b && (a.team < 0 || a.team !== b.team);

/** `teams` (same length as `ids`) puts fighters on sides; each side spawns together. `jugg` is the index of the juggernaut, if any. */
export function newGame(ids: (Power | FighterDef)[], preview = false, teams?: number[], jugg = -1): Game {
  const n = ids.length;
  const scale = n <= 2 ? 1.25 : n <= 4 ? 1.1 : n <= 8 ? 0.95 : 0.82;
  const teamMode = !!teams && teams.length === n;
  // slot order: grouped by team so teammates line up side by side
  const order = ids.map((_, i) => i);
  if (teamMode) order.sort((a, b) => teams![a] - teams![b] || a - b);
  const slotOf = new Map(order.map((idx, slot) => [idx, slot]));
  // entrances run left to right, overlapping; a juggernaut arrives last, on its own
  const gap = n <= 2 ? 0.5 : Math.min(0.16, 1.3 / (n - 1));
  const lastSlot = Math.max(0, n - 1);
  const fighters: Fighter[] = ids.map((id, i) => {
    const isJugg = i === jugg;
    const base = typeof id === "string" ? DEF_BY_ID[id] : id;
    const def = isJugg ? juggernautOf(base) : base;
    const slot = slotOf.get(i) ?? i;
    const x = n === 2 ? (slot === 0 ? 270 : W - 270) : 70 + ((W - 140) * (slot + 0.5)) / n;
    // a hybrid stands a little taller than a pure-blooded fighter
    const sc = isJugg ? scale * 1.25 : def.boss ? scale * 1.22 : def.parents ? scale * 1.12 : scale;
    const hoverY = GROUND - HOVER_HIGH * sc;
    return {
      key: i, def,
      x, y: isJugg ? hoverY : GROUND, vx: 0, vy: 0,
      facing: x < W / 2 ? 1 : -1,
      onGround: !isJugg,
      scale: sc,
      hp: def.hp, maxHp: def.hp, hpTrail: def.hp,
      alive: true, kills: 0, koT: 0,
      cds: Object.fromEntries(def.moves.map((m) => [m.id, rand(0.2, m.cd * 0.6)])),
      act: null,
      think: rand(0.2, 0.6), prefRange: 160, prefT: 0,
      walk: rand(0, 6), walkDir: 0,
      hurtT: 0, flash: 0,
      status: { burn: 0, slow: 0, stun: 0, poison: 0, blind: 0, freeze: 0 },
      lastHitBy: null, lastAttacker: null,
      pose: { ...(preview ? STANCE : INTRO_POSES[INTROS[def.id].body(0, sc).pose]) },
      dashT: 0, dashDir: 0, dashCd: rand(0, 0.6), iframeT: 0, airDashed: false,
      ghosts: [], ghostT: 0,
      clashAir: false, kneelT: 0,
      aggro: clamp(AGGRO[def.role] + rand(-0.08, 0.08), 0.2, 0.95), targetKey: null, reacted: -1, comboT: 0,
      team: teamMode ? teams![i] : -1,
      jugg: isJugg, hoverY,
      rage: false, rageT: 0,
      spawnAt: isJugg ? lastSlot * gap + 0.35 : slot * gap,
    };
  });
  const introEnd = Math.max(0, ...fighters.map((f) => f.spawnAt)) + INTRO_LEN + 0.2;
  gravK = 1;
  return {
    t: 0, fighters, projectiles: [], beams: [], eruptions: [], zones: [], particles: [], pops: [], waves: [], fx: [], feed: [], sfx: [],
    shake: 0, hitstop: 0, ending: 0, over: false, winner: null, preview, duel: n === 2 && !teamMode,
    teamMode, winnerId: null, winnerTeam: null, cut: null,
    intro: preview || n === 0 ? null : { t: 0, max: introEnd },
    realm: null, realmOut: null, annis: [], stopUntil: 0, eclipseUntil: 0, flash: 0,
  };
}

// body points
const bodyH = (f: Fighter) => 100 * f.scale;
const center = (f: Fighter) => ({ x: f.x, y: f.y - 55 * f.scale });
const hand = (f: Fighter) => ({ x: f.x + f.facing * 34 * f.scale, y: f.y - 66 * f.scale });

function emit(g: Game, power: Power, x: number, y: number, n: number, spd: number, opts: Partial<Particle> = {}) {
  const def = DEF_BY_ID[power];
  const fx = FX[power];
  const rg = paint && RAGE[power] === paint ? paint : null;
  for (let i = 0; i < n && g.particles.length < 900; i++) {
    const a = rand(0, Math.PI * 2);
    const s = rand(spd * 0.3, spd);
    const life = rand(0.3, 0.7);
    g.particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life,
      size: rand(3, 7), color: rg ? rageColor(rg) : Math.random() < 0.5 ? def.color : def.glow,
      shape: fx.shape, grav: fx.grav, add: fx.add, rot: rand(0, 6), ...opts,
    });
  }
}

/** Particles in a move's own look, or the element's when the move has none. */
function emitMove(g: Game, m: Move, power: Power, x: number, y: number, n: number, spd: number, opts: Partial<Particle> = {}) {
  const lk = LOOKS[m.id];
  if (!lk) return emit(g, power, x, y, n, spd, opts);
  for (let i = 0; i < n && g.particles.length < 900; i++) {
    const a = rand(0, Math.PI * 2);
    const sp = rand(spd * 0.3, spd);
    const life = rand(0.3, 0.7);
    g.particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life, max: life,
      size: rand(3, 7), color: paint ? rageColor(paint) : Math.random() < 0.5 ? lk.a : lk.b,
      shape: lk.p, grav: lk.grav, add: lk.add && !(paint?.dark), rot: rand(0, 6), ...opts,
    });
  }
}

/** One of a raging fighter's colours; Electro's mix in black. */
function rageColor(r: Rage) {
  const k = Math.random();
  return r.dark && k < 0.3 ? r.dark : k < 0.65 ? r.a : r.b;
}

/** A move's signature effect, at the hand when it fires or on whoever it hit. */
function moveFx(g: Game, id: string, hitFx: boolean, x: number, y: number, dir: number, size: number, life: number, reach = 0) {
  if (!LOOKS[id] || g.fx.length > 80) return;
  g.fx.push({ id, hit: hitFx, x, y, dir, size, life, max: life, seed: Math.random() * 100, reach, tint: paint ? { a: paint.a, b: paint.b } : undefined });
}

/** Fires a move's signature effect from where its look says. */
function castFx(g: Game, f: Fighter, m: Move) {
  const lk = LOOKS[m.id];
  if (!lk?.cast || lk.cast === "sky") return;
  const s = f.scale;
  const at = lk.cast === "hand" ? hand(f) : lk.cast === "body" ? center(f) : { x: f.x, y: f.y };
  const reach = m.kind === "burst" ? (m.radius ?? 120) * s : m.range * s;
  moveFx(g, m.id, false, at.x, at.y, f.facing, s, lk.castLife ?? 0.3, reach);
}

/** Queue a sound for the screen to play. A preview arena stays silent. */
function sfx(g: Game, e: Sfx) {
  if (!g.preview && g.sfx.length < 48) g.sfx.push(e);
}

function pop(g: Game, x: number, y: number, text: string, color: string, size = 18, life = 0.8) {
  g.pops.push({ x, y, text, color, life, max: life, size });
}

// ---------- clashes and dashes ----------
let actId = 0;

/** Two powers met: blast ring, flash, and everyone nearby is shoved away. */
function shockwave(g: Game, x: number, y: number, pa: Power, pb: Power, r = 170) {
  const A = DEF_BY_ID[pa], B = DEF_BY_ID[pb];
  g.waves.push({ x, y, r, life: 0.6, max: 0.6, a: A.glow, b: B.glow });
  emit(g, pa, x, y, 22, 520);
  emit(g, pb, x, y, 22, 520);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    g.particles.push({ x, y, vx: Math.cos(a) * 900, vy: Math.sin(a) * 900, life: 0.22, max: 0.22, size: 6, color: "white", shape: "spark", grav: 0, add: true, rot: 0 });
  }
  for (const f of g.fighters) {
    if (!f.alive) continue;
    const c = center(f);
    const d = Math.hypot(c.x - x, (c.y - y) * 0.8);
    if (d > r) continue;
    const k = 1 - d / r;
    const dir = Math.sign(f.x - x) || (f.key % 2 ? 1 : -1);
    f.vx = dir * (260 + 520 * k);
    if (f.onGround) { f.vy = -180 - 220 * k; f.onGround = false; }
    f.hurtT = Math.max(f.hurtT, 0.18 + 0.2 * k);
    f.act = null;
    f.kneelT = 0;
  }
  pop(g, x, y - 46, "CLASH!", "hsl(46 100% 62%)", 30, 0.9);
  sfx(g, { k: "clash" });
  g.shake = Math.max(g.shake, 13);
  g.hitstop = Math.max(g.hitstop, 0.09);
}

/** Two close-range strikes met head on: both fly back and drop to one knee. */
function m1Clash(g: Game, a: Fighter, b: Fighter) {
  const ha = hand(a), hb = hand(b);
  const x = (ha.x + hb.x) / 2, y = (ha.y + hb.y) / 2;
  g.particles.push({ x, y, vx: 0, vy: 0, life: 0.2, max: 0.2, size: 46, color: "white", shape: "ring", grav: 0, add: true, rot: 1 });
  g.particles.push({ x, y, vx: 0, vy: 0, life: 0.3, max: 0.3, size: 30, color: "hsl(46 100% 70%)", shape: "ring", grav: 0, add: true, rot: 1 });
  for (let i = 0; i < 14; i++) {
    const ang = rand(-0.9, 0.9) + (i % 2 ? Math.PI : 0);
    const sp = rand(380, 760);
    g.particles.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 120, life: 0.3, max: 0.3, size: 5, color: i % 2 ? a.def.glow : b.def.glow, shape: "spark", grav: 900, add: true, rot: 0 });
  }
  for (const f of [a, b]) {
    const other = f === a ? b : a;
    const dir = Math.sign(f.x - other.x) || (f === a ? -1 : 1);
    f.act = null;
    f.dashT = 0;
    f.vx = dir * 600;
    f.vy = -430;
    f.onGround = false;
    f.clashAir = true;
    f.kneelT = 0;
    f.facing = dir > 0 ? -1 : 1;
    for (const m of f.def.moves) if (m.kind === "melee") f.cds[m.id] = Math.max(f.cds[m.id], 0.5);
  }
  pop(g, x, y - 40, "CLASH!", "white", 28, 0.9);
  sfx(g, { k: "m1clash" });
  g.shake = Math.max(g.shake, 10);
  g.hitstop = Math.max(g.hitstop, 0.13);
}

function startDash(g: Game, f: Fighter, dir: number) {
  if (f.dashCd > 0 || f.dashT > 0 || f.kneelT > 0 || f.clashAir) return false;
  if (!f.onGround && !f.jugg) {
    if (f.airDashed) return false;
    f.airDashed = true;
  }
  f.dashT = DASH_TIME;
  f.dashDir = dir;
  sfx(g, { k: "dash", air: !f.onGround });
  f.dashCd = DASH_CD * (1.15 - f.aggro * 0.3);
  f.iframeT = IFRAMES;
  f.vx = 0;
  f.ghostT = 0;
  const s = f.scale;
  if (f.onGround) {
    for (let i = 0; i < 8; i++) {
      g.particles.push({ x: f.x - dir * rand(0, 14), y: GROUND - 2, vx: -dir * rand(80, 260), vy: -rand(20, 120), life: 0.35, max: 0.35, size: rand(4, 8) * s, color: "hsl(34 40% 82%)", shape: "dot", grav: 300, add: false, rot: 0 });
    }
  }
  emit(g, f.def.id, f.x, f.y - 50 * s, 6, 160);
  return true;
}

const invuln = (f: Fighter) => f.iframeT > 0;
const steady = (f: Fighter) => f.onGround || (f.jugg && f.alive);

// ---------- combat ----------
function knockOut(g: Game, f: Fighter, by: Fighter | null) {
  f.alive = false;
  f.hp = 0;
  f.koT = 0;
  f.act = null;
  f.onGround = false;
  f.vy = -460;
  f.vx = (by ? Math.sign(f.x - by.x) || 1 : -f.facing) * 260;
  if (by && by !== f) by.kills += 1;
  g.feed.unshift({ id: ++feedId, killer: by && by !== f ? by.def.name : null, victim: f.def.name });
  const c = center(f);
  emit(g, f.def.id, c.x, c.y, 34, 420);
  sfx(g, { k: "ko" });
  g.shake = Math.max(g.shake, 14);
  g.hitstop = Math.max(g.hitstop, 0.12);
}

function hurt(g: Game, f: Fighter, amount: number, by: Fighter | null) {
  if (!f.alive || (by && by !== f && !foe(by, f))) return;
  f.hp -= amount;
  if (by && by !== f) f.lastAttacker = by.key;
  if (f.hp <= 0) knockOut(g, f, by ?? (f.lastAttacker != null ? g.fighters[f.lastAttacker] : null));
}

function hit(g: Game, a: Fighter, o: Fighter, move: Move, power: Power, dir: number, mult = 1) {
  const prev = paint;
  paint = rageOf(a);
  try {
    return landHit(g, a, o, move, power, dir, mult);
  } finally {
    paint = prev;
  }
}

function landHit(g: Game, a: Fighter, o: Fighter, move: Move, power: Power, dir: number, mult = 1) {
  if (!o.alive || !foe(a, o)) return false;
  const rg = rageOf(a);
  const c = center(o);
  if (invuln(o)) {
    if (Math.random() < 0.5) pop(g, c.x, c.y - 50 * o.scale, "dodge", o.def.glow, 15, 0.5);
    return false;
  }
  if (o.def.id === "tele" && Math.random() < 0.25) {
    pop(g, c.x, c.y - 50 * o.scale, "dodge", o.def.glow, 16);
    emit(g, "tele", c.x, c.y, 8, 160);
    return false;
  }
  if (a.status.blind > g.t && Math.random() < 0.5) {
    pop(g, c.x, c.y - 50 * o.scale, "miss", DEF_BY_ID.lux.color, 16);
    return false;
  }
  let dmg = move.dmg * mult * (a.jugg ? JUGG_DMG : 1) * (rg?.dmg ?? 1);
  const crit = move.crit != null && Math.random() < move.crit;
  if (crit) dmg *= 1.8;
  dmg = Math.round(dmg * 10) / 10;
  sfx(g, { k: "hit", power, move: move.id, kind: move.kind, anim: move.anim, dmg, crit });
  o.flash = 0.1;
  if (power !== "shift") o.lastHitBy = power;
  const weight = o.jugg ? 0.5 : 1;
  if (move.kb) o.vx = dir * move.kb * weight * (rg?.kb ?? 1);
  if (move.lift) { o.vy = move.lift * weight; o.onGround = false; }
  if (rg && a.def.id === "pyro") o.status.burn = Math.max(o.status.burn, g.t + 1.2 * (o.jugg ? 0.33 : 1));
  // raging Electro juggles: an air strike pops them up and he follows for the next one
  if (rg && a.def.id === "electro" && move.kind === "melee" && !a.onGround && !o.jugg) {
    o.vy = Math.min(o.vy, -430);
    o.onGround = false;
    a.vy = -360;
    a.airDashed = false;
    a.comboT = 0.8;
    a.think = 0;
  }
  // a juggernaut shakes off effects in a third of the time
  if (move.status) o.status[move.status] = Math.max(o.status[move.status], g.t + (move.statusDur ?? 1) * (o.jugg ? 0.33 : 1));
  const heavy = dmg >= 9 || move.lift != null || move.status === "stun" || move.status === "freeze";
  // a juggernaut shrugs off flinches: only a stun or freeze breaks its attack
  const breaks = o.jugg ? move.status === "stun" || move.status === "freeze" : heavy;
  if (breaks && o.act) o.act = null;
  o.kneelT = 0;
  if (breaks) o.dashT = 0;
  o.hurtT = Math.max(o.hurtT, o.jugg ? 0.06 : heavy ? 0.32 : 0.16);
  emitMove(g, move, power, c.x - dir * 8, c.y, crit ? 18 : 10, crit ? 380 : 260);
  if (LOOKS[move.id]?.hit) moveFx(g, move.id, true, c.x - dir * 6, c.y, dir, o.scale, 0.4);
  // white impact star
  g.particles.push({ x: c.x - dir * 6, y: c.y, vx: 0, vy: 0, life: 0.14, max: 0.14, size: 18 + dmg, color: "white", shape: "ring", grav: 0, add: true, rot: 0 });
  pop(g, c.x + rand(-10, 10), c.y - 56 * o.scale, crit ? `${Math.ceil(dmg)}!` : `${Math.ceil(dmg)}`, crit ? DEF_BY_ID.umbra.glow : "white", crit ? 24 : 18, 0.7);
  g.shake = Math.max(g.shake, Math.min(12, dmg * 0.55));
  if (dmg >= 10) g.hitstop = Math.max(g.hitstop, 0.05);
  if (move.heal) a.hp = Math.min(a.maxHp, a.hp + move.heal);
  hurt(g, o, dmg, a);
  return true;
}

/** Where two beams cross, if they do. */
function segHit(a: Beam, b: Beam) {
  const ax = Math.cos(a.ang) * a.len, ay = Math.sin(a.ang) * a.len;
  const bx = Math.cos(b.ang) * b.len, by = Math.sin(b.ang) * b.len;
  const den = ax * by - ay * bx;
  if (Math.abs(den) < 1e-3) {
    // nearly parallel: clash if they point at each other along the same line
    const off = Math.abs((b.x - a.x) * Math.sin(a.ang) - (b.y - a.y) * Math.cos(a.ang));
    const facing = Math.cos(a.ang) * Math.cos(b.ang) < 0;
    const gap = Math.hypot(b.x - a.x, b.y - a.y);
    if (facing && off < 40 && gap < a.len + b.len) {
      const t = a.len / (a.len + b.len);
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    return null;
  }
  const t = ((b.x - a.x) * by - (b.y - a.y) * bx) / den;
  const u = ((b.x - a.x) * ay - (b.y - a.y) * ax) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: a.x + ax * t, y: a.y + ay * t };
}

function segDist(px: number, py: number, b: Beam) {
  const cx = Math.cos(b.ang), cy = Math.sin(b.ang);
  const along = clamp((px - b.x) * cx + (py - b.y) * cy, 0, b.len);
  return Math.hypot(px - (b.x + cx * along), py - (b.y + cy * along));
}

function inBox(o: Fighter, x0: number, x1: number, yTop: number, yBot: number) {
  const top = o.y - bodyH(o);
  return o.x + 12 * o.scale > Math.min(x0, x1) && o.x - 12 * o.scale < Math.max(x0, x1) && o.y > yTop && top < yBot;
}

function fire(g: Game, f: Fighter, act: Action) {
  const m = act.move;
  const power = act.power;
  const def = DEF_BY_ID[power];
  const target = g.fighters[act.target];
  const h = hand(f);
  const s = f.scale;
  const enemies = g.fighters.filter((o) => o.alive && foe(f, o));
  if (m.kind !== "blink") castFx(g, f, m);
  sfx(g, { k: "cast", power, move: m.id, kind: m.kind, anim: m.anim });
  switch (m.kind) {
    case "melee": {
      const x1 = f.x + f.facing * (m.range + 14) * s;
      for (const o of enemies) {
        const oa = o.act;
        if (!oa || oa.move.kind !== "melee" || o.facing !== -f.facing) continue;
        const reach = Math.max(m.range * s, oa.move.range * o.scale) + 24;
        if (Math.abs(o.x - f.x) > reach || Math.abs(o.y - f.y) > 50 * s) continue;
        const sinceStrike = oa.t - oa.move.wind;
        if ((oa.fired && sinceStrike < 0.15) || (!oa.fired && -sinceStrike < 0.11)) {
          m1Clash(g, f, o);
          return;
        }
      }
      for (const o of enemies) if (inBox(o, f.x, x1, f.y - 110 * s, f.y) && hit(g, f, o, m, power, f.facing)) act.landed = true;
      emitMove(g, m, power, h.x + f.facing * 14, h.y, 10, 240);
      if (m.range > 100 && !LOOKS[m.id]) {
        g.beams.push({ owner: f.key, power, x: h.x, y: h.y, ang: f.facing > 0 ? 0 : Math.PI, len: m.range * s, width: 10, life: 0.16, max: 0.16, jag: false });
      }
      break;
    }
    case "projectile": {
      const n = m.count ?? 1;
      const tc = target ? center(target) : { x: f.x + f.facing * 300, y: h.y };
      for (let i = 0; i < n; i++) {
        const spread = n > 1 ? ((i / (n - 1)) - 0.5) * (m.spread ?? 0) * 2 : 0;
        let vx: number, vy: number, grav = 0;
        const sp = m.speed ?? 500;
        if (m.arc) {
          grav = 1100;
          const dx = tc.x - h.x;
          const T = clamp(Math.abs(dx) / (sp * 0.8), 0.35, 1.4);
          vx = dx / T;
          vy = (tc.y - h.y - 0.5 * grav * T * T) / T + spread * 300;
        } else {
          const raw = Math.atan2(tc.y - h.y, tc.x - h.x);
          const base = f.facing > 0 ? 0 : Math.PI;
          let d = raw - base;
          d = Math.atan2(Math.sin(d), Math.cos(d));
          const lim = f.jugg || target?.jugg ? 0.85 : 0.45;
          const ang = base + clamp(d, -lim, lim) + spread;
          vx = Math.cos(ang) * sp; vy = Math.sin(ang) * sp;
        }
        if (m.ground) {
          // a wall of water rolls along the floor from the feet
          const r = (m.size ?? 10) * s;
          g.projectiles.push({ x: f.x + f.facing * 30 * s, y: GROUND - r, vx: f.facing * sp, vy: 0, r, grav: 0, rot: 0, owner: f.key, power, move: m, life: 4, hits: [], shape: m.shape ?? "wave" });
          continue;
        }
        g.projectiles.push({ x: h.x, y: h.y, vx, vy, r: (m.size ?? 10) * s, grav, rot: 0, owner: f.key, power, move: m, life: 3, hits: [], shape: m.shape ?? "orb" });
      }
      emitMove(g, m, power, h.x, h.y, 10, 200);
      break;
    }
    case "beam": {
      const tc = target ? center(target) : { x: h.x + f.facing * 100, y: h.y };
      const base = f.facing > 0 ? 0 : Math.PI;
      let d = Math.atan2(tc.y - h.y, tc.x - h.x) - base;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      const lim = f.jugg || target?.jugg ? 0.8 : 0.35;
      const ang = base + clamp(d, -lim, lim);
      const len = m.range * 1.1;
      const nb: Beam = { owner: f.key, power, x: h.x, y: h.y, ang, len, width: power === "magneto" ? 14 : 22, life: Math.max(m.act, 0.2) + 0.15, max: Math.max(m.act, 0.2) + 0.15, jag: power === "electro", clash: true, look: m.id };
      for (const ob of g.beams) {
        if (!ob.clash || !foe(f, g.fighters[ob.owner]) || ob.life < 0.05) continue;
        const pt = segHit(nb, ob);
        if (!pt) continue;
        nb.len = Math.hypot(pt.x - nb.x, pt.y - nb.y);
        ob.len = Math.hypot(pt.x - ob.x, pt.y - ob.y);
        ob.life = Math.min(ob.life, 0.25);
        nb.life = nb.max = 0.3;
        g.beams.push(nb);
        shockwave(g, pt.x, pt.y, power, ob.power, 200);
        return;
      }
      g.beams.push(nb);
      const cx = Math.cos(ang), cy = Math.sin(ang);
      for (const o of enemies) {
        const c = center(o);
        const px = c.x - h.x, py = c.y - h.y;
        const along = px * cx + py * cy;
        const perp = Math.abs(-px * cy + py * cx);
        if (along > 0 && along < len && perp < 40 * o.scale) hit(g, f, o, m, power, f.facing);
      }
      g.shake = Math.max(g.shake, 5);
      break;
    }
    case "burst": {
      const c = center(f);
      const r = (m.radius ?? 120) * s;
      const everyone = m.world || m.harvest || m.eclipse;
      for (const o of enemies) {
        const oc = center(o);
        if (!everyone && Math.hypot(oc.x - c.x, (oc.y - c.y) * 0.8) >= r) continue;
        if (!hit(g, f, o, m, power, Math.sign(o.x - f.x) || f.facing) || !m.harvest) continue;
        // a soul is torn out of each enemy hit and streams back to the reaper
        for (let i = 0; i < 9; i++) {
          const life = rand(0.45, 0.7);
          const sx = oc.x + rand(-10, 10), sy = oc.y + rand(-16, 10);
          g.particles.push({ x: sx, y: sy, vx: (c.x - sx) / life, vy: (c.y - sy) / life - rand(40, 120), life, max: life, size: rand(5, 9), color: i % 3 ? f.def.glow : "white", shape: "dot", grav: 0, add: true, rot: 0 });
        }
        moveFx(g, m.id, true, oc.x, oc.y, f.facing, o.scale, 0.6);
      }
      if (m.harvest && m.heal) pop(g, c.x, c.y - 70 * s, "SOUL HARVEST", f.def.glow, 20, 1);
      if (m.eclipse) {
        g.eclipseUntil = g.t + ECLIPSE_TIME;
        g.flash = Math.max(g.flash, 0.2);
        pop(g, W / 2, 150, m.name.toUpperCase(), LOOKS[m.id]?.b ?? def.glow, 44, 1.6);
        sfx(g, { k: "rage", power });
      }
      if (m.world) {
        // every enemy on the field is caught at once; the arena goes still
        g.stopUntil = g.t + (m.statusDur ?? 1.5);
        g.flash = Math.max(g.flash, 0.25);
        pop(g, W / 2, 150, m.name.toUpperCase(), LOOKS[m.id]?.b ?? def.glow, 44, 1.6);
        sfx(g, { k: "rage", power });
      }
      if (m.heal && !m.harvest) { f.hp = Math.min(f.maxHp, f.hp + m.heal); pop(g, c.x, c.y - 70 * s, `+${m.heal}`, DEF_BY_ID.vita.glow, 18); }
      if (!LOOKS[m.id]) {
        g.particles.push({ x: c.x, y: c.y, vx: 0, vy: 0, life: 0.45, max: 0.45, size: r, color: def.glow, shape: "ring", grav: 0, add: true, rot: 1 });
        g.particles.push({ x: c.x, y: c.y, vx: 0, vy: 0, life: 0.35, max: 0.35, size: r * 0.7, color: def.color, shape: "ring", grav: 0, add: true, rot: 1 });
      }
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        emitMove(g, m, power, c.x + Math.cos(a) * 20, c.y + Math.sin(a) * 20, 1, 1, { vx: Math.cos(a) * r * 2.6, vy: Math.sin(a) * r * 2.2, grav: 0 });
      }
      g.shake = Math.max(g.shake, 9);
      break;
    }
    case "dash":
      break; // handled while active
    case "eruption": {
      const tx = target ? clamp(target.x + target.vx * 0.15, 30, W - 30) : f.x + f.facing * 200;
      const n = m.count ?? 1;
      if (n > 1) {
        // a fault line: the ground splits from the caster's feet to past the target, one pillar after another
        const dir = Math.sign(tx - f.x) || f.facing;
        const step = Math.max(70, (Math.abs(tx - f.x) + 60) / n);
        for (let i = 0; i < n; i++) {
          const x = f.x + dir * (60 * s + step * i);
          if (x < 20 || x > W - 20) break;
          g.eruptions.push({ owner: f.key, power, move: m, x, t: -i * 0.13, fired: false });
        }
        break;
      }
      g.eruptions.push({ owner: f.key, power, move: m, x: tx, t: 0, fired: false });
      break;
    }
    case "rain": {
      const tx = target ? target.x : f.x + f.facing * 200;
      const n = m.count ?? 3;
      for (let i = 0; i < n; i++) {
        const x = clamp(tx + rand(-(m.radius ?? 80), m.radius ?? 80) * s, 20, W - 20);
        g.projectiles.push({
          x: x - 60, y: -30 - i * 70, vx: 60 + rand(-20, 20), vy: 520, r: (m.size ?? 9) * s, grav: 600, rot: 0,
          owner: f.key, power, move: m, life: 3, hits: [], shape: m.shape ?? (power === "lux" ? "shard" : "orb"),
        });
      }
      emitMove(g, m, power, h.x, h.y - 30 * s, 12, 200);
      if (LOOKS[m.id]?.cast === "sky") moveFx(g, m.id, false, clamp(tx, 120, W - 120), 70, f.facing, s, LOOKS[m.id].castLife ?? 1);
      break;
    }
    case "blink": {
      if (!target) break;
      const c0 = center(f);
      emitMove(g, m, power, c0.x, c0.y, 20, 260);
      castFx(g, f, m);
      const side = Math.sign(target.x - f.x) || 1;
      f.x = clamp(target.x + side * 52 * s, 24, W - 24);
      f.y = target.y;
      f.onGround = target.onGround;
      f.vy = 0;
      f.facing = side > 0 ? -1 : 1;
      const c1 = center(f);
      emitMove(g, m, power, c1.x, c1.y, 20, 260);
      castFx(g, f, m);
      for (const o of enemies) if (inBox(o, f.x, f.x + f.facing * 90 * s, f.y - 110 * s, f.y + 10)) hit(g, f, o, m, power, f.facing);
      break;
    }
    case "heal": {
      const c = center(f);
      const amt = m.heal ?? 10;
      f.hp = Math.min(f.maxHp, f.hp + amt);
      pop(g, c.x, c.y - 70 * s, `+${amt}`, def.glow, 22);
      for (let i = 0; i < 24; i++) emitMove(g, m, power, c.x + rand(-30, 30) * s, f.y - rand(0, 100) * s, 1, 40, { vy: -rand(60, 160), grav: 0 });
      if (!LOOKS[m.id]) g.particles.push({ x: c.x, y: c.y, vx: 0, vy: 0, life: 0.5, max: 0.5, size: 70 * s, color: def.glow, shape: "ring", grav: 0, add: true, rot: 1 });
      break;
    }
    case "zone": {
      const zx = m.range <= 200 || !target ? f.x : target.x;
      const dur = m.dur ?? 3;
      g.zones.push({ owner: f.key, power, move: m, x: zx, life: dur, max: dur });
      break;
    }
    case "pull": {
      if (!target) break;
      const tc = center(target);
      const ang = Math.atan2(tc.y - h.y, tc.x - h.x);
      g.beams.push({ owner: f.key, power, x: h.x, y: h.y, ang, len: Math.hypot(tc.x - h.x, tc.y - h.y), width: 8, life: 0.3, max: 0.3, jag: power === "magneto", look: m.id });
      if (hit(g, f, target, m, power, Math.sign(target.x - f.x) || 1)) {
        const dx = f.x - target.x;
        target.vx = Math.sign(dx) * Math.min(1000, Math.abs(dx) * 2.4);
        target.vy = -260;
        target.onGround = false;
      }
      break;
    }
    case "mimic":
      break;
    case "warp":
      warpReality(g, f, m);
      break;
    case "annihilate": {
      if (!target) break;
      const tc = center(target);
      g.annis.push({ owner: f.key, power, move: m, x: target.x + target.vx * 0.2, y: tc.y, t: 0, done: false });
      break;
    }
  }
}

/** The Riftmaker tears reality: a white flash, everyone lands somewhere new, and the fight goes on in another realm. */
function warpReality(g: Game, f: Fighter, m: Move) {
  const opts = REALMS.filter((r) => r !== g.realm?.id);
  const id = pick(opts);
  if (g.realm) g.realmOut = { id: g.realm.id, t: 0 };
  g.realm = { id, t: 0, left: REALM_TIME, by: f.key, heat: 0 };
  g.flash = 0.55;
  g.shake = Math.max(g.shake, 16);
  g.hitstop = Math.max(g.hitstop, 0.12);
  // everyone is thrown to a new spot in the new place
  const alive = g.fighters.filter((o) => o.alive);
  const spots = alive.map((_, i) => 90 + ((W - 180) * (i + 0.5)) / alive.length).sort(() => Math.random() - 0.5);
  alive.forEach((o, i) => {
    const c0 = center(o);
    emitMove(g, m, m.power ?? f.def.id, c0.x, c0.y, 14, 300);
    o.x = spots[i];
    o.vx = 0;
    if (!o.jugg) { o.y = GROUND - 140; o.vy = -120; o.onGround = false; }
    o.act = o === f ? o.act : null;
    o.dashT = 0;
    o.facing = o.x < W / 2 ? 1 : -1;
    const c1 = center(o);
    emitMove(g, m, m.power ?? f.def.id, c1.x, c1.y, 14, 300);
  });
  pop(g, W / 2, 130, "REALITY WARP", LOOKS[m.id]?.b ?? f.def.glow, 40, 1.6);
  pop(g, W / 2, 180, REALM_NAME[id], "white", 30, 1.8);
  sfx(g, { k: "rage", power: m.power ?? f.def.id });
}

/** Realm upkeep: the desert's sun burns whoever is not the one who brought everyone there; the realm wears off after a while. */
function stepRealm(g: Game, dt: number) {
  if (g.realmOut) {
    g.realmOut.t += dt;
    if (g.realmOut.t > REALM_FADE) g.realmOut = null;
  }
  const rl = g.realm;
  gravK = rl ? REALM_GRAV[rl.id] : 1;
  if (!rl) return;
  rl.t += dt;
  rl.left -= dt;
  const owner = g.fighters[rl.by];
  if (rl.left <= 0 || !owner?.alive) {
    g.realmOut = { id: rl.id, t: 0 };
    g.realm = null;
    gravK = 1;
    g.flash = Math.max(g.flash, 0.35);
    pop(g, W / 2, 150, "REALITY RESTORED", "white", 30, 1.4);
    return;
  }
  if (rl.id === "desert") {
    rl.heat += dt;
    if (rl.heat >= 1.6) {
      rl.heat = 0;
      for (const o of g.fighters) if (o.alive && foe(owner, o)) o.status.burn = Math.max(o.status.burn, g.t + 0.6 * (o.jugg ? 0.33 : 1));
    }
    if (Math.random() < dt * 30 && g.particles.length < 900) {
      const y = rand(GROUND - 260, GROUND - 4);
      g.particles.push({ x: -10, y, vx: rand(260, 520), vy: rand(-20, 20), life: 2.2, max: 2.2, size: rand(2, 4), color: Math.random() < 0.5 ? "hsl(36 70% 72%)" : "hsl(28 60% 60%)", shape: "dust", grav: 0, add: false, rot: 0 });
    }
  } else if (Math.random() < dt * 6 && g.particles.length < 900) {
    // moon dust drifts up off the surface
    g.particles.push({ x: rand(0, W), y: GROUND - 2, vx: rand(-10, 10), vy: -rand(10, 30), life: 2.5, max: 2.5, size: rand(2, 4), color: "hsl(220 10% 82%)", shape: "dot", grav: -2, add: false, rot: 0 });
  }
}

/** Matter and antimatter orbs close in on a spot from both sides, then cancel out in a blast. */
function stepAnnis(g: Game, dt: number) {
  for (const a of g.annis) {
    a.t += dt;
    if (a.done || a.t < ANNI_TIME) continue;
    a.done = true;
    const owner = g.fighters[a.owner];
    const r = (a.move.radius ?? 70) * (owner?.scale ?? 1);
    const prev = paint;
    paint = null;
    for (const o of g.fighters) {
      if (!o.alive || !owner || !foe(owner, o)) continue;
      const c = center(o);
      if (Math.hypot(c.x - a.x, (c.y - a.y) * 0.8) < r + 14 * o.scale) hit(g, owner, o, a.move, a.power, Math.sign(o.x - a.x) || 1);
    }
    for (let i = 0; i < 24; i++) {
      const an = (i / 24) * Math.PI * 2;
      g.particles.push({ x: a.x, y: a.y, vx: Math.cos(an) * 700, vy: Math.sin(an) * 700, life: 0.35, max: 0.35, size: 5, color: i % 2 ? "white" : "hsl(268 60% 30%)", shape: "spark", grav: 0, add: i % 2 === 1, rot: 0 });
    }
    paint = prev;
    pop(g, a.x, a.y - 70, "ANNIHILATED", "white", 22, 0.9);
    sfx(g, { k: "erupt", power: a.power, move: a.move.id });
    g.shake = Math.max(g.shake, 14);
    g.hitstop = Math.max(g.hitstop, 0.08);
  }
  g.annis = g.annis.filter((a) => a.t < ANNI_TIME + 0.35);
}

/** Picks who to fight: close, hurt, open to a punish, or whoever hit last. Sticks with a target unless a better one shows up. */
function chooseTarget(g: Game, f: Fighter) {
  let best: Fighter | null = null;
  let bs = Infinity;
  for (const o of g.fighters) {
    if (!o.alive || !foe(f, o)) continue;
    let sc = Math.abs(o.x - f.x) + Math.abs(o.y - f.y) * 0.5;
    sc -= (1 - o.hp / o.maxHp) * 160 * f.aggro;
    if (f.lastAttacker === o.key) sc -= 110;
    if (f.targetKey === o.key) sc -= 90;
    if (isOpen(g, o)) sc -= 140;
    if (sc < bs) { bs = sc; best = o; }
  }
  f.targetKey = best?.key ?? null;
  return best;
}

/** Can't defend right now: catching breath, stunned, frozen, reeling or stuck in recovery. */
function isOpen(g: Game, o: Fighter) {
  if (o.kneelT > 0 || o.clashAir || o.status.stun > g.t || o.status.freeze > g.t || o.hurtT > 0.1) return true;
  const a = o.act;
  return !!a && a.fired && a.t > a.move.wind + a.move.act;
}

const reachOf = (m: Move, s: number) => m.range * (m.range < 200 ? s : 1);

function usableMoves(g: Game, f: Fighter, target: Fighter) {
  const adx = Math.abs(target.x - f.x);
  const s = f.scale;
  return f.def.moves.filter((m) =>
    f.cds[m.id] <= 0 &&
    adx <= reachOf(m, s) + 10 &&
    adx >= (m.minRange ?? 0) &&
    Math.abs(target.y - f.y) < (m.kind === "melee" ? 70 * s : 400) &&
    (m.kind !== "heal" || f.hp / f.maxHp < (m.below ?? 0.6)) &&
    (m.kind !== "warp" || !g.realm || g.realm.left < 3),
  );
}

/** How good a move is right now, instead of a coin flip. */
function scoreMove(g: Game, f: Fighter, m: Move, target: Fighter) {
  const s = f.scale;
  let sc = m.dmg * (m.count ?? 1) * (m.kind === "zone" ? (m.dur ?? 3) * 0.6 : 1);
  if (m.status && target.status[m.status] <= g.t) sc += 6;
  if (m.kind === "burst") {
    let n = 0;
    const c = center(f);
    for (const o of g.fighters) if (o.alive && foe(f, o) && Math.hypot(center(o).x - c.x, center(o).y - c.y) < (m.radius ?? 120) * s) n++;
    sc += n === 0 ? -20 : 6 * (n - 1);
  }
  if (target.hp <= m.dmg * 1.2) sc += 18;
  if (isOpen(g, target) && (m.kind === "melee" || m.kind === "blink" || m.kind === "dash")) sc += 10;
  if (!target.onGround && (m.kind === "eruption" || m.kind === "zone")) sc -= target.jugg ? 14 : 8;
  if (m.kind === "heal") sc = 34 * (1 - f.hp / f.maxHp);
  if (m.kind === "mimic") sc = f.lastHitBy ? 12 : 5;
  if (m.kind === "warp") sc = 40;
  if (m.world) sc = g.fighters.some((o) => o.alive && foe(f, o) && o.status.freeze > g.t) ? -10 : 32;
  if (m.harvest) sc = 14 + 9 * g.fighters.filter((o) => o.alive && foe(f, o)).length + 20 * (1 - f.hp / f.maxHp);
  if (m.eclipse) sc = g.eclipseUntil > g.t ? -10 : 30;
  if (m.kind === "annihilate") sc += 8;
  if (f.comboT > 0 && m.kind === "melee") sc += 14;
  return sc + rand(0, 5);
}

function bestMove(g: Game, f: Fighter, target: Fighter, only?: (m: Move) => boolean) {
  let best: Move | null = null;
  let bs = -Infinity;
  for (const m of usableMoves(g, f, target)) {
    if (only && !only(m)) continue;
    const sc = scoreMove(g, f, m, target);
    if (sc > bs) { bs = sc; best = m; }
  }
  return best;
}

function startMove(g: Game, f: Fighter, move: Move, target: Fighter) {
  let m = move;
  let power: Power = move.power ?? f.def.id;
  let label = move.name;
  if (move.kind === "mimic") {
    const src = f.lastHitBy ?? "psy";
    const opts = DEF_BY_ID[src].moves.filter((x) => x.kind !== "heal" && x.kind !== "mimic");
    m = pick(opts);
    power = src;
    label = `${move.name}: ${m.name}`;
    const c = center(f);
    moveFx(g, move.id, false, c.x, c.y, f.facing, f.scale, LOOKS[move.id]?.castLife ?? 0.6);
  }
  f.cds[move.id] = move.cd * (f.jugg ? JUGG_CD : 1) * (rageOf(f)?.cd ?? 1);
  f.act = { id: ++actId, move: m, power, t: 0, fired: false, target: target.key, hits: [], label, landed: false };
  f.facing = target.x >= f.x ? 1 : -1;
  const showCall = g.duel || move.cd >= 3;
  if (showCall) pop(g, f.x, f.y - bodyH(f) - 34, label, DEF_BY_ID[power].glow, g.duel ? 20 : 16, 1.1);
}

/** Split-second defence: counter a strike, shoot down a shot, dash through or out, or jump. Returns true when it acted. */
function react(g: Game, f: Fighter, target: Fighter, dt: number) {
  const s = f.scale;
  const dashReady = f.dashCd <= 0;

  // an enemy is winding up a close strike at me
  for (const o of g.fighters) {
    const oa = o.act;
    if (!o.alive || !foe(f, o) || !oa || oa.fired || oa.move.kind !== "melee" || oa.id === f.reacted) continue;
    if (o.facing !== Math.sign(f.x - o.x) || Math.abs(o.x - f.x) > reachOf(oa.move, o.scale) + 40 * s || Math.abs(o.y - f.y) > 60 * s) continue;
    f.reacted = oa.id;
    const r = Math.random();
    const counter = bestMove(g, f, o, (m) => m.kind === "melee");
    if (counter && steady(f) && r < 0.3 + 0.45 * f.aggro) {
      startMove(g, f, counter, o); // meet it head on: a clash if the timing lines up
      return true;
    }
    if (dashReady && r < 0.85) {
      const away = Math.sign(f.x - o.x) || -f.facing;
      const cornered = (away < 0 && f.x < 90) || (away > 0 && f.x > W - 90);
      return startDash(g, f, cornered ? -away : away); // cornered: dash through them instead
    }
    if (f.onGround && r < 0.95) { jump(f, 0); return true; }
  }

  // incoming shots
  for (const p of g.projectiles) {
    if (!foe(f, g.fighters[p.owner]) || p.move.kind === "rain") continue;
    const toward = Math.sign(f.x - p.x) === Math.sign(p.vx);
    if (!toward) continue;
    const d = Math.abs(p.x - f.x);
    const inBand = p.y > f.y - bodyH(f) - 20 && p.y < f.y + 10;
    // shoot it down from range for a power clash
    if (d > 170 && d < 480 && steady(f) && Math.random() < dt * 3.2 * f.aggro) {
      const owner = g.fighters[p.owner];
      const tgt = owner?.alive ? owner : target;
      const shot = bestMove(g, f, tgt, (m) => m.kind === "projectile" || m.kind === "beam");
      if (shot) { startMove(g, f, shot, tgt); return true; }
    }
    if (d < 150 && inBand && Math.random() < dt * 10) {
      if (dashReady && Math.random() < 0.55) return startDash(g, f, Math.sign(p.x - f.x) || f.facing); // through it
      if (f.onGround) { jump(f, f.walkDir); return true; }
    }
  }

  // the ground is about to erupt under me
  for (const e of g.eruptions) {
    if (e.fired || !foe(f, g.fighters[e.owner]) || Math.abs(e.x - f.x) > (e.move.radius ?? 44) + 24) continue;
    if (Math.random() < dt * 12) {
      const away = Math.sign(f.x - e.x) || -f.facing;
      if (dashReady) return startDash(g, f, away);
      f.walkDir = away;
    }
  }
  return false;
}

/** Embers, sparks or wind coming off a raging fighter, and Aero's gusts. */
function rageAura(g: Game, f: Fighter, rg: Rage, dt: number) {
  const s = f.scale;
  if (Math.random() < dt * 26) emit(g, f.def.id, f.x + rand(-16, 16) * s, f.y - rand(10, 100) * s, 1, 50);
  if (f.def.id === "electro" && Math.random() < dt * 10) {
    g.particles.push({ x: f.x + rand(-26, 26) * s, y: f.y - rand(10, 100) * s, vx: rand(-120, 120), vy: rand(-120, 120), life: 0.18, max: 0.18, size: rand(5, 9) * s, color: rg.dark ?? INK, shape: "spark", grav: 0, add: false, rot: rand(0, 6) });
  }
  if (f.def.id !== "aero") return;
  f.rageT -= dt;
  if (f.rageT > 0 || g.t < 1 || g.ending > 0) return;
  f.rageT = rand(1.1, 1.6);
  // a gust: shoves every nearby enemy away and nicks them
  const c = center(f);
  const r = 250 * s;
  g.waves.push({ x: c.x, y: c.y, r, life: 0.45, max: 0.45, a: rg.b, b: rg.a });
  for (let i = 0; i < 18; i++) {
    const an = (i / 18) * Math.PI * 2;
    g.particles.push({ x: c.x, y: c.y, vx: Math.cos(an) * 700, vy: Math.sin(an) * 420, life: 0.3, max: 0.3, size: rand(4, 7), color: i % 2 ? rg.a : rg.b, shape: "spark", grav: 0, add: false, rot: an });
  }
  sfx(g, { k: "dash", air: true });
  for (const o of g.fighters) {
    if (!o.alive || !foe(f, o) || invuln(o)) continue;
    const oc = center(o);
    const d = Math.hypot(oc.x - c.x, (oc.y - c.y) * 0.8);
    if (d > r) continue;
    const k = 1 - d / r;
    const dir = Math.sign(o.x - f.x) || f.facing;
    const w = o.jugg ? 0.4 : 1;
    o.vx = dir * (300 + 420 * k) * w;
    if (o.onGround && !o.jugg) { o.vy = -160 - 160 * k; o.onGround = false; }
    hurt(g, o, 2 + 3 * k, f);
  }
}

/** Pushed to the limit: the match pauses for the transformation. */
function startRage(g: Game, f: Fighter) {
  f.rage = true;
  f.rageT = 0.6;
  f.act = null;
  f.dashT = 0;
  f.kneelT = 0;
  f.clashAir = false;
  f.hurtT = 0;
  f.vx = 0;
  g.cut = { key: f.key, t: 0, max: CUT_TIME };
  g.hitstop = 0;
  sfx(g, { k: "rage", power: f.def.id });
}

/** The cutscene plays: only the raging fighter and the effects move. */
function stepCut(g: Game, dt: number) {
  const cut = g.cut!;
  cut.t += dt;
  const f = g.fighters[cut.key];
  const rg = rageOf(f);
  const k = cut.t / cut.max;
  if (rg) {
    paint = rg;
    const c = center(f);
    const s = f.scale;
    // power gathers in, then bursts off the body
    const n = k < 0.75 ? 3 : 1;
    for (let i = 0; i < n && Math.random() < dt * 60; i++) {
      const an = rand(0, Math.PI * 2), d = rand(120, 220) * s;
      g.particles.push({ x: c.x + Math.cos(an) * d, y: c.y + Math.sin(an) * d * 0.8, vx: -Math.cos(an) * d * 3, vy: -Math.sin(an) * d * 2.4, life: 0.32, max: 0.32, size: rand(3, 7), color: rageColor(rg), shape: f.def.id === "aero" ? "spark" : FX[f.def.id].shape, grav: 0, add: !rg.dark, rot: an });
    }
    if (Math.random() < dt * 30) emit(g, f.def.id, f.x + rand(-20, 20) * s, f.y - rand(0, 110) * s, 1, 90);
    if (k > 0.72 && !f.ghosts.length) f.ghosts.push({ x: f.x, y: f.y, pose: { ...f.pose }, face: f.facing, life: 0.4 });
    smoothPose(f, k < 0.62 ? { ...RAGE_POSE, t: RAGE_POSE.t + Math.sin(cut.t * 30) * 0.03 } : ROAR_POSE, dt, k < 0.62 ? 10 : 26);
    paint = null;
  }
  g.shake = Math.max(g.shake, k > 0.62 ? 6 : 2);
  for (const gh of f.ghosts) gh.life -= dt;
  f.ghosts = f.ghosts.filter((gh) => gh.life > 0);
  tickBits(g, dt);
  if (cut.t >= cut.max) {
    g.cut = null;
    if (rg) rageBurst(g, f, rg);
  }
}

/** The cutscene ends in a blast that throws nearby enemies back. */
function rageBurst(g: Game, f: Fighter, rg: Rage) {
  const c = center(f);
  const r = 220 * f.scale;
  paint = rg;
  g.waves.push({ x: c.x, y: c.y, r: r * 1.3, life: 0.6, max: 0.6, a: rg.b, b: rg.a });
  emit(g, f.def.id, c.x, c.y, 40, 560);
  paint = null;
  for (const o of g.fighters) {
    if (!o.alive || !foe(f, o)) continue;
    const d = Math.hypot(center(o).x - c.x, (center(o).y - c.y) * 0.8);
    if (d > r) continue;
    const dir = Math.sign(o.x - f.x) || f.facing;
    o.vx = dir * (o.jugg ? 220 : 480);
    if (!o.jugg) { o.vy = -260; o.onGround = false; }
    o.hurtT = Math.max(o.hurtT, 0.3);
    o.act = null;
  }
  f.iframeT = 0.5;
  sfx(g, { k: "clash" });
  g.shake = Math.max(g.shake, 16);
}

// ---------- entrances ----------
/** Progress 0..1 of a fighter's entrance (below 0: not started; 1 once the entrance phase is over). */
const introU = (g: Game, f: Fighter) => (g.intro ? (g.intro.t - f.spawnAt) / INTRO_LEN : 1);
/** Still on the way in: no health bar or team ring yet. */
const arriving = (g: Game, f: Fighter) => !!g.intro && introU(g, f) < INTRO_ARRIVED;

function introBurst(g: Game, f: Fighter, b: IntroBurst, n: number) {
  const s = f.scale;
  const ox = f.x, oy = b.from === "feet" ? f.y : b.from === "body" ? f.y - 55 * s : rand(-10, 40);
  const spread = (b.spread ?? 0) * s;
  for (let i = 0; i < n && g.particles.length < 900; i++) {
    const life = b.life ?? rand(0.4, 0.8);
    let x = ox + (spread && b.dir !== "in" ? rand(-spread, spread) : 0), y = oy, vx: number, vy: number;
    if (b.dir === "in") {
      // start on a ring and close on the body, arriving as the particle fades (drag is 0.15 per second)
      const a = rand(0, Math.PI * 2);
      const r = spread * rand(0.8, 1.1);
      x = ox + Math.cos(a) * r; y = oy + Math.sin(a) * r * 0.8;
      const v = (r * Math.log(1 / 0.15)) / (1 - Math.pow(0.15, life));
      vx = -Math.cos(a) * v; vy = -Math.sin(a) * v * 0.8;
    } else {
      // flat: along the floor either way, tipped slightly upwards
      const a = b.dir === "up" ? -Math.PI / 2 + rand(-0.55, 0.55) : b.dir === "flat" ? (Math.random() < 0.5 ? Math.PI + rand(0, 0.3) : -rand(0, 0.3)) : rand(0, Math.PI * 2);
      const sp = rand(b.spd * 0.35, b.spd);
      vx = Math.cos(a) * sp; vy = Math.sin(a) * sp;
    }
    const [lo, hi] = b.size ?? [3, 7];
    g.particles.push({ x, y, vx, vy, life, max: life, size: rand(lo, hi) * Math.max(0.8, s), color: Math.random() < 0.5 ? b.a : b.b, shape: b.shape, grav: b.grav, add: b.add, rot: rand(0, 6) });
  }
}

/** Every fighter plays its own entrance; nothing else moves until the last one has arrived. */
function stepIntro(g: Game, dt: number) {
  const it = g.intro!;
  const prev = it.t;
  it.t += dt;
  for (const f of g.fighters) {
    const sp = INTROS[f.def.id];
    const u0 = (prev - f.spawnAt) / INTRO_LEN, u1 = (it.t - f.spawnAt) / INTRO_LEN;
    if (u1 < 0) continue;
    if (u0 >= 1) { smoothPose(f, STANCE, dt, 8); continue; }
    const crossed = (at: number) => u0 <= at && u1 > at;
    smoothPose(f, INTRO_POSES[sp.body(clamp(u1, 0, 1), f.scale).pose], dt, 14);
    for (const b of sp.bursts) if (crossed(b.at)) introBurst(g, f, b, b.n);
    const tr = sp.trickle;
    if (tr && u1 < tr.until && Math.random() < dt * tr.rate) introBurst(g, f, { ...tr, at: 0, n: 1 }, 1);
    if (crossed(sp.hit)) {
      sfx(g, { k: "intro", power: f.def.id });
      g.shake = Math.max(g.shake, sp.shake * (g.duel ? 1 : 0.6));
      if (sp.wave) g.waves.push({ x: f.x, y: f.y - 30 * f.scale, r: 120 * f.scale, life: 0.5, max: 0.5, a: sp.wave[0], b: sp.wave[1] });
    }
  }
  tickBits(g, dt);
  if (it.t >= it.max) {
    g.intro = null;
    for (const f of g.fighters) f.pose = { ...STANCE };
  }
}

function jump(f: Fighter, dir: number) {
  f.vy = f.jugg ? -420 : -760;
  f.vx += dir * 120;
  f.onGround = false;
}

function updateFighter(g: Game, f: Fighter, dt: number) {
  paint = rageOf(f);
  try {
    tickFighter(g, f, dt);
  } finally {
    paint = null;
  }
}

function tickFighter(g: Game, f: Fighter, dt: number) {
  const s = f.scale;
  const rg = rageOf(f);
  f.flash = Math.max(0, f.flash - dt);
  f.hpTrail += (f.hp - f.hpTrail) * Math.min(1, dt * 2.2);
  for (const gh of f.ghosts) gh.life -= dt;
  if (f.ghosts.length) f.ghosts = f.ghosts.filter((gh) => gh.life > 0);

  if (!f.alive) {
    f.koT += dt;
    f.dashT = 0; f.kneelT = 0; f.clashAir = false;
    physics(f, dt);
    smoothPose(f, KO, dt, 9);
    return;
  }

  // status damage
  if (f.status.burn > g.t) {
    hurt(g, f, 5 * dt, null);
    if (Math.random() < dt * 18) emit(g, "pyro", f.x + rand(-12, 12) * s, f.y - rand(10, 90) * s, 1, 30);
  }
  if (f.status.poison > g.t) {
    hurt(g, f, 4.5 * dt, null);
    if (Math.random() < dt * 8) emit(g, "toxi", f.x + rand(-12, 12) * s, f.y - rand(20, 90) * s, 1, 20);
  }
  if (f.def.id === "vita") f.hp = Math.min(f.maxHp, f.hp + 1.8 * dt);
  if (!f.alive) return;

  const frozen = f.status.freeze > g.t;
  const stunned = f.status.stun > g.t;
  const slowed = f.status.slow > g.t;
  if (slowed && Math.random() < dt * 6) emit(g, "cryo", f.x + rand(-12, 12) * s, f.y - rand(10, 90) * s, 1, 20);

  for (const k in f.cds) f.cds[k] -= dt;
  f.hurtT = Math.max(0, f.hurtT - dt);
  f.dashCd -= dt;
  f.iframeT -= dt;
  f.comboT -= dt;

  if (frozen) {
    f.act = null;
    f.dashT = 0;
    physics(f, dt);
    return; // pose holds
  }

  // catching breath on one knee after a clash
  if (f.kneelT > 0) {
    f.kneelT -= dt;
    if (Math.random() < dt * 3) {
      const hx = f.x + f.facing * 14 * s, hy = f.y - 62 * s;
      g.particles.push({ x: hx, y: hy, vx: f.facing * rand(30, 60), vy: -rand(20, 50), life: 0.6, max: 0.6, size: rand(3, 5) * s, color: "hsl(0 0% 100% / 0.85)", shape: "dot", grav: -40, add: false, rot: 0 });
    }
  }

  const target = chooseTarget(g, f);
  const intro = g.preview || g.t < 1 || g.ending > 0;
  const locked = f.clashAir || f.kneelT > 0 || stunned || f.hurtT > 0 || intro;
  f.walkDir = 0;

  if (f.dashT > 0) {
    // dashing: a quick burst of ground (or air) with a moment of invulnerability
    f.dashT -= dt;
    f.x += f.dashDir * ((DASH_DIST * s * (0.8 + f.def.speed / 450) * (rg ? Math.sqrt(rg.speed) : 1)) / DASH_TIME) * dt;
    if (!f.onGround) f.vy = 0;
    if (f.dashDir === f.facing && Math.random() < dt * 40) emit(g, f.def.id, f.x - f.facing * 14 * s, f.y - rand(20, 80) * s, 1, 40);
  } else if (f.act) {
    const a = f.act;
    const m = a.move;
    a.t += dt * (slowed ? 0.7 : 1) * (rg?.act ?? 1);
    if (!a.fired && a.t >= m.wind) {
      a.fired = true;
      fire(g, f, a);
    }
    if (f.act === a) {
      // charging glow at the hand
      if (!a.fired && Math.random() < dt * 40) {
        const h = hand(f);
        emitMove(g, m, a.power, h.x, h.y, 1, 60);
      }
      if (m.kind === "dash" && a.fired && a.t < m.wind + m.act) {
        const sp = ((m.dist ?? 240) * s) / m.act;
        f.x += f.facing * sp * dt;
        if (Math.random() < dt * 60) emitMove(g, m, a.power, f.x - f.facing * 10, f.y - rand(10, 90) * s, 1, 60);
        for (const o of g.fighters) {
          if (!o.alive || !foe(f, o) || a.hits.includes(o.key)) continue;
          if (Math.abs(o.x - f.x) < 34 * s && Math.abs(o.y - f.y) < 90 * s) {
            a.hits.push(o.key);
            hit(g, f, o, m, a.power, f.facing);
          }
        }
      }
      // a strike landed and knocked them back: dash-cancel the recovery to chase the combo
      if (m.kind === "melee" && a.landed && a.t >= m.wind + m.act && target && !intro) {
        a.landed = false;
        const gap = Math.abs(target.x - f.x);
        if (gap > 70 * s && gap < 300 && Math.random() < f.aggro * 0.75 && f.dashCd <= 0) {
          f.act = null;
          f.facing = target.x >= f.x ? 1 : -1;
          startDash(g, f, f.facing);
          f.comboT = 0.7;
          f.think = 0;
        }
      }
      if (f.act === a && a.t >= m.wind + m.act + m.rec) f.act = null;
    }
  } else if (!locked && target) {
    const dx = target.x - f.x;
    const adx = Math.abs(dx);
    f.facing = dx >= 0 ? 1 : -1;
    f.think -= dt;
    f.prefT -= dt;

    if (!react(g, f, target, dt)) {
      // choose a fighting distance: aggressive fighters like it close
      if (f.prefT <= 0 || (isOpen(g, target) && f.prefRange > 120)) {
        f.prefT = rand(1.2, 3);
        const close = isOpen(g, target) || Math.random() < f.aggro;
        const pool = f.def.moves.filter((m) => m.kind !== "heal" && m.kind !== "mimic" && (close ? reachOf(m, s) < 200 : reachOf(m, s) >= 200));
        const m = pool.length ? pick(pool) : pick(f.def.moves);
        f.prefRange = clamp(reachOf(m, s) * rand(0.55, 0.85), 50, 420);
      }
      if (f.think <= 0) {
        f.think = rand(0.08, 0.26) * (1.25 - f.aggro * 0.45);
        const m = bestMove(g, f, target);
        if (m && (steady(f) || Math.random() < 0.4 || (rg && f.def.id === "electro"))) startMove(g, f, m, target);
      }
      if (!f.act && f.dashT <= 0) {
        const low = f.hp / f.maxHp < 0.3;
        // dash in from far away, back off when crowded, flee when low
        if (steady(f) && f.dashCd <= 0 && adx > f.prefRange + 160 && Math.random() < dt * 2.2 * f.aggro) {
          startDash(g, f, f.facing);
        } else if (steady(f) && f.dashCd <= 0 && adx < 90 * s && (low || f.prefRange > 200) && Math.random() < dt * 2.5) {
          const cornered = (f.facing > 0 && f.x < 90) || (f.facing < 0 && f.x > W - 90);
          startDash(g, f, cornered ? f.facing : -f.facing);
        } else if (!f.onGround && !f.airDashed && adx > 180 && Math.random() < dt * 2 * f.aggro) {
          startDash(g, f, f.facing);
        }
      }
      if (!f.act && f.dashT <= 0) {
        if (f.walkDir === 0) {
          if (adx > f.prefRange + 20) f.walkDir = f.facing;
          else if (adx < Math.max(40 * s, f.prefRange - 90)) f.walkDir = -f.facing;
          else {
            // footsies: shuffle in and out at the edge of range
            const sh = Math.sin(g.t * 2.1 + f.key * 1.7);
            f.walkDir = sh > 0.55 ? f.facing : sh < -0.55 ? -f.facing : 0;
          }
        }
        // step out of an enemy field
        for (const z of g.zones) {
          if (foe(f, g.fighters[z.owner]) && Math.abs(z.x - f.x) < (z.move.radius ?? 100)) { f.walkDir = Math.sign(f.x - z.x) || -f.facing; break; }
        }
        const sp = f.def.speed * 1.5 * (slowed ? 0.55 : 1) * (f.walkDir === -f.facing ? 0.7 : 1) * (rg?.speed ?? 1);
        f.x += f.walkDir * sp * dt;
        if (f.walkDir) f.walk += dt * (sp / 14);
        if (f.onGround && Math.random() < dt * 0.15) jump(f, f.walkDir);
        // raging Electro takes the fight into the air
        if (rg && f.def.id === "electro" && f.onGround && adx < 230 && Math.random() < dt * 2.4) jump(f, f.facing);
      }
    }
  }

  if (rg) rageAura(g, f, rg, dt);

  // afterimages while dashing or rushing
  const rushing = f.dashT > 0 || (f.act?.move.kind === "dash" && f.act.fired && f.act.t < f.act.move.wind + f.act.move.act);
  if (rushing) {
    f.ghostT -= dt;
    if (f.ghostT <= 0) {
      f.ghostT = 0.028;
      f.ghosts.push({ x: f.x, y: f.y, pose: { ...f.pose }, face: f.facing, life: 0.22 });
    }
  }

  if (f.jugg) {
    const k = f.act?.move.kind;
    const close = !!target && Math.abs(target.x - f.x) < 150 * s;
    const meleeReady = f.def.moves.some((m) => m.kind === "melee" && f.cds[m.id] <= 0);
    const low = k === "melee" || k === "dash" || k === "blink" || (close && !f.act && meleeReady);
    f.hoverY = GROUND - (low ? HOVER_LOW : HOVER_HIGH) * s + Math.sin(g.t * 3 + f.key) * 7 * s;
    // knocked into the air by an M1 clash: no floor to land on, so catch breath on the wing
    if (f.clashAir && f.vy > -40) {
      f.clashAir = false;
      f.kneelT = KNEEL_TIME * 0.6;
      f.vx *= 0.3;
    }
    if (Math.random() < dt * 14) emit(g, f.def.id, f.x - f.facing * rand(20, 60) * s, f.y - rand(70, 120) * s, 1, 40);
  }

  const wasAir = !f.onGround;
  physics(f, dt);
  if (wasAir && f.onGround) {
    f.airDashed = false;
    if (f.clashAir) {
      // land from the clash and drop to one knee
      f.clashAir = false;
      f.kneelT = KNEEL_TIME;
      f.vx *= 0.2;
      for (let i = 0; i < 10; i++) {
        g.particles.push({ x: f.x + rand(-16, 16) * s, y: GROUND - 2, vx: rand(-160, 160), vy: -rand(30, 140), life: 0.45, max: 0.45, size: rand(4, 8) * s, color: "hsl(34 40% 82%)", shape: "dot", grav: 300, add: false, rot: 0 });
      }
    }
  }

  // pose
  let target_: Pose;
  let k = 18;
  if (f.clashAir) {
    target_ = CLASHED; k = 26;
  } else if (f.kneelT > 0) {
    const br = Math.sin(g.t * 6 + f.key);
    target_ = { ...KNEEL, t: KNEEL.t + br * 0.06, aF2: KNEEL.aF2 + br * 0.05 };
    k = 22;
  } else if (stunned) {
    target_ = { ...DAZED, t: DAZED.t + Math.sin(g.t * 6) * 0.08 };
  } else if (f.hurtT > 0) {
    target_ = HURT; k = 30;
  } else if (f.dashT > 0) {
    target_ = f.dashDir === f.facing ? DASH : BACKDASH; k = 45;
  } else if (f.act) {
    const a = f.act;
    const m = a.move;
    const anim = ANIMS[m.anim];
    const base = f.jugg ? FLY : f.onGround ? STANCE : AIR;
    if (a.t < m.wind) target_ = { ...base, ...anim.wind };
    else if (a.t < m.wind + m.act + m.rec * 0.5) { target_ = { ...base, ...anim.strike }; k = 40; }
    else target_ = base;
  } else if (f.jugg) {
    const sw = Math.sin(g.t * 5 + f.key);
    target_ = { ...FLY, t: FLY.t + (f.walkDir === f.facing ? 0.15 : 0), lF1: FLY.lF1 + sw * 0.12, lB1: FLY.lB1 - sw * 0.12, lF2: FLY.lF2 + sw * 0.1 };
  } else if (!f.onGround) {
    target_ = AIR;
  } else if (f.walkDir) {
    const p = f.walk;
    const back = f.walkDir !== f.facing ? -1 : 1;
    const lF1 = 0.08 + 0.55 * Math.sin(p) * back;
    const lB1 = 0.08 - 0.55 * Math.sin(p) * back;
    target_ = {
      ...STANCE,
      t: 0.2 + Math.abs(Math.sin(p)) * 0.04,
      lF1, lF2: lF1 - (0.15 + 0.5 * Math.max(0, Math.cos(p) * back)),
      lB1, lB2: lB1 - (0.15 + 0.5 * Math.max(0, -Math.cos(p) * back)),
      aB1: 0.35 - 0.4 * Math.sin(p) * back,
    };
    k = 26;
  } else {
    const b = Math.sin(g.t * 4 + f.key);
    target_ = { ...STANCE, t: STANCE.t + b * 0.03, aF2: STANCE.aF2 + b * 0.08, aB2: STANCE.aB2 - b * 0.06 };
  }
  smoothPose(f, target_, dt, k);
}

function physics(f: Fighter, dt: number) {
  if (f.jugg && f.alive) {
    f.onGround = false;
    f.vy += ((f.hoverY - f.y) * 5 - f.vy) * Math.min(1, dt * 6);
  } else if (!f.onGround) f.vy += GRAV * gravK * dt;
  f.x += f.vx * dt;
  f.y += f.vy * dt;
  if (f.y >= GROUND) {
    f.y = GROUND;
    if (!f.onGround && f.vy > 600 && !f.alive) f.vy = -f.vy * 0.25;
    else { f.vy = 0; f.onGround = true; }
  }
  f.vx *= Math.pow(f.onGround ? 0.004 : f.jugg && f.alive ? 0.03 : 0.4, dt);
  if (f.x < 24) { f.x = 24; f.vx = Math.abs(f.vx) * 0.4; }
  if (f.x > W - 24) { f.x = W - 24; f.vx = -Math.abs(f.vx) * 0.4; }
}

function smoothPose(f: Fighter, target: Pose, dt: number, k: number) {
  const a = 1 - Math.exp(-dt * k);
  for (const key of POSE_KEYS) f.pose[key] += (target[key] - f.pose[key]) * a;
}

export function step(g: Game, dt: number) {
  g.shake = Math.max(0, g.shake - dt * 40);
  if (g.intro) {
    stepIntro(g, dt);
    return;
  }
  if (g.cut) {
    stepCut(g, dt);
    return;
  }
  if (g.hitstop > 0) {
    g.hitstop -= dt;
    return;
  }
  g.t += dt;
  g.flash = Math.max(0, g.flash - dt);
  stepRealm(g, dt);
  const alive = g.fighters.filter((f) => f.alive);
  for (const f of g.fighters) updateFighter(g, f, dt);

  // keep bodies from stacking
  for (let i = 0; i < alive.length; i++) {
    for (let j = i + 1; j < alive.length; j++) {
      const a = alive[i], b = alive[j];
      const min = 20 * Math.min(a.scale, b.scale);
      const d = b.x - a.x;
      if (Math.abs(d) < min && Math.abs(a.y - b.y) < 60) {
        const push = (min - Math.abs(d)) / 2;
        const sgn = d === 0 ? (a.key < b.key ? 1 : -1) : Math.sign(d);
        a.x -= sgn * push; b.x += sgn * push;
      }
    }
  }

  // pushed below a third of their health: Rage Mode (one cutscene at a time)
  if (!g.preview && g.ending === 0) {
    for (const f of g.fighters) {
      if (f.alive && canRage(f) && f.hp <= f.maxHp * RAGE_AT) { startRage(g, f); return; }
    }
  }

  // projectiles
  const magnetos = g.fighters.filter((f) => f.alive && f.def.id === "magneto");
  for (const p of g.projectiles) {
    paint = rageOf(g.fighters[p.owner]);
    for (const m of magnetos) {
      if (!foe(m, g.fighters[p.owner])) continue;
      const c = center(m);
      const d = Math.hypot(p.x - c.x, p.y - c.y);
      if (d < 100 && d > 0) { p.vx += ((p.x - c.x) / d) * 1100 * dt; p.vy += ((p.y - c.y) / d) * 1100 * dt; }
    }
    p.vy += p.grav * gravK * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += dt * 10;
    p.life -= dt;
    if (Math.random() < dt * 50) {
      emitMove(g, p.move, p.power, p.x, p.y, 1, 40, { size: rand(2, 5) + p.r * 0.25, life: 0.35, max: 0.35 });
    }
    if (p.x < -40 || p.x > W + 40) p.life = 0;
    if (p.y >= GROUND) {
      p.life = 0;
      emitMove(g, p.move, p.power, p.x, GROUND - 4, 10, 220);
      if (LOOKS[p.move.id]?.hit) moveFx(g, p.move.id, true, p.x, GROUND - 8, Math.sign(p.vx) || 1, p.r / Math.max(4, p.move.size ?? 10), 0.35);
      if (p.move.kind === "rain" || p.shape === "rock") g.shake = Math.max(g.shake, 4);
    }
    if (p.life <= 0) continue;
    for (const f of g.fighters) {
      if (!f.alive || !foe(g.fighters[p.owner], f) || p.hits.includes(f.key) || invuln(f)) continue;
      const top = f.y - bodyH(f);
      if (Math.abs(p.x - f.x) < 14 * f.scale + p.r && p.y > top - p.r && p.y < f.y + p.r) {
        p.hits.push(f.key);
        hit(g, g.fighters[p.owner], f, p.move, p.power, Math.sign(p.vx) || 1);
        if (!p.move.pierce) { p.life = 0; break; }
      }
    }
  }
  paint = null;
  // power clashes: two shots meet, or a shot runs into a beam
  const shots = g.projectiles.filter((p) => p.life > 0 && p.move.kind === "projectile" && !p.move.ground);
  for (let i = 0; i < shots.length; i++) {
    const p = shots[i];
    if (p.life <= 0) continue;
    for (let j = i + 1; j < shots.length; j++) {
      const q = shots[j];
      if (q.life <= 0 || !foe(g.fighters[p.owner], g.fighters[q.owner])) continue;
      if (Math.hypot(p.x - q.x, p.y - q.y) < p.r + q.r + 4) {
        p.life = 0; q.life = 0;
        shockwave(g, (p.x + q.x) / 2, (p.y + q.y) / 2, p.power, q.power, 120 + (p.r + q.r) * 2.5);
        break;
      }
    }
    if (p.life <= 0) continue;
    for (const b of g.beams) {
      if (!b.clash || !foe(g.fighters[p.owner], g.fighters[b.owner]) || b.life < 0.05) continue;
      if (segDist(p.x, p.y, b) < p.r + b.width * 0.6) {
        p.life = 0;
        shockwave(g, p.x, p.y, p.power, b.power, 110 + p.r * 2);
        break;
      }
    }
  }
  g.projectiles = g.projectiles.filter((p) => p.life > 0);

  for (const b of g.beams) b.life -= dt;
  g.beams = g.beams.filter((b) => b.life > 0);

  // eruptions: telegraph, then burst out of the ground
  for (const e of g.eruptions) {
    e.t += dt;
    paint = rageOf(g.fighters[e.owner]);
    if (!e.fired && e.t >= 0.3) {
      e.fired = true;
      sfx(g, { k: "erupt", power: e.power, move: e.move.id });
      const owner = g.fighters[e.owner];
      const r = e.move.radius ?? 44;
      for (const o of g.fighters) {
        if (!o.alive || !foe(owner, o) || Math.abs(o.x - e.x) > r + 10 || o.y < GROUND - (o.jugg ? 200 : 120)) continue;
        hit(g, owner, o, e.move, e.power, Math.sign(o.x - e.x) || 1);
      }
      for (let i = 0; i < 22; i++) emitMove(g, e.move, e.power, e.x + rand(-r, r) * 0.6, GROUND - rand(0, 160), 1, 120, { vy: -rand(200, 500) });
      g.shake = Math.max(g.shake, 8);
    }
  }
  paint = null;
  g.eruptions = g.eruptions.filter((e) => e.t < 0.85);

  // zones
  for (const z of g.zones) {
    z.life -= dt;
    const owner = g.fighters[z.owner];
    const r = z.move.radius ?? 100;
    paint = rageOf(owner);
    if (Math.random() < dt * 22) emitMove(g, z.move, z.power, z.x + rand(-r, r) * 0.9, GROUND - rand(0, r * 0.5), 1, 30);
    paint = null;
    for (const o of g.fighters) {
      if (!o.alive || !foe(owner, o) || Math.abs(o.x - z.x) > r || o.y < GROUND - r * 0.9) continue;
      hurt(g, o, z.move.dmg * dt, owner);
      // a draining field feeds its owner while enemies stand in it
      if (z.move.heal && owner?.alive) {
        owner.hp = Math.min(owner.maxHp, owner.hp + z.move.heal * dt);
        if (Math.random() < dt * 8) {
          const oc = center(o), c = center(owner), life = 0.6;
          g.particles.push({ x: oc.x, y: oc.y, vx: (c.x - oc.x) / life, vy: (c.y - oc.y) / life - 60, life, max: life, size: rand(4, 7), color: owner.def.glow, shape: "dot", grav: 0, add: true, rot: 0 });
        }
      }
      if (z.move.status) o.status[z.move.status] = Math.max(o.status[z.move.status], g.t + (z.move.statusDur ?? 0.5));
      if (z.move.pullIn) o.x += Math.sign(z.x - o.x) * Math.min(Math.abs(z.x - o.x), z.move.pullIn * dt);
    }
  }
  // fields that erase matter: enemy shots flying in are deleted
  for (const z of g.zones) {
    if (!z.move.erase) continue;
    const owner = g.fighters[z.owner];
    const r = z.move.radius ?? 100;
    for (const p of g.projectiles) {
      if (p.life <= 0 || !foe(owner, g.fighters[p.owner]) || Math.abs(p.x - z.x) > r || p.y < GROUND - r * 1.3) continue;
      p.life = 0;
      g.particles.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.3, max: 0.3, size: 26, color: "white", shape: "ring", grav: 0, add: true, rot: 0 });
      pop(g, p.x, p.y - 24, "erased", LOOKS[z.move.id]?.b ?? "white", 15, 0.6);
    }
  }
  g.projectiles = g.projectiles.filter((p) => p.life > 0);
  g.zones = g.zones.filter((z) => z.life > 0);
  stepAnnis(g, dt);

  tickBits(g, dt);

  if (g.preview) return;
  const left = g.fighters.filter((f) => f.alive);
  const sides = g.teamMode ? new Set(left.map((f) => f.team)).size : left.length;
  if (sides <= 1 && g.ending === 0) g.ending = g.t;
  if (g.ending > 0 && g.t - g.ending > 1.6) {
    g.over = true;
    const top = [...left].sort((a, b) => b.hp - a.hp)[0];
    g.winner = top?.def.name ?? null;
    g.winnerId = top ? rosterIdOf(top.def) : null;
    g.winnerTeam = g.teamMode && top ? top.team : null;
  }
}

/** Particles, floating numbers, rings and one-off effects. They keep moving through a rage cutscene. */
function tickBits(g: Game, dt: number) {
  for (const p of g.particles) {
    p.vy += p.grav * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.pow(0.15, dt);
    if (p.grav <= 0) p.vy *= Math.pow(0.15, dt);
    p.rot += dt * 6;
    p.life -= dt;
  }
  g.particles = g.particles.filter((p) => p.life > 0);
  for (const t of g.pops) { t.life -= dt; t.y -= dt * 40; }
  g.pops = g.pops.filter((t) => t.life > 0);
  for (const w of g.waves) w.life -= dt;
  g.waves = g.waves.filter((w) => w.life > 0);
  for (const x of g.fx) x.life -= dt;
  g.fx = g.fx.filter((x) => x.life > 0);
}

// ---------- drawing ----------
const realmArt: Partial<Record<Realm, HTMLCanvasElement>> = {};

/** The realm the fight was warped into, faded in over the home arena (and faded out once it ends). */
function drawRealm(ctx: CanvasRenderingContext2D, g: Game) {
  const show = (id: Realm, a: number) => {
    if (a <= 0) return;
    const art = (realmArt[id] ??= buildRealmBackdrop(id));
    ctx.globalAlpha = clamp(a, 0, 1);
    ctx.drawImage(art, -12, -8, W + 24, H + 16);
    ctx.globalAlpha = 1;
  };
  if (g.realmOut) show(g.realmOut.id, 1 - g.realmOut.t / REALM_FADE);
  if (g.realm) {
    show(g.realm.id, Math.min(g.realm.t, g.realm.left) / REALM_FADE);
    if (g.realm.id === "desert") {
      // heat shimmer low over the sand
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = "hsl(40 100% 92%)";
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const y = GROUND - 30 - i * 26;
        ctx.beginPath();
        for (let x = 0; x <= W; x += 24) ctx.lineTo(x, y + Math.sin(x * 0.03 + g.t * 5 + i) * 4);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}

/** A whole-arena painting for a realm: the Moon with Earth in a black sky, or dunes under a white-hot sun. */
function buildRealmBackdrop(id: Realm): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  let seed = id === "moon" ? 7 : 3;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  if (id === "moon") {
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
    sky.addColorStop(0, "hsl(235 45% 5%)");
    sky.addColorStop(1, "hsl(240 30% 14%)");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = `hsl(${rnd() < 0.2 ? 210 : 45} 60% 92% / ${0.3 + rnd() * 0.7})`;
      const r = rnd() < 0.08 ? 1.8 : 1;
      ctx.fillRect(rnd() * W, rnd() * (GROUND - 80), r, r);
    }
    // Earth
    const ex = 730, ey = 140, er = 62;
    const glowE = ctx.createRadialGradient(ex, ey, er * 0.8, ex, ey, er * 1.6);
    glowE.addColorStop(0, "hsl(205 90% 70% / 0.35)");
    glowE.addColorStop(1, "hsl(205 90% 70% / 0)");
    ctx.fillStyle = glowE;
    ctx.fillRect(ex - er * 2, ey - er * 2, er * 4, er * 4);
    ctx.save();
    ctx.beginPath();
    ctx.arc(ex, ey, er, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "hsl(212 75% 46%)";
    ctx.fillRect(ex - er, ey - er, er * 2, er * 2);
    ctx.fillStyle = "hsl(118 38% 42%)";
    for (const [dx, dy, rx, ry, rot] of [[-22, -18, 22, 14, 0.4], [14, 8, 18, 24, -0.3], [-8, 30, 14, 9, 0.2], [30, -30, 10, 7, 0.8]] as const) {
      ctx.beginPath();
      ctx.ellipse(ex + dx, ey + dy, rx, ry, rot, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "hsl(0 0% 100% / 0.55)";
    for (const [dx, dy, rx] of [[-30, 4, 26], [20, -14, 20], [6, 40, 22]] as const) {
      ctx.beginPath();
      ctx.ellipse(ex + dx, ey + dy, rx, 4, -0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    // night side
    const sh = ctx.createLinearGradient(ex - er, 0, ex + er, 0);
    sh.addColorStop(0, "hsl(235 50% 4% / 0)");
    sh.addColorStop(0.55, "hsl(235 50% 4% / 0.1)");
    sh.addColorStop(1, "hsl(235 50% 4% / 0.85)");
    ctx.fillStyle = sh;
    ctx.fillRect(ex - er, ey - er, er * 2, er * 2);
    ctx.restore();
    // grey hills and the cratered floor
    ctx.fillStyle = "hsl(230 8% 34%)";
    ctx.beginPath();
    ctx.moveTo(0, GROUND - 60);
    for (let x = 0; x <= W; x += 40) ctx.lineTo(x, GROUND - 60 - Math.abs(Math.sin(x * 0.011)) * 50 - rnd() * 10);
    ctx.lineTo(W, GROUND);
    ctx.lineTo(0, GROUND);
    ctx.fill();
    const fl = ctx.createLinearGradient(0, GROUND - 20, 0, H);
    fl.addColorStop(0, "hsl(225 6% 66%)");
    fl.addColorStop(1, "hsl(225 8% 42%)");
    ctx.fillStyle = fl;
    ctx.fillRect(0, GROUND - 18, W, H - GROUND + 18);
    for (let i = 0; i < 14; i++) {
      const x = rnd() * W, y = GROUND - 8 + rnd() * (H - GROUND), r = 8 + rnd() * 26;
      ctx.fillStyle = "hsl(225 8% 46%)";
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "hsl(225 10% 76%)";
      ctx.beginPath();
      ctx.ellipse(x, y + r * 0.06, r * 0.85, r * 0.2, 0, 0, Math.PI);
      ctx.fill();
    }
  } else {
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
    sky.addColorStop(0, "hsl(204 70% 62%)");
    sky.addColorStop(0.6, "hsl(40 80% 82%)");
    sky.addColorStop(1, "hsl(30 90% 74%)");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    const sun = ctx.createRadialGradient(240, 110, 10, 240, 110, 200);
    sun.addColorStop(0, "hsl(55 100% 98%)");
    sun.addColorStop(0.18, "hsl(50 100% 88% / 0.9)");
    sun.addColorStop(1, "hsl(40 100% 80% / 0)");
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, 520, 360);
    // far dunes, a mesa, near dunes
    const dune = (base: number, amp: number, col: string, k: number) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(0, GROUND);
      for (let x = 0; x <= W; x += 10) ctx.lineTo(x, base - Math.sin(x * k + base) * amp - Math.sin(x * k * 2.3) * amp * 0.35);
      ctx.lineTo(W, GROUND);
      ctx.fill();
    };
    ctx.fillStyle = "hsl(18 45% 52%)";
    ctx.beginPath();
    ctx.moveTo(600, GROUND - 120);
    ctx.lineTo(630, GROUND - 210); ctx.lineTo(760, GROUND - 214); ctx.lineTo(790, GROUND - 120);
    ctx.fill();
    dune(GROUND - 120, 26, "hsl(32 60% 66%)", 0.008);
    dune(GROUND - 60, 22, "hsl(30 62% 58%)", 0.012);
    const fl = ctx.createLinearGradient(0, GROUND - 20, 0, H);
    fl.addColorStop(0, "hsl(36 70% 64%)");
    fl.addColorStop(1, "hsl(28 60% 46%)");
    ctx.fillStyle = fl;
    ctx.fillRect(0, GROUND - 14, W, H - GROUND + 14);
    ctx.strokeStyle = "hsl(30 50% 50% / 0.5)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      const y = GROUND + 6 + i * 7, x0 = rnd() * W;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.quadraticCurveTo(x0 + 60, y - 4, x0 + 130, y);
      ctx.stroke();
    }
    // a bleached rock and a cactus silhouette
    ctx.fillStyle = "hsl(25 40% 38%)";
    ctx.beginPath();
    ctx.ellipse(110, GROUND - 6, 44, 18, 0, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = "hsl(120 25% 30%)";
    ctx.lineCap = "round";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(870, GROUND - 4); ctx.lineTo(870, GROUND - 110);
    ctx.moveTo(870, GROUND - 60); ctx.lineTo(892, GROUND - 60); ctx.lineTo(892, GROUND - 90);
    ctx.moveTo(870, GROUND - 46); ctx.lineTo(850, GROUND - 46); ctx.lineTo(850, GROUND - 70);
    ctx.stroke();
  }
  return c;
}

/** Everwinter's Time Stop: the arena drains to a cold grey and a frozen clock face hangs over it. */
/** The Black Sun's Total Eclipse: night falls over the arena and a blacked-out sun hangs in the sky. */
function drawEclipse(ctx: CanvasRenderingContext2D, g: Game) {
  const left = g.eclipseUntil - g.t;
  const a = clamp(Math.min(left, 0.6) / 0.6, 0, 1) * clamp((ECLIPSE_TIME - left) / 0.5, 0, 1);
  const t = g.t;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = "hsl(250 45% 5% / 0.66)";
  ctx.fillRect(-20, -20, W + 40, H + 40);
  const cx = W / 2, cy = 112, r = 44;
  ctx.globalCompositeOperation = "lighter";
  const halo = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 3.4);
  halo.addColorStop(0, "hsl(42 100% 70% / 0.85)");
  halo.addColorStop(0.35, "hsl(28 100% 50% / 0.35)");
  halo.addColorStop(1, "hsl(28 100% 50% / 0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 3.4, 0, Math.PI * 2);
  ctx.fill();
  // corona streamers flickering out from behind the moon
  ctx.strokeStyle = "hsl(44 100% 78% / 0.7)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 18; i++) {
    const an = (i / 18) * Math.PI * 2 + Math.sin(t * 0.7 + i) * 0.05;
    const len = r * (1.5 + 0.5 * Math.sin(t * 3 + i * 2.3) + (i % 3 === 0 ? 0.6 : 0));
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(an) * r, cy + Math.sin(an) * r);
    ctx.quadraticCurveTo(cx + Math.cos(an + 0.08) * r * 1.3, cy + Math.sin(an + 0.08) * r * 1.3, cx + Math.cos(an) * len, cy + Math.sin(an) * len);
    ctx.stroke();
  }
  // the diamond ring: one bright bead of light slipping past the edge
  const da = -0.7 + Math.sin(t * 0.4) * 0.15;
  glowDot(ctx, cx + Math.cos(da) * r, cy + Math.sin(da) * r, 22, "hsl(0 0% 100%)", "hsl(44 100% 70% / 0)");
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "hsl(250 40% 4%)";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "hsl(44 100% 80%)";
  ctx.lineWidth = 2;
  ctx.stroke();
  // a few stars come out
  ctx.fillStyle = "hsl(0 0% 100% / 0.8)";
  for (let i = 0; i < 26; i++) {
    const sx = ((i * 157.3) % W), sy = 20 + ((i * 83.7) % 220);
    const tw = 0.5 + 0.5 * Math.sin(t * 3 + i);
    ctx.fillRect(sx, sy, 1.5 + tw, 1.5 + tw);
  }
  ctx.restore();
}

function drawTimeStop(ctx: CanvasRenderingContext2D, g: Game) {
  const left = g.stopUntil - g.t;
  const a = clamp(Math.min(left, 0.3) / 0.3, 0, 1);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.globalCompositeOperation = "saturation";
  ctx.fillStyle = "hsl(0 0% 50%)";
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "hsl(205 60% 70% / 0.16)";
  ctx.fillRect(0, 0, W, H);
  const cx = W / 2, cy = 250, r = 170;
  ctx.strokeStyle = "hsl(44 90% 80% / 0.55)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 3;
  for (let i = 0; i < 12; i++) {
    const an = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(an) * r * 0.86, cy + Math.sin(an) * r * 0.86);
    ctx.lineTo(cx + Math.cos(an) * r * 0.97, cy + Math.sin(an) * r * 0.97);
    ctx.stroke();
  }
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - r * 0.7);
  ctx.moveTo(cx, cy); ctx.lineTo(cx + r * 0.45, cy + r * 0.12);
  ctx.stroke();
  ctx.restore();
}

export function buildBackdrop(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;
  // sky
  const sky = ctx.createLinearGradient(0, 0, 0, 420);
  sky.addColorStop(0, "hsl(222 70% 62%)");
  sky.addColorStop(0.55, "hsl(260 60% 78%)");
  sky.addColorStop(1, "hsl(28 95% 82%)");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, 440);
  // sun
  const sun = ctx.createRadialGradient(720, 250, 10, 720, 250, 190);
  sun.addColorStop(0, "hsl(48 100% 92%)");
  sun.addColorStop(0.3, "hsl(40 100% 78% / 0.8)");
  sun.addColorStop(1, "hsl(30 100% 80% / 0)");
  ctx.fillStyle = sun;
  ctx.fillRect(500, 40, 440, 400);
  // clouds
  ctx.fillStyle = "hsl(0 0% 100% / 0.7)";
  for (const [cx, cy, s] of [[140, 90, 1], [420, 60, 0.7], [820, 110, 0.85], [600, 150, 0.5]] as const) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, 70 * s, 20 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(cx - 30 * s, cy - 10 * s, 36 * s, 22 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 26 * s, cy - 14 * s, 30 * s, 20 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // far mountains
  const hills = (y: number, amp: number, col: string, seed: number) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, 440);
    for (let x = 0; x <= W; x += 20) {
      ctx.lineTo(x, y - Math.abs(Math.sin(x * 0.006 + seed)) * amp - Math.sin(x * 0.021 + seed * 2) * amp * 0.25);
    }
    ctx.lineTo(W, 440);
    ctx.fill();
  };
  hills(300, 110, "hsl(255 32% 64%)", 1.3);
  hills(330, 70, "hsl(250 30% 54%)", 4.1);
  // colosseum wall
  const wallTop = 330, wallBot = 440;
  const wall = ctx.createLinearGradient(0, wallTop, 0, wallBot);
  wall.addColorStop(0, "hsl(30 40% 72%)");
  wall.addColorStop(1, "hsl(24 34% 56%)");
  ctx.fillStyle = wall;
  ctx.fillRect(0, wallTop, W, wallBot - wallTop);
  // crowd
  const crowd = ["hsl(12 80% 60%)", "hsl(200 70% 60%)", "hsl(50 90% 60%)", "hsl(140 50% 50%)", "hsl(300 50% 62%)", "hsl(30 30% 30%)"];
  for (let row = 0; row < 3; row++) {
    for (let x = 6 + row * 7; x < W; x += 14) {
      ctx.fillStyle = crowd[(x * 7 + row * 13) % crowd.length];
      const y = wallTop - 8 - row * 10 + ((x * 31) % 5);
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x - 5, y + 3, 10, 8);
    }
  }
  ctx.fillStyle = INK;
  ctx.fillRect(0, wallTop - 4, W, 6);
  // arches
  for (let x = 30; x < W; x += 96) {
    ctx.fillStyle = "hsl(22 30% 34%)";
    ctx.beginPath();
    ctx.moveTo(x, wallBot);
    ctx.lineTo(x, wallTop + 48);
    ctx.arc(x + 24, wallTop + 48, 24, Math.PI, 0);
    ctx.lineTo(x + 48, wallBot);
    ctx.fill();
    ctx.strokeStyle = "hsl(22 30% 26%)";
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  // banners
  const banners = ["hsl(14 92% 54%)", "hsl(198 88% 55%)", "hsl(50 96% 54%)", "hsl(140 58% 44%)", "hsl(274 58% 50%)"];
  for (let i = 0; i < 10; i++) {
    const x = 78 + i * 96;
    ctx.fillStyle = banners[i % banners.length];
    ctx.beginPath();
    ctx.moveTo(x - 12, wallTop + 2);
    ctx.lineTo(x + 12, wallTop + 2);
    ctx.lineTo(x + 12, wallTop + 52);
    ctx.lineTo(x, wallTop + 42);
    ctx.lineTo(x - 12, wallTop + 52);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // floor
  const floor = ctx.createLinearGradient(0, 440, 0, H);
  floor.addColorStop(0, "hsl(36 60% 70%)");
  floor.addColorStop(1, "hsl(30 55% 60%)");
  ctx.fillStyle = floor;
  ctx.fillRect(0, 440, W, H - 440);
  ctx.fillStyle = INK;
  ctx.fillRect(0, 438, W, 4);
  ctx.strokeStyle = "hsl(30 40% 52% / 0.55)";
  ctx.lineWidth = 2;
  for (let i = -12; i <= 12; i++) {
    ctx.beginPath();
    ctx.moveTo(W / 2 + i * 60, 442);
    ctx.lineTo(W / 2 + i * 150, H);
    ctx.stroke();
  }
  for (const y of [462, 492, 530, 575]) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  // arena ring painted on the floor
  ctx.strokeStyle = "hsl(0 0% 100% / 0.45)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(W / 2, 540, 300, 40, 0, 0, Math.PI * 2);
  ctx.stroke();
  // vignette
  const v = ctx.createRadialGradient(W / 2, H / 2, 260, W / 2, H / 2, 640);
  v.addColorStop(0, "hsl(0 0% 0% / 0)");
  v.addColorStop(1, "hsl(250 40% 10% / 0.35)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  return c;
}

function limb(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[], col: string, w: number, flash: boolean) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.strokeStyle = INK;
  ctx.lineWidth = w + 4;
  ctx.stroke();
  ctx.strokeStyle = flash ? "white" : col;
  ctx.lineWidth = w;
  ctx.stroke();
}

const HEAD = 11;

/** Joint positions for a pose, standing at (x, y). */
function rig(x: number, y: number, p: Pose, s: number, face: number) {
  const T = 21, S = 21, TOR = 34, UA = 18, FA = 17;
  const drop = Math.max(4, Math.cos(p.lF1) * T + Math.cos(p.lF2) * S, Math.cos(p.lB1) * T + Math.cos(p.lB2) * S);
  const hip = { x, y: y - drop * s };
  const P = (a: number, len: number, o: { x: number; y: number }) => ({ x: o.x + Math.sin(a) * len * s * face, y: o.y + Math.cos(a) * len * s });
  const neck = { x: hip.x + Math.sin(p.t) * TOR * s * face, y: hip.y - Math.cos(p.t) * TOR * s };
  const shoulder = { x: hip.x + (neck.x - hip.x) * 0.88, y: hip.y + (neck.y - hip.y) * 0.88 };
  const head = { x: hip.x + Math.sin(p.t) * (TOR + HEAD + 3) * s * face, y: hip.y - Math.cos(p.t) * (TOR + HEAD + 3) * s };
  const kF = P(p.lF1, T, hip), fF = P(p.lF2, S, kF);
  const kB = P(p.lB1, T, hip), fB = P(p.lB2, S, kB);
  const eF = P(p.aF1, UA, shoulder), hF = P(p.aF2, FA, eF);
  const eB = P(p.aB1, UA, shoulder), hB = P(p.aB2, FA, eB);
  return { hip, neck, shoulder, head, kF, fF, kB, fB, eF, hF, eB, hB };
}

/** Fading coloured silhouettes left behind by a dash. */
function drawGhosts(ctx: CanvasRenderingContext2D, f: Fighter) {
  if (!f.ghosts.length) return;
  const s = f.scale;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const gh of f.ghosts) {
    const r = rig(gh.x, gh.y, gh.pose, s, gh.face);
    ctx.globalAlpha = clamp(gh.life / 0.22, 0, 1) * 0.5;
    ctx.strokeStyle = rageOf(f)?.glow ?? f.def.glow;
    ctx.lineWidth = 6 * s;
    ctx.beginPath();
    for (const seg of [[r.hip, r.kB, r.fB], [r.shoulder, r.eB, r.hB], [r.hip, r.neck], [r.hip, r.kF, r.fF], [r.shoulder, r.eF, r.hF]]) {
      ctx.moveTo(seg[0].x, seg[0].y);
      for (let i = 1; i < seg.length; i++) ctx.lineTo(seg[i].x, seg[i].y);
    }
    ctx.stroke();
    ctx.fillStyle = rageOf(f)?.body ?? f.def.color;
    ctx.beginPath();
    ctx.arc(r.head.x, r.head.y, HEAD * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawWave(ctx: CanvasRenderingContext2D, w: Wave) {
  const t = 1 - w.life / w.max;
  const e = 1 - Math.pow(1 - t, 3);
  const r = 16 + w.r * e;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  // flash at the point of contact
  if (t < 0.35) glowDot(ctx, w.x, w.y, 30 + w.r * 0.5 * (1 - t), `hsl(0 0% 100% / ${0.9 * (1 - t / 0.35)})`, "hsl(0 0% 100% / 0)");
  ctx.globalAlpha = 1 - t;
  ctx.lineWidth = 14 * (1 - t) + 2;
  ctx.strokeStyle = w.a;
  ctx.beginPath();
  ctx.arc(w.x, w.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 6 * (1 - t) + 1;
  ctx.strokeStyle = w.b;
  ctx.beginPath();
  ctx.arc(w.x, w.y, r * 0.78, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(w.x, w.y, r * 1.06, 0, Math.PI * 2);
  ctx.stroke();
  // dust ring where the blast meets the floor
  const gy = GROUND + 2;
  if (Math.abs(gy - w.y) < r) {
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = (1 - t) * 0.6;
    ctx.strokeStyle = "hsl(34 40% 88%)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(w.x, gy, r * 1.1, 10 + r * 0.06, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** `alpha` fades the whole body, `solid` paints it one flat colour (used by the entrances), `shadow: false` skips the floor shadow. */
function drawFighter(ctx: CanvasRenderingContext2D, g: Game, f: Fighter, o: { alpha?: number; solid?: string; shadow?: boolean } = {}) {
  const s = f.scale;
  let face: number = f.facing;
  if (f.act?.move.anim === "spin" && f.act.fired) face = Math.sin(g.t * 40) > 0 ? 1 : -1;
  const { hip, neck, shoulder, head, kF, fF, kB, fB, eF, hF, eB, hB } = rig(f.x, f.y, f.pose, s, face);

  const flash = f.flash > 0;
  const rg = f.alive ? rageOf(f) : null;
  const col = o.solid ?? (rg ? rg.body : f.def.id === "shift" && f.lastHitBy ? DEF_BY_ID[f.lastHitBy].color : f.def.color);
  const dark = o.solid ?? shade(col, -16);
  const deadFade = !f.alive ? clamp(1 - (f.koT - 1.5) / 1.5, 0.45, 1) : 1;
  ctx.globalAlpha = deadFade * (o.alpha ?? 1);

  // ground shadow
  if (o.shadow !== false) {
    const air = clamp((GROUND - f.y) / 300, 0, 1);
    ctx.fillStyle = `hsl(250 40% 15% / ${0.28 * (1 - air * 0.6)})`;
    ctx.beginPath();
    ctx.ellipse(f.x, GROUND + 2, 26 * s * (1 - air * 0.4), 6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const lw = 6 * s;

  if (f.jugg) drawWings(ctx, g, f, shoulder, face);
  if (rg) drawRageAura(ctx, g, f, rg, hip, head);
  const bt = g.t + (g.intro?.t ?? 0) + f.key;
  const bossPts = { hip, neck, shoulder, head, kF, fF, kB, fB, eF, hF, eB, hB };
  if (f.def.boss && !o.solid) drawBossDesign(ctx, f.def.boss, "back", bossPts, s, face, bt, f.alive, f.vx);

  // scarf trailing from the neck (a boss wears its own design instead)
  const wave = Math.sin((g.t + (g.intro?.t ?? 0)) * 12 + f.key) * 4 * s;
  if (!f.def.boss) {
  const sx = -face * (16 + Math.abs(f.vx) * 0.03) * s;
  ctx.beginPath();
  ctx.moveTo(neck.x, neck.y + 2 * s);
  ctx.quadraticCurveTo(neck.x + sx * 0.6, neck.y + wave, neck.x + sx * 1.5, neck.y + 6 * s - wave);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7 * s;
  ctx.stroke();
  ctx.strokeStyle = o.solid ?? rg?.glow ?? f.def.glow;
  ctx.lineWidth = 4 * s;
  ctx.stroke();
  }

  limb(ctx, [hip, kB, fB], dark, lw, flash);
  limb(ctx, [shoulder, eB, hB], dark, lw, flash);
  limb(ctx, [hip, neck], col, lw * 1.35, flash);
  limb(ctx, [hip, kF, fF], col, lw, flash);
  limb(ctx, [shoulder, eF, hF], col, lw, flash);

  // power glow on the hand while acting
  if (f.act && f.alive) {
    const lk = LOOKS[f.act.move.id];
    const pc = rg ? { glow: rg.b, color: rg.a } : lk ? { glow: lk.b, color: lk.a } : DEF_BY_ID[f.act.power];
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const r = (10 + Math.sin(g.t * 30) * 2) * s;
    const grd = ctx.createRadialGradient(hF.x, hF.y, 0, hF.x, hF.y, r * 2);
    grd.addColorStop(0, pc.glow);
    grd.addColorStop(1, shade(pc.color, 0, 0));
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(hF.x, hF.y, r * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // fists
  for (const hp of [hB, hF]) {
    ctx.beginPath();
    ctx.arc(hp.x, hp.y, 4.5 * s, 0, Math.PI * 2);
    ctx.fillStyle = flash ? "white" : col;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5 * s;
    ctx.stroke();
  }
  // head
  ctx.beginPath();
  ctx.arc(head.x, head.y, HEAD * s, 0, Math.PI * 2);
  ctx.fillStyle = flash ? "white" : col;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3 * s;
  ctx.stroke();
  // eye
  const blind = f.status.blind > g.t;
  const ex = head.x + face * 5 * s, ey = head.y - 1.5 * s;
  if (!f.alive) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(ex - 3 * s, ey - 3 * s); ctx.lineTo(ex + 3 * s, ey + 3 * s);
    ctx.moveTo(ex + 3 * s, ey - 3 * s); ctx.lineTo(ex - 3 * s, ey + 3 * s);
    ctx.stroke();
  } else if (blind) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(ex - 3.5 * s, ey); ctx.lineTo(ex + 3.5 * s, ey);
    ctx.stroke();
  } else {
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.ellipse(ex, ey, 3.6 * s, 4.4 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(ex + face * 1.3 * s, ey + 0.5 * s, 2 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  if (f.def.boss && !o.solid) drawBossDesign(ctx, f.def.boss, "front", bossPts, s, face, bt, f.alive, f.vx);
  ctx.globalAlpha = 1;

  if (!f.alive) return;
  // freeze block
  if (f.status.freeze > g.t) {
    ctx.fillStyle = "hsl(195 90% 85% / 0.45)";
    ctx.strokeStyle = "hsl(195 90% 95% / 0.9)";
    ctx.lineWidth = 2;
    const top = f.y - bodyH(f) - 8 * s;
    ctx.beginPath();
    ctx.roundRect(f.x - 26 * s, top, 52 * s, f.y - top, 6);
    ctx.fill();
    ctx.stroke();
  }
  // stun stars
  if (f.status.stun > g.t) {
    for (let i = 0; i < 3; i++) {
      const a = g.t * 6 + (i * Math.PI * 2) / 3;
      star(ctx, head.x + Math.cos(a) * 16 * s, head.y - 16 * s + Math.sin(a) * 5 * s, 5 * s, "hsl(50 100% 65%)");
    }
  }
}

/** Rage Mode around the body: Pyro's blue flame, Electro's black lightning, Aero's storm. Drawn behind the limbs. */
function drawRageAura(ctx: CanvasRenderingContext2D, g: Game, f: Fighter, rg: Rage, hip: { x: number; y: number }, head: { x: number; y: number }) {
  const s = f.scale;
  const cx = (hip.x + head.x) / 2, cy = (hip.y + head.y) / 2;
  const t = g.t + (g.cut ? g.cut.t : 0);
  ctx.save();
  // soft glow behind the body
  const grd = ctx.createRadialGradient(cx, cy, 4 * s, cx, cy, 70 * s);
  grd.addColorStop(0, shade(rg.glow, 0, 0.55));
  grd.addColorStop(1, shade(rg.glow, 0, 0));
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(cx, cy, 70 * s, 0, Math.PI * 2);
  ctx.fill();
  if (f.def.id === "pyro") {
    // tongues of blue fire licking up the body
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 7; i++) {
      const ph = t * 9 + i * 1.7;
      const x = f.x + (i - 3) * 7 * s + Math.sin(ph) * 3 * s;
      const h = (34 + 22 * Math.abs(Math.sin(ph * 0.7 + i))) * s;
      const by = f.y - (8 + Math.abs(i - 3) * 6) * s;
      ctx.fillStyle = shade(i % 2 ? rg.a : rg.b, 0, 0.55);
      ctx.beginPath();
      ctx.moveTo(x - 7 * s, by);
      ctx.quadraticCurveTo(x - 9 * s, by - h * 0.6, x + Math.sin(ph * 1.3) * 6 * s, by - h - 50 * s);
      ctx.quadraticCurveTo(x + 9 * s, by - h * 0.6, x + 7 * s, by);
      ctx.fill();
    }
  } else if (f.def.id === "electro") {
    // black lightning crackling around the body, white sparks inside it
    ctx.lineCap = "round";
    for (let i = 0; i < 4; i++) {
      const a0 = (Math.floor(t * 14) * 2.3 + i * 1.57) % (Math.PI * 2);
      let x = cx + Math.cos(a0) * 34 * s, y = cy + Math.sin(a0) * 46 * s;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let j = 0; j < 5; j++) {
        const a = a0 + (j + 1) * 0.35;
        x = cx + Math.cos(a) * (30 + Math.random() * 16) * s;
        y = cy + Math.sin(a) * (40 + Math.random() * 20) * s;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = shade(rg.b, 0, 0.9);
      ctx.lineWidth = 5 * s;
      ctx.stroke();
      ctx.strokeStyle = rg.dark ?? INK;
      ctx.lineWidth = 2.5 * s;
      ctx.stroke();
    }
  } else if (f.def.id === "aero") {
    // a ring of storm wind spinning around the fighter
    ctx.lineCap = "round";
    for (let i = 0; i < 3; i++) {
      const ry = cy - 34 * s + i * 32 * s;
      const rx = (40 + i * 6) * s;
      const a0 = t * (9 + i * 2) + i * 2;
      ctx.strokeStyle = shade(i % 2 ? rg.a : rg.b, 0, 0.85);
      ctx.lineWidth = (4 - i * 0.6) * s;
      ctx.beginPath();
      ctx.ellipse(cx, ry, rx, 9 * s, 0, a0, a0 + 2.4);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** A pair of feathered wings in the fighter's element colours, flapping from the shoulders. */
function drawWings(ctx: CanvasRenderingContext2D, g: Game, f: Fighter, shoulder: { x: number; y: number }, face: number) {
  const s = f.scale;
  const dir = -face;
  const flap = f.alive ? Math.sin(g.t * 8 + f.key * 1.3) : -0.6;
  const col = f.def.color, glow = f.def.glow;
  for (const far of [true, false]) {
    const L = (far ? 56 : 68) * s;
    const phi = (far ? 0.85 : 0.6) + flap * 0.5;
    const bx = shoulder.x + dir * 2 * s, by = shoulder.y + 3 * s;
    const tx = bx + dir * Math.cos(phi) * L, ty = by - Math.sin(phi) * L;
    const rx = bx + dir * 8 * s, ry = by + 12 * s;
    const pts: { x: number; y: number }[] = [];
    const n = 5;
    for (let i = 1; i <= n; i++) {
      const k = i / n;
      pts.push({ x: tx + (rx - tx) * k, y: ty + (ry - ty) * k + Math.sin(k * Math.PI) * 30 * s });
    }
    const fill = ctx.createLinearGradient(bx, by, tx, ty);
    fill.addColorStop(0, shade(col, far ? -18 : -6));
    fill.addColorStop(1, shade(glow, far ? -14 : 0));
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + dir * L * 0.3, ty - 4 * s, tx, ty);
    let px = tx, py = ty;
    for (const p of pts) {
      ctx.quadraticCurveTo((px + p.x) / 2 + dir * 3 * s, Math.max(py, p.y) + 11 * s, p.x, p.y);
      px = p.x; py = p.y;
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3 * s;
    ctx.stroke();
    // feather veins
    ctx.strokeStyle = shade(col, -26, 0.7);
    ctx.lineWidth = 1.6 * s;
    ctx.beginPath();
    for (const p of pts.slice(0, -1)) { ctx.moveTo(bx + (tx - bx) * 0.25, by + (ty - by) * 0.25); ctx.lineTo(p.x, p.y); }
    ctx.stroke();
    if (!far && f.alive) {
      // glowing leading edge
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = shade(glow, 0, 0.55);
      ctx.lineWidth = 3 * s;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + dir * L * 0.3, ty - 4 * s, tx, ty);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, col: string) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = col;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function glowDot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, inner: string, outer: string) {
  const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
  grd.addColorStop(0, inner);
  grd.addColorStop(1, outer);
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** A move's colours for the plain drawings: its own look's when it has one, else its element's. */
function colsOf(id: string | undefined, power: Power) {
  const lk = id ? LOOKS[id] : undefined;
  return lk ? { color: lk.a, glow: lk.b } : DEF_BY_ID[power];
}

function drawProjectile(ctx: CanvasRenderingContext2D, p: Projectile, t: number) {
  if (drawShotLook(ctx, p.move.id, p, t)) return;
  const def = colsOf(p.move.id, p.power);
  const ang = Math.atan2(p.vy, p.vx);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  glowDot(ctx, p.x, p.y, p.r * 2.4, shade(def.glow, 0, 0.55), shade(def.color, 0, 0));
  ctx.restore();
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  switch (p.shape) {
    case "shard":
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(p.r * 1.8, 0); ctx.lineTo(0, p.r * 0.55); ctx.lineTo(-p.r * 1.2, 0); ctx.lineTo(0, -p.r * 0.55);
      ctx.closePath();
      ctx.fillStyle = def.glow;
      ctx.fill();
      ctx.stroke();
      break;
    case "rock":
      ctx.rotate(p.rot);
      ctx.beginPath();
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const rr = p.r * (0.8 + ((i * 37) % 5) * 0.07);
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fillStyle = p.power === "terra" ? DEF_BY_ID.terra.color : "hsl(20 30% 40%)";
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "hsl(30 30% 70% / 0.6)";
      ctx.beginPath();
      ctx.arc(-p.r * 0.25, -p.r * 0.25, p.r * 0.25, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "blade":
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.arc(-p.r * 0.6, 0, p.r * 1.4, -1.1, 1.1);
      ctx.arc(-p.r * 1.1, 0, p.r * 1.3, 1.0, -1.0, true);
      ctx.closePath();
      ctx.fillStyle = def.glow;
      ctx.fill();
      ctx.stroke();
      break;
    case "wave": {
      const dir = p.vx >= 0 ? 1 : -1;
      ctx.scale(dir, 1);
      ctx.beginPath();
      ctx.moveTo(-p.r * 0.6, -p.r * 1.6);
      ctx.quadraticCurveTo(p.r * 1.3, 0, -p.r * 0.6, p.r * 1.6);
      ctx.quadraticCurveTo(p.r * 0.3, 0, -p.r * 0.6, -p.r * 1.6);
      ctx.fillStyle = def.color;
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = def.glow;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-p.r * 0.3, -p.r * 1.1);
      ctx.quadraticCurveTo(p.r * 0.8, 0, -p.r * 0.3, p.r * 1.1);
      ctx.stroke();
      break;
    }
    case "disc":
      ctx.rotate(p.rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, p.r * 1.2, p.r * 0.5, 0, 0, Math.PI * 2);
      ctx.fillStyle = def.color;
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = def.glow;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.r * 0.5, p.r * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    default:
      ctx.beginPath();
      ctx.arc(0, 0, p.r, 0, Math.PI * 2);
      ctx.fillStyle = def.color;
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-p.r * 0.2, -p.r * 0.2, p.r * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = def.glow;
      ctx.fill();
      if (p.power === "electro") {
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          const a = Math.random() * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * p.r, Math.sin(a) * p.r);
          ctx.lineTo(Math.cos(a + 0.3) * p.r * 1.7, Math.sin(a + 0.3) * p.r * 1.7);
          ctx.stroke();
        }
      }
  }
  ctx.restore();
}

function drawBeam(ctx: CanvasRenderingContext2D, b: Beam, t: number) {
  const def = colsOf(b.look, b.power);
  const a = clamp(b.life / b.max, 0, 1);
  if (b.look && drawBeamLook(ctx, b.look, b, a, t)) return;
  const ex = b.x + Math.cos(b.ang) * b.len, ey = b.y + Math.sin(b.ang) * b.len;
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    if (b.jag) {
      const n = Math.max(4, Math.floor(b.len / 30));
      for (let i = 1; i < n; i++) {
        const t = i / n;
        const off = rand(-14, 14);
        ctx.lineTo(b.x + (ex - b.x) * t - Math.sin(b.ang) * off, b.y + (ey - b.y) * t + Math.cos(b.ang) * off);
      }
    }
    ctx.lineTo(ex, ey);
  };
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = a;
  path();
  ctx.strokeStyle = shade(def.color, 0, 0.45);
  ctx.lineWidth = b.width * 1.8;
  ctx.stroke();
  ctx.strokeStyle = def.glow;
  ctx.lineWidth = b.width * 0.7;
  ctx.stroke();
  ctx.strokeStyle = "white";
  ctx.lineWidth = b.width * 0.25;
  ctx.stroke();
  glowDot(ctx, b.x, b.y, b.width * 1.6, "white", shade(def.color, 0, 0));
  glowDot(ctx, ex, ey, b.width * 1.2, def.glow, shade(def.color, 0, 0));
  ctx.restore();
}

function drawZone(ctx: CanvasRenderingContext2D, g: Game, z: Zone) {
  const def = colsOf(z.move.id, z.power);
  const r = z.move.radius ?? 100;
  const a = clamp(Math.min(z.life, z.max - z.life) * 4, 0, 1);
  if (drawZoneLook(ctx, z.move.id, z.x, GROUND, r, a, g.t)) return;
  ctx.save();
  ctx.globalAlpha = a;
  if (z.move.pullIn) {
    const cy = GROUND - 60;
    glowDot(ctx, z.x, cy, r * 0.9, shade(def.glow, 0, 0.5), shade(def.color, 0, 0));
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(z.x, cy, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = def.glow;
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const rr = ((g.t * 70 + i * 30) % 90) + 10;
      ctx.globalAlpha = a * (1 - rr / 100);
      ctx.beginPath();
      ctx.arc(z.x, cy, 100 - rr, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else {
    const dome = ctx.createRadialGradient(z.x, GROUND, 0, z.x, GROUND, r);
    const dark = z.power === "umbra";
    dome.addColorStop(0, dark ? "hsl(270 50% 12% / 0.75)" : shade(def.color, 0, 0.45));
    dome.addColorStop(1, shade(def.color, 0, 0));
    ctx.fillStyle = dome;
    ctx.beginPath();
    ctx.ellipse(z.x, GROUND, r, r * 0.75, 0, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = def.glow;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(z.x, GROUND + 2, r, 12, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (z.power === "chrono") {
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 4;
      const cy = GROUND - r * 0.4;
      ctx.beginPath();
      ctx.arc(z.x, cy, 22, 0, Math.PI * 2);
      ctx.moveTo(z.x, cy);
      ctx.lineTo(z.x + Math.cos(g.t * 4) * 16, cy + Math.sin(g.t * 4) * 16);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawEruption(ctx: CanvasRenderingContext2D, e: Eruption) {
  const def = DEF_BY_ID[e.power];
  const own = eruptionColors(e.move.id);
  const col = own?.a ?? def.color, glo = own?.b ?? def.glow;
  const r = e.move.radius ?? 44;
  if (!e.fired) {
    const pulse = 0.5 + 0.5 * Math.sin(e.t * 40);
    ctx.fillStyle = shade(col, 0, 0.3 + pulse * 0.3);
    ctx.beginPath();
    ctx.ellipse(e.x, GROUND + 2, r, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = glo;
    ctx.lineWidth = 2;
    ctx.stroke();
    return;
  }
  const t = e.t - 0.3;
  const grow = clamp(t / 0.1, 0, 1);
  const fade = clamp(1 - (t - 0.3) / 0.25, 0, 1);
  const h = 190 * grow;
  ctx.save();
  ctx.globalAlpha = fade;
  if (drawEruptionLook(ctx, e.move.id, e.x, GROUND, r, h, e.t)) { ctx.restore(); return; }
  if (e.power === "terra" || e.power === "cryo") {
    const fill = e.power === "terra" ? def.color : def.glow;
    for (const [dx, sc] of [[-r * 0.55, 0.6], [r * 0.55, 0.7], [0, 1]] as const) {
      ctx.beginPath();
      ctx.moveTo(e.x + dx - r * 0.5 * sc, GROUND + 4);
      ctx.lineTo(e.x + dx, GROUND - h * sc);
      ctx.lineTo(e.x + dx + r * 0.5 * sc, GROUND + 4);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  } else {
    ctx.globalCompositeOperation = "lighter";
    const col = ctx.createLinearGradient(0, GROUND, 0, GROUND - h);
    col.addColorStop(0, def.glow);
    col.addColorStop(0.6, shade(def.color, 0, 0.7));
    col.addColorStop(1, shade(def.color, 0, 0));
    ctx.fillStyle = col;
    const wob = Math.sin(e.t * 50) * 4;
    ctx.beginPath();
    ctx.ellipse(e.x, GROUND - h / 2, r * 0.7 + wob, h / 2 + 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shade("hsl(0 0% 100%)", 0, 0.6);
    ctx.beginPath();
    ctx.ellipse(e.x, GROUND - h / 2, r * 0.22, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  const a = clamp(p.life / p.max, 0, 1);
  ctx.globalAlpha = p.shape === "smoke" ? a * 0.55 : a;
  ctx.globalCompositeOperation = p.add ? "lighter" : "source-over";
  switch (p.shape) {
    case "dot":
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.4 + a * 0.6), 0, Math.PI * 2);
      ctx.fill();
      break;
    case "smoke":
      ctx.fillStyle = "hsl(270 45% 14%)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (2 - a), 0, Math.PI * 2);
      ctx.fill();
      break;
    case "spark": {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      const sp = Math.hypot(p.vx, p.vy) || 1;
      const len = Math.min(18, sp * 0.04) + 4;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - (p.vx / sp) * len, p.y - (p.vy / sp) * len);
      ctx.stroke();
      break;
    }
    case "shard":
    case "chunk":
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      if (p.shape === "shard") { ctx.moveTo(p.size, 0); ctx.lineTo(0, p.size * 0.4); ctx.lineTo(-p.size, 0); ctx.lineTo(0, -p.size * 0.4); }
      else ctx.rect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
      break;
    case "ring":
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.rot === 1 ? 6 * a : 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.rot === 1 || p.size > 14 ? p.size * (1.1 - a * 0.6) : p.size, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "plus":
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size, p.y - p.size * 0.3, p.size * 2, p.size * 0.6);
      ctx.fillRect(p.x - p.size * 0.3, p.y - p.size, p.size * 0.6, p.size * 2);
      break;
    default:
      drawSpark(ctx, p.shape, p.x, p.y, p.size, p.rot, p.color, a, p.vx, p.vy);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

function outlinedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, fill: string, align: CanvasTextAlign = "center") {
  ctx.font = `700 ${size}px Fredoka, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(4, size * 0.18);
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

function drawHud(ctx: CanvasRenderingContext2D, g: Game) {
  if (g.duel) {
    const bw = 380, bh = 24, top = 24;
    g.fighters.forEach((f, i) => {
      const left = i === 0;
      const x0 = left ? 30 : W - 30 - bw;
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.roundRect(x0 - 4, top - 4, bw + 8, bh + 8, 8);
      ctx.fill();
      ctx.fillStyle = "hsl(250 20% 30%)";
      ctx.fillRect(x0, top, bw, bh);
      const trail = (bw * Math.max(0, f.hpTrail)) / f.maxHp;
      const cur = (bw * Math.max(0, f.hp)) / f.maxHp;
      ctx.fillStyle = "hsl(0 85% 60%)";
      ctx.fillRect(left ? x0 + bw - trail : x0, top, trail, bh);
      const grd = ctx.createLinearGradient(0, top, 0, top + bh);
      grd.addColorStop(0, shade(f.def.glow, 4));
      grd.addColorStop(1, f.def.color);
      ctx.fillStyle = grd;
      ctx.fillRect(left ? x0 + bw - cur : x0, top, cur, bh);
      ctx.fillStyle = "hsl(0 0% 100% / 0.35)";
      ctx.fillRect(x0, top + 3, bw, 4);
      outlinedText(ctx, f.def.name, left ? x0 : x0 + bw, top + bh + 22, 22, "white", left ? "left" : "right");
      outlinedText(ctx, `${Math.ceil(Math.max(0, f.hp))}`, left ? x0 + bw - 10 : x0 + 10, top + bh / 2 + 1, 16, "white", left ? "right" : "left");
    });
    ctx.fillStyle = "hsl(46 100% 62%)";
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(W / 2, top - 8); ctx.lineTo(W / 2 + 34, top + 12); ctx.lineTo(W / 2, top + 32); ctx.lineTo(W / 2 - 34, top + 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    outlinedText(ctx, "VS", W / 2, top + 12, 20, "white");
  } else {
    const boss = g.fighters.find((f) => f.jugg);
    if (boss) drawBossBar(ctx, boss);
    for (const f of g.fighters) {
      if (!f.alive || f.jugg || arriving(g, f)) continue;
      const bw = 46 * f.scale, y = f.y - bodyH(f) - 24 * f.scale;
      const tc = f.team >= 0 ? TEAM_COLORS[f.team % TEAM_COLORS.length] : null;
      ctx.fillStyle = INK;
      ctx.fillRect(f.x - bw / 2 - 2, y - 2, bw + 4, 9);
      if (tc) { ctx.strokeStyle = tc; ctx.lineWidth = 2; ctx.strokeRect(f.x - bw / 2 - 3, y - 3, bw + 6, 11); }
      ctx.fillStyle = "hsl(0 85% 60%)";
      ctx.fillRect(f.x - bw / 2, y, (bw * f.hpTrail) / f.maxHp, 5);
      ctx.fillStyle = f.def.color;
      ctx.fillRect(f.x - bw / 2, y, (bw * Math.max(0, f.hp)) / f.maxHp, 5);
      outlinedText(ctx, f.def.name, f.x, y - 12, 15, tc ?? "white");
    }
  }
}

/** The juggernaut's long health bar across the top of the arena. */
function drawBossBar(ctx: CanvasRenderingContext2D, f: Fighter) {
  const bw = 520, bh = 22, x0 = (W - bw) / 2, top = 22;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.roundRect(x0 - 5, top - 5, bw + 10, bh + 10, 9);
  ctx.fill();
  ctx.fillStyle = "hsl(250 20% 30%)";
  ctx.fillRect(x0, top, bw, bh);
  ctx.fillStyle = "hsl(0 85% 60%)";
  ctx.fillRect(x0, top, (bw * Math.max(0, f.hpTrail)) / f.maxHp, bh);
  const grd = ctx.createLinearGradient(0, top, 0, top + bh);
  grd.addColorStop(0, shade(f.def.glow, 4));
  grd.addColorStop(1, f.def.color);
  ctx.fillStyle = grd;
  ctx.fillRect(x0, top, (bw * Math.max(0, f.hp)) / f.maxHp, bh);
  ctx.fillStyle = "hsl(0 0% 100% / 0.35)";
  ctx.fillRect(x0, top + 3, bw, 4);
  // a notch at half: the health it would have without the juggernaut bonus
  ctx.fillStyle = INK;
  ctx.fillRect(x0 + bw / 2 - 1.5, top, 3, bh);
  outlinedText(ctx, `JUGGERNAUT  ${f.def.name.toUpperCase()}`, x0, top + bh + 20, 18, f.def.glow, "left");
  outlinedText(ctx, `${Math.ceil(Math.max(0, f.hp))} / ${f.maxHp}`, x0 + bw, top + bh + 20, 16, "white", "right");
}

/** A team-coloured disc on the floor under a fighter, shrinking as they rise. */
function drawTeamRing(ctx: CanvasRenderingContext2D, f: Fighter) {
  const lift = clamp((GROUND - f.y) / 300, 0, 0.7);
  const rx = 30 * f.scale * (1 - lift), ry = 8 * f.scale * (1 - lift);
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = TEAM_COLORS[f.team % TEAM_COLORS.length];
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(f.x, GROUND + 4, rx, ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Moves drawn next take their owner's rage colours, if they are raging. */
function tintBy(f: Fighter | undefined) {
  const r = rageOf(f);
  setLookTint(r ? { a: r.a, b: r.b } : null);
}

export function drawScene(ctx: CanvasRenderingContext2D, g: Game, backdrop: HTMLCanvasElement) {
  ctx.save();
  if (g.shake > 0) ctx.translate(rand(-g.shake, g.shake), rand(-g.shake, g.shake) * 0.6);
  const cut = g.cut;
  const hero = cut ? g.fighters[cut.key] : null;
  const ck = cut ? cut.t / cut.max : 0;
  // the camera pushes in on the raging fighter, then pulls back out
  const zoom = cut ? 1 + 0.45 * Math.min(1, ck / 0.18) * Math.min(1, (1 - ck) / 0.12) : 1;
  if (hero && zoom > 1) {
    const c = center(hero);
    const fx = clamp(c.x, W / (2 * zoom), W - W / (2 * zoom));
    const fy = clamp(c.y, H / (2 * zoom), H - H / (2 * zoom));
    ctx.translate(W / 2, H / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-fx, -fy);
  }
  ctx.drawImage(backdrop, -12, -8, W + 24, H + 16);
  drawRealm(ctx, g);
  if (g.eclipseUntil > g.t) drawEclipse(ctx, g);
  for (const z of g.zones) { tintBy(g.fighters[z.owner]); drawZone(ctx, g, z); }
  for (const e of g.eruptions) if (!e.fired) { tintBy(g.fighters[e.owner]); drawEruption(ctx, e); }
  setLookTint(null);
  for (const f of g.fighters) if (f.alive && f.team >= 0 && !arriving(g, f)) drawTeamRing(ctx, f);
  if (g.intro) for (const f of g.fighters) drawIntroLayer(ctx, g, f, "back");
  for (const f of g.fighters) if (!f.alive) drawFighter(ctx, g, f);
  for (const f of g.fighters) if (f.alive && f !== hero) drawGhosts(ctx, f);
  for (const f of g.fighters) if (f.alive && f !== hero) { if (g.intro) drawIntroFighter(ctx, g, f); else drawFighter(ctx, g, f); }
  if (g.intro) for (const f of g.fighters) drawIntroLayer(ctx, g, f, "front");
  for (const f of g.fighters) {
    const a = f.act;
    if (f.alive && a && a.move.kind === "dash" && a.fired && a.t < a.move.wind + a.move.act) { tintBy(f); drawRushLook(ctx, a.move.id, f.x, f.y, f.scale, f.facing, g.t); }
  }
  for (const e of g.eruptions) if (e.fired) { tintBy(g.fighters[e.owner]); drawEruption(ctx, e); }
  for (const p of g.projectiles) { tintBy(g.fighters[p.owner]); drawProjectile(ctx, p, g.t); }
  for (const b of g.beams) { tintBy(g.fighters[b.owner]); drawBeam(ctx, b, g.t); }
  setLookTint(null);
  if (hero) drawCutBackdrop(ctx, hero, ck, g.t + (cut?.t ?? 0));
  if (hero) { drawGhosts(ctx, hero); drawFighter(ctx, g, hero); }
  for (const a of g.annis) {
    const owner = g.fighters[a.owner];
    drawAnnihilation(ctx, a.move.id, a.x, a.y, (a.move.radius ?? 70) * (owner?.scale ?? 1), a.t / ANNI_TIME, g.t);
  }
  for (const x of g.fx) drawFx(ctx, x, g.t);
  for (const w of g.waves) drawWave(ctx, w);
  for (const p of g.particles) drawParticle(ctx, p);
  for (const t of g.pops) {
    ctx.globalAlpha = clamp(t.life / t.max * 2, 0, 1);
    outlinedText(ctx, t.text, t.x, t.y, t.size, t.color);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  if (g.stopUntil > g.t) drawTimeStop(ctx, g);
  if (g.flash > 0) {
    ctx.fillStyle = `hsl(0 0% 100% / ${clamp(g.flash / 0.4, 0, 0.9)})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (hero && cut) {
    drawCutTitles(ctx, hero, ck);
    return;
  }
  drawHud(ctx, g);
  if (!g.preview && !g.intro && g.t < 1.1) {
    const k = clamp(g.t / 0.2, 0, 1);
    outlinedText(ctx, g.t < 0.55 ? "READY" : "FIGHT!", W / 2, H / 2 - 40, 60 + 30 * k, g.t < 0.55 ? "white" : "hsl(46 100% 62%)");
  }
  if (g.ending > 0) {
    const k = clamp((g.t - g.ending) / 0.25, 0, 1);
    ctx.fillStyle = `hsl(0 0% 100% / ${0.35 * (1 - k)})`;
    ctx.fillRect(0, 0, W, H);
    outlinedText(ctx, "K.O.", W / 2, H / 2 - 40, 70 + 40 * k, "hsl(0 85% 60%)");
  }
}

/** A fighter during its entrance: moved, squashed, faded or tinted as its entrance says. */
function drawIntroFighter(ctx: CanvasRenderingContext2D, g: Game, f: Fighter) {
  const u = introU(g, f);
  if (u <= 0) return;
  const b = INTROS[f.def.id].body(Math.min(1, u), f.scale);
  if (b.alpha <= 0.001) return;
  const s = f.scale;
  // the floor shadow grows as the body comes down to it
  const lift = clamp(-b.dy / 320, 0, 1);
  ctx.fillStyle = `hsl(250 40% 15% / ${0.28 * (1 - lift * 0.7) * b.alpha})`;
  ctx.beginPath();
  ctx.ellipse(f.x + b.dx, GROUND + 2, 26 * s * (1 - lift * 0.5) * b.sx, 6 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  if (b.clip) {
    ctx.beginPath();
    ctx.rect(-W, -H, W * 3, GROUND + 3 + H);
    ctx.clip();
  }
  const one = (dx: number, alpha: number) => {
    ctx.save();
    ctx.translate(f.x + b.dx + dx, f.y + b.dy);
    ctx.scale(b.sx, b.sy);
    ctx.translate(-f.x, -f.y);
    drawFighter(ctx, g, f, { alpha, shadow: false });
    const sa = b.solidA ?? 0;
    if (b.solid && sa > 0.01) drawFighter(ctx, g, f, { alpha: alpha * sa, solid: b.solid, shadow: false });
    ctx.restore();
  };
  if (b.echo && b.echo.alpha > 0.01) for (const d of [-1, 1]) one(d * b.echo.spread, b.echo.alpha);
  one(0, b.alpha);
  ctx.restore();
  ctx.globalAlpha = 1;
}

/** An entrance's own drawing, behind or in front of the body. */
function drawIntroLayer(ctx: CanvasRenderingContext2D, g: Game, f: Fighter, which: "back" | "front") {
  const u = introU(g, f);
  if (u <= 0 || u >= 1 || !g.intro) return;
  const sp = INTROS[f.def.id];
  const draw = sp[which];
  if (!draw) return;
  ctx.save();
  draw({ ctx, x: f.x, y: f.y, ground: GROUND, s: f.scale, u, t: g.intro.t - f.spawnAt, face: f.facing, body: sp.body(u, f.scale) });
  ctx.restore();
}

/** Behind the raging fighter during the cutscene: the arena darkens and speed lines burst from them. */
function drawCutBackdrop(ctx: CanvasRenderingContext2D, f: Fighter, k: number, t: number) {
  const rg = RAGE[f.def.id];
  if (!rg) return;
  const fade = Math.min(1, k / 0.12) * Math.min(1, (1 - k) / 0.1);
  ctx.save();
  ctx.fillStyle = `hsl(255 45% 7% / ${0.62 * fade})`;
  ctx.fillRect(-W, -H, W * 3, H * 3);
  const c = center(f);
  ctx.globalAlpha = fade;
  const glow = ctx.createRadialGradient(c.x, c.y, 10, c.x, c.y, 260);
  glow.addColorStop(0, shade(rg.glow, 0, 0.7));
  glow.addColorStop(0.4, shade(rg.a, 0, 0.3));
  glow.addColorStop(1, shade(rg.a, 0, 0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(c.x, c.y, 260, 0, Math.PI * 2);
  ctx.fill();
  // speed lines
  ctx.lineCap = "round";
  const turn = Math.floor(t * 18);
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2 + ((turn * 7 + i * 13) % 10) * 0.02;
    const r0 = 90 + ((turn + i * 5) % 7) * 12;
    ctx.strokeStyle = i % 3 === 0 ? (rg.dark ?? shade(rg.a, -10)) : shade(i % 2 ? rg.a : rg.b, 0, 0.75);
    ctx.lineWidth = 2 + (i % 4);
    ctx.beginPath();
    ctx.moveTo(c.x + Math.cos(a) * r0, c.y + Math.sin(a) * r0);
    ctx.lineTo(c.x + Math.cos(a) * 640, c.y + Math.sin(a) * 640);
    ctx.stroke();
  }
  // flash as the rage breaks loose
  if (k > 0.6 && k < 0.75) {
    ctx.globalAlpha = 1 - (k - 0.6) / 0.15;
    ctx.fillStyle = rg.dark && f.def.id === "electro" && Math.floor(t * 30) % 2 ? rg.dark : "white";
    ctx.fillRect(-W, -H, W * 3, H * 3);
  }
  ctx.restore();
}

/** Letterbox bars and the fighter's name sliding in over the cutscene. */
function drawCutTitles(ctx: CanvasRenderingContext2D, f: Fighter, k: number) {
  const rg = RAGE[f.def.id];
  if (!rg) return;
  const bar = 64 * Math.min(1, k / 0.1) * Math.min(1, (1 - k) / 0.08);
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, W, bar);
  ctx.fillRect(0, H - bar, W, bar);
  const enter = (from: number) => 1 - Math.pow(1 - clamp((k - from) / 0.14, 0, 1), 3);
  const leave = clamp((1 - k) / 0.08, 0, 1);
  const c = center(f);
  const left = c.x > W / 2;
  const x = left ? 60 : W - 60;
  const align: CanvasTextAlign = left ? "left" : "right";
  const slide = (e: number) => (left ? -1 : 1) * (1 - e) * 360;
  ctx.globalAlpha = leave;
  const e1 = enter(0.08), e2 = enter(0.2), e3 = enter(0.62);
  outlinedText(ctx, f.def.name.toUpperCase(), x + slide(e1), H * 0.3, 56, "white", align);
  outlinedText(ctx, "RAGE MODE", x + slide(e2), H * 0.3 + 58, 44, rg.glow, align);
  if (e3 > 0) {
    ctx.globalAlpha = leave * e3;
    outlinedText(ctx, rg.title, x, H * 0.3 + 104, 26 + 6 * (1 - e3), f.def.id === "electro" ? "white" : rg.b, align);
  }
  ctx.globalAlpha = 1;
}
