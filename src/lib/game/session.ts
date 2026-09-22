import { api, onGameState } from "../ipc";
import type { Snapshot, Tetromino } from "../types";

export type PhaseKind = "playing" | "game_over";

/** Derived state the React chrome renders. Recreated only when a field changes. */
export interface GameUi {
  score: number;
  level: number;
  lines: number;
  hold: Tetromino | null;
  holdAvailable: boolean;
  next: Tetromino[];
  nextKey: string;
  paused: boolean;
  phase: PhaseKind;
  countdownDigit: number | null;
}

type Listener = () => void;
type FrameListener = (snapshot: Snapshot) => void;
type Unlisten = () => void;

class GameSession {
  private snapshot: Snapshot | null = null;
  private ui: GameUi | null = null;
  private version = 0;
  private epoch = 0;
  private unlisten: Unlisten | null = null;
  private uiListeners = new Set<Listener>();
  private frameListeners = new Set<FrameListener>();

  getSnapshot = (): Snapshot | null => this.snapshot;
  getUi = (): GameUi | null => this.ui;

  subscribe = (listener: Listener): Unlisten => {
    this.uiListeners.add(listener);
    return () => this.uiListeners.delete(listener);
  };

  subscribeFrame = (listener: FrameListener): Unlisten => {
    this.frameListeners.add(listener);
    return () => this.frameListeners.delete(listener);
  };

  async start(): Promise<void> {
    const epoch = ++this.epoch;
    const unlisten = await onGameState((snapshot) => this.apply(snapshot));
    if (epoch !== this.epoch) {
      unlisten();
      return;
    }
    this.unlisten = unlisten;
    const snapshot = await api.newGame();
    if (epoch === this.epoch) this.apply(snapshot);
  }

  async stop(): Promise<void> {
    const running = this.unlisten !== null || this.snapshot !== null;
    this.epoch++;
    this.unlisten?.();
    this.unlisten = null;
    this.snapshot = null;
    this.ui = null;
    this.version = 0;
    if (running) {
      await api.endGame().catch((error) => console.error("end_game", error));
    }
  }

  restart = async (): Promise<void> => {
    const epoch = this.epoch;
    const snapshot = await api.newGame();
    if (epoch === this.epoch) this.apply(snapshot);
  };

  private apply(next: Snapshot): void {
    if (next.version < this.version) return;
    this.version = next.version;
    this.snapshot = next;
    for (const listener of this.frameListeners) listener(next);
    const ui = deriveUi(next, this.ui);
    if (ui !== this.ui) {
      this.ui = ui;
      for (const listener of this.uiListeners) listener();
    }
  }
}

function deriveUi(next: Snapshot, prev: GameUi | null): GameUi {
  const nextKey = next.next.join("");
  const countdownDigit =
    next.countdownMs === null ? null : Math.max(1, Math.ceil(next.countdownMs / 500));
  if (
    prev &&
    prev.score === next.score &&
    prev.level === next.level &&
    prev.lines === next.lines &&
    prev.hold === next.hold &&
    prev.holdAvailable === next.holdAvailable &&
    prev.nextKey === nextKey &&
    prev.paused === next.paused &&
    prev.phase === next.phase.kind &&
    prev.countdownDigit === countdownDigit
  ) {
    return prev;
  }
  return {
    score: next.score,
    level: next.level,
    lines: next.lines,
    hold: next.hold,
    holdAvailable: next.holdAvailable,
    next: next.next,
    nextKey,
    paused: next.paused,
    phase: next.phase.kind,
    countdownDigit,
  };
}

export const gameSession = new GameSession();
