import type { Power } from "./fighters";

/** One bracket slot. A null side in round one is a bye; in later rounds it is still to be decided. */
export type Match = { a: Power | null; b: Power | null; winner: Power | null };
/** Rounds in order, first round first; the last round holds the final. */
export type Bracket = Match[][];
export type MatchRef = { r: number; i: number };

/** Shuffles the entrants into a single-elimination bracket, handing out byes when the count is not a power of two. */
export function drawBracket(ids: Power[]): Bracket {
  const pool = [...ids];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  let size = 2;
  while (size < pool.length) size *= 2;
  const first = size / 2;
  const byes = size - pool.length;
  // spread the byes down the bracket so they never meet each other
  const byeAt = new Set<number>();
  for (let i = 0; i < byes; i++) byeAt.add(Math.floor((i * first) / byes));
  const r0: Match[] = [];
  let k = 0;
  for (let i = 0; i < first; i++) {
    const a = pool[k++] ?? null;
    const b = byeAt.has(i) ? null : pool[k++] ?? null;
    r0.push({ a, b, winner: null });
  }
  const rounds: Bracket = [r0];
  for (let n = first / 2; n >= 1; n /= 2) rounds.push(Array.from({ length: n }, () => ({ a: null, b: null, winner: null })));
  return settle(rounds);
}

/** Sends every decided winner (and every bye) into its next-round slot. */
function settle(b: Bracket): Bracket {
  for (let r = 0; r < b.length; r++) {
    b[r].forEach((m, i) => {
      if (r === 0 && !m.winner && (m.a == null) !== (m.b == null)) m.winner = m.a ?? m.b;
      if (m.winner && r + 1 < b.length) {
        const nx = b[r + 1][i >> 1];
        if (i % 2 === 0) nx.a = m.winner;
        else nx.b = m.winner;
      }
    });
  }
  return b;
}

export function recordWinner(b: Bracket, at: MatchRef, winner: Power): Bracket {
  const next = b.map((round) => round.map((m) => ({ ...m })));
  const m = next[at.r]?.[at.i];
  if (!m || m.winner || (winner !== m.a && winner !== m.b)) return b;
  m.winner = winner;
  return settle(next);
}

/** The next match with both fighters known and no result yet, earliest round first. */
export function nextMatch(b: Bracket): MatchRef | null {
  for (let r = 0; r < b.length; r++) {
    const i = b[r].findIndex((m) => m.a && m.b && !m.winner);
    if (i >= 0) return { r, i };
  }
  return null;
}

export const champion = (b: Bracket): Power | null => b[b.length - 1]?.[0]?.winner ?? null;

const isBout = (m: Match) => !!m.a && !!m.b;

/** Real matches (byes left out): how many are done, and how many there are in all. */
export function progress(b: Bracket) {
  const entrants = b[0].reduce((n, m) => n + (m.a ? 1 : 0) + (m.b ? 1 : 0), 0);
  const played = b.flat().filter((m) => isBout(m) && m.winner).length;
  return { played, total: Math.max(0, entrants - 1) };
}

export const started = (b: Bracket) => progress(b).played > 0;

export const entrants = (b: Bracket): Power[] => b[0].flatMap((m) => [m.a, m.b]).filter((x): x is Power => !!x);
