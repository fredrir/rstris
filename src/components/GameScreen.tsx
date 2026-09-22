import { useCallback, useEffect, useRef, useState } from "react";

import { useGameInput, type InputMode } from "../hooks/useGameInput";
import { useGameState } from "../hooks/useGameState";
import { sfx } from "../lib/audio";
import { formatNumber, formatPps, formatTime } from "../lib/format";
import { api, sendInput } from "../lib/ipc";
import { keysLabel } from "../lib/keys";
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
    return <div className="screen game-screen loading">Starting…</div>;

  const showCountdown = snapshot.countdownMs !== null && !paused && !over;
  const keys = settings.keys;

  return (
    <div className={`screen game-screen${levelFlash ? " level-flash" : ""}`}>
      <aside className="panel panel-left">
        <section className="card">
          <h3>Hold</h3>
          <PiecePreview kind={snapshot.hold} dim={!snapshot.holdAvailable} />
        </section>
        <section className="card stats">
          <div className="stat">
            <span className="stat-label">Score</span>
            <span className="stat-value big">
              {formatNumber(snapshot.score)}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Level</span>
            <span className="stat-value">{snapshot.level}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Lines</span>
            <span className="stat-value">{snapshot.lines}</span>
          </div>
          <div
            className="progress"
            title={`${snapshot.linesToNextLevel} lines to next level`}
          >
            <div
              className="progress-bar"
              style={{ width: `${(10 - snapshot.linesToNextLevel) * 10}%` }}
            />
          </div>
          <span className="stat-sub">
            {snapshot.linesToNextLevel} to next level
          </span>
        </section>
        <section className="card last-clear">
          <h3>Last clear</h3>
          {snapshot.lastClear ? (
            <>
              <span
                className={`clear-label${snapshot.lastClear.spin !== "none" ? " spin" : ""}`}
              >
                {snapshot.lastClear.label}
              </span>
              <span className="stat-sub">
                +{formatNumber(snapshot.lastClear.points)}
                {snapshot.backToBack ? " · B2B" : ""}
                {snapshot.combo > 0 ? ` · combo ×${snapshot.combo}` : ""}
              </span>
            </>
          ) : (
            <span className="stat-sub muted">—</span>
          )}
        </section>
      </aside>

      <main className="board-area">
        <BoardCanvas snapshot={snapshot} className={over ? "over" : ""}>
          <div className="popups">
            {popups.map((popup) => (
              <div key={popup.id} className={`popup popup-${popup.tone}`}>
                <span className="popup-title">{popup.title}</span>
                {popup.lines.map((line) => (
                  <span key={line} className="popup-line">
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

      <aside className="panel panel-right">
        <section className="card">
          <h3>Next</h3>
          <div className="next-queue">
            {snapshot.next.length === 0 && (
              <span className="stat-sub muted">hidden</span>
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
        <section className="card stats">
          <div className="stat">
            <span className="stat-label">Time</span>
            <span className="stat-value mono">
              {formatTime(snapshot.elapsedMs)}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Pieces</span>
            <span className="stat-value mono">{snapshot.pieces}</span>
          </div>
          <div className="stat">
            <span className="stat-label">PPS</span>
            <span className="stat-value mono">
              {formatPps(snapshot.pieces, snapshot.elapsedMs)}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Gravity</span>
            <span className="stat-value mono">{snapshot.gravityMs}ms</span>
          </div>
        </section>
      </aside>
    </div>
  );
}
