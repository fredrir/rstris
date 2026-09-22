import { useCallback, useEffect, useRef, useState } from "react";

import { useGameInput } from "../hooks/useGameInput";
import { useGameSession, useGameUi } from "../hooks/useGameSession";

import { sfx } from "../lib/audio";
import { cx } from "../lib/cx";
import { handleEvent as dispatchGameEvent, type Popup } from "../lib/game/event";
import { gameSession } from "../lib/game/session";
import { api, onGameOver, sendInput } from "../lib/ipc";
import type { GameEvent, GameOverInfo, Settings, SubmitResult } from "../lib/types";
import { BoardCanvas } from "./BoardCanvas";
import { CountdownOverlay, GameOverOverlay, PauseOverlay } from "./Overlays";
import { PiecePreview } from "./PiecePreview";
import GamePanel from "./Game/GamePanel";
import GameStatCard from "./Game/GameStatCard";
import GameCard from "./Game/GameCard";

interface Props {
  settings: Settings;
  inputEnabled: boolean;
  onMenu: () => void;
  onScores: (highlightId: number | null) => void;
  onSettings: () => void;
}

const POPUP_MS = 1300;

const POPUP_TONES: Record<Popup["tone"], string> = {
  normal: "text-[26px] text-ink",
  big: "text-[34px] text-gold",
  spin: "text-[26px] text-accent-2",
  level: "text-[26px] text-accent",
};

export function GameScreen({ settings, inputEnabled, onMenu, onScores, onSettings }: Props) {
  const ui = useGameUi();
  const { restart } = useGameSession();
  const [popups, setPopups] = useState<Popup[]>([]);
  const [levelFlash, setLevelFlash] = useState(false);
  const [gameOver, setGameOver] = useState<GameOverInfo | null>(null);
  const [submitted, setSubmitted] = useState<SubmitResult | null>(null);
  const popupId = useRef(0);

  useGameInput(settings.keys, inputEnabled);

  const pushPopup = useCallback((popup: Omit<Popup, "id">) => {
    const id = ++popupId.current;
    setPopups((list) => [...list, { ...popup, id }]);
    window.setTimeout(() => setPopups((list) => list.filter((p) => p.id !== id)), POPUP_MS);
  }, []);

  const flashLevel = useCallback(() => {
    setLevelFlash(true);
    window.setTimeout(() => setLevelFlash(false), 700);
  }, []);

  const handleEvent = useCallback(
    (event: GameEvent) => dispatchGameEvent(event, { pushPopup, flashLevel }),
    [pushPopup, flashLevel],
  );

  useEffect(() => {
    let countdownDigit: number | null = null;
    return gameSession.subscribeFrame((snapshot) => {
      snapshot.events.forEach(handleEvent);
      const digit =
        snapshot.countdownMs === null ? null : Math.max(1, Math.ceil(snapshot.countdownMs / 500));
      if (digit !== countdownDigit) {
        if (digit !== null) sfx.play("countdown");
        else if (countdownDigit !== null) sfx.play("go");
        countdownDigit = digit;
      }
    });
  }, [handleEvent]);

  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | null = null;
    void onGameOver((info) => setGameOver(info)).then((fn) => {
      if (cancelled) fn();
      else unlisten = fn;
    });
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  const handleRestart = useCallback(() => {
    setPopups([]);
    setGameOver(null);
    setSubmitted(null);
    setLevelFlash(false);
    void restart();
  }, [restart]);

  const handleSubmit = useCallback(async (name: string) => {
    try {
      setSubmitted(await api.submitScore(name));
    } catch (error) {
      console.error("submit_score", error);
    }
  }, []);

  if (!ui)
    return <div className="relative grid size-full place-items-center text-muted">Starting…</div>;

  const over = ui.phase === "game_over";
  const showCountdown = ui.countdownDigit !== null && !ui.paused && !over;

  return (
    <div className="relative grid size-full grid-cols-[200px_minmax(0,1fr)_220px] gap-4.5 p-4.5 max-[1000px]:grid-cols-[170px_minmax(0,1fr)_190px] max-[1000px]:gap-3 max-[1000px]:p-3">
      <GamePanel>
        <GameCard className="flex w-full justify-start">
          <PiecePreview kind={ui.hold} dim={!ui.holdAvailable} />
        </GameCard>
        <GameCard className="mt-auto gap-2">
          <div className="flex w-full justify-start gap-4">
            <GameStatCard label="Level" value={ui.level} />
            <GameStatCard label="Lines" value={ui.lines} />
            <GameStatCard label="Score" tone="accent" value={ui.score} />
          </div>
        </GameCard>
      </GamePanel>

      <main className="flex min-h-0 min-w-0">
        <BoardCanvas className={cx(levelFlash && "animate-level-glow")}>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {settings.popupsEnabled &&
              popups.map((popup) => (
                <div
                  key={popup.id}
                  className="absolute flex animate-popup flex-col items-center gap-0.5 [text-shadow:0_2px_12px_rgb(0_0_0/0.8)]"
                  style={{ willChange: "transform, opacity" }}
                >
                  <span
                    className={cx(
                      "font-mono font-extrabold tracking-[0.12em]",
                      POPUP_TONES[popup.tone],
                    )}
                  >
                    {popup.title}
                  </span>
                  {popup.lines.map((line) => (
                    <span key={line} className="font-mono text-sm tracking-[0.08em] text-accent">
                      {line}
                    </span>
                  ))}
                </div>
              ))}
          </div>
          {showCountdown && ui.countdownDigit !== null && (
            <CountdownOverlay digit={ui.countdownDigit} />
          )}
          {ui.paused && !over && inputEnabled && (
            <PauseOverlay
              onResume={() => sendInput("resume")}
              onRestart={handleRestart}
              onSettings={onSettings}
              onMenu={onMenu}
            />
          )}
          {over && (
            <GameOverOverlay
              info={gameOver}
              submitted={submitted}
              onSubmit={(name) => void handleSubmit(name)}
              onRestart={handleRestart}
              onScores={() => onScores(submitted?.id ?? null)}
              onMenu={onMenu}
            />
          )}
        </BoardCanvas>
      </main>

      <GamePanel>
        <GameCard className="flex w-full justify-end">
          <div className="flex flex-col items-center gap-1">
            {ui.next.length === 0 && <span className="text-xs text-muted">hidden</span>}
            {ui.next.map((kind, i) => (
              <PiecePreview key={`${i}-${kind}`} kind={kind} size={i === 0 ? 18 : 14} />
            ))}
          </div>
        </GameCard>
      </GamePanel>
    </div>
  );
}
