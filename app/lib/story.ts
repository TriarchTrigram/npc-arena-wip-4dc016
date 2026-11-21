// Story mode: chapters of stages. The player brings two fighters into each stage and either fuses
// them into one hybrid or sends them in side by side with team attacks. Progress lives in the browser.
import { DEF_BY_ID, fusionOrder, hybridOf, withTeamAttack, type FighterDef, type Power } from "./fighters";
import { BOSSES, type BossId } from "./bosses";

export { fusionOrder };

export type Stage = {
  /** Enemies on the other side. A boss is its own fighter from bosses.ts, with its own moves and design. */
  enemies: Power[];
  /** Share of their normal health the enemies bring, so a crowd stays beatable for a pair. */
  enemyHp?: number;
  boss?: BossId;
};

export type Chapter = { stages: Stage[] };

/** The chapters, each ten stages ending on a boss. A chapter opens once the one before it is cleared. */
export const CHAPTERS: Chapter[] = [
  {
    stages: [
      { enemies: ["toxi"] },
      { enemies: ["chrono"] },
      { enemies: ["shift"] },
      { enemies: ["aero", "tele"], enemyHp: 0.8 },
      { enemies: ["magneto", "gravi"], enemyHp: 0.68 },
      { enemies: ["cryo", "psy"], enemyHp: 0.75 },
      { enemies: ["vita", "toxi", "umbra"], enemyHp: 0.4 },
      { enemies: ["terra", "electro", "lux"], enemyHp: 0.42 },
      { enemies: ["pyro", "hydro", "aero"], enemyHp: 0.48 },
      { enemies: [], boss: "nullshade" },
    ],
  },
  {
    // Chapter 2: The Storm Coast
    stages: [
      { enemies: ["hydro"] },
      { enemies: ["electro"] },
      { enemies: ["magneto"] },
      { enemies: ["aero", "terra"], enemyHp: 0.8 },
      { enemies: ["umbra", "hydro"], enemyHp: 0.75 },
      { enemies: ["psy", "tele"], enemyHp: 0.75 },
      { enemies: ["toxi", "shift", "vita"], enemyHp: 0.45 },
      { enemies: ["cryo", "hydro", "electro"], enemyHp: 0.48 },
      { enemies: ["aero", "electro", "lux"], enemyHp: 0.5 },
      { enemies: [], boss: "maelstrom" },
    ],
  },
  {
    // Chapter 3: The Ember Wastes
    stages: [
      { enemies: ["pyro"] },
      { enemies: ["lux"] },
      { enemies: ["gravi"] },
      { enemies: ["terra", "toxi"], enemyHp: 0.82 },
      { enemies: ["shift", "psy"], enemyHp: 0.8 },
      { enemies: ["pyro", "magneto"], enemyHp: 0.7 },
      { enemies: ["vita", "pyro", "aero"], enemyHp: 0.45 },
      { enemies: ["terra", "gravi", "chrono"], enemyHp: 0.34 },
      { enemies: ["pyro", "terra", "lux", "electro"], enemyHp: 0.3 },
      { enemies: [], boss: "magmaw" },
    ],
  },
  {
    // Chapter 4: The Frozen Clock
    stages: [
      { enemies: ["cryo"] },
      { enemies: ["psy"] },
      { enemies: ["chrono"] },
      { enemies: ["cryo", "aero"], enemyHp: 0.85 },
      { enemies: ["lux", "umbra"], enemyHp: 0.75 },
      { enemies: ["chrono", "magneto"], enemyHp: 0.65 },
      { enemies: ["cryo", "lux", "tele"], enemyHp: 0.34 },
      { enemies: ["gravi", "cryo", "psy"], enemyHp: 0.45 },
      { enemies: ["chrono", "tele", "shift", "umbra"], enemyHp: 0.23 },
      { enemies: [], boss: "everwinter" },
    ],
  },
  {
    // Chapter 5: The Heart of the Rift
    stages: [
      { enemies: ["shift"] },
      { enemies: ["tele"] },
      { enemies: ["gravi", "umbra"], enemyHp: 0.8 },
      { enemies: ["electro", "aero", "lux"], enemyHp: 0.46 },
      { enemies: ["toxi", "vita", "terra"], enemyHp: 0.46 },
      { enemies: ["psy", "chrono", "shift"], enemyHp: 0.4 },
      { enemies: ["pyro", "cryo", "hydro", "terra"], enemyHp: 0.27 },
      { enemies: ["magneto", "gravi", "tele", "umbra"], enemyHp: 0.19 },
      { enemies: ["pyro", "electro", "aero", "lux", "umbra"], enemyHp: 0.16 },
      { enemies: [], boss: "riftmaker" },
    ],
  },
  {
    // Chapter 6: The Hollow Kingdom
    stages: [
      { enemies: ["umbra"] },
      { enemies: ["toxi", "vita"], enemyHp: 0.85 },
      { enemies: ["chrono", "psy"], enemyHp: 0.8 },
      { enemies: ["umbra", "magneto"], enemyHp: 0.7 },
      { enemies: ["toxi", "umbra", "shift"], enemyHp: 0.45 },
      { enemies: ["psy", "tele", "vita"], enemyHp: 0.45 },
      { enemies: ["gravi", "umbra", "cryo"], enemyHp: 0.38 },
      { enemies: ["pyro", "toxi", "terra", "umbra"], enemyHp: 0.22 },
      { enemies: ["chrono", "psy", "tele", "shift", "umbra"], enemyHp: 0.13 },
      { enemies: [], boss: "hollowking" },
    ],
  },
  {
    // Chapter 7: The Dying Sun
    stages: [
      { enemies: ["lux"] },
      { enemies: ["pyro", "lux"], enemyHp: 0.85 },
      { enemies: ["electro", "magneto"], enemyHp: 0.65 },
      { enemies: ["umbra", "lux"], enemyHp: 0.8 },
      { enemies: ["pyro", "aero", "gravi"], enemyHp: 0.46 },
      { enemies: ["lux", "chrono", "psy"], enemyHp: 0.46 },
      { enemies: ["electro", "pyro", "terra"], enemyHp: 0.44 },
      { enemies: ["gravi", "umbra", "lux", "tele"], enemyHp: 0.2 },
      { enemies: ["pyro", "lux", "electro", "umbra", "gravi"], enemyHp: 0.14 },
      { enemies: [], boss: "blacksun" },
    ],
  },
];

