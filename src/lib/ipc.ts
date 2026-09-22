import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

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
} from "./types";

export const api = {
  getSettings: () => invoke<Settings>("get_settings"),
  updateSettings: (patch: SettingsPatch) => invoke<Settings>("update_settings", { patch }),
  assignKey: (action: KeyAction, slot: number, code: string | null) =>
    invoke<Settings>("assign_key", { action, slot, code }),
  resetSettings: () => invoke<Settings>("reset_settings"),
  getGameMeta: () => invoke<GameMeta>("get_game_meta"),
  getHighScores: (limit?: number) => invoke<ScoreEntry[]>("get_high_scores", { limit }),
  clearHighScores: () => invoke<void>("clear_high_scores"),
  newGame: () => invoke<Snapshot>("new_game"),
  gameInput: (action: InputAction) => invoke<void>("game_input", { action }),
  keyInput: (code: string, pressed: boolean) => invoke<void>("key_input", { code, pressed }),
  endGame: () => invoke<void>("end_game"),
  submitScore: (name: string) => invoke<SubmitResult>("submit_score", { name }),
  quit: () => invoke<void>("quit"),
};

export function onGameState(handler: (snapshot: Snapshot) => void): Promise<UnlistenFn> {
  return listen<Snapshot>("game-state", (event) => handler(event.payload));
}

export function onGameOver(handler: (info: GameOverInfo) => void): Promise<UnlistenFn> {
  return listen<GameOverInfo>("game-over", (event) => handler(event.payload));
}

export function sendInput(action: InputAction): void {
  void api.gameInput(action).catch((error) => console.error("game_input", action, error));
}
