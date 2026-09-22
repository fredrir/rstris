import { api } from "../lib/ipc";
import { Menu } from "./Menu";
import { MenuBackdrop } from "./MenuBackdrop";

interface Props {
  onPlay: () => void;
  onScores: () => void;
  onSettings: () => void;
}

const TITLE_COLORS = [
  "text-cyan-400",
  "text-yellow-400",
  "text-purple-400",
  "text-green-400",
  "text-red-400",
  "text-blue-400",
  "text-orange-400",
];

export function MainMenu({ onPlay, onScores, onSettings }: Props) {
  return (
    <div className="relative grid size-full place-items-center">
      <MenuBackdrop />
      <div className="relative z-10 flex flex-col items-center gap-4.5 rounded-[20px] border border-white/10 bg-bg/70 px-16 py-11 shadow-[0_30px_80px_rgb(0_0_0/0.5)] backdrop-blur-[6px]">
        <h1 className="ml-[0.18em] flex font-mono text-7xl font-bold tracking-[0.18em]">
          {"RSTRIS".split("").map((letter, i) => (
            <span
              key={i}
              className={`inline-block animate-float ${TITLE_COLORS[i % 7]}`}
              style={{ animationDelay: `${i * 0.2}s` }}
            >
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
