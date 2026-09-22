import { useEffect, useState, type FormEvent } from "react";

import { formatNumber, formatTime } from "../lib/format";
import type { GameOverInfo, SubmitResult } from "../lib/types";
import { Menu } from "./Menu";

const OVERLAY =
  "absolute inset-0 flex flex-col items-center justify-center gap-3.5 text-center";
const OVERLAY_DIM =
  "bg-[#080a10]/78 backdrop-blur-[3px] animate-fade-in";
const OVERLAY_TITLE = "font-mono text-[30px] font-bold tracking-[0.2em]";
const BUTTON =
  "cursor-pointer rounded-lg border bg-white/5 px-4 py-2 transition-colors duration-100 hover:bg-white/10 disabled:cursor-default disabled:opacity-40";
const BUTTON_PRIMARY = `${BUTTON} border-accent/50 text-accent`;

export function CountdownOverlay({ ms }: { ms: number }) {
  const digit = Math.max(1, Math.ceil(ms / 500));
  return (
    <div className={`${OVERLAY} pointer-events-none`}>
      <span
        key={digit}
        className="animate-countdown font-mono text-[96px] font-bold text-ink [text-shadow:0_0_40px_rgb(34_211_238/0.8)]"
      >
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
    <div className={`${OVERLAY} ${OVERLAY_DIM}`}>
      <h2 className={`${OVERLAY_TITLE} text-accent`}>PAUSED</h2>
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
    <div className={`${OVERLAY} ${OVERLAY_DIM}`}>
      <h2 className={`${OVERLAY_TITLE} text-danger`}>GAME OVER</h2>
      {info && (
        <dl className="m-0 grid grid-cols-[auto_auto] gap-x-4.5 gap-y-1">
          <dt className="self-center text-right text-xs uppercase tracking-[0.1em] text-muted">
            Score
          </dt>
          <dd className="m-0 text-left font-mono text-lg font-bold">
            {formatNumber(info.summary.score)}
          </dd>
          <dt className="self-center text-right text-xs uppercase tracking-[0.1em] text-muted">
            Level
          </dt>
          <dd className="m-0 text-left font-mono text-lg font-bold">
            {info.summary.level}
          </dd>
          <dt className="self-center text-right text-xs uppercase tracking-[0.1em] text-muted">
            Lines
          </dt>
          <dd className="m-0 text-left font-mono text-lg font-bold">
            {info.summary.lines}
          </dd>
          <dt className="self-center text-right text-xs uppercase tracking-[0.1em] text-muted">
            Time
          </dt>
          <dd className="m-0 text-left font-mono text-lg font-bold">
            {formatTime(info.summary.durationMs)}
          </dd>
        </dl>
      )}
      {needsName && info && (
        <form
          className="flex flex-col items-center gap-2"
          onSubmit={submit}
        >
          <p className="m-0 animate-pulse-soft font-bold tracking-[0.12em] text-gold">
            NEW HIGH SCORE · #{info.rank}
          </p>
          <label className="text-xs text-muted" htmlFor="player-name">
            Enter your name
          </label>
          <input
            className="w-[200px] select-text rounded-lg border border-white/10 bg-white/6 px-3 py-2 text-center font-mono text-lg outline-none focus:border-accent"
            id="player-name"
            autoFocus
            maxLength={16}
            value={name}
            onChange={(event) => setName(event.target.value)}
            onFocus={(event) => event.target.select()}
          />
          <button type="submit" className={BUTTON_PRIMARY}>
            Save score
          </button>
        </form>
      )}
      {!needsName && info && (
        <>
          {submitted && info.rank !== null && (
            <p className="m-0 animate-pulse-soft font-bold tracking-[0.12em] text-gold">
              Saved as #{submitted.rank}
            </p>
          )}
          <Menu
            compact
            items={[
              { label: "Play again", onSelect: onRestart },
              { label: "High scores", onSelect: onScores },
              { label: "Main menu", onSelect: onMenu },
            ]}
          />
        </>
      )}
      {!info && <p className="m-0 text-muted">Saving…</p>}
    </div>
  );
}
