// The 16 fighters and their power moves. Shared by the arena engine and the Fighters page.

export type Power =
  | "pyro" | "cryo" | "electro" | "terra" | "aero" | "hydro" | "umbra" | "lux"
  | "gravi" | "tele" | "vita" | "toxi" | "chrono" | "magneto" | "psy" | "shift";

export type Role = "attacker" | "control" | "tank" | "support" | "trickster";

/** What a move does in the fight. */
export type MoveKind =
  | "melee"      // strike in front
  | "projectile" // fired from the hand
  | "beam"       // held ray from the hand
  | "burst"      // blast around the user
  | "dash"       // rush forward, hitting everyone in the path
  | "eruption"   // pillar bursts out of the ground under the target
  | "rain"       // falls from the sky around the target
  | "blink"      // vanish, reappear behind the target and strike
  | "heal"       // restore own health
  | "zone"       // lingering field on the ground
  | "pull"       // yank the target in
  | "mimic";     // borrow a move from the last power that hit

/** Body animation the stickman plays for a move. */
export type Anim = "jab" | "kick" | "cast" | "thrust" | "raise" | "slam" | "uppercut" | "spin" | "lunge";

export type StatusEffect = "burn" | "slow" | "stun" | "poison" | "blind" | "freeze";

export type Move = {
  id: string;
  name: string;
  kind: MoveKind;
  anim: Anim;
  /** Furthest horizontal distance at which the fighter starts it. */
  range: number;
  minRange?: number;
  cd: number;
  dmg: number;
  /** Seconds of wind-up, active time and recovery. */
  wind: number;
  act: number;
  rec: number;
  kb?: number;
  lift?: number;
  status?: StatusEffect;
  statusDur?: number;
  speed?: number;
  size?: number;
  count?: number;
  spread?: number;
  arc?: boolean;
  pierce?: boolean;
  shape?: "orb" | "shard" | "rock" | "blade" | "wave" | "disc";
  radius?: number;
  /** Zone lifetime in seconds. */
  dur?: number;
  /** Zone pull strength toward its centre. */
  pullIn?: number;
  heal?: number;
  dist?: number;
  crit?: number;
  /** Only used below this share of health (heals). */
  below?: number;
};

export type FighterDef = {
  id: Power;
  name: string;
  power: string;
  role: Role;
  ability: string;
  color: string;
  glow: string;
  hp: number;
  speed: number;
  moves: Move[];
};

const M = (m: Omit<Move, "wind" | "act" | "rec"> & Partial<Pick<Move, "wind" | "act" | "rec">>): Move => ({
  wind: 0.18,
  act: 0.12,
  rec: 0.22,
  ...m,
});

