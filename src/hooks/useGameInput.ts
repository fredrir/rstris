import { useEffect, useMemo } from "react";

import { api, sendInput } from "../lib/ipc";
import type { KeyBindings } from "../lib/types";

export function useGameInput(keys: KeyBindings, enabled: boolean): void {
  const bound = useMemo(() => new Set(Object.values(keys).flat()), [keys]);

  useEffect(() => {
    const send = (code: string, pressed: boolean) => {
      void api.keyInput(code, pressed).catch((error) => console.error("key_input", code, error));
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!enabled || event.target instanceof HTMLInputElement) return;
      if (!bound.has(event.code)) return;
      event.preventDefault();
      if (event.repeat) return;
      send(event.code, true);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (!bound.has(event.code)) return;
      send(event.code, false);
    };
    const onBlur = () => {
      if (enabled) sendInput("pause");
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [bound, enabled]);
}
