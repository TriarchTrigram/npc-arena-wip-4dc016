// Story mode: chapters of stages. The player brings two fighters into each stage and either fuses
// them into one hybrid or sends them in side by side with team attacks. Progress lives in the browser.
import { DEF_BY_ID, FIGHTERS, hybridOf, withTeamAttack, type FighterDef, type Power } from "./fighters";

export type Stage = {
  /** Enemies on the other side. A boss is a hybrid fused from two fighters with extra health. */
  enemies: Power[];
  /** Share of their normal health the enemies bring, so a crowd stays beatable for a pair. */
  enemyHp?: number;
  boss?: { a: Power; b: Power; name: string; hpBoost: number };
};

export type Chapter = { stages: Stage[] };

/** Chapter 1 of 5. Chapters 2 to 5 are still to come. */
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
      { enemies: [], boss: { a: "umbra", b: "gravi", name: "Nullshade", hpBoost: 1.5 } },
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

const ORDER = new Map(FIGHTERS.map((f, i) => [f.id, i]));
/** The same two fighters make the same hybrid whichever is picked first. */
export function fusionOrder(a: Power, b: Power): [Power, Power] {
  return (ORDER.get(a) ?? 0) <= (ORDER.get(b) ?? 0) ? [a, b] : [b, a];
}

export function enemySide(stage: Stage): FighterDef[] {
  if (stage.boss) {
    const { a, b, name, hpBoost } = stage.boss;
    const h = hybridOf(a, b, name);
    return [{ ...h, hp: Math.round(h.hp * hpBoost) }];
  }
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
const HYBRIDS_KEY = "npc-arena-hybrids";

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

export function saveProgress(p: Progress) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch {
    // storage full or blocked: progress just isn't kept
  }
}

/** Remember each hybrid made (one entry per pair, in either order) for the Hybrids roster to come. */
export function rememberHybrid(a: Power, b: Power) {
  try {
    const key = [a, b].sort().join("+");
    const list: string[] = JSON.parse(localStorage.getItem(HYBRIDS_KEY) ?? "[]");
    if (!list.includes(key)) localStorage.setItem(HYBRIDS_KEY, JSON.stringify([...list, key]));
  } catch {
    // not kept if storage is blocked
  }
}
