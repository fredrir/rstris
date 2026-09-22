import { api } from "../lib/ipc";
import { Menu } from "./Menu";
import { MenuBackdrop } from "./MenuBackdrop";

interface Props {
  onPlay: () => void;
  onScores: () => void;
  onSettings: () => void;
}

export function MainMenu({ onPlay, onScores, onSettings }: Props) {
  return (
    <div className="screen main-menu">
      <MenuBackdrop />
      <div className="main-menu-card">
        <h1 className="title">
          {"RSTRIS".split("").map((letter, i) => (
            <span key={i} className={`title-letter c${i % 7}`}>
              {letter}
            </span>
          ))}
        </h1>

        <Menu
          items={[
            { label: "Play", onSelect: onPlay },
            { label: "High Scores", onSelect: onScores },
            { label: "Settings", onSelect: onSettings },
            { label: "Quit", onSelect: () => void api.quit() },
          ]}
        />
      </div>
    </div>
  );
}
