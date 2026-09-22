import { useCallback, useEffect, useRef, useState } from "react";

import { useGameInput, type InputMode } from "../hooks/useGameInput";
import { useGameState } from "../hooks/useGameState";
import { sfx } from "../lib/audio";
import { formatNumber, formatPps, formatTime } from "../lib/format";
import { api, sendInput } from "../lib/ipc";
import type {
  GameEvent,
  GameOverInfo,
  Settings,
  SubmitResult,
} from "../lib/types";
import { BoardCanvas } from "./BoardCanvas";
import { CountdownOverlay, GameOverOverlay, PauseOverlay } from "./Overlays";
import { PiecePreview } from "./PiecePreview";

interface Popup {
  id: number;
  title: string;
  lines: string[];
  tone: "normal" | "big" | "spin" | "level";
}

interface Props {
  settings: Settings;
  inputEnabled: boolean;
  onMenu: () => void;
  onScores: (highlightId: number | null) => void;
  onSettings: () => void;
}

const POPUP_MS = 1300;

const GAME_GRID =
  "relative grid h-full w-full grid-cols-[200px_minmax(0,1fr)_220px] gap-4.5 p-4.5 max-[1000px]:grid-cols-[170px_minmax(0,1fr)_190px] max-[1000px]:gap-3 max-[1000px]:p-3";
const PANEL = "flex min-h-0 flex-col gap-3";
const CARD = "rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3";
const STAT_LABEL = "text-[11px] uppercase tracking-[0.12em] text-muted";
const STAT_VALUE = "font-mono font-bold tabular-nums";

function popupTitleClass(tone: Popup["tone"]) {
  const size = tone === "big" ? "text-[34px]" : "text-[26px]";
  const color =
    tone === "big"
      ? "text-gold"
      : tone === "spin"
        ? "text-accent-2"
        : tone === "level"
          ? "text-accent"
          : "text-ink";
  return `${size} ${color} font-mono font-extrabold tracking-[0.12em]`;
}

export function GameScreen({
  settings,
  inputEnabled,
  onMenu,
  onScores,
  onSettings,
}: Props) {
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
    !snapshot || !inputEnabled
      ? "disabled"
      : over
        ? "over"
        : paused
          ? "paused"
          : "playing";
  useGameInput(settings.keys, mode);

  const pushPopup = useCallback((popup: Omit<Popup, "id">) => {
    const id = ++popupId.current;
    setPopups((list) => [...list, { ...popup, id }]);
    window.setTimeout(
      () => setPopups((list) => list.filter((p) => p.id !== id)),
      POPUP_MS,
    );
  }, []);

  const handleEvent = useCallback(
    (event: GameEvent) => {
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
          pushPopup({ title: result.label, lines, tone });
          sfx.play(
            result.spin !== "none"
              ? "tspin"
              : result.lines === 4
                ? "tetris"
                : "clear",
          );
          break;
        }
        case "level_up":
          pushPopup({
            title: `LEVEL ${event.level}`,
            lines: [],
            tone: "level",
          });
          setLevelFlash(true);
          window.setTimeout(() => setLevelFlash(false), 700);
          sfx.play("levelUp");
          break;
        case "game_over":
          sfx.play("gameOver");
          break;
      }
    },
    [pushPopup],
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
    if (!over) {
      setGameOver(null);
      setSubmitted(null);
      return;
    }
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
    return (
      <div className="relative grid h-full w-full place-items-center text-muted">
        Starting…
      </div>
    );

  const showCountdown = snapshot.countdownMs !== null && !paused && !over;

  return (
    <div className={GAME_GRID}>
      <aside className={PANEL}>
        <section className={CARD}>
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
            Hold
          </h3>
          <PiecePreview kind={snapshot.hold} dim={!snapshot.holdAvailable} />
        </section>
        <section className={`${CARD} flex flex-col gap-2`}>
          <div className="flex flex-col">
            <span className={STAT_LABEL}>Score</span>
            <span className={`${STAT_VALUE} text-[26px] text-accent`}>
              {formatNumber(snapshot.score)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className={STAT_LABEL}>Level</span>
            <span className={`${STAT_VALUE} text-xl`}>{snapshot.level}</span>
          </div>
          <div className="flex flex-col">
            <span className={STAT_LABEL}>Lines</span>
            <span className={`${STAT_VALUE} text-xl`}>{snapshot.lines}</span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-[3px] bg-white/[0.08]"
            title={`${snapshot.linesToNextLevel} lines to next level`}
          >
            <div
              className="h-full bg-linear-to-r from-accent to-accent-2 transition-[width] duration-[250ms] ease-out"
              style={{ width: `${(10 - snapshot.linesToNextLevel) * 10}%` }}
            />
          </div>
          <span className="text-xs text-muted">
            {snapshot.linesToNextLevel} to next level
          </span>
        </section>
      </aside>

      <main className="flex min-h-0 min-w-0">
        <BoardCanvas
          snapshot={snapshot}
          className={`${over ? "saturate-[0.4]" : ""} ${
            levelFlash ? "animate-level-glow" : ""
          }`}
        >
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {popups.map((popup) => (
              <div
                key={popup.id}
                className="absolute flex animate-popup flex-col items-center gap-0.5 [text-shadow:0_2px_12px_rgb(0_0_0/0.8)]"
              >
                <span className={popupTitleClass(popup.tone)}>{popup.title}</span>
                {popup.lines.map((line) => (
                  <span
                    key={line}
                    className="font-mono text-sm tracking-[0.08em] text-accent"
                  >
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

      <aside className={PANEL}>
        <section className={CARD}>
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
            Next
          </h3>
          <div className="flex flex-col items-center gap-0.5">
            {snapshot.next.length === 0 && (
              <span className="text-xs text-muted">hidden</span>
            )}
            {snapshot.next.map((kind, i) => (
              <PiecePreview
                key={`${i}-${kind}`}
                kind={kind}
                size={i === 0 ? 18 : 14}
              />
            ))}
          </div>
        </section>
        <section className={`${CARD} flex flex-col gap-2`}>
          <div className="flex flex-col">
            <span className={STAT_LABEL}>Time</span>
            <span className={`${STAT_VALUE} text-xl`}>
              {formatTime(snapshot.elapsedMs)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className={STAT_LABEL}>Pieces</span>
            <span className={`${STAT_VALUE} text-xl`}>{snapshot.pieces}</span>
          </div>
          <div className="flex flex-col">
            <span className={STAT_LABEL}>PPS</span>
            <span className={`${STAT_VALUE} text-xl`}>
              {formatPps(snapshot.pieces, snapshot.elapsedMs)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className={STAT_LABEL}>Gravity</span>
            <span className={`${STAT_VALUE} text-xl`}>{snapshot.gravityMs}ms</span>
          </div>
        </section>
      </aside>
    </div>
  );
}
