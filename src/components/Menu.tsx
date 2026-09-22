import { useEffect, useState } from "react";

import { PlayIcon } from "../icons/PlayIcon";
import { sfx } from "../lib/audio";
import { cx } from "../lib/cx";

export interface MenuItem {
  label: string;
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
    <ul className="m-0 flex w-full list-none flex-col items-center gap-1 p-0" role="menu">
      {items.map((item, i) => {
        const active = i === index;
        return (
          <li
            key={item.label}
            role="menuitem"
            className={cx(
              "flex items-center gap-3 transition-[background-color,color,transform] duration-100",
              compact ? "px-3.5 py-2 text-[15px]" : "px-4 py-2.5 text-lg",
              active ? cx("translate-x-1", item.danger ? "text-danger" : "text-ink") : "text-muted",
            )}
            onMouseEnter={() => setIndex(i)}
            onClick={() => {
              sfx.play("menuSelect");
              item.onSelect();
            }}
          >
            <PlayIcon
              className={cx(
                "h-[0.54em] w-[0.5em] flex-none text-accent transition-opacity duration-100",
                active ? "opacity-100" : "opacity-0",
              )}
            />
            <span>{item.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
