// Arena sound effects, synthesised live with Web Audio (no audio files).
// The engine queues events on `game.sfx`; the arena screen hands them to `arenaSound.play` each frame.
import type { Anim, MoveKind, Power } from "./fighters";

export type Sfx =
  | { k: "cast"; power: Power; move: string; kind: MoveKind; anim: Anim }
  | { k: "hit"; power: Power; move: string; kind: MoveKind; anim: Anim; dmg: number; crit: boolean }
  | { k: "erupt"; power: Power; move: string }
  | { k: "dash"; air: boolean }
  | { k: "clash" }
  | { k: "m1clash" }
  | { k: "ko" }
  | { k: "rage"; power: Power }
  | { k: "intro"; power: Power };

/** Stable 0..1 number per move id, so every move keeps its own pitch and variant. */
function hash(s: string, salt = 0) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

type Wave = OscillatorType;
type ToneOpts = { delay?: number; attack?: number; type?: Wave; detune?: number; lp?: number; vib?: [number, number] };
type NoiseOpts = { delay?: number; attack?: number; type?: BiquadFilterType; q?: number };

class Synth {
  constructor(private ctx: AudioContext, private out: AudioNode, private noiseBuf: AudioBuffer, public gain: number) {}

  private env(g: GainNode, at: number, peak: number, attack: number, dur: number) {
    attack = Math.min(attack, dur * 0.6);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  }

  /** One oscillator gliding from f0 to f1. */
  tone(f0: number, f1: number, dur: number, vol: number, o: ToneOpts = {}) {
    const { ctx } = this;
    const at = ctx.currentTime + (o.delay ?? 0);
    const osc = ctx.createOscillator();
    osc.type = o.type ?? "sine";
    osc.frequency.setValueAtTime(Math.max(20, f0), at);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), at + dur);
    if (o.detune) osc.detune.value = o.detune;
    const g = ctx.createGain();
    this.env(g, at, vol * this.gain, o.attack ?? 0.005, dur);
    let node: AudioNode = osc;
    if (o.lp) {
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = o.lp;
      node.connect(f);
      node = f;
    }
    if (o.vib) {
      const lfo = ctx.createOscillator();
      const depth = ctx.createGain();
      lfo.frequency.value = o.vib[0];
      depth.gain.value = o.vib[1];
      lfo.connect(depth).connect(osc.frequency);
      lfo.start(at);
      lfo.stop(at + dur + 0.05);
    }
    node.connect(g).connect(this.out);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }

  /** Filtered noise with the filter sweeping from f0 to f1. */
  noise(f0: number, f1: number, dur: number, vol: number, o: NoiseOpts = {}) {
    const { ctx } = this;
    const at = ctx.currentTime + (o.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = o.type ?? "bandpass";
    f.Q.value = o.q ?? 1;
    f.frequency.setValueAtTime(Math.max(20, f0), at);
    f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), at + dur);
    const g = ctx.createGain();
    this.env(g, at, vol * this.gain, o.attack ?? 0.005, dur);
    src.connect(f).connect(g).connect(this.out);
    src.start(at, Math.random() * 1.5);
    src.stop(at + dur + 0.05);
  }

  /** Two-operator FM: bells, warbles. */
  fm(carrier: number, ratio: number, index: number, dur: number, vol: number, delay = 0) {
    const { ctx } = this;
    const at = ctx.currentTime + delay;
    const c = ctx.createOscillator();
    const m = ctx.createOscillator();
    const mg = ctx.createGain();
    c.frequency.value = carrier;
    m.frequency.value = carrier * ratio;
    mg.gain.setValueAtTime(carrier * index, at);
    mg.gain.exponentialRampToValueAtTime(carrier * 0.05 + 1, at + dur);
    m.connect(mg).connect(c.frequency);
    const g = ctx.createGain();
    this.env(g, at, vol * this.gain, 0.004, dur);
    c.connect(g).connect(this.out);
    c.start(at); m.start(at);
    c.stop(at + dur + 0.05); m.stop(at + dur + 0.05);
  }
}

