import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/home";
import { Text, useString, type StringKey } from "~stencil/ui/strings";
import { Button } from "~/components/ui/button";
import {
  PageContainer,
  PageHeader,
  SectionHeading,
  Panel,
  PanelBody,
  StatusBadge,
  EmptyState,
} from "~/components/design";
import { cn } from "~/lib/utils";
import { FIGHTERS, type FighterDef, type Power } from "~/lib/fighters";
import { W, H, newGame, step, drawScene, buildBackdrop, type Game, type FeedItem } from "~/lib/arena-engine";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "NPC Arena" },
    { name: "description", content: "Watch 16 superpowered NPCs battle it out in a cartoon arena." },
  ];
}

type Status = "ready" | "running" | "paused" | "finished";
type Mode = "duel" | "ffa";

type Snapshot = { alive: { key: number; name: string; color: string; hp: number; maxHp: number; kills: number }[]; feed: FeedItem[] };

const SPEEDS = [1, 2, 4] as const;

export default function Home() {
  const [mode, setMode] = useState<Mode>("ffa");
  const [picked, setPicked] = useState<Power[]>(FIGHTERS.map((f) => f.id));
  const [status, setStatus] = useState<Status>("ready");
  const [speed, setSpeed] = useState<number>(1);
  const [snap, setSnap] = useState<Snapshot>({ alive: [], feed: [] });
  const [winner, setWinner] = useState<string | null>(null);
  const canvasAria = useString("arena.canvasAria");
  const speedAria = useString("arena.controls.speedAria");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const previewRef = useRef<Game | null>(null);
  const statusRef = useRef<Status>("ready");
  const speedRef = useRef(1);
  statusRef.current = status;
  speedRef.current = speed;

  const valid = mode === "duel" ? picked.length === 2 : picked.length >= 3 && picked.length <= 16;

  const readSnap = useCallback((g: Game): Snapshot => ({
    alive: g.fighters
      .filter((f) => f.alive)
      .sort((a, b) => b.hp / b.maxHp - a.hp / a.maxHp)
      .map((f) => ({ key: f.key, name: f.def.name, color: f.def.color, hp: Math.ceil(f.hp), maxHp: f.maxHp, kills: f.kills })),
    feed: g.feed.slice(0, 12),
  }), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const backdrop = buildBackdrop();
    let raf = 0;
    let last = performance.now();
    let snapTimer = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const g = gameRef.current;
      if (g && statusRef.current === "running") {
        const sub = speedRef.current;
        for (let i = 0; i < sub && !g.over; i++) step(g, dt);
        snapTimer += dt;
        if (snapTimer > 0.2 || g.over) {
          snapTimer = 0;
          setSnap(readSnap(g));
        }
        if (g.over) {
          setWinner(g.winner);
          setStatus("finished");
        }
      }
      if (g) drawScene(ctx, g, backdrop);
      else {
        const p = previewRef.current ?? newGame([], true);
        step(p, dt);
        drawScene(ctx, p, backdrop);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [readSnap]);

  // Idle line-up of the picked fighters while waiting to start.
  useEffect(() => {
    previewRef.current = newGame(picked, true);
  }, [picked]);

  const start = () => {
    if (!valid) return;
    const g = newGame(picked);
    gameRef.current = g;
    setWinner(null);
    setSnap(readSnap(g));
    setStatus("running");
  };

  const restart = () => {
    gameRef.current = null;
    setWinner(null);
    setSnap({ alive: [], feed: [] });
    setStatus("ready");
  };

  const toggle = (id: Power) => {
    if (status === "running" || status === "paused") return;
    setPicked((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (mode === "duel") return [...cur.slice(-1), id];
      return [...cur, id];
    });
  };

  const switchMode = (m: Mode) => {
    if (status === "running" || status === "paused") return;
    setMode(m);
    setPicked(m === "duel" ? ["pyro", "cryo"] : FIGHTERS.map((f) => f.id));
  };

  const locked = status === "running" || status === "paused";
  const tone = status === "running" ? "success" : status === "paused" ? "warning" : status === "finished" ? "info" : "neutral";

  return (
    <PageContainer>
      <nav className="mb-6 flex items-center gap-2">
        <Text id="common.appName" className="mr-auto font-display text-lg" />
        <Button asChild variant="secondary" size="sm"><Link to="/"><Text id="common.arena" /></Link></Button>
        <Button asChild variant="ghost" size="sm"><Link to="/roster"><Text id="common.fighters" /></Link></Button>
      </nav>

      <PageHeader
        eyebrow={<Text id="arena.eyebrow" />}
        title={<Text id="arena.title" />}
        subtitle={<Text id="arena.subtitle" />}
        actions={<StatusBadge tone={tone}><Text id={`arena.status.${status}` as StringKey} /></StatusBadge>}
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex flex-col gap-6">
          <Panel>
            <PanelBody className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {status === "ready" && (
                  <Button onClick={start} disabled={!valid}><Text id="arena.controls.start" /></Button>
                )}
                {status === "running" && (
                  <Button variant="secondary" onClick={() => setStatus("paused")}><Text id="arena.controls.pause" /></Button>
                )}
                {status === "paused" && (
                  <Button onClick={() => setStatus("running")}><Text id="arena.controls.resume" /></Button>
                )}
                {status !== "ready" && (
                  <Button variant="outline" onClick={restart}><Text id="arena.controls.restart" /></Button>
                )}
                <div className="ml-auto flex items-center gap-2" role="group" aria-label={speedAria}>
                  <Text id="arena.controls.speed" className="text-sm text-muted-foreground" />
                  {SPEEDS.map((s) => (
                    <Button key={s} size="sm" variant={speed === s ? "default" : "outline"} onClick={() => setSpeed(s)} className="tabular-nums">
                      {`${s}x`}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  width={W}
                  height={H}
                  aria-label={canvasAria}
                  role="img"
                  className="block h-auto w-full rounded-xl border-4 border-border bg-background-secondary text-foreground"
                />
                {status === "ready" && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                    <Text id="arena.idle" as="p" className="rounded-full bg-card px-6 py-3 text-center font-display text-lg text-foreground" />
                  </div>
                )}
                {status === "finished" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
                    <div className="rounded-2xl border-4 border-foreground bg-card px-8 py-6 text-center">
                      {winner ? (
                        <Text id="arena.winner.title" vars={{ name: winner }} as="p" className="font-display text-3xl text-foreground" />
                      ) : (
                        <Text id="arena.winner.draw" as="p" className="font-display text-3xl text-foreground" />
                      )}
                      <Button className="mt-4" onClick={start}><Text id="arena.winner.again" /></Button>
                    </div>
                  </div>
                )}
              </div>
            </PanelBody>
          </Panel>

          <section>
            <SectionHeading
              title={<Text id="arena.pick.title" />}
              action={
                <div className="flex gap-2">
                  {mode === "ffa" && (
                    <Button size="sm" variant="ghost" disabled={locked} onClick={() => setPicked(FIGHTERS.map((f) => f.id))}><Text id="arena.pick.all" /></Button>
                  )}
                  <Button size="sm" variant="ghost" disabled={locked} onClick={() => setPicked([])}><Text id="arena.pick.clear" /></Button>
                </div>
              }
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="flex gap-2" role="group">
                <Text id="arena.mode.label" className="sr-only" />
                {(["duel", "ffa"] as const).map((m) => (
                  <Button key={m} size="sm" variant={mode === m ? "default" : "outline"} disabled={locked} onClick={() => switchMode(m)}>
                    <Text id={`arena.mode.${m}` as StringKey} />
                  </Button>
                ))}
              </div>
              <Text id={mode === "duel" ? "arena.pick.duelHint" : "arena.pick.ffaHint"} className={cn("text-sm", valid ? "text-muted-foreground" : "text-error")} />
              <Text id="arena.pick.count" vars={{ count: picked.length }} className="ml-auto text-sm text-muted-foreground tabular-nums" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
              {FIGHTERS.map((f) => (
                <FighterChip key={f.id} def={f} on={picked.includes(f.id)} disabled={locked} onClick={() => toggle(f.id)} />
              ))}
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-6">
          <section>
            <SectionHeading title={<Text id="arena.alive.title" />} />
            <Panel className="mt-3">
              <PanelBody>
                {snap.alive.length === 0 ? (
                  <Text id="arena.alive.empty" as="p" className="text-sm text-muted-foreground" />
                ) : (
                  <ul className="flex flex-col gap-3">
                    {snap.alive.map((a) => (
                      <li key={a.key} className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="size-3 shrink-0 rounded-full border-2 border-foreground" style={{ background: a.color }} />
                          <span className="font-semibold text-foreground">{a.name}</span>
                          <Text id="arena.alive.kills" vars={{ count: a.kills }} className="ml-auto text-muted-foreground tabular-nums" />
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full" style={{ width: `${(a.hp / a.maxHp) * 100}%`, background: a.color }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </PanelBody>
            </Panel>
          </section>
          <section>
            <SectionHeading title={<Text id="arena.feed.title" />} />
            <div className="mt-3">
              {snap.feed.length === 0 ? (
                <EmptyState title={<Text id="arena.feed.emptyTitle" />} body={<Text id="arena.feed.emptyBody" />} />
              ) : (
                <Panel>
                  <PanelBody>
                    <ul className="flex flex-col gap-2 text-sm text-foreground">
                      {snap.feed.map((k) => (
                        <li key={k.id}>
                          {k.killer ? (
                            <Text id="arena.feed.ko" vars={{ killer: k.killer, victim: k.victim }} />
                          ) : (
                            <Text id="arena.feed.fell" vars={{ victim: k.victim }} />
                          )}
                        </li>
                      ))}
                    </ul>
                  </PanelBody>
                </Panel>
              )}
            </div>
          </section>
        </aside>
      </div>
    </PageContainer>
  );
}

function FighterChip({ def, on, disabled, onClick }: { def: FighterDef; on: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      className={cn(
        "flex min-h-10 items-center gap-2 rounded-xl border-2 px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-surface-hover active:bg-surface-active disabled:opacity-60",
        on ? "border-foreground bg-card font-semibold text-foreground" : "border-border bg-background text-muted-foreground",
      )}
    >
      <span className="size-5 shrink-0 rounded-full border-2 border-foreground" style={{ background: def.color }} />
      <span className="truncate">{def.name}</span>
    </button>
  );
}
