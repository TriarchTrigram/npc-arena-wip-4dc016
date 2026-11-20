import { Text, type StringKey } from "~stencil/ui/strings";
import { cn } from "~/lib/utils";
import { defOf, type RosterId } from "~/lib/fighters";
import { FighterDot } from "~/components/fighter-dot";
import { champion, type Bracket, type Match, type MatchRef } from "~/lib/bracket";

const ROUND_KEY: Record<number, StringKey> = {
  1: "arena.bracket.final",
  2: "arena.bracket.semis",
  4: "arena.bracket.quarters",
  8: "arena.bracket.round16",
};

/** Single-elimination bracket: one column per round, the current match outlined. */
export function BracketView({ bracket, current }: { bracket: Bracket; current: MatchRef | null }) {
  const champ = champion(bracket);
  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-2">
      <div className="flex min-w-max gap-6">
        {bracket.map((round, r) => (
          <div key={r} className="flex w-48 flex-col">
            <Text id={ROUND_KEY[round.length] ?? "arena.bracket.round16"} as="p" className="mb-3 text-xs font-extrabold uppercase tracking-[0.1em] text-muted-foreground" />
            <ol className="flex flex-1 flex-col justify-around gap-3">
              {round.map((m, i) => (
                <li key={i}>
                  <MatchCard m={m} round={r} live={current?.r === r && current.i === i} />
                </li>
              ))}
            </ol>
          </div>
        ))}
        <div className="flex w-44 flex-col">
          <Text id="arena.bracket.champion" as="p" className="mb-3 text-xs font-extrabold uppercase tracking-[0.1em] text-muted-foreground" />
          <div className="flex flex-1 items-center">
            <div className={cn("w-full rounded-xl border-2 px-3 py-3", champ ? "border-border-strong bg-highlight text-highlight-foreground shadow-sm" : "border-dashed border-border bg-background")}>
              {champ ? <Entrant id={champ} strong /> : <Text id="arena.bracket.tbd" className="text-sm text-muted-foreground" />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MatchCard({ m, round, live }: { m: Match; round: number; live: boolean }) {
  return (
    <div className={cn("rounded-xl border-2 bg-card", live ? "border-primary shadow-md" : "border-border")}>
      {live && <Text id="arena.bracket.next" as="p" className="border-b-2 border-primary bg-primary px-3 py-0.5 text-xs font-extrabold uppercase tracking-[0.1em] text-primary-foreground" />}
      <Side id={m.a} winner={m.winner} round={round} />
      <div className="border-t border-border-subtle" />
      <Side id={m.b} winner={m.winner} round={round} />
    </div>
  );
}

function Side({ id, winner, round }: { id: RosterId | null; winner: RosterId | null; round: number }) {
  if (!id) {
    return (
      <div className="px-3 py-2">
        <Text id={round === 0 ? "arena.bracket.bye" : "arena.bracket.tbd"} className="text-sm text-muted-foreground" />
      </div>
    );
  }
  const lost = !!winner && winner !== id;
  return (
    <div className="px-3 py-2">
      <Entrant id={id} strong={winner === id} lost={lost} />
    </div>
  );
}

function Entrant({ id, strong, lost }: { id: RosterId; strong?: boolean; lost?: boolean }) {
  const def = defOf(id);
  return (
    <span className={cn("flex items-center gap-2 text-sm", strong ? "font-semibold text-foreground" : lost ? "text-muted-foreground" : "text-foreground-secondary")}>
      <FighterDot def={def} />
      <span className="truncate">{def.name}</span>
    </span>
  );
}
