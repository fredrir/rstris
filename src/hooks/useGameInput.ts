import { useEffect } from "react";

import { sendInput } from "../lib/ipc";
import { lookupAction, pressAction, releaseAction } from "../lib/keys";
import type { KeyBindings } from "../lib/types";

export type InputMode = "playing" | "paused" | "over" | "disabled";

export function useGameInput(keys: KeyBindings, mode: InputMode): void {
  useEffect(() => {
    if (mode === "disabled" || mode === "over") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      const action = lookupAction(keys, event.code);
      if (!action) return;
      event.preventDefault();
      if (event.repeat) return;
      if (action === "pause") {
        if (mode === "playing") sendInput("pause");
        else if (mode === "paused") sendInput("resume");
        return;
      }
      if (mode !== "playing") return;
      const input = pressAction(action);
      if (input) sendInput(input);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const action = lookupAction(keys, event.code);
      if (!action) return;
      const input = releaseAction(action);
      if (input) sendInput(input);
    };
    const onBlur = () => {
      if (mode === "playing") sendInput("pause");
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [keys, mode]);
}
