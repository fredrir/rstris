export type SfxName =
  | "move"
  | "rotate"
  | "softDrop"
  | "hardDrop"
  | "lock"
  | "hold"
  | "clear"
  | "tetris"
  | "tspin"
  | "levelUp"
  | "gameOver"
  | "pause"
  | "resume"
  | "menuMove"
  | "menuSelect"
  | "countdown"
  | "go";

type Wave = OscillatorType;

interface Tone {
  freq: number;
  ms: number;
  wave?: Wave;
  gain?: number;
  slideTo?: number;
  at?: number;
}

const PATTERNS: Record<SfxName, Tone[]> = {
  move: [{ freq: 220, ms: 25, wave: "square", gain: 0.12 }],
  rotate: [{ freq: 330, ms: 40, wave: "triangle", gain: 0.2, slideTo: 400 }],
  softDrop: [{ freq: 160, ms: 20, wave: "square", gain: 0.08 }],
  hardDrop: [{ freq: 140, ms: 80, wave: "sawtooth", gain: 0.25, slideTo: 60 }],
  lock: [{ freq: 110, ms: 60, wave: "square", gain: 0.18, slideTo: 80 }],
  hold: [
    { freq: 440, ms: 50, wave: "triangle", gain: 0.18 },
    { freq: 660, ms: 60, wave: "triangle", gain: 0.18, at: 50 },
  ],
  clear: [
    { freq: 523, ms: 60, wave: "square", gain: 0.16 },
    { freq: 659, ms: 60, wave: "square", gain: 0.16, at: 60 },
    { freq: 784, ms: 90, wave: "square", gain: 0.16, at: 120 },
  ],
  tetris: [
    { freq: 523, ms: 80, wave: "square", gain: 0.2 },
    { freq: 659, ms: 80, wave: "square", gain: 0.2, at: 80 },
    { freq: 784, ms: 80, wave: "square", gain: 0.2, at: 160 },
    { freq: 1046, ms: 220, wave: "square", gain: 0.22, at: 240 },
  ],
  tspin: [
    { freq: 400, ms: 160, wave: "sawtooth", gain: 0.18, slideTo: 900 },
    { freq: 1200, ms: 120, wave: "triangle", gain: 0.18, at: 160 },
  ],
  levelUp: [
    { freq: 392, ms: 70, wave: "triangle", gain: 0.2 },
    { freq: 523, ms: 70, wave: "triangle", gain: 0.2, at: 70 },
    { freq: 659, ms: 70, wave: "triangle", gain: 0.2, at: 140 },
    { freq: 784, ms: 70, wave: "triangle", gain: 0.2, at: 210 },
    { freq: 1046, ms: 200, wave: "triangle", gain: 0.22, at: 280 },
  ],
  gameOver: [
    { freq: 392, ms: 200, wave: "sawtooth", gain: 0.18 },
    { freq: 330, ms: 200, wave: "sawtooth", gain: 0.18, at: 220 },
    { freq: 262, ms: 200, wave: "sawtooth", gain: 0.18, at: 440 },
    { freq: 196, ms: 500, wave: "sawtooth", gain: 0.2, at: 660, slideTo: 120 },
  ],
  pause: [
    { freq: 520, ms: 60, wave: "triangle", gain: 0.16 },
    { freq: 390, ms: 90, wave: "triangle", gain: 0.16, at: 70 },
  ],
  resume: [
    { freq: 390, ms: 60, wave: "triangle", gain: 0.16 },
    { freq: 520, ms: 90, wave: "triangle", gain: 0.16, at: 70 },
  ],
  menuMove: [{ freq: 600, ms: 25, wave: "square", gain: 0.1 }],
  menuSelect: [{ freq: 700, ms: 70, wave: "triangle", gain: 0.18, slideTo: 1100 }],
  countdown: [{ freq: 440, ms: 90, wave: "square", gain: 0.14 }],
  go: [{ freq: 880, ms: 220, wave: "square", gain: 0.16 }],
};

const MIN_INTERVAL_MS: Partial<Record<SfxName, number>> = { move: 35, softDrop: 45, rotate: 30 };

class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = true;
  private volume = 0.6;
  private lastPlayed: Partial<Record<SfxName, number>> = {};

  configure(enabled: boolean, volume: number): void {
    this.enabled = enabled;
    this.volume = Math.max(0, Math.min(1, volume / 100));
    if (this.master) this.master.gain.value = this.volume;
  }

  play(name: SfxName): void {
    if (!this.enabled) return;
    const minInterval = MIN_INTERVAL_MS[name];
    const stamp = performance.now();
    if (minInterval && stamp - (this.lastPlayed[name] ?? -Infinity) < minInterval) return;
    this.lastPlayed[name] = stamp;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const now = ctx.currentTime;
    for (const tone of PATTERNS[name]) {
      const start = now + (tone.at ?? 0) / 1000;
      const end = start + tone.ms / 1000;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = tone.wave ?? "square";
      osc.frequency.setValueAtTime(tone.freq, start);
      if (tone.slideTo) osc.frequency.exponentialRampToValueAtTime(tone.slideTo, end);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(tone.gain ?? 0.15, start + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(gain).connect(this.master);
      osc.start(start);
      osc.stop(end + 0.01);
    }
  }

  private ensure(): AudioContext | null {
    if (!this.ctx) {
      if (typeof AudioContext === "undefined") return null;
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }
}

export const sfx = new Sfx();