/**
 * Each fighter's own voice. `p` is the move's pitch (0.82 to 1.22), `len` scales the length for the move kind,
 * `v` is the move's variant (0, 1 or 2) so two moves of one fighter never sound the same.
 */
type Voice = (s: Synth, p: number, len: number, v: number) => void;

const CAST: Record<Power, Voice> = {
  pyro: (s, p, len, v) => {
    s.noise(380 * p, 2600 * p, 0.12 * len, 0.5, { type: "lowpass", q: 2, attack: 0.03 });
    s.noise(2400 * p, 500 * p, 0.38 * len, 0.45, { type: "lowpass", q: 1.5, delay: 0.1 * len });
    for (let i = 0; i < 3 + v; i++) s.noise(3500, 2500, 0.025, 0.25, { type: "highpass", delay: 0.05 + i * 0.07 * len });
  },
  cryo: (s, p, len, v) => {
    const notes = v === 0 ? [1760, 2350, 2960] : v === 1 ? [2960, 2350, 1980, 1760] : [1980, 2640, 3520];
    notes.forEach((n, i) => s.tone(n * p, n * p * 0.99, 0.5 * len, 0.22, { type: "sine", delay: i * 0.06 * len }));
    s.noise(6000, 9000, 0.35 * len, 0.18, { type: "highpass", attack: 0.04 });
  },
  electro: (s, p, len, v) => {
    s.tone(1800 * p, 110 * p, 0.22 * len, 0.25, { type: "sawtooth", lp: 5000 });
    s.tone(90 * p, 70 * p, 0.35 * len, 0.2, { type: "square", lp: 1400, vib: [38 + v * 9, 30] });
    for (let i = 0; i < 4; i++) s.noise(3000, 1500, 0.03, 0.3, { type: "bandpass", q: 3, delay: i * 0.06 * len + Math.random() * 0.03 });
  },
  terra: (s, p, len, v) => {
    s.tone(140 * p, 38, 0.32 * len, 0.75, { type: "sine" });
    s.noise(500 * p, 90, 0.5 * len, 0.5, { type: "lowpass", q: 1 });
    for (let i = 0; i < 2 + v; i++) s.noise(900, 500, 0.05, 0.3, { type: "lowpass", delay: 0.12 + i * 0.08 * len });
  },
  aero: (s, p, len, v) => {
    const up = v !== 1;
    s.noise(up ? 300 * p : 3200 * p, up ? 3200 * p : 400 * p, 0.4 * len, 0.55, { type: "bandpass", q: 2.5, attack: 0.1 * len });
    s.noise(1200 * p, 1800 * p, 0.3 * len, 0.2, { type: "bandpass", q: 6, delay: 0.08 });
  },
  hydro: (s, p, len, v) => {
    s.noise(1400 * p, 400 * p, 0.35 * len, 0.4, { type: "lowpass", q: 3, attack: 0.02 });
    for (let i = 0; i < 4 + v; i++) {
      const f = (260 + Math.random() * 260) * p;
      s.tone(f, f * 2.6, 0.07, 0.22, { delay: i * 0.055 * len });
    }
  },
  umbra: (s, p, len, v) => {
    s.tone(110 * p, 52 * p, 0.55 * len, 0.32, { type: "sawtooth", lp: 650, attack: 0.08 });
    s.tone(113 * p, 54 * p, 0.55 * len, 0.32, { type: "sawtooth", lp: 650, attack: 0.08, detune: 18 });
    s.noise(200, 900 + v * 300, 0.45 * len, 0.2, { type: "lowpass", attack: 0.3 * len });
  },
  lux: (s, p, len, v) => {
    const chord = v === 2 ? [880, 1175, 1480] : [880, 1109, 1319];
    chord.forEach((n, i) => s.tone(n * p, n * p, 0.55 * len, 0.17, { type: "triangle", delay: i * 0.03, attack: 0.02 }));
    s.tone(3520 * p, 3520 * p, 0.3 * len, 0.06, { type: "sine", delay: 0.08, vib: [9, 40] });
  },
  gravi: (s, p, len, v) => {
    s.tone(95 * p, 28, 0.55 * len, 0.8, { type: "sine", attack: 0.02 });
    s.noise(300, 60, 0.45 * len, 0.45, { type: "lowpass", q: 4 });
    if (v > 0) s.tone(48 * p, 26, 0.4 * len, 0.4, { type: "triangle", delay: 0.12 });
  },
  tele: (s, p, len, v) => {
    s.fm(620 * p, 1.41 + v * 0.3, 4, 0.5 * len, 0.3);
    s.tone(400 * p, 1600 * p, 0.18 * len, 0.12, { type: "sine", delay: 0.04 });
  },
  vita: (s, p, len, v) => {
    const notes = v === 1 ? [523, 784, 1047] : [523, 659, 784, 1047];
    notes.forEach((n, i) => s.tone(n * p, n * p, 0.35 * len, 0.2, { type: "sine", delay: i * 0.07 * len, attack: 0.02 }));
  },
  toxi: (s, p, len, v) => {
    s.tone(210 * p, 120 * p, 0.45 * len, 0.35, { type: "sine", vib: [11 + v * 4, 60] });
    s.noise(800, 300, 0.4 * len, 0.25, { type: "lowpass", q: 6, attack: 0.05 });
    for (let i = 0; i < 3; i++) s.tone(180 * p, 420 * p, 0.05, 0.18, { delay: 0.1 + i * 0.09 * len });
  },
  chrono: (s, p, len, v) => {
    for (let i = 0; i < 4; i++) {
      s.noise(4200, 4000, 0.018, 0.4, { type: "highpass", delay: i * 0.08 * len });
      s.tone(i % 2 ? 1500 * p : 2000 * p, 1400 * p, 0.03, 0.12, { type: "square", delay: i * 0.08 * len });
    }
    const up = v !== 1;
    s.tone(up ? 200 * p : 1300 * p, up ? 1300 * p : 200 * p, 0.35 * len, 0.14, { type: "triangle", delay: 0.05, attack: 0.2 * len });
  },
  magneto: (s, p, len, v) => {
    s.tone(60 * p, 64 * p, 0.45 * len, 0.25, { type: "sawtooth", lp: 900, vib: [6, 4] });
    s.tone(120 * p, 124 * p, 0.45 * len, 0.15, { type: "square", lp: 700 });
    [1300, 1743, 2390].forEach((n, i) => s.tone(n * p * (1 + v * 0.06), n * p, 0.4 * len, 0.09, { type: "triangle", delay: 0.05 + i * 0.01 }));
  },
  psy: (s, p, len, v) => {
    s.tone(420 * p, 520 * p, 0.55 * len, 0.25, { type: "sine", vib: [7 + v * 2, 70] });
    s.tone(630 * p, 780 * p, 0.55 * len, 0.12, { type: "triangle", vib: [5, 50], attack: 0.1 });
    s.fm(300 * p, 3.5, 2, 0.3 * len, 0.1, 0.05);
  },
  shift: (s, p, len, v) => {
    s.tone(200 * p, 900 * p, 0.18 * len, 0.18, { type: "sawtooth", lp: 2200 });
    s.tone(900 * p, 140 * p, 0.25 * len, 0.18, { type: "sawtooth", lp: 1800, delay: 0.16 * len });
    for (let i = 0; i < 2 + v; i++) s.tone(1200 + Math.random() * 1600, 800, 0.03, 0.1, { type: "square", delay: 0.05 + i * 0.07 });
  },
};

