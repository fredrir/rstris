import { useEffect, useState } from "react";

import { sfx } from "../lib/audio";

export interface MenuItem {
  label: string;
  hint?: string;
  danger?: boolean;
  onSelect: () => void;
}

interface Props {
  items: MenuItem[];
  compact?: boolean;
}

export function Menu({ items, compact = false }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      if (event.code === "ArrowUp" || event.code === "KeyW") {
        event.preventDefault();
        sfx.play("menuMove");
        setIndex((i) => (i - 1 + items.length) % items.length);
      } else if (event.code === "ArrowDown" || event.code === "KeyS") {
        event.preventDefault();
        sfx.play("menuMove");
        setIndex((i) => (i + 1) % items.length);
      } else if (event.code === "Enter" || event.code === "NumpadEnter") {
        event.preventDefault();
        const item = items[index];
        if (item) {
          sfx.play("menuSelect");
          item.onSelect();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [items, index]);

  return (
    <ul className={`menu${compact ? " menu-compact" : ""}`} role="menu">
      {items.map((item, i) => (
        <li
          key={item.label}
          role="menuitem"
          className={`menu-item${i === index ? " active" : ""}${item.danger ? " danger" : ""}`}
          onMouseEnter={() => setIndex(i)}
          onClick={() => {
            sfx.play("menuSelect");
            item.onSelect();
          }}
        >
          <span className="menu-caret">▸</span>
          <span className="menu-label">{item.label}</span>
          {item.hint && <span className="menu-hint">{item.hint}</span>}
        </li>
      ))}
    </ul>
  );
}
