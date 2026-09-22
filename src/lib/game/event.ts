import { sfx } from "../audio";
import { formatNumber } from "../format";
import type { GameEvent } from "../types";

export interface Popup {
  id: number;
  title: string;
  lines: string[];
  tone: "normal" | "big" | "spin" | "level";
}

interface EventContext {
  pushPopup: (popup: Omit<Popup, "id">) => void;
  flashLevel: () => void;
}

export function handleEvent(event: GameEvent, ctx: EventContext): void {
  switch (event.type) {
    case "move":
      sfx.play("move");
      break;
    case "rotate":
      sfx.play("rotate");
      break;
    case "soft_drop":
      sfx.play("softDrop");
      break;
    case "hard_drop":
      sfx.play("hardDrop");
      break;
    case "lock":
      sfx.play("lock");
      break;
    case "hold":
      sfx.play("hold");
      break;
    case "line_clear": {
      const { result } = event;
      const lines: string[] = [`+${formatNumber(result.points)}`];
      if (result.backToBack) lines.push("BACK-TO-BACK");
      if (result.combo > 0) lines.push(`COMBO ×${result.combo}`);
      if (result.perfectClear) lines.push("PERFECT CLEAR");
      const tone =
        result.spin !== "none"
          ? "spin"
          : result.lines === 4 || result.perfectClear
            ? "big"
            : "normal";
      ctx.pushPopup({ title: result.label, lines, tone });
      sfx.play(result.spin !== "none" ? "tspin" : result.lines === 4 ? "tetris" : "clear");
      break;
    }
    case "level_up":
      ctx.pushPopup({
        title: `LEVEL ${event.level}`,
        lines: [],
        tone: "level",
      });
      ctx.flashLevel();
      sfx.play("levelUp");
      break;
    case "game_over":
      sfx.play("gameOver");
      break;
  }
}
