import { useEffect, useSyncExternalStore } from "react";

import { gameSession, type GameUi } from "../lib/game/session";

export function useGameUi(): GameUi | null {
  return useSyncExternalStore(gameSession.subscribe, gameSession.getUi);
}

export function useGameSession(): { restart: () => Promise<void> } {
  useEffect(() => {
    void gameSession.start().catch((error) => console.error("start game", error));
    return () => {
      void gameSession.stop();
    };
  }, []);
  return { restart: gameSession.restart };
}
