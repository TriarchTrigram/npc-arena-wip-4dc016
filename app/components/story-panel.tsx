import { Text, useString } from "~stencil/ui/strings";
import type { StringKey } from "~stencil/types/strings";
import { Button } from "~/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { cn } from "~/lib/utils";
import { DEF_BY_ID, FIGHTERS, type Power } from "~/lib/fighters";
import { CHAPTERS, STAGES_PER_CHAPTER, canTeam, enemySide, playerSide, type Pair } from "~/lib/story";

const STAGE_KEYS: StringKey[] = [
  "story.stages.s1", "story.stages.s2", "story.stages.s3", "story.stages.s4", "story.stages.s5",
  "story.stages.s6", "story.stages.s7", "story.stages.s8", "story.stages.s9", "story.stages.s10",
];

export function StoryPanel({ cleared, stage, onStage, pair, onPair, locked }: {
  cleared: number;
  stage: number;
  onStage: (i: number) => void;
  pair: Pair;
  onPair: (p: Pair) => void;
  locked: boolean;
}) {
  const firstAria = useString("story.first");
  const secondAria = useString("story.second");
  const stages = CHAPTERS[0].stages;
  const side = playerSide(pair);
  const teamOk = canTeam(pair);
  const fused = pair.fuse || !teamOk;

  return (
    <div className="flex flex-col gap-6" data-story-panel>
      <div className="flex flex-col gap-1">
        <Text id="story.chapterTitle" as="h3" className="font-display text-xl text-foreground" />
        <Text id="story.chapterIntro" as="p" className="max-w-prose text-sm text-muted-foreground" />
        <Text id="story.progress" vars={{ count: cleared, total: STAGES_PER_CHAPTER }} as="p" className="text-sm font-semibold text-foreground tabular-nums" />
      </div>

      <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" data-story-stages>
        {stages.map((s, i) => {
          const open = i <= cleared;
          const done = i < cleared;
          const on = i === stage;
          const foes = enemySide(s);
          return (
            <li key={i}>
              <button
                type="button"
                disabled={!open || locked}
                onClick={() => onStage(i)}
                aria-pressed={on}
                className={cn(
                  "flex h-full w-full flex-col items-start gap-2 rounded-xl border-2 px-3 py-3 text-left transition-colors duration-150 hover:bg-surface-hover active:bg-surface-active disabled:cursor-not-allowed",
                  on ? "border-foreground bg-card" : "border-border bg-background",
                  !open && "opacity-60",
                )}
              >
                <span className="flex w-full items-center gap-2">
                  <Text id="story.stageNumber" vars={{ n: i + 1 }} className="text-xs font-extrabold uppercase tracking-[0.08em] text-muted-foreground" />
                  {done ? (
                    <Text id="story.cleared" className="ml-auto text-xs font-extrabold text-success" />
                  ) : !open ? (
                    <Text id="story.locked" className="ml-auto text-xs font-semibold text-muted-foreground" />
                  ) : s.boss ? (
                    <Text id="story.boss" className="ml-auto text-xs font-extrabold text-error" />
                  ) : null}
                </span>
                <Text id={STAGE_KEYS[i]} className="font-display text-base leading-[1.2] text-foreground" />
                <span className="flex flex-wrap gap-1">
                  {foes.map((f, k) => (
                    <span key={k} className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="size-2.5 rounded-full border border-foreground" style={{ background: f.color }} aria-hidden />
                      {f.name}
                    </span>
                  ))}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-col gap-3">
        <Text id="story.pairTitle" as="h3" className="font-display text-xl text-foreground" />
        <div className="flex flex-wrap items-center gap-3">
          <FighterSelect value={pair.a} label={firstAria} disabled={locked} onChange={(a) => onPair({ ...pair, a })} />
          <FighterSelect value={pair.b} label={secondAria} disabled={locked} onChange={(b) => onPair({ ...pair, b })} />
        </div>
        <div className="flex flex-wrap gap-2" role="group">
          <Button size="sm" variant={fused ? "default" : "outline"} disabled={locked} onClick={() => onPair({ ...pair, fuse: true })}>
            <Text id="story.fuse" />
          </Button>
          <Button size="sm" variant={!fused ? "default" : "outline"} disabled={locked || !teamOk} onClick={() => onPair({ ...pair, fuse: false })}>
            <Text id="story.team" />
          </Button>
        </div>
        <div className="rounded-xl border-2 border-border bg-background-secondary px-4 py-3" data-story-pair>
          {fused ? (
            <div className="flex flex-col gap-2">
              <span className="flex items-center gap-2">
                <span className="size-4 rounded-full border-2 border-foreground" style={{ background: `linear-gradient(90deg, ${side[0].color} 50%, ${side[0].glow} 50%)` }} aria-hidden />
                <span className="font-display text-lg text-foreground">{side[0].name}</span>
              </span>
              <Text id="story.fuseHint" vars={{ count: side[0].moves.length }} as="p" className="text-sm text-muted-foreground" />
              <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-foreground">
                {side[0].moves.map((m) => (
                  <li key={m.id} className={cn(m.id.startsWith("mix-") && "font-semibold")}>{m.name}</li>
                ))}
              </ul>
              {!teamOk && <Text id="story.sameHint" as="p" className="text-sm text-muted-foreground" />}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Text id="story.teamHint" as="p" className="text-sm text-muted-foreground" />
              <ul className="flex flex-col gap-1 text-sm text-foreground">
                {side.map((f) => (
                  <li key={f.id} className="flex items-center gap-2">
                    <span className="size-3 shrink-0 rounded-full border-2 border-foreground" style={{ background: f.color }} aria-hidden />
                    <span className="font-semibold">{f.name}</span>
                    <span className="text-muted-foreground">{f.moves[f.moves.length - 1].name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FighterSelect({ value, label, disabled, onChange }: { value: Power; label: string; disabled: boolean; onChange: (p: Power) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Power)} disabled={disabled}>
      <SelectTrigger className="w-48" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {FIGHTERS.map((f) => (
          <SelectItem key={f.id} value={f.id}>
            <span className="size-3 shrink-0 rounded-full border-2 border-foreground" style={{ background: f.color }} />
            {DEF_BY_ID[f.id].name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
