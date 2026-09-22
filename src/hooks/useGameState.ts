import { useEffect, useRef, useState } from "react";

import { api, onGameState } from "../lib/ipc";
import type { Snapshot } from "../lib/types";

export function useGameState(): { snapshot: Snapshot | null; restart: () => Promise<void> } {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const latestVersion = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | null = null;
    const apply = (next: Snapshot) => {
      if (cancelled || next.version < latestVersion.current) return;
      latestVersion.current = next.version;
      setSnapshot(next);
    };
    void onGameState(apply).then((fn) => {
      if (cancelled) fn();
      else unlisten = fn;
    });
    void api
      .newGame()
      .then(apply)
      .catch((error) => console.error("new_game", error));
    return () => {
      cancelled = true;
      unlisten?.();
      void api.endGame();
    };
  }, []);

  const restart = async () => {
    latestVersion.current = 0;
    const next = await api.newGame();
    latestVersion.current = next.version;
    setSnapshot(next);
  };

  return { snapshot, restart };
}