const IMPACT: Record<Power, Voice> = {
  pyro: (s, p) => { s.noise(2200 * p, 300, 0.25, 0.6, { type: "lowpass", q: 1 }); s.tone(130, 50, 0.15, 0.4); },
  cryo: (s, p) => {
    for (let i = 0; i < 4; i++) s.tone((2400 + Math.random() * 2400) * p, 2000 * p, 0.12, 0.13, { type: "triangle", delay: i * 0.02 });
    s.noise(5000, 3000, 0.12, 0.4, { type: "highpass" });
  },
  electro: (s, p) => { s.tone(95 * p, 80, 0.16, 0.3, { type: "sawtooth", lp: 2400, vib: [50, 30] }); s.noise(4000, 1500, 0.06, 0.5, { type: "bandpass", q: 2 }); },
  terra: (s, p) => { s.tone(110 * p, 35, 0.22, 0.85); s.noise(700, 150, 0.2, 0.5, { type: "lowpass" }); },
  aero: (s, p) => { s.noise(2600 * p, 500, 0.18, 0.5, { type: "bandpass", q: 2 }); },
  hydro: (s, p) => { s.noise(1200 * p, 350, 0.22, 0.55, { type: "bandpass", q: 1.5 }); s.tone(300 * p, 800 * p, 0.06, 0.2, { delay: 0.05 }); },
  umbra: (s, p) => { s.tone(90 * p, 40, 0.25, 0.5, { type: "sawtooth", lp: 400 }); s.noise(300, 900, 0.2, 0.25, { type: "lowpass", attack: 0.15 }); },
  lux: (s, p) => { s.tone(2640 * p, 2640 * p, 0.25, 0.18, { type: "triangle" }); s.tone(1760 * p, 1760 * p, 0.2, 0.12, { type: "sine" }); },
  gravi: (s, p) => { s.tone(70 * p, 24, 0.35, 0.85); s.noise(250, 60, 0.25, 0.4, { type: "lowpass" }); },
  tele: (s, p) => { s.fm(900 * p, 2.76, 3, 0.25, 0.25); },
  vita: (s, p) => { s.tone(784 * p, 784 * p, 0.15, 0.2, { type: "triangle" }); s.tone(1047 * p, 1047 * p, 0.15, 0.12, { delay: 0.05 }); },
  toxi: (s, p) => { s.noise(700 * p, 180, 0.2, 0.5, { type: "bandpass", q: 4 }); s.tone(150 * p, 60, 0.15, 0.3); },
  chrono: (s, p) => { s.noise(4500, 4200, 0.02, 0.45, { type: "highpass" }); s.noise(3000, 2800, 0.02, 0.4, { type: "highpass", delay: 0.09 }); s.tone(1800 * p, 900 * p, 0.12, 0.12, { type: "square" }); },
  magneto: (s, p) => { [520, 1243, 1890].forEach((n) => s.tone(n * p, n * p * 0.98, 0.35, 0.14, { type: "triangle" })); s.noise(3000, 1500, 0.05, 0.4); },
  psy: (s, p) => { s.tone(500 * p, 250 * p, 0.2, 0.25, { vib: [18, 80] }); },
  shift: (s, p) => { for (let i = 0; i < 3; i++) s.tone(400 + Math.random() * 1800, 300, 0.04, 0.15, { type: "square", delay: i * 0.035 }); },
};

