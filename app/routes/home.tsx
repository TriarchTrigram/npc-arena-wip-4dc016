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
import { Slider } from "~/components/ui/slider";
import { PiSpeakerHighBold, PiSpeakerLowBold, PiSpeakerSlashBold } from "react-icons/pi";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { cn } from "~/lib/utils";
import { FIGHTERS, DEF_BY_ID, type FighterDef, type Power } from "~/lib/fighters";
import { W, H, TEAM_COLORS, newGame, step, drawScene, buildBackdrop, type Game, type FeedItem } from "~/lib/arena-engine";
import { arenaSound } from "~/lib/arena-sound";
import { arenaMusic } from "~/lib/arena-music";
import { MusicControl } from "~/components/music-control";
import { drawBracket, recordWinner, nextMatch, champion, progress, started, entrants, type Bracket, type MatchRef } from "~/lib/bracket";
import { BracketView } from "~/components/bracket-view";
import { TitleScreen } from "~/components/title-screen";
import { StoryPanel } from "~/components/story-panel";
import { CHAPTERS, STAGES_PER_CHAPTER, canTeam, chapterOpen, fusionOrder, loadProgress, rememberHybrid, saveProgress, stageLineup, type Pair } from "~/lib/story";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "NPC Arena" },
    { name: "description", content: "Watch 16 superpowered NPCs battle it out in a cartoon arena." },
  ];
}

type Status = "ready" | "running" | "paused" | "finished";
type Mode = "story" | "duel" | "ffa" | "teams" | "tournament" | "juggernaut";
type Result = { name: string | null; id: Power | null; team: number | null };

type Snapshot = { alive: { key: number; name: string; color: string; hp: number; maxHp: number; kills: number; team: number; jugg: boolean }[]; feed: FeedItem[] };

const SPEEDS = [1, 2, 4] as const;
const MODES: Mode[] = ["story", "duel", "ffa", "teams", "tournament", "juggernaut"];
/** Juggernaut mode: five challengers (team 0) against one juggernaut (team 1), which goes last. */
const CHALLENGERS = 5;
const JUGG_TEAMS = [...Array(CHALLENGERS).fill(0), 1] as number[];
const TEAM_COUNTS = [2, 3, 4] as const;
const TEAM_KEYS: StringKey[] = ["arena.teams.name0", "arena.teams.name1", "arena.teams.name2", "arena.teams.name3"];
const HINTS: Record<Mode, StringKey> = {
  story: "arena.pick.storyHint",
  duel: "arena.pick.duelHint",
  ffa: "arena.pick.ffaHint",
  teams: "arena.pick.teamsHint",
  tournament: "arena.pick.tournamentHint",
  juggernaut: "arena.pick.juggHint",
};
const ALL = FIGHTERS.map((f) => f.id);
const defaultPicks = (m: Mode, jugg: Power): Power[] =>
  m === "duel" ? ["pyro", "cryo"] : m === "tournament" ? ALL.slice(0, 8) : m === "juggernaut" ? ALL.filter((id) => id !== jugg).slice(0, CHALLENGERS) : ALL;

