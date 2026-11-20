// The five Story bosses. Each is its own fighter, not a fusion: its own moves (several with mechanics no
// roster fighter has), its own body design drawn by the engine, and its own colours. `id` is only the
// voice and entrance it borrows from the roster.
import type { FighterDef, Move } from "./fighters";

export type BossId = "nullshade" | "maelstrom" | "magmaw" | "everwinter" | "riftmaker";

const M = (m: Omit<Move, "wind" | "act" | "rec"> & Partial<Pick<Move, "wind" | "act" | "rec">>): Move => ({
  wind: 0.2,
  act: 0.12,
  rec: 0.24,
  ...m,
});

export const BOSSES: Record<BossId, FighterDef> = {
  // Chapter 1. Bends antimatter: whatever it touches cancels out.
  nullshade: {
    id: "umbra", boss: "antimatter", name: "Nullshade", power: "Antimatter", role: "control",
    ability: "Commands antimatter. Its field erases shots, and matter meeting antimatter annihilates.",
    color: "hsl(268 40% 16%)", glow: "hsl(186 100% 82%)", hp: 255, speed: 86,
    moves: [
      M({ id: "positron-palm", name: "Positron Palm", kind: "melee", anim: "thrust", range: 74, cd: 0.95, dmg: 9, kb: 260 }),
      M({ id: "antimatter-lance", name: "Antimatter Lance", kind: "beam", anim: "cast", range: 460, minRange: 70, cd: 3, dmg: 13, act: 0.32, wind: 0.32 }),
      M({ id: "annihilation", name: "Annihilation", kind: "annihilate", anim: "raise", range: 520, minRange: 40, cd: 6, dmg: 22, radius: 78, kb: 360, lift: -420, wind: 0.35, rec: 0.35 }),
      M({ id: "null-field", name: "Null Field", kind: "zone", anim: "slam", range: 380, cd: 9, dmg: 5, radius: 130, dur: 4.5, pullIn: 90, erase: true, wind: 0.35 }),
      M({ id: "pair-burst", name: "Pair Production", kind: "projectile", anim: "thrust", range: 560, minRange: 90, cd: 2.6, dmg: 6, speed: 520, size: 10, count: 2, spread: 0.16, shape: "orb" }),
      M({ id: "zero-point", name: "Zero Point", kind: "burst", anim: "slam", range: 130, cd: 7, dmg: 15, radius: 160, kb: 480, lift: -300, wind: 0.32, rec: 0.35 }),
    ],
  },
  // Chapter 2. A storm at sea given a body.
  maelstrom: {
    id: "hydro", boss: "maelstrom", name: "Maelstrom", power: "Tempest Sea", role: "attacker",
    ability: "A living sea storm. Walls of water roll across the whole arena, and its whirlpool drags everyone in.",
    color: "hsl(204 70% 30%)", glow: "hsl(186 100% 76%)", hp: 280, speed: 94,
    moves: [
      M({ id: "trident-rake", name: "Trident Rake", kind: "melee", anim: "lunge", range: 96, cd: 1, dmg: 9, kb: 240, status: "stun", statusDur: 0.2 }),
      M({ id: "tidal-wall", name: "Tidal Wall", kind: "projectile", anim: "slam", range: 900, minRange: 60, cd: 7, dmg: 16, speed: 330, size: 34, pierce: true, ground: true, shape: "wave", kb: 420, lift: -360, wind: 0.4, rec: 0.35 }),
      M({ id: "eye-of-the-storm", name: "Eye of the Storm", kind: "zone", anim: "raise", range: 420, cd: 9, dmg: 6, radius: 140, dur: 4, pullIn: 130, status: "stun", statusDur: 0.12, wind: 0.35 }),
      M({ id: "thunderhead", name: "Thunderhead", kind: "rain", anim: "raise", range: 520, cd: 5.5, dmg: 7, count: 7, radius: 160, status: "stun", statusDur: 0.25, wind: 0.35, rec: 0.3 }),
      M({ id: "riptide", name: "Riptide", kind: "pull", anim: "thrust", range: 420, minRange: 120, cd: 4.5, dmg: 7, wind: 0.24 }),
      M({ id: "waterspout", name: "Waterspout", kind: "eruption", anim: "uppercut", range: 460, minRange: 50, cd: 4.5, dmg: 13, radius: 52, lift: -820, wind: 0.32 }),
    ],
  },
  // Chapter 3. A walking volcano with a mouth of magma.
  magmaw: {
    id: "terra", boss: "magmaw", name: "Magmaw", power: "Living Volcano", role: "tank",
    ability: "A walking volcano. The floor splits into fault lines and the sky rains molten rock.",
    color: "hsl(12 30% 20%)", glow: "hsl(28 100% 58%)", hp: 266, speed: 74,
    moves: [
      M({ id: "magma-bite", name: "Magma Bite", kind: "melee", anim: "lunge", range: 88, cd: 1.3, dmg: 13, kb: 340, status: "burn", statusDur: 1.5, wind: 0.26 }),
      M({ id: "fault-line", name: "Fault Line", kind: "eruption", anim: "slam", range: 600, minRange: 40, cd: 6, dmg: 12, radius: 46, count: 4, lift: -640, status: "burn", statusDur: 1.5, wind: 0.4 }),
      M({ id: "lava-bombs", name: "Lava Bombs", kind: "rain", anim: "raise", range: 540, cd: 5.5, dmg: 9, count: 5, radius: 150, size: 13, shape: "rock", status: "burn", statusDur: 2, wind: 0.4, rec: 0.3 }),
      M({ id: "magma-lake", name: "Magma Lake", kind: "zone", anim: "slam", range: 360, cd: 9, dmg: 7, radius: 120, dur: 4, status: "burn", statusDur: 0.6, wind: 0.35 }),
      M({ id: "volcanic-roar", name: "Volcanic Roar", kind: "burst", anim: "raise", range: 150, cd: 6.5, dmg: 16, radius: 175, kb: 440, lift: -380, status: "burn", statusDur: 2.5, wind: 0.36, rec: 0.38 }),
      M({ id: "obsidian-hide", name: "Obsidian Hide", kind: "heal", anim: "raise", range: 2000, cd: 14, dmg: 0, heal: 30, below: 0.5, wind: 0.4 }),
    ],
  },
  // Chapter 4. The winter that stopped the clocks.
  everwinter: {
    id: "cryo", boss: "everwinter", name: "Everwinter", power: "Frozen Time", role: "control",
    ability: "The winter that stopped time. It can freeze the whole arena in one moment and strike while nothing moves.",
    color: "hsl(206 50% 82%)", glow: "hsl(44 90% 72%)", hp: 331, speed: 86,
    moves: [
      M({ id: "rime-sickle", name: "Rime Sickle", kind: "melee", anim: "spin", range: 84, cd: 1, dmg: 9, kb: 200, status: "slow", statusDur: 1.2 }),
      M({ id: "time-stop", name: "Time Stop", kind: "burst", anim: "raise", range: 2000, cd: 13, dmg: 6, radius: 60, world: true, status: "freeze", statusDur: 1.7, wind: 0.5, rec: 0.2 }),
      M({ id: "hourglass-icicles", name: "Hourglass Icicles", kind: "rain", anim: "raise", range: 520, cd: 5, dmg: 8, count: 6, radius: 140, shape: "shard", status: "slow", statusDur: 1.2, wind: 0.35, rec: 0.3 }),
      M({ id: "frost-lance", name: "Frost Lance", kind: "beam", anim: "thrust", range: 440, minRange: 70, cd: 3, dmg: 12, act: 0.3, status: "slow", statusDur: 1.4, wind: 0.28 }),
      M({ id: "rime-step", name: "Rime Step", kind: "blink", anim: "kick", range: 480, minRange: 140, cd: 4.5, dmg: 11, kb: 300, status: "freeze", statusDur: 0.6 }),
      M({ id: "glacial-age", name: "Glacial Age", kind: "zone", anim: "slam", range: 360, cd: 9, dmg: 5, radius: 140, dur: 4.5, status: "slow", statusDur: 0.6, wind: 0.35 }),
    ],
  },
  // Chapter 5. Bends reality: it can move the whole fight to the Moon or the desert.
  riftmaker: {
    id: "psy", boss: "riftmaker", name: "The Riftmaker", power: "Reality Warping", role: "trickster",
    ability: "Rewrites reality. It moves the whole fight to the Moon, where everyone floats, or to a scorching desert that burns its enemies.",
    color: "hsl(252 30% 12%)", glow: "hsl(318 100% 72%)", hp: 320, speed: 98,
    moves: [
      M({ id: "fold-strike", name: "Fold Strike", kind: "melee", anim: "jab", range: 76, cd: 0.9, dmg: 9, kb: 220 }),
      M({ id: "reality-warp", name: "Reality Warp", kind: "warp", anim: "raise", range: 2000, cd: 15, dmg: 0, wind: 0.55, rec: 0.3 }),
      M({ id: "dimension-tear", name: "Dimension Tear", kind: "beam", anim: "cast", range: 480, minRange: 70, cd: 3.2, dmg: 14, act: 0.34, wind: 0.3 }),
      M({ id: "fold-space", name: "Fold Space", kind: "blink", anim: "uppercut", range: 520, minRange: 140, cd: 4, dmg: 12, lift: -560, kb: 160 }),
      M({ id: "mirror-shards", name: "Mirror Shards", kind: "projectile", anim: "cast", range: 580, minRange: 80, cd: 2.4, dmg: 5, speed: 640, size: 9, count: 4, spread: 0.2, shape: "shard" }),
      M({ id: "unmake", name: "Unmake", kind: "burst", anim: "slam", range: 140, cd: 7, dmg: 17, radius: 165, kb: 460, lift: -320, status: "blind", statusDur: 1.5, wind: 0.34, rec: 0.36 }),
    ],
  },
};