/** How long each kind of move sounds, relative to its fighter's voice. */
const KIND_LEN: Record<MoveKind, number> = {
  melee: 0.5, projectile: 0.75, beam: 1.5, burst: 1.15, dash: 0.9, eruption: 0.6,
  rain: 1.1, blink: 0.55, heal: 1.2, zone: 1.3, pull: 0.8, mimic: 0.8,
};

const KICK_ANIMS: Anim[] = ["kick", "spin"];

const STORE = "npc-arena-sound";

export type SoundPrefs = { volume: number; muted: boolean };

export class ArenaSound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private comp: DynamicsCompressorNode | null = null;
  private synth: Synth | null = null;
  private last: Record<string, number> = {};
  volume = 0.6;
  muted = false;

  /** Read the saved volume and mute switch. Call after the first render. */
  load(): SoundPrefs {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE) ?? "null");
      if (raw && typeof raw.volume === "number") this.volume = Math.min(1, Math.max(0, raw.volume));
      if (raw && typeof raw.muted === "boolean") this.muted = raw.muted;
    } catch {
      // keep the defaults
    }
    this.apply();
    return { volume: this.volume, muted: this.muted };
  }

  set(prefs: Partial<SoundPrefs>) {
    if (prefs.volume != null) this.volume = Math.min(1, Math.max(0, prefs.volume));
    if (prefs.muted != null) this.muted = prefs.muted;
    this.apply();
    try {
      localStorage.setItem(STORE, JSON.stringify({ volume: this.volume, muted: this.muted }));
    } catch {
      // private mode: settings last for this visit only
    }
  }

  /** Browsers only allow sound after a tap or key press: call this from one. */
  unlock() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 6;
      comp.attack.value = 0.003;
      comp.release.value = 0.2;
      const master = ctx.createGain();
      master.connect(comp).connect(ctx.destination);
      const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.ctx = ctx;
      this.master = master;
      this.comp = comp;
      this.synth = new Synth(ctx, master, buf, 1);
      this.apply();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  /** The shared audio graph once a tap has unlocked it: the theme music plays through it too, with its own volume. */
  get output(): { ctx: AudioContext; out: AudioNode } | null {
    return this.ctx && this.comp ? { ctx: this.ctx, out: this.comp } : null;
  }

  private apply() {
    if (!this.master || !this.ctx) return;
    const v = this.muted ? 0 : this.volume * this.volume * 0.9;
    this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  }

  /** At most one of each sound per short window, so a 16-fighter brawl stays readable. */
  private gate(key: string, gap: number) {
    const now = performance.now();
    if (now - (this.last[key] ?? -1e9) < gap * 1000) return false;
    this.last[key] = now;
    return true;
  }

  play(events: Sfx[]) {
    if (!events.length) return;
    const s = this.synth;
    if (!s || !this.ctx || this.muted || this.volume <= 0 || this.ctx.state !== "running") return;
    let hits = 0, casts = 0;
    for (const e of events) {
      switch (e.k) {
        case "cast": {
          if (casts >= 3 || !this.gate(`c:${e.move}`, 0.08)) break;
          casts++;
          const p = 0.82 + hash(e.move) * 0.4;
          const v = Math.floor(hash(e.move, 7) * 3);
          if (e.kind === "melee") {
            // the swing itself, tinted by the fighter's element
            this.swish(s, KICK_ANIMS.includes(e.anim) ? 0.75 : 1);
            s.gain = 0.35;
            CAST[e.power](s, p, KIND_LEN.melee, v);
            s.gain = 1;
            break;
          }
          s.gain = e.kind === "zone" ? 0.6 : 0.85;
          CAST[e.power](s, p, KIND_LEN[e.kind], v);
          if (e.kind === "burst") this.boom(s, 0.5);
          if (e.kind === "blink") { this.swish(s, 1.4); s.noise(400, 3000, 0.15, 0.3, { type: "bandpass", q: 3, delay: 0.12 }); }
          if (e.kind === "pull") s.noise(3000, 300, 0.3, 0.3, { type: "bandpass", q: 3 });
          if (e.kind === "heal") [1047, 1319, 1568].forEach((n, i) => s.tone(n, n, 0.4, 0.08, { delay: 0.15 + i * 0.07, attack: 0.03 }));
          s.gain = 1;
          break;
        }
        case "hit": {
          if (hits >= 4 || !this.gate(`h:${e.power}:${e.kind}`, 0.05)) break;
          hits++;
          const p = 0.82 + hash(e.move) * 0.4;
          const loud = Math.min(1, 0.55 + e.dmg / 22) * (e.crit ? 1.25 : 1);
          if (e.kind === "melee" || e.kind === "dash" || e.kind === "blink") {
            s.gain = loud;
            if (KICK_ANIMS.includes(e.anim)) this.kick(s); else this.punch(s, e.anim);
            if (e.crit) s.noise(5000, 2500, 0.05, 0.5, { type: "highpass", delay: 0.01 });
            s.gain = loud * 0.45;
            IMPACT[e.power](s, p, 1, 0);
          } else {
            s.gain = loud * 0.85;
            IMPACT[e.power](s, p, 1, 0);
            if (e.crit) this.punch(s, "slam");
          }
          s.gain = 1;
          break;
        }
        case "erupt": {
          if (!this.gate(`e:${e.move}`, 0.08)) break;
          const p = 0.82 + hash(e.move) * 0.4;
          s.gain = 1;
          this.boom(s, 0.6);
          IMPACT[e.power](s, p, 1, 0);
          break;
        }
        case "dash":
          if (!this.gate("dash", 0.04)) break;
          s.gain = 0.7;
          s.noise(e.air ? 1200 : 700, e.air ? 3600 : 2600, 0.16, 0.5, { type: "bandpass", q: 2, attack: 0.02 });
          s.noise(5000, 7000, 0.08, 0.12, { type: "highpass" });
          s.gain = 1;
          break;
        case "clash":
          if (!this.gate("clash", 0.1)) break;
          this.boom(s, 1);
          s.noise(4000, 300, 0.6, 0.5, { type: "lowpass", q: 0.8 });
          [1180, 1770, 2650].forEach((n) => s.tone(n, n * 0.97, 0.7, 0.08, { type: "triangle" }));
          break;
        case "m1clash":
          if (!this.gate("m1", 0.1)) break;
          // two fists meeting: a ringing smack, then both fly back
          [1400, 2120, 3010].forEach((n) => s.tone(n, n * 0.99, 0.45, 0.13, { type: "triangle" }));
          s.noise(6000, 2000, 0.07, 0.7, { type: "highpass" });
          s.tone(180, 60, 0.18, 0.7);
          this.swish(s, 0.8, 0.08);
          break;
        case "rage":
          if (!this.gate("rage", 1)) break;
          // Rage Mode: a low rumble climbing into a roar with the element's own voice on top; the burst at the end plays as a clash
          s.gain = 1;
          s.tone(55, 140, 1.9, 0.5, { type: "sawtooth", lp: 700, attack: 0.6 });
          s.tone(110, 300, 1.7, 0.18, { type: "square", lp: 1400, attack: 0.9, delay: 0.2 });
          s.noise(200, 3800, 1.8, 0.4, { type: "bandpass", q: 1.2, attack: 1 });
          s.gain = 0.9;
          CAST[e.power](s, 0.7, 1.4, 0);
          s.gain = 1;
          break;
        case "intro": {
          // a fighter arriving: its element's voice, drawn out, over a low thud
          if (!this.gate(`i:${e.power}`, 0.12) || !this.gate("intro", 0.06)) break;
          s.gain = 0.8;
          CAST[e.power](s, 0.92, 1.25, 1);
          s.gain = 0.55;
          IMPACT[e.power](s, 0.85, 1, 2);
          s.gain = 1;
          this.boom(s, 0.35);
          break;
        }
        case "ko":
          if (!this.gate("ko", 0.2)) break;
          this.boom(s, 1.2);
          s.tone(220, 55, 0.9, 0.3, { type: "sawtooth", lp: 900, delay: 0.05 });
          s.noise(1500, 120, 0.8, 0.4, { type: "lowpass" });
          break;
      }
    }
  }

  private swish(s: Synth, pitch: number, delay = 0) {
    s.noise(500 * pitch, 2400 * pitch, 0.13, 0.4, { type: "bandpass", q: 1.6, attack: 0.04, delay });
  }

  private punch(s: Synth, anim: Anim) {
    const deep = anim === "slam" || anim === "uppercut" ? 0.8 : 1;
    s.tone(170 * deep, 55, 0.12, 0.9);
    s.noise(2200, 600, 0.06, 0.65, { type: "lowpass", q: 1 });
    s.noise(4000, 3000, 0.02, 0.3, { type: "highpass" });
  }

  private kick(s: Synth) {
    s.tone(120, 38, 0.2, 1);
    s.noise(1400, 300, 0.11, 0.7, { type: "lowpass", q: 1.2 });
    s.noise(3200, 2000, 0.035, 0.45, { type: "bandpass", q: 1.5 });
  }

  private boom(s: Synth, size: number) {
    s.tone(85, 26, 0.5 * size, 0.9 * Math.min(1, size + 0.2));
    s.noise(900, 60, 0.45 * size, 0.55, { type: "lowpass", q: 0.7 });
  }
}

export const arenaSound = new ArenaSound();
