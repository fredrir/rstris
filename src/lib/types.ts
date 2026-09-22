export type Tetromino = "I" | "O" | "T" | "S" | "Z" | "J" | "L";
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
  boardVersion: number;
  /** Flat row-major visible cells: 0 empty, 1..=7 tetromino. */
  board: number[];
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

export type KeyAction = keyof KeyBindings;

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

export type SettingsPatch = Partial<Omit<Settings, "keys">>;

export type SettingKey =
  "startLevel" | "nextCount" | "dasMs" | "arrMs" | "softDropFactor" | "lockDelayMs" | "soundVolume";

export interface SettingLimit {
  key: SettingKey;
  min: number;
  max: number;
  step: number;
  unit: string | null;
}

export interface PieceShape {
  kind: Tetromino;
  cells: Point[];
}

export interface GameMeta {
  boardWidth: number;
  boardHeight: number;
  hiddenRows: number;
  clearAnimationMs: number;
  previewShapes: PieceShape[];
  limits: SettingLimit[];
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
