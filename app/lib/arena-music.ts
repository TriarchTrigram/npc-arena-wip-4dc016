// Looping theme music, synthesised live with Web Audio like the sound effects (no audio files).
// It plays through the sound effects' audio graph (`arenaSound.output`) on a bus of its own,
// so music has its own volume and mute, saved in localStorage under `npc-arena-music`.
import { arenaSound } from "./arena-sound";

export type MusicTheme = "title" | "battle";
export type MusicPrefs = { volume: number; muted: boolean };

const STORE = "npc-arena-music";
const STEPS = 16; // sixteenth notes per bar

type Hit = { step: number; midi: number; len: number }; // len in steps

type SongDef = {
  bpm: number;
  /** One chord per bar, note names low to high. */
  pad: string[];
  padWave: OscillatorType;
  padCut: number;
  padAttack: number;
  /** One root per bar; the pattern marks x = root, o = octave up, . = rest. */
  bass: string[];
  bassPat: string;
  bassMax: number;
  bassCut: number;
  /** One bar per string, eight eighth-note tokens: a note, - to hold, . to rest. */
  lead: string[];
  leadWave: OscillatorType;
  leadVol: number;
  /** Chord-tone arpeggio, one character per step: 0-2 a chord note, 3 the root an octave up. */
  arp: string | null;
  kick: string;
  snare: string;
  hat: string;
  /** The last bar's drums, a fill into the loop. */
  fill: { kick: string; snare: string };
  drums: number;
};

type Song = Omit<SongDef, "pad" | "bass" | "lead"> & { pad: number[][]; bass: number[]; lead: Hit[][] };

