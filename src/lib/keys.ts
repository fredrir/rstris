import type { InputAction, KeyBindings } from "./types";

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

const PRESS: Record<ActionId, InputAction | null> = {
  moveLeft: "left_press",
  moveRight: "right_press",
  softDrop: "soft_drop_press",
  hardDrop: "hard_drop",
  rotateCw: "rotate_cw",
  rotateCcw: "rotate_ccw",
  rotate180: "rotate_180",
  hold: "hold",
  pause: null,
};

const RELEASE: Partial<Record<ActionId, InputAction>> = {
  moveLeft: "left_release",
  moveRight: "right_release",
  softDrop: "soft_drop_release",
};

export function lookupAction(keys: KeyBindings, code: string): ActionId | null {
  for (const { id } of ACTIONS) {
    if (keys[id].includes(code)) return id;
  }
  return null;
}

export function pressAction(id: ActionId): InputAction | null {
  return PRESS[id];
}

export function releaseAction(id: ActionId): InputAction | null {
  return RELEASE[id] ?? null;
}

export function assignKey(keys: KeyBindings, id: ActionId, slot: number, code: string | null): KeyBindings {
  const next: KeyBindings = { ...keys };
  for (const { id: other } of ACTIONS) {
    next[other] = keys[other].filter((k) => k !== code);
  }
  const list = [...next[id]];
  if (code === null) {
    list.splice(slot, 1);
  } else if (slot < list.length) {
    list[slot] = code;
  } else {
    list.push(code);
  }
  next[id] = list.slice(0, 2);
  return next;
}

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

export function keysLabel(codes: string[]): string {
  return codes.length ? codes.map(keyLabel).join(" / ") : "—";
}
