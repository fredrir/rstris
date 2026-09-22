import type { KeyBindings } from "./types";

export type ActionId = keyof KeyBindings;

export const ACTIONS: { id: ActionId; label: string }[] = [
  { id: "moveLeft", label: "Move left" },
  { id: "moveRight", label: "Move right" },
  { id: "softDrop", label: "Soft drop" },
  { id: "hardDrop", label: "Hard drop" },
  { id: "rotateCw", label: "Rotate clockwise" },
  { id: "rotateCcw", label: "Rotate counter-clockwise" },
  { id: "rotate180", label: "Rotate 180°" },
  { id: "hold", label: "Hold" },
  { id: "pause", label: "Pause" },
];

const SPECIAL: Record<string, string> = {
  ArrowLeft: "←",
  ArrowRight: "→",
  ArrowUp: "↑",
  ArrowDown: "↓",
  Space: "Space",
  Escape: "Esc",
  Enter: "Enter",
  Tab: "Tab",
  Backspace: "Bksp",
  ShiftLeft: "Shift",
  ShiftRight: "R Shift",
  ControlLeft: "Ctrl",
  ControlRight: "R Ctrl",
  AltLeft: "Alt",
  AltRight: "R Alt",
  MetaLeft: "Cmd",
  MetaRight: "R Cmd",
  CapsLock: "Caps",
  Comma: ",",
  Period: ".",
  Slash: "/",
  Semicolon: ";",
  Quote: "'",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  Minus: "-",
  Equal: "=",
  Backquote: "`",
};

export function keyLabel(code: string): string {
  if (SPECIAL[code]) return SPECIAL[code];
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return `Num ${code.slice(6)}`;
  return code;
}