export const FIGHTERS: FighterDef[] = [
  {
    id: "pyro", name: "Pyro", power: "Pyrokinesis", role: "attacker",
    ability: "Burns everything it touches. Fire keeps hurting after the hit.",
    color: "hsl(14 92% 54%)", glow: "hsl(42 100% 60%)", hp: 100, speed: 92,
    moves: [
      M({ id: "ember-jab", name: "Ember Jab", kind: "melee", anim: "jab", range: 70, cd: 0.9, dmg: 7, kb: 140, status: "burn", statusDur: 1.5 }),
      M({ id: "fireball", name: "Fireball", kind: "projectile", anim: "cast", range: 560, minRange: 90, cd: 1.8, dmg: 10, speed: 540, size: 12, status: "burn", statusDur: 2 }),
      M({ id: "flame-pillar", name: "Flame Pillar", kind: "eruption", anim: "raise", range: 440, minRange: 60, cd: 4.5, dmg: 16, radius: 46, lift: -620, status: "burn", statusDur: 2.5, wind: 0.35 }),
      M({ id: "inferno-ring", name: "Inferno Ring", kind: "burst", anim: "slam", range: 120, cd: 6, dmg: 14, radius: 140, kb: 420, lift: -260, status: "burn", statusDur: 3, wind: 0.3, rec: 0.35 }),
    ],
  },
  {
    id: "cryo", name: "Cryo", power: "Cryokinesis", role: "control",
    ability: "Ice that slows enemies down and can freeze them solid.",
    color: "hsl(198 88% 62%)", glow: "hsl(190 100% 88%)", hp: 100, speed: 88,
    moves: [
      M({ id: "frost-palm", name: "Frost Palm", kind: "melee", anim: "thrust", range: 68, cd: 0.9, dmg: 7, kb: 160, status: "slow", statusDur: 1.5 }),
      M({ id: "ice-shard-volley", name: "Ice Shard Volley", kind: "projectile", anim: "cast", range: 520, minRange: 80, cd: 2, dmg: 5, speed: 640, size: 8, count: 3, spread: 0.12, shape: "shard", status: "slow", statusDur: 1.5 }),
      M({ id: "glacier-spike", name: "Glacier Spike", kind: "eruption", anim: "slam", range: 420, minRange: 60, cd: 5, dmg: 14, radius: 42, lift: -560, status: "freeze", statusDur: 0.9, wind: 0.35 }),
      M({ id: "frozen-floor", name: "Frozen Floor", kind: "zone", anim: "slam", range: 300, cd: 7, dmg: 4, radius: 120, dur: 3.5, status: "slow", statusDur: 0.6, wind: 0.3 }),
    ],
  },
  {
    id: "electro", name: "Electro", power: "Electrokinesis", role: "attacker",
    ability: "Fast lightning hits that stun for a split second.",
    color: "hsl(50 96% 54%)", glow: "hsl(58 100% 86%)", hp: 95, speed: 100,
    moves: [
      M({ id: "shock-knuckle", name: "Shock Knuckle", kind: "melee", anim: "jab", range: 70, cd: 0.8, dmg: 8, kb: 120, status: "stun", statusDur: 0.25, wind: 0.12 }),
      M({ id: "thunder-bolt", name: "Thunder Bolt", kind: "beam", anim: "cast", range: 400, minRange: 60, cd: 2.4, dmg: 12, act: 0.3, status: "stun", statusDur: 0.35 }),
      M({ id: "ball-lightning", name: "Ball Lightning", kind: "projectile", anim: "thrust", range: 600, minRange: 120, cd: 3.5, dmg: 11, speed: 260, size: 17, pierce: true, status: "stun", statusDur: 0.3 }),
      M({ id: "storm-call", name: "Storm Call", kind: "rain", anim: "raise", range: 480, cd: 6, dmg: 7, count: 5, radius: 130, status: "stun", statusDur: 0.3, wind: 0.35, rec: 0.3 }),
    ],
  },
  {
    id: "terra", name: "Terra", power: "Geokinesis", role: "tank",
    ability: "Slow but very tough. Rocks, spikes and ground-shaking stomps.",
    color: "hsl(28 52% 42%)", glow: "hsl(36 70% 70%)", hp: 150, speed: 70,
    moves: [
      M({ id: "boulder-fist", name: "Boulder Fist", kind: "melee", anim: "jab", range: 76, cd: 1.4, dmg: 12, kb: 320, wind: 0.24 }),
      M({ id: "rock-toss", name: "Rock Toss", kind: "projectile", anim: "slam", range: 520, minRange: 100, cd: 2.6, dmg: 13, speed: 470, size: 16, arc: true, shape: "rock", kb: 220, wind: 0.3 }),
      M({ id: "earth-spike", name: "Earth Spike", kind: "eruption", anim: "slam", range: 420, minRange: 50, cd: 4, dmg: 15, radius: 44, lift: -700, wind: 0.35 }),
      M({ id: "quake-stomp", name: "Quake Stomp", kind: "burst", anim: "slam", range: 150, cd: 5.5, dmg: 13, radius: 180, kb: 200, lift: -420, status: "stun", statusDur: 0.4, wind: 0.35, rec: 0.35 }),
    ],
  },
  {
    id: "aero", name: "Aero", power: "Aerokinesis", role: "control",
    ability: "The fastest fighter. Blows enemies away and launches them high.",
    color: "hsl(168 58% 58%)", glow: "hsl(170 80% 90%)", hp: 90, speed: 140,
    moves: [
      M({ id: "gale-kick", name: "Gale Kick", kind: "melee", anim: "kick", range: 82, cd: 1, dmg: 8, kb: 380 }),
      M({ id: "wind-blade", name: "Wind Blade", kind: "projectile", anim: "thrust", range: 560, minRange: 80, cd: 1.6, dmg: 8, speed: 720, size: 13, shape: "blade", pierce: true }),
      M({ id: "cyclone-spin", name: "Cyclone Spin", kind: "dash", anim: "spin", range: 260, cd: 4, dmg: 9, dist: 260, act: 0.45, lift: -380, kb: 160 }),
      M({ id: "updraft", name: "Updraft", kind: "eruption", anim: "raise", range: 440, minRange: 50, cd: 4.5, dmg: 8, radius: 52, lift: -860, wind: 0.3 }),
    ],
  },
  {
    id: "hydro", name: "Hydro", power: "Hydrokinesis", role: "attacker",
    ability: "Waves and water jets that push enemies across the arena.",
    color: "hsl(214 86% 52%)", glow: "hsl(196 100% 80%)", hp: 105, speed: 90,
    moves: [
      M({ id: "splash-jab", name: "Splash Jab", kind: "melee", anim: "jab", range: 70, cd: 0.9, dmg: 7, kb: 220 }),
      M({ id: "water-whip", name: "Water Whip", kind: "melee", anim: "lunge", range: 150, minRange: 50, cd: 1.6, dmg: 10, kb: 260, wind: 0.22 }),
      M({ id: "tidal-wave", name: "Tidal Wave", kind: "projectile", anim: "cast", range: 600, minRange: 60, cd: 4, dmg: 10, speed: 380, size: 28, shape: "wave", pierce: true, kb: 420, wind: 0.3 }),
      M({ id: "geyser", name: "Geyser", kind: "eruption", anim: "raise", range: 440, minRange: 50, cd: 4.5, dmg: 13, radius: 46, lift: -780, wind: 0.35 }),
    ],
  },
  {
    id: "umbra", name: "Umbra", power: "Shadow manipulation", role: "trickster",
    ability: "Slips through shadows to strike from behind, often for critical hits.",
    color: "hsl(274 58% 40%)", glow: "hsl(280 70% 72%)", hp: 90, speed: 108,
    moves: [
      M({ id: "shade-slash", name: "Shade Slash", kind: "melee", anim: "lunge", range: 84, cd: 0.9, dmg: 9, kb: 160, crit: 0.2 }),
      M({ id: "shadow-step", name: "Shadow Step", kind: "blink", anim: "jab", range: 640, minRange: 90, cd: 3.5, dmg: 13, kb: 260, crit: 0.4, wind: 0.2 }),
      M({ id: "dark-orb", name: "Dark Orb", kind: "projectile", anim: "cast", range: 520, minRange: 90, cd: 2.2, dmg: 9, speed: 440, size: 14, status: "blind", statusDur: 1.5 }),
      M({ id: "night-veil", name: "Night Veil", kind: "zone", anim: "raise", range: 160, cd: 7, dmg: 5, radius: 115, dur: 3, status: "blind", statusDur: 0.8, wind: 0.3 }),
    ],
  },
  {
    id: "lux", name: "Lux", power: "Light manipulation", role: "control",
    ability: "Blinding light. A blinded fighter misses half its attacks.",
    color: "hsl(46 100% 66%)", glow: "hsl(52 100% 92%)", hp: 95, speed: 96,
    moves: [
      M({ id: "flash-jab", name: "Flash Jab", kind: "melee", anim: "jab", range: 70, cd: 0.9, dmg: 7, kb: 140, status: "blind", statusDur: 1 }),
      M({ id: "prism-beam", name: "Prism Beam", kind: "beam", anim: "cast", range: 560, minRange: 80, cd: 3, dmg: 14, act: 0.5, wind: 0.28 }),
      M({ id: "sun-flare", name: "Sun Flare", kind: "burst", anim: "raise", range: 140, cd: 5, dmg: 8, radius: 160, kb: 260, status: "blind", statusDur: 2.5, wind: 0.3 }),
      M({ id: "light-lances", name: "Light Lances", kind: "rain", anim: "raise", range: 480, cd: 4, dmg: 7, count: 4, radius: 90, wind: 0.3 }),
    ],
  },
  {
    id: "gravi", name: "Gravi", power: "Gravity control", role: "control",
    ability: "Bends gravity to drag enemies in and drop rocks on them.",
    color: "hsl(240 56% 50%)", glow: "hsl(250 90% 80%)", hp: 110, speed: 82,
    moves: [
      M({ id: "heavy-palm", name: "Heavy Palm", kind: "melee", anim: "thrust", range: 70, cd: 1.1, dmg: 9, kb: 300 }),
      M({ id: "singularity", name: "Singularity", kind: "zone", anim: "cast", range: 420, minRange: 60, cd: 6, dmg: 6, radius: 95, dur: 2.5, pullIn: 380, status: "slow", statusDur: 0.5, wind: 0.3 }),
      M({ id: "gravity-pull", name: "Gravity Pull", kind: "pull", anim: "cast", range: 400, minRange: 100, cd: 3, dmg: 8, status: "stun", statusDur: 0.4 }),
      M({ id: "meteor-drop", name: "Meteor Drop", kind: "rain", anim: "raise", range: 480, cd: 5, dmg: 11, count: 3, radius: 80, shape: "rock", size: 18, wind: 0.35 }),
    ],
  },
  {
    id: "tele", name: "Tele", power: "Teleportation", role: "trickster",
    ability: "Blinks around the arena and dodges one in four hits.",
    color: "hsl(312 78% 58%)", glow: "hsl(300 100% 86%)", hp: 85, speed: 100,
    moves: [
      M({ id: "warp-kick", name: "Warp Kick", kind: "blink", anim: "kick", range: 600, minRange: 80, cd: 2.5, dmg: 11, kb: 300 }),
      M({ id: "phase-shot", name: "Phase Shot", kind: "projectile", anim: "thrust", range: 580, minRange: 80, cd: 1.3, dmg: 8, speed: 660, size: 9, shape: "disc" }),
      M({ id: "blink-barrage", name: "Blink Barrage", kind: "dash", anim: "lunge", range: 300, cd: 3.5, dmg: 9, dist: 300, act: 0.25, kb: 200 }),
      M({ id: "rift-burst", name: "Rift Burst", kind: "burst", anim: "raise", range: 120, cd: 5, dmg: 10, radius: 125, kb: 380, wind: 0.25 }),
    ],
  },
  {
    id: "vita", name: "Vita", power: "Healing", role: "support",
    ability: "Heals over time and patches itself up mid-fight.",
    color: "hsl(140 58% 44%)", glow: "hsl(110 80% 78%)", hp: 110, speed: 86,
    moves: [
      M({ id: "life-tap", name: "Life Tap", kind: "melee", anim: "jab", range: 70, cd: 1, dmg: 7, kb: 140, heal: 4 }),
      M({ id: "mend", name: "Mend", kind: "heal", anim: "raise", range: 2000, cd: 7, dmg: 0, heal: 22, below: 0.7, wind: 0.3, act: 0.3 }),
      M({ id: "thorn-seed", name: "Thorn Seed", kind: "projectile", anim: "cast", range: 500, minRange: 90, cd: 2, dmg: 8, speed: 440, size: 10, arc: true, status: "poison", statusDur: 2 }),
      M({ id: "bloom-burst", name: "Bloom Burst", kind: "burst", anim: "raise", range: 130, cd: 6, dmg: 8, radius: 130, kb: 260, heal: 10, wind: 0.3 }),
    ],
  },
  {
    id: "toxi", name: "Toxi", power: "Poison", role: "attacker",
    ability: "Poison that keeps eating away at health.",
    color: "hsl(86 78% 46%)", glow: "hsl(80 100% 72%)", hp: 100, speed: 88,
    moves: [
      M({ id: "venom-jab", name: "Venom Jab", kind: "melee", anim: "jab", range: 70, cd: 0.9, dmg: 6, kb: 120, status: "poison", statusDur: 3 }),
      M({ id: "acid-spit", name: "Acid Spit", kind: "projectile", anim: "thrust", range: 500, minRange: 80, cd: 1.8, dmg: 6, speed: 500, size: 10, arc: true, status: "poison", statusDur: 3 }),
      M({ id: "miasma-cloud", name: "Miasma Cloud", kind: "zone", anim: "cast", range: 420, cd: 6, dmg: 5, radius: 100, dur: 4, status: "poison", statusDur: 1.5, wind: 0.3 }),
      M({ id: "plague-burst", name: "Plague Burst", kind: "burst", anim: "slam", range: 130, cd: 5.5, dmg: 9, radius: 135, kb: 300, status: "poison", statusDur: 4, wind: 0.3 }),
    ],
  },
  {
    id: "chrono", name: "Chrono", power: "Time manipulation", role: "control",
    ability: "Slows enemies down and rewinds its own wounds.",
    color: "hsl(38 94% 52%)", glow: "hsl(45 100% 80%)", hp: 100, speed: 92,
    moves: [
      M({ id: "tick-strike", name: "Tick Strike", kind: "melee", anim: "jab", range: 70, cd: 0.8, dmg: 7, kb: 140, wind: 0.12 }),
      M({ id: "time-bolt", name: "Time Bolt", kind: "projectile", anim: "cast", range: 540, minRange: 80, cd: 1.8, dmg: 9, speed: 540, size: 11, shape: "disc", status: "slow", statusDur: 2 }),
      M({ id: "stasis-field", name: "Stasis Field", kind: "zone", anim: "raise", range: 420, cd: 6, dmg: 2, radius: 100, dur: 3, status: "freeze", statusDur: 0.35, wind: 0.3 }),
      M({ id: "rewind", name: "Rewind", kind: "heal", anim: "raise", range: 2000, cd: 9, dmg: 0, heal: 18, below: 0.6, wind: 0.3, act: 0.4 }),
    ],
  },
  {
    id: "magneto", name: "Magneto", power: "Magnetism", role: "tank",
    ability: "Pulls enemies close and fires metal at them. Bends projectiles away.",
    color: "hsl(0 70% 50%)", glow: "hsl(210 20% 86%)", hp: 115, speed: 80,
    moves: [
      M({ id: "iron-fist", name: "Iron Fist", kind: "melee", anim: "jab", range: 72, cd: 1.1, dmg: 10, kb: 260, wind: 0.2 }),
      M({ id: "shard-storm", name: "Shard Storm", kind: "projectile", anim: "cast", range: 520, minRange: 70, cd: 2.2, dmg: 4, speed: 640, size: 8, count: 4, spread: 0.2, shape: "shard" }),
      M({ id: "magnet-pull", name: "Magnet Pull", kind: "pull", anim: "thrust", range: 420, minRange: 100, cd: 3, dmg: 7, status: "stun", statusDur: 0.3 }),
      M({ id: "railgun", name: "Railgun", kind: "beam", anim: "thrust", range: 640, minRange: 80, cd: 5, dmg: 16, act: 0.2, kb: 500, wind: 0.4 }),
    ],
  },
  {
    id: "psy", name: "Psy", power: "Telekinesis", role: "control",
    ability: "Lifts enemies with the mind and slams them down.",
    color: "hsl(330 84% 66%)", glow: "hsl(320 100% 88%)", hp: 95, speed: 92,
    moves: [
      M({ id: "mind-jab", name: "Mind Jab", kind: "melee", anim: "thrust", range: 92, cd: 1, dmg: 8, kb: 220 }),
      M({ id: "psychic-lift", name: "Psychic Lift", kind: "eruption", anim: "raise", range: 440, minRange: 50, cd: 3.5, dmg: 12, radius: 40, lift: -680, status: "stun", statusDur: 0.6, wind: 0.3 }),
      M({ id: "psi-wave", name: "Psi Wave", kind: "projectile", anim: "cast", range: 560, minRange: 60, cd: 3, dmg: 8, speed: 440, size: 22, shape: "wave", pierce: true, status: "stun", statusDur: 0.3 }),
      M({ id: "mind-crush", name: "Mind Crush", kind: "burst", anim: "raise", range: 140, cd: 6, dmg: 11, radius: 145, kb: 240, status: "stun", statusDur: 0.8, wind: 0.3 }),
    ],
  },
  {
    id: "shift", name: "Shift", power: "Shapeshifting", role: "trickster",
    ability: "Turns its arm into a blade and copies the last power that hit it.",
    color: "hsl(186 84% 46%)", glow: "hsl(180 100% 82%)", hp: 100, speed: 96,
    moves: [
      M({ id: "morph-strike", name: "Morph Strike", kind: "melee", anim: "lunge", range: 80, cd: 1, dmg: 9, kb: 180 }),
      M({ id: "mimic", name: "Mimic", kind: "mimic", anim: "cast", range: 400, cd: 3, dmg: 0 }),
      M({ id: "blade-arm", name: "Blade Arm", kind: "melee", anim: "lunge", range: 115, minRange: 40, cd: 2, dmg: 12, kb: 240, wind: 0.22 }),
      M({ id: "slime-shot", name: "Slime Shot", kind: "projectile", anim: "thrust", range: 500, minRange: 80, cd: 2, dmg: 8, speed: 480, size: 12, arc: true, status: "slow", statusDur: 1.5 }),
    ],
  },
];

export const DEF_BY_ID = Object.fromEntries(FIGHTERS.map((f) => [f.id, f])) as Record<Power, FighterDef>;