export const STAGES_PER_CHAPTER = 10;

export type Pair = { a: Power; b: Power; fuse: boolean };

/** Team attacks need two different fighters; the same fighter twice can only fuse. */
export const canTeam = (p: Pair) => p.a !== p.b;

/** The player's side: one hybrid, or two fighters each carrying a team attack. */
export function playerSide(p: Pair): FighterDef[] {
  if (p.fuse || !canTeam(p)) {
    const [a, b] = fusionOrder(p.a, p.b);
    return [hybridOf(a, b)];
  }
  return [withTeamAttack(p.a, p.b), withTeamAttack(p.b, p.a)];
}

export function enemySide(stage: Stage): FighterDef[] {
  if (stage.boss) return [BOSSES[stage.boss]];
  const share = stage.enemyHp ?? 1;
  return stage.enemies.map((id) => {
    const d = DEF_BY_ID[id];
    return share === 1 ? d : { ...d, hp: Math.round(d.hp * share) };
  });
}

/** Everyone in the fight, with the player on team 0 and the stage on team 1. */
export function stageLineup(p: Pair, stage: Stage): { defs: FighterDef[]; teams: number[] } {
  const mine = playerSide(p);
  const theirs = enemySide(stage);
  return { defs: [...mine, ...theirs], teams: [...mine.map(() => 0), ...theirs.map(() => 1)] };
}

// ---------- Saved progress (this browser only) ----------

const PROGRESS_KEY = "npc-arena-story";

/** How many stages of each chapter are cleared. */
export type Progress = { cleared: number[] };

export function loadProgress(): Progress {
  try {
    const raw = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "null");
    if (raw && Array.isArray(raw.cleared)) {
      return { cleared: CHAPTERS.map((_, i) => Math.max(0, Math.min(STAGES_PER_CHAPTER, Number(raw.cleared[i]) || 0))) };
    }
  } catch {
    // unreadable storage starts fresh
  }
  return { cleared: CHAPTERS.map(() => 0) };
}

/** A chapter opens once every stage of the one before it is cleared. */
export const chapterOpen = (cleared: number[], ch: number) => ch === 0 || (cleared[ch - 1] ?? 0) >= STAGES_PER_CHAPTER;

export function saveProgress(p: Progress) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch {
    // storage full or blocked: progress just isn't kept
  }
}

