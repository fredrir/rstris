import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

import type {
  GameOverInfo,
  InputAction,
  ScoreEntry,
  Settings,
  Snapshot,
  Stats,
  SubmitResult,
} from "./types";

export const api = {
  getSettings: () => invoke<Settings>("get_settings"),
  saveSettings: (settings: Settings) => invoke<Settings>("save_settings", { settings }),
  resetSettings: () => invoke<Settings>("reset_settings"),
  getHighScores: (limit?: number) => invoke<ScoreEntry[]>("get_high_scores", { limit }),
  clearHighScores: () => invoke<void>("clear_high_scores"),
  getStats: () => invoke<Stats>("get_stats"),
  newGame: () => invoke<Snapshot>("new_game"),
  gameInput: (action: InputAction) => invoke<void>("game_input", { action }),
  getGameState: () => invoke<Snapshot | null>("get_game_state"),
  endGame: () => invoke<void>("end_game"),
  gameOverInfo: () => invoke<GameOverInfo>("game_over_info"),
  submitScore: (name: string) => invoke<SubmitResult>("submit_score", { name }),
  getDbPath: () => invoke<string>("get_db_path"),
  quit: () => invoke<void>("quit"),
};

export function onGameState(handler: (snapshot: Snapshot) => void): Promise<UnlistenFn> {
  return listen<Snapshot>("game-state", (event) => handler(event.payload));
}

export function sendInput(action: InputAction): void {
  void api.gameInput(action).catch((error) => console.error("game_input", action, error));
}
