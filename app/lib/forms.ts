// Every original fighter has one form it breaks into once per fight when pushed low: four Rage Modes,
// four Awakened, four Mastery and four Mystic. Pyro goes one step further, from Blue Flame into Perfected Flame.
// A form recolours the fighter and its moves, changes its stats, adds a passive and adds 2 new moves.
// Shared by the arena engine (the transformation and the fight) and the Fighters page (who has what).

import type { Move, Power } from "./fighters";

export type FormKind = "rage" | "perfected" | "awakened" | "mastery" | "mystic";

export type Form = {
  power: Power;
  kind: FormKind;
  /** The form's own name, shown under the mode title in the cutscene. */
  title: string;
  /** One line for the Fighters page. */
  blurb: string;
  /** Body colour and glow while in the form. */
  body: string; glow: string;
  /** Its moves' new colour and highlight. */
  a: string; b: string;
  /** A dark streak mixed in (Electro's black lightning). */
  dark?: string;
  /** Fires once the fighter drops to this share of health. */
  at: number;
  dmg: number; kb: number; cd: number; speed: number; act: number;
  /** Passives: health back per second, chance to slip a hit, share of damage dealt drained back, share of damage taken. */
  regen?: number; dodge?: number; drain?: number; guard?: number;
  /** The new moves it fights with on top of its own. */
  moves: Move[];
};

export const FORM_NAME: Record<FormKind, string> = {
  rage: "Rage Mode",
  perfected: "Perfected Flame",
  awakened: "Awakened Mode",
  mastery: "Mastery Mode",
  mystic: "Mystic Mode",
};

/** The big title the cutscene shouts. */
export const FORM_SHOUT: Record<FormKind, string> = {
  rage: "RAGE MODE",
  perfected: "PERFECTED FLAME",
  awakened: "AWAKENED",
  mastery: "MASTERY MODE",
  mystic: "MYSTIC MODE",
};

const M = (m: Omit<Move, "wind" | "act" | "rec"> & Partial<Pick<Move, "wind" | "act" | "rec">>): Move => ({
  wind: 0.18,
  act: 0.12,
  rec: 0.22,
  ...m,
});

const RAGE_STATS = { at: 0.34 };
const AWAKE = { at: 0.4, regen: 1.6 };
const MASTER = { at: 0.45, dodge: 0.22 };
const MYSTIC = { at: 0.42, drain: 0.2 };

