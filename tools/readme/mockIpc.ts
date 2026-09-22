/**
 * Browser stand-in for `src/lib/ipc.ts`, used only by the README capture build.
 *
 * It loads a real gameplay recording produced by
 * `cargo run --example readme_capture` and replays the engine snapshots in real
 * time so the unmodified React/Canvas UI renders exactly like the desktop app.
 */
import type {
  GameMeta,
  GameOverInfo,
  InputAction,
  KeyAction,
  ScoreEntry,
  Settings,
  SettingsPatch,
  Snapshot,
  SubmitResult,
} from "../../src/lib/types";

interface Frame {
  tMs: number;
  snapshot: Snapshot;
}

interface Demo {
  meta: GameMeta;
  settings: Settings;
  scores: ScoreEntry[];
  frames: Frame[];
}

let demo: Demo | null = null;
let loading: Promise<Demo> | null = null;

function load(): Promise<Demo> {
  loading ??= (async () => {
    const response = await fetch("/demo.json.gz");
    if (!response.ok) throw new Error(`demo data missing (${response.status})`);
    if (!response.body) throw new Error("demo data unreadable");
    const stream = response.body.pipeThrough(new DecompressionStream("gzip"));
    const text = await new Response(stream).text();
    demo = JSON.parse(text) as Demo;
    return demo;
  })();
  return loading;
}

const stateHandlers = new Set<(snapshot: Snapshot) => void>();
const overHandlers = new Set<(info: GameOverInfo) => void>();

let rafId = 0;
let startTime = 0;
let cursor = 0;
let current: Snapshot | null = null;
let pausedAt: number | null = null;

function stopReplay(): void {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
}

function emit(snapshot: Snapshot): void {
  current = snapshot;
  for (const handler of stateHandlers) handler(snapshot);
}

function tick(): void {
  rafId = 0;
  const data = demo;
  if (!data) return;
  const elapsed = performance.now() - startTime;
  const origin = data.frames[0]?.tMs ?? 0;
  while (cursor < data.frames.length && data.frames[cursor]!.tMs - origin <= elapsed) {
    emit(data.frames[cursor++]!.snapshot);
  }
  if (cursor >= data.frames.length) {
    const last = data.frames.at(-1)?.snapshot;
    if (last) {
      const info: GameOverInfo = {
        summary: {
          score: last.score,
          level: last.level,
          lines: last.lines,
          startLevel: 1,
          durationMs: last.elapsedMs,
          pieces: last.pieces,
          maxCombo: 0,
          tetrises: 0,
          tspins: 0,
          perfectClears: 0,
        },
        rank: null,
        recorded: true,
        playerName: "Player",
      };
      for (const handler of overHandlers) handler(info);
    }
    return;
  }
  rafId = requestAnimationFrame(tick);
}

function startReplay(): void {
  stopReplay();
  cursor = 1;
  pausedAt = null;
  startTime = performance.now();
  rafId = requestAnimationFrame(tick);
}

function togglePause(): void {
  if (!current || !settings) return;
  const paused = !current.paused;
  if (paused) {
    pausedAt = performance.now();
    stopReplay();
  } else if (pausedAt !== null) {
    startTime += performance.now() - pausedAt;
    pausedAt = null;
    rafId = requestAnimationFrame(tick);
  }
  emit({ ...current, paused, version: current.version + 1 });
}

let settings: Settings | null = null;

export const api = {
  async getSettings(): Promise<Settings> {
    const data = await load();
    settings = data.settings;
    return settings;
  },
  async updateSettings(patch: SettingsPatch): Promise<Settings> {
    const data = await load();
    settings = { ...(settings ?? data.settings), ...patch };
    return settings;
  },
  async assignKey(): Promise<Settings> {
    const data = await load();
    return settings ?? data.settings;
  },
  async resetSettings(): Promise<Settings> {
    const data = await load();
    settings = data.settings;
    return settings;
  },
  async getGameMeta(): Promise<GameMeta> {
    return (await load()).meta;
  },
  async getHighScores(limit?: number): Promise<ScoreEntry[]> {
    const data = await load();
    return data.scores.slice(0, limit ?? data.scores.length);
  },
  async clearHighScores(): Promise<void> {},
  async newGame(): Promise<Snapshot> {
    const data = await load();
    startReplay();
    return data.frames[0]!.snapshot;
  },
  async gameInput(_action: InputAction): Promise<void> {},
  async keyInput(code: string, pressed: boolean): Promise<void> {
    if (!pressed || !settings) return;
    if (settings.keys.pause.includes(code)) togglePause();
  },
  async endGame(): Promise<void> {
    stopReplay();
  },
  async submitScore(_name: string): Promise<SubmitResult> {
    return { id: 1, rank: 1 };
  },
  async quit(): Promise<void> {},
};

export function onGameState(handler: (snapshot: Snapshot) => void): Promise<() => void> {
  stateHandlers.add(handler);
  return Promise.resolve(() => stateHandlers.delete(handler));
}

export function onGameOver(handler: (info: GameOverInfo) => void): Promise<() => void> {
  overHandlers.add(handler);
  return Promise.resolve(() => overHandlers.delete(handler));
}

export function sendInput(_action: InputAction): void {}

export type { KeyAction };