const SEMI: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function midi(name: string): number {
  const m = /^([A-G])(#|b)?(\d)$/.exec(name);
  if (!m) throw new Error(`bad note ${name}`);
  return 12 * (Number(m[3]) + 1) + SEMI[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
}
const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

function song(d: SongDef): Song {
  const lead = d.lead.map((bar) => {
    const hits: Hit[] = [];
    bar.trim().split(/\s+/).forEach((tok, i) => {
      if (tok === ".") return;
      if (tok === "-") {
        const last = hits[hits.length - 1];
        if (last) last.len += 2;
        return;
      }
      hits.push({ step: i * 2, midi: midi(tok), len: 2 });
    });
    return hits;
  });
  return { ...d, pad: d.pad.map((c) => c.split(" ").map(midi)), bass: d.bass.map(midi), lead };
}

const SONGS: Record<MusicTheme, Song> = {
  // Title: a slow, wide D minor theme with a rolling arpeggio, built to sit behind the mode cards.
  title: song({
    bpm: 96,
    pad: ["D3 F3 A3", "Bb2 D3 F3", "F3 A3 C4", "C3 E3 G3", "D3 F3 A3", "Bb2 D3 F3", "C3 E3 G3", "A2 C#3 E3"],
    padWave: "sawtooth",
    padCut: 900,
    padAttack: 0.7,
    bass: ["D2", "Bb1", "F2", "C2", "D2", "Bb1", "C2", "A1"],
    bassPat: "x.......x...x...",
    bassMax: 8,
    bassCut: 420,
    lead: [
      "D5 - - - F5 - A5 -",
      "G5 - F5 - D5 - - -",
      "C5 - - - F5 - A5 -",
      "G5 - - - E5 - - -",
      "A5 - - - G5 F5 E5 F5",
      "D5 - - - F5 - Bb5 -",
      "A5 - G5 - E5 - C5 -",
      "C#5 - - - E5 - - -",
    ],
    leadWave: "triangle",
    leadVol: 0.12,
    arp: "0123012301230123",
    kick: "x.......x.....x.",
    snare: "....x.......x...",
    hat: "..x...x...x...x.",
    fill: { kick: "x.......x.......", snare: "....x.......x.xx" },
    drums: 0.6,
  }),
  // Battle: a driving A minor theme with a pumping bass line and a square-wave lead.
  battle: song({
    bpm: 148,
    pad: ["A3 C4 E4", "F3 A3 C4", "G3 B3 D4", "E3 G#3 B3", "A3 C4 E4", "F3 A3 C4", "G3 B3 D4", "E3 G#3 B3"],
    padWave: "sawtooth",
    padCut: 1100,
    padAttack: 0.08,
    bass: ["A1", "F1", "G1", "E1", "A1", "F1", "G1", "E1"],
    bassPat: "x.xox.x.x.xox.x.",
    bassMax: 2,
    bassCut: 650,
    lead: [
      "A4 . C5 E5 - D5 C5 B4",
      "C5 - A4 . F4 . A4 C5",
      "D5 - B4 . G4 . D5 E5",
      "E5 - - G#4 B4 - E5 .",
      "A5 - G5 E5 - C5 D5 E5",
      "F5 - E5 C5 - A4 C5 F5",
      "G5 - F5 D5 - B4 D5 G5",
      "G#5 - E5 - B4 - G#4 .",
    ],
    leadWave: "square",
    leadVol: 0.06,
    arp: null,
    kick: "x.....x.x.x...x.",
    snare: "....x.......x...",
    hat: "x.x.x.x.x.x.x.o.",
    fill: { kick: "x.....x.x.......", snare: "....x...x.x.xxxx" },
    drums: 1,
  }),
};

type Playing = { theme: MusicTheme; song: Song; out: GainNode; step: number; next: number };

export class ArenaMusic {
  volume = 0.5;
  muted = false;
  private want: MusicTheme | null = null;
  private ctx: AudioContext | null = null;
  private bus: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private cur: Playing | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  /** Read the saved music volume and mute switch. Call after the first render. */
  load(): MusicPrefs {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE) ?? "null");
      if (raw && typeof raw.volume === "number") this.volume = Math.min(1, Math.max(0, raw.volume));
      if (raw && typeof raw.muted === "boolean") this.muted = raw.muted;
    } catch {
      // keep the defaults
    }
    this.apply();
    this.sync();
    return { volume: this.volume, muted: this.muted };
  }

  set(prefs: Partial<MusicPrefs>) {
    if (prefs.volume != null) this.volume = Math.min(1, Math.max(0, prefs.volume));
    if (prefs.muted != null) this.muted = prefs.muted;
    this.apply();
    this.sync();
    try {
      localStorage.setItem(STORE, JSON.stringify({ volume: this.volume, muted: this.muted }));
    } catch {
      // private mode: settings last for this visit only
    }
  }

  /** Which theme the screen wants; null stops the music. It starts once audio is unlocked. */
  play(theme: MusicTheme | null) {
    this.want = theme;
    this.sync();
  }

  /** Browsers only allow sound after a tap or key press: call this from one. */
  unlock() {
    if (typeof window === "undefined") return;
    arenaSound.unlock();
    const o = arenaSound.output;
    if (!o) return;
    if (!this.bus) {
      const { ctx } = o;
      this.ctx = ctx;
      this.bus = ctx.createGain();
      this.bus.gain.value = 0;
      this.bus.connect(o.out);
      const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;
      ctx.addEventListener("statechange", () => this.sync());
      // a hidden tab throttles timers, so the music rests until the tab is back
      document.addEventListener("visibilitychange", () => this.sync());
      this.apply();
    }
    this.sync();
  }

  private apply() {
    if (!this.bus || !this.ctx) return;
    const v = this.muted ? 0 : this.volume * this.volume * 0.6;
    this.bus.gain.setTargetAtTime(v, this.ctx.currentTime, 0.03);
  }

  private sync() {
    const ctx = this.ctx;
    const on = !!ctx && !!this.bus && ctx.state === "running" && !document.hidden && !this.muted && this.volume > 0 && this.want != null;
    if (this.cur && (!on || this.cur.theme !== this.want)) this.fadeOut();
    if (on && !this.cur && this.want) this.start(this.want);
  }

  private start(theme: MusicTheme) {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, now);
    out.gain.linearRampToValueAtTime(1, now + 0.6);
    out.connect(this.bus!);
    this.cur = { theme, song: SONGS[theme], out, step: 0, next: now + 0.08 };
    if (!this.timer) this.timer = setInterval(() => this.tick(), 25);
  }

  private fadeOut() {
    const ctx = this.ctx!;
    const { out } = this.cur!;
    const now = ctx.currentTime;
    out.gain.cancelScheduledValues(now);
    out.gain.setValueAtTime(out.gain.value, now);
    out.gain.linearRampToValueAtTime(0, now + 0.6);
    setTimeout(() => out.disconnect(), 1500);
    this.cur = null;
  }

  /** Schedules notes a little ahead of the audio clock, so timing holds even when a frame is late. */
  private tick() {
    const c = this.cur;
    const ctx = this.ctx;
    if (!c || !ctx) {
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
      return;
    }
    const stepDur = 60 / c.song.bpm / 4;
    const total = c.song.pad.length * STEPS;
    if (c.next < ctx.currentTime) c.next = ctx.currentTime + 0.05;
    while (c.next < ctx.currentTime + 0.2) {
      this.scheduleStep(c, Math.floor(c.step / STEPS), c.step % STEPS, c.next, stepDur);
      c.step = (c.step + 1) % total;
      c.next += stepDur;
    }
  }

  private scheduleStep(c: Playing, bar: number, s: number, t: number, stepDur: number) {
    const sg = c.song;
    const out = c.out;
    const last = bar === sg.pad.length - 1;
    const chord = sg.pad[bar];

    if (s === 0) for (const n of chord) this.pad(out, t, hz(n), stepDur * STEPS, sg);

    const b = sg.bassPat[s];
    if (b !== ".") {
      let gap = 1;
      while (s + gap < STEPS && sg.bassPat[s + gap] === ".") gap++;
      this.bass(out, t, hz(sg.bass[bar] + (b === "o" ? 12 : 0)), Math.min(gap, sg.bassMax) * stepDur * 0.92, sg.bassCut);
    }

    for (const h of sg.lead[bar]) if (h.step === s) this.lead(out, t, hz(h.midi), h.len * stepDur * 0.95, sg);

    if (sg.arp && sg.arp[s] !== ".") {
      const i = Number(sg.arp[s]);
      const n = i === 3 ? chord[0] + 12 : chord[i];
      this.pluck(out, t, hz(n + 12), stepDur * 1.6);
    }

    const kick = last ? sg.fill.kick : sg.kick;
    const snare = last ? sg.fill.snare : sg.snare;
    if (kick[s] === "x") this.kick(out, t, sg.drums);
    if (snare[s] === "x") this.snare(out, t, sg.drums);
    if (sg.hat[s] !== ".") this.hat(out, t, sg.hat[s] === "o", sg.drums);
  }

  // ── instruments ──

  /** Attack, hold, release envelope on a fresh gain node. */
  private envelope(t: number, peak: number, attack: number, dur: number, release: number) {
    const g = this.ctx!.createGain();
    attack = Math.min(attack, dur * 0.5);
    release = Math.min(release, dur - attack);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.setValueAtTime(peak, t + dur - release);
    g.gain.linearRampToValueAtTime(0, t + dur);
    return g;
  }

  private osc(type: OscillatorType, f: number, t: number, dur: number, detune = 0) {
    const o = this.ctx!.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.detune.value = detune;
    o.start(t);
    o.stop(t + dur + 0.05);
    return o;
  }

  private lowpass(f: number, q = 0.7) {
    const lp = this.ctx!.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = f;
    lp.Q.value = q;
    return lp;
  }

  private pad(out: AudioNode, t: number, f: number, dur: number, sg: Song) {
    const g = this.envelope(t, 0.03, sg.padAttack, dur, Math.min(0.4, dur * 0.3));
    const lp = this.lowpass(sg.padCut);
    for (const d of [-8, 8]) this.osc(sg.padWave, f, t, dur, d).connect(lp);
    lp.connect(g).connect(out);
  }

  private bass(out: AudioNode, t: number, f: number, dur: number, cut: number) {
    const ctx = this.ctx!;
    const g = this.envelope(t, 0.2, 0.006, dur, Math.min(0.06, dur * 0.4));
    const lp = this.lowpass(cut, 4);
    lp.frequency.setValueAtTime(cut * 2.4, t);
    lp.frequency.exponentialRampToValueAtTime(cut, t + Math.min(0.12, dur));
    this.osc("sawtooth", f, t, dur).connect(lp);
    const sub = this.osc("sine", f, t, dur);
    const sg = ctx.createGain();
    sg.gain.value = 0.6;
    sub.connect(sg).connect(g);
    lp.connect(g).connect(out);
  }

  private lead(out: AudioNode, t: number, f: number, dur: number, sg: Song) {
    const ctx = this.ctx!;
    const g = this.envelope(t, sg.leadVol, 0.012, dur, Math.min(0.08, dur * 0.3));
    const lp = this.lowpass(sg.leadWave === "square" ? 2600 : 5000);
    const a = this.osc(sg.leadWave, f, t, dur);
    const b = this.osc(sg.leadWave === "square" ? "sawtooth" : "sine", sg.leadWave === "square" ? f : f * 2, t, dur, 7);
    // a gentle vibrato that comes in after the note starts
    const lfo = this.osc("sine", 5.5, t, dur);
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(0, t);
    depth.gain.linearRampToValueAtTime(f * 0.006, t + Math.min(0.25, dur));
    lfo.connect(depth);
    depth.connect(a.frequency);
    depth.connect(b.frequency);
    const bg = ctx.createGain();
    bg.gain.value = sg.leadWave === "square" ? 0.6 : 0.2;
    a.connect(lp);
    b.connect(bg).connect(lp);
    lp.connect(g).connect(out);
  }

  private pluck(out: AudioNode, t: number, f: number, dur: number) {
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.045, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    this.osc("triangle", f, t, dur).connect(g).connect(out);
  }

  private noise(t: number, dur: number) {
    const src = this.ctx!.createBufferSource();
    src.buffer = this.noiseBuf;
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
    return src;
  }

  private kick(out: AudioNode, t: number, vol: number) {
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.55 * vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    const o = this.osc("sine", 150, t, 0.22);
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.16);
    o.connect(g).connect(out);
  }

  private snare(out: AudioNode, t: number, vol: number) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.26 * vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1900;
    bp.Q.value = 0.8;
    this.noise(t, 0.16).connect(bp).connect(g).connect(out);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(0.16 * vol, t);
    tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    const o = this.osc("triangle", 200, t, 0.08);
    o.frequency.setValueAtTime(200, t);
    o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
    o.connect(tg).connect(out);
  }

  private hat(out: AudioNode, t: number, open: boolean, vol: number) {
    const ctx = this.ctx!;
    const dur = open ? 0.2 : 0.045;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.07 * vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7000;
    this.noise(t, dur).connect(hp).connect(g).connect(out);
  }
}

export const arenaMusic = new ArenaMusic();
