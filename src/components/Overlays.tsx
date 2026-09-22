import { useEffect, useState, type FormEvent } from "react";

import { formatNumber, formatTime } from "../lib/format";
import type { GameOverInfo, SubmitResult } from "../lib/types";
import { Menu } from "./Menu";
import { Button } from "./ui/Button";
import { Overlay, OverlayTitle } from "./ui/Overlay";

export function CountdownOverlay({ digit }: { digit: number }) {
  return (
    <Overlay dim={false} className="pointer-events-none">
      <span
        key={digit}
        className="animate-countdown font-mono text-[96px] font-bold text-ink [text-shadow:0_0_40px_rgb(34_211_238/0.8)]"
      >
        {digit}
      </span>
    </Overlay>
  );
}

interface PauseProps {
  onResume: () => void;
  onRestart: () => void;
  onSettings: () => void;
  onMenu: () => void;
}

export function PauseOverlay({ onResume, onRestart, onSettings, onMenu }: PauseProps) {
  return (
    <Overlay>
      <OverlayTitle>PAUSED</OverlayTitle>
      <Menu
        compact
        items={[
          { label: "Resume", onSelect: onResume },
          { label: "Restart", onSelect: onRestart },
          { label: "Settings", onSelect: onSettings },
          { label: "Quit to menu", danger: true, onSelect: onMenu },
        ]}
      />
    </Overlay>
  );
}

interface GameOverProps {
  info: GameOverInfo | null;
  submitted: SubmitResult | null;
  onSubmit: (name: string) => void;
  onRestart: () => void;
  onScores: () => void;
  onMenu: () => void;
}

export function GameOverOverlay({
  info,
  submitted,
  onSubmit,
  onRestart,
  onScores,
  onMenu,
}: GameOverProps) {
  const needsName = info !== null && info.rank !== null && !info.recorded && submitted === null;

  useEffect(() => {
    if (needsName) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Escape") onMenu();
      else if (event.code === "KeyR") onRestart();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [needsName, onMenu, onRestart]);

  return (
    <Overlay>
      <OverlayTitle tone="danger">GAME OVER</OverlayTitle>
      {submitted && info?.rank !== null && (
        <p className="m-0 animate-pulse-soft font-bold tracking-[0.12em] text-gold">
          Saved as #{submitted.rank}
        </p>
      )}
      {info && <Summary info={info} />}
      {needsName && info && <NewHighScoreForm info={info} onSubmit={onSubmit} />}
      {!needsName && info && (
        <Menu
          compact
          items={[
            { label: "Play again", onSelect: onRestart },
            { label: "High scores", onSelect: onScores },
            { label: "Main menu", onSelect: onMenu },
          ]}
        />
      )}
      {!info && <p className="m-0 text-muted">Saving…</p>}
    </Overlay>
  );
}

function Summary({ info }: { info: GameOverInfo }) {
  const rows = [
    { label: "Score", value: formatNumber(info.summary.score) },
    { label: "Level", value: String(info.summary.level) },
    { label: "Lines", value: String(info.summary.lines) },
    { label: "Time", value: formatTime(info.summary.durationMs) },
  ];
  return (
    <dl className="m-0 grid grid-cols-[auto_auto] gap-x-4.5 gap-y-1">
      {rows.map((row) => (
        <div key={row.label} className="contents">
          <dt className="self-center text-right text-xs tracking-widest text-muted uppercase">
            {row.label}
          </dt>
          <dd className="m-0 text-left font-mono text-lg font-bold">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function NewHighScoreForm({
  info,
  onSubmit,
}: {
  info: GameOverInfo;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState(info.playerName);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(name.trim() || "Player");
  };

  return (
    <form className="flex flex-col items-center gap-2" onSubmit={submit}>
      <p className="m-0 animate-pulse-soft font-bold tracking-[0.12em] text-gold">
        NEW HIGH SCORE #{info.rank}
      </p>
      <label className="text-xs text-muted" htmlFor="player-name">
        Enter your name
      </label>
      <input
        className="w-50 rounded-lg border border-white/10 bg-white/6 px-3 py-2 text-center font-mono text-lg outline-none select-text focus:border-accent"
        id="player-name"
        autoFocus
        maxLength={16}
        value={name}
        onChange={(event) => setName(event.target.value)}
        onFocus={(event) => event.target.select()}
      />
      <Button type="submit" variant="primary">
        Save score
      </Button>
    </form>
  );
}
