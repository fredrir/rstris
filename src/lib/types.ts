export type Tetromino = "I" | "O" | "T" | "S" | "Z" | "J" | "L";
export type Cell = Tetromino | null;
export type SpinKind = "none" | "mini" | "full";
export type Point = [number, number];

export interface ClearResult {
  lines: number;
  spin: SpinKind;
  backToBack: boolean;
  combo: number;
  perfectClear: boolean;
  points: number;
  label: string;
}

export type GameEvent =
  | { type: "move" }
  | { type: "rotate" }
  | { type: "soft_drop" }
  | { type: "hard_drop"; distance: number }
  | { type: "lock" }
  | { type: "hold" }
  | { type: "line_clear"; result: ClearResult }
  | { type: "level_up"; level: number }
  | { type: "game_over" };

export type Phase =
  | { kind: "playing" }
  | { kind: "clearing"; rows: number[]; remainingMs: number }
  | { kind: "game_over" };

export interface PieceView {
  kind: Tetromino;
  cells: Point[];
}

export interface Snapshot {
  version: number;
  board: Cell[][];
  active: PieceView | null;
  ghost: Point[] | null;
  hold: Tetromino | null;
  holdAvailable: boolean;
  next: Tetromino[];
  score: number;
  level: number;
  lines: number;
  linesToNextLevel: number;
  combo: number;
  backToBack: boolean;
  phase: Phase;
  paused: boolean;
  countdownMs: number | null;
  elapsedMs: number;
  pieces: number;
  gravityMs: number;
  lockProgress: number;
  lastClear: ClearResult | null;
  events: GameEvent[];
}

export type InputAction =
  | "left_press"
  | "left_release"
  | "right_press"
  | "right_release"
  | "soft_drop_press"
  | "soft_drop_release"
  | "hard_drop"
  | "rotate_cw"
  | "rotate_ccw"
  | "rotate_180"
  | "hold"
  | "pause"
  | "resume"
  | "toggle_pause";

export interface KeyBindings {
  moveLeft: string[];
  moveRight: string[];
  softDrop: string[];
  hardDrop: string[];
  rotateCw: string[];
  rotateCcw: string[];
  rotate180: string[];
  hold: string[];
  pause: string[];
}

export interface Settings {
  playerName: string;
  startLevel: number;
  ghostPiece: boolean;
  holdEnabled: boolean;
  nextCount: number;
  dasMs: number;
  arrMs: number;
  softDropFactor: number;
  lockDelayMs: number;
  soundEnabled: boolean;
  soundVolume: number;
  keys: KeyBindings;
}

export interface GameSummary {
  score: number;
  level: number;
  lines: number;
  startLevel: number;
  durationMs: number;
  pieces: number;
  maxCombo: number;
  tetrises: number;
  tspins: number;
  perfectClears: number;
}

export interface ScoreEntry extends GameSummary {
  id: number;
  name: string;
  playedAt: string;
}

export interface Stats {
  games: number;
  totalScore: number;
  bestScore: number;
  totalLines: number;
  bestLines: number;
  totalTimeMs: number;
  totalPieces: number;
  highestLevel: number;
  tetrises: number;
  tspins: number;
  perfectClears: number;
  bestCombo: number;
}

export interface GameOverInfo {
  summary: GameSummary;
  rank: number | null;
  recorded: boolean;
  playerName: string;
}

export interface SubmitResult {
  id: number;
  rank: number;
}

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;
export const HIDDEN_ROWS = 4;
export const HIGH_SCORE_LIMIT = 10;
export const CLEAR_ANIMATION_MS = 280;
export const COUNTDOWN_MS = 1500;
