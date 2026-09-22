import { useEffect, useState, type FormEvent } from "react";

import { formatNumber, formatTime } from "../lib/format";
import type { GameOverInfo, SubmitResult } from "../lib/types";
import { Menu } from "./Menu";

export function CountdownOverlay({ ms }: { ms: number }) {
  const digit = Math.max(1, Math.ceil(ms / 500));
  return (
    <div className="overlay overlay-countdown">
      <span key={digit} className="countdown-digit">
        {digit}
      </span>
    </div>
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
    <div className="overlay overlay-dim">
      <h2 className="overlay-title">PAUSED</h2>
      <Menu
        compact
        items={[
          { label: "Resume", onSelect: onResume },
          { label: "Restart", onSelect: onRestart },
          { label: "Settings", onSelect: onSettings },
          { label: "Quit to menu", danger: true, onSelect: onMenu },
        ]}
      />
    </div>
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

export function GameOverOverlay({ info, submitted, onSubmit, onRestart, onScores, onMenu }: GameOverProps) {
  const [name, setName] = useState("");
  const needsName = info !== null && info.rank !== null && !info.recorded && submitted === null;

  useEffect(() => {
    if (info) setName(info.playerName);
  }, [info]);

  useEffect(() => {
    if (needsName) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Escape") onMenu();
      else if (event.code === "KeyR") onRestart();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [needsName, onMenu, onRestart]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(name.trim() || "Player");
  };

  return (
    <div className="overlay overlay-dim overlay-gameover">
      <h2 className="overlay-title danger">GAME OVER</h2>
      {info && (
        <dl className="summary">
          <dt>Score</dt>
          <dd>{formatNumber(info.summary.score)}</dd>
          <dt>Level</dt>
          <dd>{info.summary.level}</dd>
          <dt>Lines</dt>
          <dd>{info.summary.lines}</dd>
          <dt>Time</dt>
          <dd>{formatTime(info.summary.durationMs)}</dd>
        </dl>
      )}
      {needsName && info && (
        <form className="name-form" onSubmit={submit}>
          <p className="highscore-banner">NEW HIGH SCORE · #{info.rank}</p>
          <label htmlFor="player-name">Enter your name</label>
          <input
            id="player-name"
            autoFocus
            maxLength={16}
            value={name}
            onChange={(event) => setName(event.target.value)}
            onFocus={(event) => event.target.select()}
          />
          <button type="submit" className="button primary">
            Save score
          </button>
        </form>
      )}
      {!needsName && info && (
        <>
          {submitted && info.rank !== null && <p className="highscore-banner">Saved as #{submitted.rank}</p>}
          <Menu
            compact
            items={[
              { label: "Play again", hint: "R", onSelect: onRestart },
              { label: "High scores", onSelect: onScores },
              { label: "Main menu", hint: "Esc", onSelect: onMenu },
            ]}
          />
        </>
      )}
      {!info && <p className="muted">Saving…</p>}
    </div>
  );
}
