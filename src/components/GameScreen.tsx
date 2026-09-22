import { useCallback, useEffect, useRef, useState } from "react";

import { useGameInput, type InputMode } from "../hooks/useGameInput";
import { useGameState } from "../hooks/useGameState";

import { sfx } from "../lib/audio";
import { cx } from "../lib/cx";
import { handleEvent as dispatchGameEvent, type Popup } from "../lib/game/event";
import { api, sendInput } from "../lib/ipc";
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
  const { snapshot, restart } = useGameState();
  const [popups, setPopups] = useState<Popup[]>([]);
  const [levelFlash, setLevelFlash] = useState(false);
  const [gameOver, setGameOver] = useState<GameOverInfo | null>(null);
  const [submitted, setSubmitted] = useState<SubmitResult | null>(null);
  const popupId = useRef(0);
  const countdownDigit = useRef<number | null>(null);

  const over = snapshot?.phase.kind === "game_over";
  const paused = snapshot?.paused ?? false;
  const mode: InputMode =
    !snapshot || !inputEnabled ? "disabled" : over ? "over" : paused ? "paused" : "playing";
  useGameInput(settings.keys, mode);

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
    if (!snapshot) return;
    snapshot.events.forEach(handleEvent);
  }, [snapshot, handleEvent]);

  useEffect(() => {
    const ms = snapshot?.countdownMs ?? null;
    const digit = ms === null ? null : Math.max(1, Math.ceil(ms / 500));
    if (digit !== countdownDigit.current) {
      if (digit !== null) sfx.play("countdown");
      else if (countdownDigit.current !== null) sfx.play("go");
      countdownDigit.current = digit;
    }
  }, [snapshot?.countdownMs]);

  useEffect(() => {
    if (!over) return;
    let cancelled = false;
    void (async () => {
      try {
        const info = await api.gameOverInfo();
        if (cancelled) return;
        if (info.rank === null && !info.recorded) {
          const result = await api.submitScore(info.playerName);
          if (!cancelled) setSubmitted(result);
        }
        if (!cancelled) setGameOver(info);
      } catch (error) {
        console.error("game_over_info", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [over]);

  const handleRestart = useCallback(() => {
    setPopups([]);
    setGameOver(null);
    setSubmitted(null);
    void restart();
  }, [restart]);

  const handleSubmit = useCallback(async (name: string) => {
    try {
      setSubmitted(await api.submitScore(name));
    } catch (error) {
      console.error("submit_score", error);
    }
  }, []);

  if (!snapshot)
    return <div className="relative grid size-full place-items-center text-muted">Starting…</div>;

  const showCountdown = snapshot.countdownMs !== null && !paused && !over;

  return (
    <div className="relative grid size-full grid-cols-[200px_minmax(0,1fr)_220px] gap-4.5 p-4.5 max-[1000px]:grid-cols-[170px_minmax(0,1fr)_190px] max-[1000px]:gap-3 max-[1000px]:p-3">
      <GamePanel>
        <GameCard className="flex w-full justify-start">
          <PiecePreview kind={snapshot.hold} dim={!snapshot.holdAvailable} />
        </GameCard>
        <GameCard className="mt-auto gap-2">
          <div className="flex w-full justify-start gap-4">
            <GameStatCard label="Level" value={snapshot.level} />
            <GameStatCard label="Lines" value={snapshot.lines} />
            <GameStatCard label="Score" tone="accent" value={snapshot.score} />
          </div>
        </GameCard>
      </GamePanel>

      <main className="flex min-h-0 min-w-0">
        <BoardCanvas snapshot={snapshot} className={cx(levelFlash && "animate-level-glow")}>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {popups.map((popup) => (
              <div
                key={popup.id}
                className="absolute flex animate-popup flex-col items-center gap-0.5 [text-shadow:0_2px_12px_rgb(0_0_0/0.8)]"
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
          {showCountdown && snapshot.countdownMs !== null && (
            <CountdownOverlay ms={snapshot.countdownMs} />
          )}
          {paused && !over && inputEnabled && (
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
            {snapshot.next.length === 0 && <span className="text-xs text-muted">hidden</span>}
            {snapshot.next.map((kind, i) => (
              <PiecePreview key={`${i}-${kind}`} kind={kind} size={i === 0 ? 18 : 14} />
            ))}
          </div>
        </GameCard>
      </GamePanel>
    </div>
  );
}
