import { Text } from "~stencil/ui/strings";
import type { StringKey } from "~stencil/types/strings";
import { cn } from "~/lib/utils";
import { DEF_BY_ID, type FighterDef } from "~/lib/fighters";

type Mode = "story" | "duel" | "ffa" | "teams" | "tournament" | "juggernaut";

const MODE_ORDER: Mode[] = ["story", "duel", "ffa", "teams", "tournament", "juggernaut"];
const MODE_NAME_KEYS: Record<Mode, StringKey> = {
  story: "arena.mode.story",
  duel: "arena.mode.duel",
  ffa: "arena.mode.ffa",
  teams: "arena.mode.teams",
  tournament: "arena.mode.tournament",
  juggernaut: "arena.mode.juggernaut",
};
const MODE_DESC_KEYS: Record<Mode, StringKey> = {
  story: "title.modes.story",
  duel: "title.modes.duel",
  ffa: "title.modes.ffa",
  teams: "title.modes.teams",
  tournament: "title.modes.tournament",
  juggernaut: "title.modes.juggernaut",
};

/** A stickman portrait with an elemental aura: flame licks for Pyro, water beads for Hydro. */
function FighterFigure({ def, kind, flip }: { def: FighterDef; kind: "fire" | "water"; flip?: boolean }) {
  return (
    <div className="relative flex h-36 w-24 shrink-0 items-end justify-center sm:h-52 sm:w-32">
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-full opacity-70 blur-2xl"
        style={{ background: `radial-gradient(circle, ${def.glow}, transparent 70%)` }}
      />
      <svg viewBox="0 0 100 160" className={cn("relative h-full w-full", flip && "-scale-x-100")} aria-hidden="true">
        {kind === "fire" ? (
          <path
            fill={def.color}
            opacity={0.85}
            d="M30 150 Q18 122 34 96 Q27 112 40 119 Q33 92 52 68 Q46 100 59 109 Q54 78 72 52 Q60 94 73 116 Q82 132 68 150 Z"
          />
        ) : (
          <g fill={def.color} opacity={0.55}>
            <path d="M50 18 Q71 44 71 76 Q71 107 50 118 Q29 107 29 76 Q29 44 50 18 Z" />
            <circle cx="20" cy="104" r="7" />
            <circle cx="82" cy="58" r="5" />
            <circle cx="12" cy="58" r="4" />
          </g>
        )}
        <g stroke={def.color} strokeWidth="9" strokeLinecap="round" fill="none">
          <circle cx="50" cy="28" r="14" fill={def.color} stroke="none" />
          <line x1="50" y1="42" x2="50" y2="100" />
          <line x1="50" y1="58" x2="24" y2="80" />
          <line x1="50" y1="58" x2="78" y2="36" />
          <line x1="50" y1="100" x2="27" y2="150" />
          <line x1="50" y1="100" x2="71" y2="150" />
        </g>
      </svg>
    </div>
  );
}

/** Classic yin-yang swirl, recoloured to the two elements instead of black and white. */
function ElementYinYang({ redColor, blueColor, className }: { redColor: string; blueColor: string; className?: string }) {
  return (
    <svg viewBox="-52 -52 104 104" className={className} role="img" aria-label="Pyro and Hydro's powers in balance">
      <circle r="50" fill={blueColor} />
      <path d="M0,-50 A50,50 0 0 1 0,50 A25,25 0 0 1 0,0 A25,25 0 0 0 0,-50 Z" fill={redColor} />
      <circle cx="0" cy="-25" r="8" fill={blueColor} />
      <circle cx="0" cy="25" r="8" fill={redColor} />
      <circle r="50" fill="none" stroke="currentColor" strokeWidth="2" className="text-foreground/30" />
    </svg>
  );
}

export function TitleScreen({ onPick }: { onPick: (mode: Mode) => void }) {
  const pyro = DEF_BY_ID.pyro;
  const hydro = DEF_BY_ID.hydro;
  return (
    <div
      className="relative overflow-hidden rounded-2xl border-4 border-border"
      style={{ background: "linear-gradient(180deg, hsl(222 70% 62%) 0%, hsl(260 60% 78%) 55%, hsl(28 95% 86%) 100%)" }}
    >
      <div className="relative flex flex-col items-center gap-8 px-6 py-10 sm:gap-10 sm:py-16">
        <div className="flex w-full max-w-3xl items-center justify-between gap-2 sm:gap-6">
          <FighterFigure def={pyro} kind="fire" />
          <ElementYinYang redColor={pyro.color} blueColor={hydro.color} className="h-24 w-24 shrink-0 drop-shadow-lg sm:h-36 sm:w-36" />
          <FighterFigure def={hydro} kind="water" flip />
        </div>

        <div className="flex flex-col items-center gap-3 text-center">
          <Text id="title.eyebrow" as="p" className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground/70" />
          <Text id="common.appName" as="h1" className="text-balance font-display text-4xl leading-[1.1] text-foreground sm:text-6xl" />
          <Text id="title.tagline" as="p" className="max-w-prose text-base text-foreground/80" />
        </div>

        <div className="flex flex-col items-center gap-3">
          <Text id="title.cta" as="p" className="text-sm font-semibold uppercase tracking-[0.08em] text-foreground/70" />
          <div className="flex flex-wrap items-center justify-center gap-3">
            {MODE_ORDER.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onPick(m)}
                className="flex min-w-40 flex-col items-start gap-1 rounded-xl border-2 border-foreground/15 bg-card/90 px-4 py-3 text-left shadow-sm transition-colors duration-150 hover:border-foreground/35 hover:bg-card active:bg-card"
              >
                <Text id={MODE_NAME_KEYS[m]} as="span" className="font-display text-base text-foreground" />
                <Text id={MODE_DESC_KEYS[m]} as="span" className="text-sm text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