function shuffled<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Home() {
  const [screen, setScreen] = useState<"title" | "arena">("title");
  const [mode, setMode] = useState<Mode>("ffa");
  const [picked, setPicked] = useState<Power[]>(FIGHTERS.map((f) => f.id));
  const [status, setStatus] = useState<Status>("ready");
  const [speed, setSpeed] = useState<number>(1);
  const [snap, setSnap] = useState<Snapshot>({ alive: [], feed: [] });
  const [result, setResult] = useState<Result | null>(null);
  const [teamCount, setTeamCount] = useState<number>(2);
  const [bracket, setBracket] = useState<Bracket | null>(null);
  const [jugg, setJugg] = useState<Power>("pyro");
  // Story mode: each chapter's cleared count is read from this browser after the first render.
  const [clearedAll, setClearedAll] = useState<number[]>(() => CHAPTERS.map(() => 0));
  const [chapter, setChapter] = useState(0);
  const [stage, setStage] = useState(0);
  const [pair, setPair] = useState<Pair>({ a: "pyro", b: "hydro", fuse: true });
  // the chapter and stage of the fight on screen
  const stageRef = useRef<{ ch: number; i: number } | null>(null);
  const cleared = clearedAll[chapter] ?? 0;
  useEffect(() => {
    const all = loadProgress().cleared;
    setClearedAll(all);
    // pick up in the furthest chapter that is open
    let ch = 0;
    while (ch + 1 < CHAPTERS.length && chapterOpen(all, ch + 1)) ch++;
    setChapter(ch);
    setStage(Math.min(all[ch] ?? 0, STAGES_PER_CHAPTER - 1));
  }, []);
  const chooseChapter = (ch: number) => {
    if (!chapterOpen(clearedAll, ch)) return;
    setChapter(ch);
    setStage(Math.min(clearedAll[ch] ?? 0, STAGES_PER_CHAPTER - 1));
  };
  // Sound: saved volume and mute are read from this browser after the first render.
  const [volume, setVolume] = useState(60);
  const [muted, setMuted] = useState(false);
  // Theme music has its own volume and mute, saved the same way.
  const [musicVolume, setMusicVolume] = useState(50);
  const [musicMuted, setMusicMuted] = useState(false);
  useEffect(() => {
    const prefs = arenaSound.load();
    setVolume(Math.round(prefs.volume * 100));
    setMuted(prefs.muted);
    const music = arenaMusic.load();
    setMusicVolume(Math.round(music.volume * 100));
    setMusicMuted(music.muted);
    // browsers start audio only after a tap or key press
    const unlock = () => {
      arenaSound.unlock();
      arenaMusic.unlock();
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);
  const changeVolume = (v: number) => {
    setVolume(v);
    const unmute = v > 0 && muted;
    if (unmute) setMuted(false);
    arenaSound.set({ volume: v / 100, ...(unmute ? { muted: false } : {}) });
  };
  const toggleMute = () => {
    arenaSound.unlock();
    setMuted(!muted);
    arenaSound.set({ muted: !muted });
  };
  const changeMusicVolume = (v: number) => {
    setMusicVolume(v);
    const unmute = v > 0 && musicMuted;
    if (unmute) setMusicMuted(false);
    arenaMusic.set({ volume: v / 100, ...(unmute ? { muted: false } : {}) });
  };
  const toggleMusic = () => {
    arenaMusic.unlock();
    setMusicMuted(!musicMuted);
    arenaMusic.set({ muted: !musicMuted });
  };
  // The title theme on the title screen, the battle theme in the arena; leaving the page stops it.
  useEffect(() => {
    arenaMusic.play(screen === "title" ? "title" : "battle");
  }, [screen]);
  useEffect(() => () => arenaMusic.play(null), []);
  const musicControl = <MusicControl volume={musicVolume} muted={musicMuted} onVolume={changeMusicVolume} onToggle={toggleMusic} />;
  const muteAria = useString(muted ? "arena.controls.unmute" : "arena.controls.mute");
  const volumeAria = useString("arena.controls.volume");
  const soundAria = useString("arena.controls.soundAria");
  const canvasAria = useString("arena.canvasAria");
  const titleBackAria = useString("title.backAria");
  const speedAria = useString("arena.controls.speedAria");
  const juggAria = useString("arena.jugg.label");
  const teamNames = [useString("arena.teams.name0"), useString("arena.teams.name1"), useString("arena.teams.name2"), useString("arena.teams.name3")];
  const matchRef = useRef<MatchRef | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const previewRef = useRef<Game | null>(null);
  const statusRef = useRef<Status>("ready");
  const speedRef = useRef(1);
  statusRef.current = status;
  speedRef.current = speed;

  const validFor = (m: Mode, n: number) =>
    m === "story" ? stage <= cleared : m === "duel" ? n === 2 : m === "teams" ? n >= teamCount * 2 && n <= 16 : m === "juggernaut" ? n === CHALLENGERS && !picked.includes(jugg) : n >= 3 && n <= 16;
  const valid = validFor(mode, picked.length);
  const teamsFor = (ids: Power[]) => ids.map((_, i) => i % teamCount);
  const upNext = mode === "tournament" && bracket ? nextMatch(bracket) : null;
  const champ = bracket ? champion(bracket) : null;
  const tourLive = mode === "tournament" && !!bracket && started(bracket) && !champ;

  // Called from the animation loop the moment a fight is decided.
  const finishRef = useRef<(g: Game) => void>(() => {});
  finishRef.current = (g: Game) => {
    statusRef.current = "finished";
    setResult({ name: g.winner, id: g.winnerId, team: g.winnerTeam });
    const at = matchRef.current;
    if (mode === "tournament" && at && g.winnerId) {
      const id = g.winnerId;
      setBracket((b) => (b ? recordWinner(b, at, id) : b));
    }
    matchRef.current = null;
    const at0 = stageRef.current;
    if (mode === "story" && at0 != null && g.winnerTeam === 0) {
      setClearedAll((all) => {
        const next = [...all];
        next[at0.ch] = Math.max(next[at0.ch] ?? 0, at0.i + 1);
        saveProgress({ cleared: next });
        return next;
      });
    }
    setStatus("finished");
  };

  const readSnap = useCallback((g: Game): Snapshot => ({
    alive: g.fighters
      .filter((f) => f.alive)
      .sort((a, b) => a.team - b.team || b.hp / b.maxHp - a.hp / a.maxHp)
      .map((f) => ({ key: f.key, name: f.def.name, color: f.def.color, hp: Math.ceil(f.hp), maxHp: f.maxHp, kills: f.kills, team: f.team, jugg: f.jugg })),
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
        // a rage cutscene always plays at normal speed
        const sub = g.cut ? 1 : speedRef.current;
        for (let i = 0; i < sub && !g.over; i++) step(g, dt);
        arenaSound.play(g.sfx);
        g.sfx.length = 0;
        snapTimer += dt;
        if (snapTimer > 0.2 || g.over) {
          snapTimer = 0;
          setSnap(readSnap(g));
        }
        if (g.over) finishRef.current(g);
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
    // The canvas only exists on the arena screen, so the loop restarts when it appears.
  }, [readSnap, screen]);

  // A fresh bracket whenever the picks change, unless a tournament is already under way.
  useEffect(() => {
    if (mode !== "tournament") return;
    setBracket((cur) => (cur && started(cur) && !champion(cur) ? cur : validFor("tournament", picked.length) ? drawBracket(picked) : null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, picked]);

  // Idle line-up while waiting to start: the next pairing in a tournament, the picks otherwise.
  const upA = upNext && bracket ? bracket[upNext.r][upNext.i].a : null;
  const upB = upNext && bracket ? bracket[upNext.r][upNext.i].b : null;
  useEffect(() => {
    if (mode === "tournament") previewRef.current = newGame(upA && upB ? [upA, upB] : [], true);
    else if (mode === "story") {
      const { defs, teams } = stageLineup(pair, CHAPTERS[chapter].stages[stage]);
      previewRef.current = newGame(defs, true, teams);
    } else if (mode === "juggernaut") {
      const ids = [...picked.filter((id) => id !== jugg), jugg];
      previewRef.current = newGame(ids, true, ids.map((_, i) => (i === ids.length - 1 ? 1 : 0)), ids.length - 1);
    } else previewRef.current = newGame(picked, true, mode === "teams" ? picked.map((_, i) => i % teamCount) : undefined);
  }, [picked, mode, teamCount, upA, upB, jugg, pair, stage, chapter]);

  const begin = (g: Game) => {
    gameRef.current = g;
    setResult(null);
    setSnap(readSnap(g));
    setStatus("running");
  };

  const startStage = (i: number, ch = chapter) => {
    const { defs, teams } = stageLineup(pair, CHAPTERS[ch].stages[i]);
    if (pair.fuse || !canTeam(pair)) rememberHybrid(...fusionOrder(pair.a, pair.b));
    stageRef.current = { ch, i };
    setChapter(ch);
    setStage(i);
    begin(newGame(defs, false, teams));
  };

  const start = () => {
    if (mode === "story") {
      if (stage <= cleared) startStage(stage);
      return;
    }
    if (mode === "tournament") {
      const at = bracket ? nextMatch(bracket) : null;
      const m = at && bracket ? bracket[at.r][at.i] : null;
      if (!at || !m?.a || !m.b) return;
      matchRef.current = at;
      begin(newGame([m.a, m.b]));
      return;
    }
    if (!valid) return;
    if (mode === "juggernaut") {
      begin(newGame([...picked, jugg], false, JUGG_TEAMS, CHALLENGERS));
      return;
    }
    begin(newGame(picked, false, mode === "teams" ? teamsFor(picked) : undefined));
  };

  const restart = () => {
    gameRef.current = null;
    matchRef.current = null;
    setResult(null);
    setSnap({ alive: [], feed: [] });
    setStatus("ready");
  };

  const newTournament = () => {
    restart();
    setBracket(validFor("tournament", picked.length) ? drawBracket(picked) : null);
  };

  const toggle = (id: Power) => {
    if (locked) return;
    setPicked((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (mode === "duel") return [...cur.slice(-1), id];
      if (mode === "juggernaut") return id === jugg ? cur : [...cur.slice(cur.length >= CHALLENGERS ? 1 : 0), id];
      return [...cur, id];
    });
  };

  const chooseJugg = (id: Power) => {
    if (locked) return;
    setJugg(id);
    setPicked((cur) => cur.filter((x) => x !== id));
  };

  const switchMode = (m: Mode) => {
    if (status === "running" || status === "paused") return;
    restart();
    setMode(m);
    // coming back to a tournament in progress keeps its bracket and its line-up
    setPicked(m === "tournament" && bracket && started(bracket) && !champion(bracket) ? entrants(bracket) : defaultPicks(m, jugg));
  };

  const enterFromTitle = (m: Mode) => {
    switchMode(m);
    setScreen("arena");
  };

  const fighting = status === "running" || status === "paused";
  const locked = fighting || tourLive;
  const tour = bracket ? progress(bracket) : null;
  const tone = status === "running" ? "success" : status === "paused" ? "warning" : status === "finished" ? "info" : "neutral";

  return (
    <PageContainer>
      <nav className="mb-6 flex items-center gap-2">
        {screen === "arena" && !fighting && !tourLive ? (
          <button
            type="button"
            onClick={() => setScreen("title")}
            aria-label={titleBackAria}
            className="mr-auto font-display text-lg text-foreground transition-colors duration-150 hover:text-foreground-secondary"
          >
            <Text id="common.appName" as="span" />
          </button>
        ) : (
          <Text id="common.appName" className="mr-auto font-display text-lg" />
        )}
        <Button asChild variant="secondary" size="sm"><Link to="/"><Text id="common.arena" /></Link></Button>
        <Button asChild variant="ghost" size="sm"><Link to="/roster"><Text id="common.fighters" /></Link></Button>
      </nav>

      {screen === "title" ? (
        <TitleScreen onPick={enterFromTitle} music={musicControl} />
      ) : (
        <>
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
                  <Button onClick={start} disabled={mode === "tournament" ? !upNext : !valid}><Text id="arena.controls.start" /></Button>
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
                {mode === "tournament" && tour && tour.total > 0 && !champ && (
                  <Text id="arena.bracket.matchOf" vars={{ n: Math.min(tour.played + (status === "finished" ? 0 : 1), tour.total), total: tour.total }} className="text-sm text-muted-foreground tabular-nums" />
                )}
                <div className="ml-auto flex items-center gap-2" role="group" aria-label={speedAria}>
                  <Text id="arena.controls.speed" className="text-sm text-muted-foreground" />
                  {SPEEDS.map((s) => (
                    <Button key={s} size="sm" variant={speed === s ? "default" : "outline"} onClick={() => setSpeed(s)} className="tabular-nums">
                      {`${s}x`}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-2" role="group" aria-label={soundAria}>
                  <Button size="sm" variant={muted ? "secondary" : "outline"} onClick={toggleMute} aria-label={muteAria} aria-pressed={muted}>
                    {muted || volume === 0 ? <PiSpeakerSlashBold className="size-5" /> : volume < 45 ? <PiSpeakerLowBold className="size-5" /> : <PiSpeakerHighBold className="size-5" />}
                  </Button>
                  <Slider
                    className="w-28"
                    min={0}
                    max={100}
                    step={5}
                    value={[muted ? 0 : volume]}
                    onValueChange={(v) => changeVolume(v[0] ?? 0)}
                    aria-label={volumeAria}
                  />
                </div>
                {musicControl}
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
                    {mode === "story" ? (
                      <Text id="arena.idleStory" vars={{ n: stage + 1 }} as="p" className="rounded-full bg-card px-6 py-3 text-center font-display text-lg text-foreground" />
                    ) : (
                      <Text id={mode === "tournament" ? "arena.idleTournament" : "arena.idle"} as="p" className="rounded-full bg-card px-6 py-3 text-center font-display text-lg text-foreground" />
                    )}
                  </div>
                )}
                {status === "finished" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6">
                    <div className="rounded-2xl border-4 border-foreground bg-card px-8 py-6 text-center">
                      {mode === "story" ? (
                        <StoryBanner
                          chapter={stageRef.current?.ch ?? chapter}
                          stage={stageRef.current?.i ?? stage}
                          won={result?.team === 0}
                          onRetry={() => startStage(stageRef.current?.i ?? stage, stageRef.current?.ch ?? chapter)}
                          onNext={() => startStage(Math.min((stageRef.current?.i ?? stage) + 1, STAGES_PER_CHAPTER - 1), stageRef.current?.ch ?? chapter)}
                          onNextChapter={() => { const ch = Math.min((stageRef.current?.ch ?? chapter) + 1, CHAPTERS.length - 1); setChapter(ch); setStage(0); restart(); }}
                          onBack={() => { setStage(Math.min((stageRef.current?.i ?? stage) + 1, STAGES_PER_CHAPTER - 1)); restart(); }}
                        />
                      ) : (
                      <WinnerBanner
                        mode={mode}
                        result={result}
                        champ={champ ? DEF_BY_ID[champ].name : null}
                        teamName={result?.team != null ? teamNames[result.team] : null}
                        teamColor={result?.team != null ? TEAM_COLORS[result.team] : null}
                        onAgain={start}
                        onNewTournament={newTournament}
                      />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </PanelBody>
          </Panel>

          {mode === "tournament" && (
            <section>
              <SectionHeading
                title={<Text id="arena.bracket.title" />}
                action={
                  <Button size="sm" variant="ghost" disabled={fighting || !valid} onClick={newTournament}><Text id="arena.bracket.newBracket" /></Button>
                }
              />
              <Panel className="mt-3">
                <PanelBody>
                  {bracket ? (
                    <BracketView bracket={bracket} current={fighting ? null : upNext} />
                  ) : (
                    <Text id="arena.pick.tournamentHint" as="p" className="text-sm text-muted-foreground" />
                  )}
                </PanelBody>
              </Panel>
            </section>
          )}

          <section>
            <SectionHeading
              title={<Text id={mode === "story" ? "story.title" : "arena.pick.title"} />}
              action={mode === "story" ? undefined :
                <div className="flex gap-2">
                  {mode !== "duel" && mode !== "juggernaut" && (
                    <Button size="sm" variant="ghost" disabled={locked} onClick={() => setPicked(ALL)}><Text id="arena.pick.all" /></Button>
                  )}
                  <Button size="sm" variant="ghost" disabled={locked} onClick={() => setPicked([])}><Text id="arena.pick.clear" /></Button>
                </div>
              }
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap gap-2" role="group">
                <Text id="arena.mode.label" className="sr-only" />
                {MODES.map((m) => (
                  <Button key={m} size="sm" variant={mode === m ? "default" : "outline"} disabled={fighting} onClick={() => switchMode(m)}>
                    <Text id={`arena.mode.${m}` as StringKey} />
                  </Button>
                ))}
              </div>
              <Text id={tourLive ? "arena.pick.lockedHint" : HINTS[mode]} className={cn("text-sm", valid ? "text-muted-foreground" : "text-error")} />
              {mode !== "story" && <Text id="arena.pick.count" vars={{ count: picked.length }} className="ml-auto text-sm text-muted-foreground tabular-nums" />}
            </div>
            {mode === "teams" && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Text id="arena.teams.countLabel" className="text-sm text-muted-foreground" />
                {TEAM_COUNTS.map((n) => (
                  <Button key={n} size="sm" variant={teamCount === n ? "default" : "outline"} disabled={locked} onClick={() => setTeamCount(n)} className="tabular-nums">
                    {n}
                  </Button>
                ))}
                <Button size="sm" variant="ghost" disabled={locked || picked.length < 2} onClick={() => setPicked((cur) => shuffled(cur))}>
                  <Text id="arena.teams.shuffle" />
                </Button>
              </div>
            )}
            {mode === "juggernaut" && (
              <div className="mt-3 flex flex-wrap items-center gap-3" data-jugg-picker>
                <Text id="arena.jugg.label" className="text-sm text-muted-foreground" />
                <Select value={jugg} onValueChange={(v) => chooseJugg(v as Power)} disabled={locked}>
                  <SelectTrigger className="w-48" aria-label={juggAria}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIGHTERS.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        <span className="size-3 shrink-0 rounded-full border-2 border-foreground" style={{ background: f.color }} />
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Text id="arena.jugg.perks" className="text-sm text-muted-foreground" />
              </div>
            )}
            {mode === "story" ? (
              <div className="mt-6">
                <StoryPanel cleared={clearedAll} chapter={chapter} onChapter={chooseChapter} stage={stage} onStage={setStage} pair={pair} onPair={setPair} locked={fighting} />
              </div>
            ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
              {FIGHTERS.map((f) => (
                <FighterChip
                  key={f.id}
                  def={f}
                  on={picked.includes(f.id) || (mode === "juggernaut" && f.id === jugg)}
                  disabled={locked || (mode === "juggernaut" && f.id === jugg)}
                  onClick={() => toggle(f.id)}
                  team={mode === "teams" && picked.includes(f.id) ? picked.indexOf(f.id) % teamCount : null}
                  juggernaut={mode === "juggernaut" && f.id === jugg}
                />
              ))}
            </div>
            )}
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
                          {mode === "juggernaut" ? (
                            a.jugg && (
                              <span className="rounded-full border-2 border-foreground px-1.5 text-xs font-extrabold text-foreground">
                                <Text id="arena.jugg.badge" />
                              </span>
                            )
                          ) : a.team >= 0 && (
                            <span className="rounded-full border-2 px-1.5 text-xs font-extrabold text-foreground" style={{ borderColor: TEAM_COLORS[a.team] }}>
                              <Text id={TEAM_KEYS[a.team]} />
                            </span>
                          )}
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
        </>
      )}
    </PageContainer>
  );
}

function StoryBanner({ chapter, stage, won, onRetry, onNext, onNextChapter, onBack }: { chapter: number; stage: number; won: boolean; onRetry: () => void; onNext: () => void; onNextChapter: () => void; onBack: () => void }) {
  const title = "font-display text-3xl text-foreground";
  const last = stage >= STAGES_PER_CHAPTER - 1;
  const finale = last && chapter >= CHAPTERS.length - 1;
  if (!won) {
    return (
      <>
        <Text id="arena.winner.stageLost" vars={{ n: stage + 1 }} as="p" className={title} />
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button onClick={onRetry}><Text id="arena.winner.tryAgain" /></Button>
        </div>
      </>
    );
  }
  return (
    <>
      {finale ? (
        <Text id="arena.winner.storyComplete" as="p" className={cn(title, "max-w-sm text-balance")} />
      ) : (
        <Text id={last ? "arena.winner.chapterCleared" : "arena.winner.stageCleared"} vars={{ n: last ? chapter + 1 : stage + 1 }} as="p" className={title} />
      )}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {!last && <Button onClick={onNext}><Text id="arena.winner.nextStage" /></Button>}
        {last && !finale && <Button onClick={onNextChapter}><Text id="arena.winner.nextChapter" /></Button>}
        <Button variant="outline" onClick={last ? onRetry : onBack}><Text id={last ? "arena.winner.again" : "arena.winner.changePair"} /></Button>
      </div>
    </>
  );
}

function WinnerBanner({ mode, result, champ, teamName, teamColor, onAgain, onNewTournament }: {
  mode: Mode;
  result: Result | null;
  champ: string | null;
  teamName: string | null;
  teamColor: string | null;
  onAgain: () => void;
  onNewTournament: () => void;
}) {
  const title = "font-display text-3xl text-foreground";
  if (mode === "tournament") {
    if (!result?.id) {
      return (
        <>
          <Text id="arena.winner.doubleKo" as="p" className={cn(title, "max-w-sm text-balance")} />
          <Button className="mt-4" onClick={onAgain}><Text id="arena.winner.rematch" /></Button>
        </>
      );
    }
    if (champ) {
      return (
        <>
          <Text id="arena.winner.champion" vars={{ name: champ }} as="p" className={title} />
          <Button className="mt-4" onClick={onNewTournament}><Text id="arena.winner.newTournament" /></Button>
        </>
      );
    }
    return (
      <>
        <Text id="arena.winner.match" vars={{ name: result.name ?? "" }} as="p" className={title} />
        <Button className="mt-4" onClick={onAgain}><Text id="arena.winner.nextMatch" /></Button>
      </>
    );
  }
  if (mode === "juggernaut" && result?.team != null) {
    return (
      <>
        {result.team === 1 ? (
          <Text id="arena.winner.juggernaut" vars={{ name: result.name ?? "" }} as="p" className={title} />
        ) : (
          <Text id="arena.winner.challengers" as="p" className={title} />
        )}
        <Button className="mt-4" onClick={onAgain}><Text id="arena.winner.again" /></Button>
      </>
    );
  }
  return (
    <>
      {teamName ? (
        <p className="flex items-center justify-center gap-3">
          <span className="size-5 rounded-full border-2 border-foreground" style={{ background: teamColor ?? undefined }} />
          <Text id="arena.winner.team" vars={{ team: teamName }} className={title} />
        </p>
      ) : result?.name ? (
        <Text id="arena.winner.title" vars={{ name: result.name }} as="p" className={title} />
      ) : (
        <Text id="arena.winner.draw" as="p" className={title} />
      )}
      <Button className="mt-4" onClick={onAgain}><Text id="arena.winner.again" /></Button>
    </>
  );
}

function FighterChip({ def, on, disabled, onClick, team, juggernaut = false }: { def: FighterDef; on: boolean; disabled: boolean; onClick: () => void; team: number | null; juggernaut?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      className={cn(
        "flex min-h-10 items-center gap-2 rounded-xl border-2 px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-surface-hover active:bg-surface-active disabled:opacity-60",
        on ? "border-foreground bg-card font-semibold text-foreground" : "border-border bg-background text-muted-foreground",
        juggernaut && "disabled:opacity-100",
      )}
      style={juggernaut ? { borderColor: def.color, boxShadow: `0 0 0 2px ${def.glow}` } : undefined}
    >
      <span className="size-5 shrink-0 rounded-full border-2 border-foreground" style={{ background: def.color }} />
      <span className="truncate">{def.name}</span>
      {juggernaut && <Text id="arena.jugg.badge" className="ml-auto shrink-0 text-xs font-extrabold uppercase tracking-[0.08em] text-foreground" />}
      {team != null && (
        <>
          <span className="ml-auto h-5 w-1.5 shrink-0 rounded-full" style={{ background: TEAM_COLORS[team] }} aria-hidden />
          <Text id={TEAM_KEYS[team]} className="sr-only" />
        </>
      )}
    </button>
  );
}