export const FORMS: Record<Power, Form> = {
  // ----- Rage Mode: raw fury -----
  pyro: {
    power: "pyro", kind: "rage", title: "BLUE FLAME", ...RAGE_STATS,
    blurb: "His fire turns blue and hotter. Every hit burns.",
    body: "hsl(218 88% 56%)", glow: "hsl(195 100% 74%)", a: "hsl(222 100% 58%)", b: "hsl(190 100% 80%)",
    dmg: 1.3, kb: 1.1, cd: 0.8, speed: 1.1, act: 1.1,
    moves: [
      M({ id: "blue-comet", name: "Blue Comet", kind: "projectile", anim: "thrust", range: 600, minRange: 90, cd: 2.6, dmg: 14, speed: 700, size: 16, status: "burn", statusDur: 2.5, kb: 260 }),
      M({ id: "azure-inferno", name: "Azure Inferno", kind: "burst", anim: "slam", range: 150, cd: 6.5, dmg: 18, radius: 175, kb: 480, lift: -320, status: "burn", statusDur: 3, wind: 0.32, rec: 0.35 }),
    ],
  },
  electro: {
    power: "electro", kind: "rage", title: "BLACK LIGHTNING", ...RAGE_STATS,
    blurb: "White lightning with a black aura. Much faster, and he juggles in the air.",
    body: "hsl(0 0% 97%)", glow: "hsl(0 0% 100%)", a: "hsl(0 0% 100%)", b: "hsl(215 40% 94%)", dark: "hsl(265 45% 7%)",
    dmg: 1.15, kb: 1, cd: 0.45, speed: 1.6, act: 1.45,
    moves: [
      M({ id: "black-bolt-rush", name: "Black Bolt Rush", kind: "dash", anim: "lunge", range: 340, cd: 3.2, dmg: 13, dist: 340, act: 0.25, kb: 320, lift: -220, status: "stun", statusDur: 0.35 }),
      M({ id: "thunder-judgement", name: "Thunder Judgement", kind: "rain", anim: "raise", range: 520, cd: 6, dmg: 9, count: 7, radius: 160, status: "stun", statusDur: 0.35, wind: 0.3, rec: 0.3 }),
    ],
  },
  aero: {
    power: "aero", kind: "rage", title: "STORM FURY", ...RAGE_STATS,
    blurb: "Storm winds around him hit harder, throw further and gust every second or so.",
    body: "hsl(168 78% 36%)", glow: "hsl(150 100% 80%)", a: "hsl(166 88% 34%)", b: "hsl(146 100% 82%)",
    dmg: 1.5, kb: 1.7, cd: 0.8, speed: 1.15, act: 1.1,
    moves: [
      M({ id: "hurricane-blades", name: "Hurricane Blades", kind: "projectile", anim: "thrust", range: 560, minRange: 80, cd: 2.4, dmg: 7, speed: 720, size: 11, count: 3, spread: 0.16, pierce: true, shape: "blade" }),
      M({ id: "hurricane-eye", name: "Hurricane Eye", kind: "zone", anim: "spin", range: 280, cd: 7, dmg: 6, radius: 150, dur: 3.5, pullIn: 140, wind: 0.3 }),
    ],
  },
  terra: {
    power: "terra", kind: "rage", title: "MAGMA CORE", ...RAGE_STATS, guard: 0.7,
    blurb: "His rock splits open over molten stone. He takes less damage and his fists burn.",
    body: "hsl(12 70% 34%)", glow: "hsl(28 100% 60%)", a: "hsl(14 90% 46%)", b: "hsl(40 100% 64%)", dark: "hsl(15 30% 12%)",
    dmg: 1.35, kb: 1.3, cd: 0.8, speed: 1.05, act: 1.05,
    moves: [
      M({ id: "molten-fist", name: "Molten Fist", kind: "melee", anim: "uppercut", range: 78, cd: 1.1, dmg: 12, kb: 300, lift: -360, status: "burn", statusDur: 2 }),
      M({ id: "volcanic-rupture", name: "Volcanic Rupture", kind: "eruption", anim: "slam", range: 460, minRange: 60, cd: 6, dmg: 15, radius: 44, count: 3, lift: -640, status: "burn", statusDur: 2, wind: 0.36 }),
    ],
  },

  // ----- Awakened Mode: a hidden power wakes up, health slowly comes back -----
  umbra: {
    power: "umbra", kind: "awakened", title: "ABYSS", ...AWAKE,
    blurb: "The shadow wakes up hungry. Darkness mends him while he fights.",
    body: "hsl(276 70% 18%)", glow: "hsl(300 100% 66%)", a: "hsl(282 80% 30%)", b: "hsl(310 100% 72%)", dark: "hsl(270 60% 6%)",
    dmg: 1.25, kb: 1.15, cd: 0.75, speed: 1.15, act: 1.15,
    moves: [
      M({ id: "abyssal-maw", name: "Abyssal Maw", kind: "pull", anim: "cast", range: 460, minRange: 100, cd: 4.5, dmg: 12, status: "blind", statusDur: 1.2 }),
      M({ id: "eclipse-fang", name: "Eclipse Fang", kind: "blink", anim: "lunge", range: 520, minRange: 90, cd: 4, dmg: 18, kb: 360, lift: -260 }),
    ],
  },
  lux: {
    power: "lux", kind: "awakened", title: "RADIANCE", ...AWAKE,
    blurb: "Light pours out of her. Her shots blind and she heals as she glows.",
    body: "hsl(46 100% 70%)", glow: "hsl(52 100% 92%)", a: "hsl(44 100% 62%)", b: "hsl(0 0% 100%)",
    dmg: 1.25, kb: 1.1, cd: 0.75, speed: 1.15, act: 1.15,
    moves: [
      M({ id: "solar-lance", name: "Solar Lance", kind: "beam", anim: "thrust", range: 460, minRange: 60, cd: 3.4, dmg: 17, act: 0.32, status: "blind", statusDur: 1.2 }),
      M({ id: "heavens-gate", name: "Heaven's Gate", kind: "rain", anim: "raise", range: 520, cd: 6.5, dmg: 9, count: 7, radius: 160, status: "blind", statusDur: 0.8, wind: 0.32 }),
    ],
  },
  gravi: {
    power: "gravi", kind: "awakened", title: "EVENT HORIZON", ...AWAKE,
    blurb: "Gravity bends around him. His pull grows stronger and he recovers as he fights.",
    body: "hsl(250 60% 22%)", glow: "hsl(268 100% 76%)", a: "hsl(255 70% 36%)", b: "hsl(275 100% 82%)", dark: "hsl(250 50% 6%)",
    dmg: 1.25, kb: 1.2, cd: 0.75, speed: 1.1, act: 1.1,
    moves: [
      M({ id: "collapsing-star", name: "Collapsing Star", kind: "zone", anim: "cast", range: 360, cd: 7, dmg: 8, radius: 150, dur: 3.2, pullIn: 230, wind: 0.32 }),
      M({ id: "planet-crusher", name: "Planet Crusher", kind: "rain", anim: "slam", range: 500, cd: 7, dmg: 18, count: 2, radius: 90, wind: 0.4, rec: 0.35 }),
    ],
  },
  shift: {
    power: "shift", kind: "awakened", title: "PRIMAL FORM", ...AWAKE,
    blurb: "Her true shape breaks out: longer reach, harder hits and a body that knits back together.",
    body: "hsl(322 80% 50%)", glow: "hsl(150 100% 66%)", a: "hsl(318 85% 54%)", b: "hsl(150 100% 70%)",
    dmg: 1.25, kb: 1.2, cd: 0.75, speed: 1.15, act: 1.15,
    moves: [
      M({ id: "hydra-lash", name: "Hydra Lash", kind: "melee", anim: "lunge", range: 120, cd: 1.3, dmg: 13, kb: 300, lift: -200 }),
      M({ id: "chimera-burst", name: "Chimera Burst", kind: "burst", anim: "slam", range: 150, cd: 6, dmg: 16, radius: 170, kb: 440, lift: -300, status: "poison", statusDur: 2, wind: 0.3 }),
    ],
  },

  // ----- Mastery Mode: perfect control, slips some hits entirely -----
  cryo: {
    power: "cryo", kind: "mastery", title: "ABSOLUTE ZERO", ...MASTER,
    blurb: "Perfect control of the cold. Her ice freezes longer and she slips some hits.",
    body: "hsl(200 60% 88%)", glow: "hsl(190 100% 96%)", a: "hsl(205 90% 66%)", b: "hsl(0 0% 100%)",
    dmg: 1.2, kb: 1.1, cd: 0.7, speed: 1.15, act: 1.2,
    moves: [
      M({ id: "frozen-requiem", name: "Frozen Requiem", kind: "beam", anim: "cast", range: 440, minRange: 60, cd: 4, dmg: 14, act: 0.34, status: "freeze", statusDur: 0.9 }),
      M({ id: "glacial-lotus", name: "Glacial Lotus", kind: "eruption", anim: "raise", range: 440, minRange: 60, cd: 6, dmg: 13, radius: 42, count: 3, lift: -520, status: "freeze", statusDur: 0.7, wind: 0.34 }),
    ],
  },
  hydro: {
    power: "hydro", kind: "mastery", title: "FLOWING TIDE", ...MASTER,
    blurb: "He moves like water: hard to hit, and his waves roll along the floor.",
    body: "hsl(210 90% 46%)", glow: "hsl(186 100% 82%)", a: "hsl(215 90% 50%)", b: "hsl(185 100% 86%)",
    dmg: 1.2, kb: 1.25, cd: 0.7, speed: 1.2, act: 1.2,
    moves: [
      M({ id: "tsunami-crash", name: "Tsunami Crash", kind: "projectile", anim: "slam", range: 600, minRange: 90, cd: 4.5, dmg: 15, speed: 420, size: 26, ground: true, pierce: true, kb: 420, lift: -300 }),
      M({ id: "hydro-cutter", name: "Hydro Cutter", kind: "beam", anim: "thrust", range: 460, minRange: 60, cd: 3.2, dmg: 14, act: 0.28 }),
    ],
  },
  magneto: {
    power: "magneto", kind: "mastery", title: "IRON SOVEREIGN", ...MASTER,
    blurb: "Every scrap of metal answers him. Blades fly in sixes and he turns hits aside.",
    body: "hsl(220 14% 58%)", glow: "hsl(0 90% 64%)", a: "hsl(220 16% 62%)", b: "hsl(355 90% 66%)",
    dmg: 1.2, kb: 1.15, cd: 0.7, speed: 1.1, act: 1.2,
    moves: [
      M({ id: "thousand-blades", name: "Thousand Blades", kind: "projectile", anim: "cast", range: 560, minRange: 80, cd: 3, dmg: 5, speed: 760, size: 9, count: 6, spread: 0.1, shape: "blade" }),
      M({ id: "magnetic-storm", name: "Magnetic Storm", kind: "zone", anim: "raise", range: 320, cd: 7, dmg: 7, radius: 140, dur: 3.2, pullIn: 180, status: "slow", statusDur: 0.5, wind: 0.3 }),
    ],
  },
  toxi: {
    power: "toxi", kind: "mastery", title: "VENOM SAGE", ...MASTER,
    blurb: "Poison mastered, not just thrown. Three-headed spit and a garden of plague.",
    body: "hsl(96 70% 38%)", glow: "hsl(78 100% 66%)", a: "hsl(100 75% 40%)", b: "hsl(280 70% 70%)",
    dmg: 1.2, kb: 1.1, cd: 0.7, speed: 1.1, act: 1.2,
    moves: [
      M({ id: "hydra-venom", name: "Hydra Venom", kind: "projectile", anim: "thrust", range: 540, minRange: 80, cd: 2.6, dmg: 6, speed: 560, size: 11, count: 3, spread: 0.2, arc: true, status: "poison", statusDur: 2.5 }),
      M({ id: "plague-garden", name: "Plague Garden", kind: "zone", anim: "slam", range: 320, cd: 7, dmg: 7, radius: 160, dur: 4, status: "poison", statusDur: 1.5, wind: 0.3 }),
    ],
  },

  // ----- Mystic Mode: arcane power, every hit drains health back -----
  tele: {
    power: "tele", kind: "mystic", title: "ASTRAL GATE", ...MYSTIC,
    blurb: "Portals open to the stars. Every hit she lands pulls a little health back.",
    body: "hsl(262 80% 60%)", glow: "hsl(186 100% 80%)", a: "hsl(265 85% 62%)", b: "hsl(186 100% 82%)",
    dmg: 1.25, kb: 1.1, cd: 0.75, speed: 1.15, act: 1.15,
    moves: [
      M({ id: "starfall-portals", name: "Starfall Portals", kind: "rain", anim: "raise", range: 520, cd: 6, dmg: 9, count: 6, radius: 150, wind: 0.3 }),
      M({ id: "void-step", name: "Void Step", kind: "blink", anim: "kick", range: 520, minRange: 90, cd: 3.6, dmg: 16, kb: 340, lift: -280 }),
    ],
  },
  vita: {
    power: "vita", kind: "mystic", title: "WORLD TREE", ...MYSTIC,
    blurb: "Ancient roots wake under her. Her hits drain life and she can bloom herself back.",
    body: "hsl(140 60% 40%)", glow: "hsl(60 100% 78%)", a: "hsl(135 65% 40%)", b: "hsl(55 100% 76%)",
    dmg: 1.2, kb: 1.1, cd: 0.75, speed: 1.1, act: 1.15,
    moves: [
      M({ id: "verdant-wrath", name: "Verdant Wrath", kind: "eruption", anim: "slam", range: 460, minRange: 60, cd: 5.5, dmg: 15, radius: 46, count: 2, lift: -560, status: "slow", statusDur: 1, wind: 0.34 }),
      M({ id: "sacred-bloom", name: "Sacred Bloom", kind: "heal", anim: "raise", range: 2000, cd: 11, dmg: 0, heal: 18, below: 0.7, wind: 0.4, rec: 0.3 }),
    ],
  },
  chrono: {
    power: "chrono", kind: "mystic", title: "ETERNITY", ...MYSTIC,
    blurb: "He steps outside time. Clock hands fly in volleys and stolen seconds heal him.",
    body: "hsl(40 70% 52%)", glow: "hsl(180 90% 78%)", a: "hsl(38 80% 54%)", b: "hsl(180 100% 82%)",
    dmg: 1.2, kb: 1.1, cd: 0.7, speed: 1.15, act: 1.25,
    moves: [
      M({ id: "clockwork-judgement", name: "Clockwork Judgement", kind: "projectile", anim: "cast", range: 560, minRange: 80, cd: 3, dmg: 5, speed: 620, size: 10, count: 5, spread: 0.14, status: "slow", statusDur: 1 }),
      M({ id: "paradox-field", name: "Paradox Field", kind: "zone", anim: "raise", range: 320, cd: 7.5, dmg: 6, radius: 160, dur: 3.5, status: "stun", statusDur: 0.3, wind: 0.32 }),
    ],
  },
  psy: {
    power: "psy", kind: "mystic", title: "THIRD EYE", ...MYSTIC,
    blurb: "The third eye opens. Her mind attacks stun, and she feeds on the pain.",
    body: "hsl(290 70% 56%)", glow: "hsl(320 100% 82%)", a: "hsl(292 75% 58%)", b: "hsl(330 100% 84%)",
    dmg: 1.25, kb: 1.15, cd: 0.75, speed: 1.1, act: 1.15,
    moves: [
      M({ id: "mind-shatter", name: "Mind Shatter", kind: "beam", anim: "cast", range: 440, minRange: 60, cd: 3.6, dmg: 15, act: 0.3, status: "stun", statusDur: 0.45 }),
      M({ id: "psychic-maelstrom", name: "Psychic Maelstrom", kind: "burst", anim: "raise", range: 160, cd: 6.5, dmg: 16, radius: 185, kb: 300, lift: -480, wind: 0.32 }),
    ],
  },
};

