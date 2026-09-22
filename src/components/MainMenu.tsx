import { api } from "../lib/ipc";
import { Menu } from "./Menu";
import { MenuBackdrop } from "./MenuBackdrop";

interface Props {
  playerName: string;
  onPlay: () => void;
  onScores: () => void;
  onSettings: () => void;
}

export function MainMenu({ playerName, onPlay, onScores, onSettings }: Props) {
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
        <p className="tagline">Welcome back, {playerName}</p>
        <Menu
          items={[
            { label: "Play", hint: "Enter", onSelect: onPlay },
            { label: "High Scores", onSelect: onScores },
            { label: "Settings", onSelect: onSettings },
            { label: "Quit", onSelect: () => void api.quit() },
          ]}
        />
        <p className="footer-hint">↑ ↓ navigate · Enter select</p>
      </div>
    </div>
  );
}