/** Pyro's second step: from Blue Flame into red and blue fire at once. Stronger and faster than his Rage Mode. */
export const PERFECTED_FLAME: Form = {
  power: "pyro", kind: "perfected", title: "RED AND BLUE", at: 0.2, regen: 1,
  blurb: "Pushed past Blue Flame, he wields red and blue fire together. Stronger and faster than his Rage Mode.",
  body: "hsl(350 85% 52%)", glow: "hsl(0 0% 100%)", a: "hsl(2 95% 54%)", b: "hsl(214 100% 62%)",
  dmg: 1.65, kb: 1.3, cd: 0.55, speed: 1.4, act: 1.35,
  moves: [
    M({ id: "twin-dragon-flame", name: "Twin Dragon Flame", kind: "projectile", anim: "thrust", range: 620, minRange: 90, cd: 2.4, dmg: 13, speed: 760, size: 18, count: 2, spread: 0.12, pierce: true, status: "burn", statusDur: 3 }),
    M({ id: "crimson-azure-nova", name: "Crimson Azure Nova", kind: "burst", anim: "raise", range: 170, cd: 7, dmg: 24, radius: 230, kb: 560, lift: -420, status: "burn", statusDur: 3.5, wind: 0.36, rec: 0.35 }),
  ],
};

/** Every form a power has, in the order they come. */
export const formsOf = (p: Power): Form[] => (p === "pyro" ? [FORMS.pyro, PERFECTED_FLAME] : [FORMS[p]]);
