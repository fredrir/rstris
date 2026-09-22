import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { cx } from "../lib/cx";
import { gameSession } from "../lib/game/session";
import { gameMeta } from "../lib/meta";
import { drawBoardDynamic, drawBoardStatic, setupCanvas } from "../lib/render";

interface Props {
  className?: string;
  children?: ReactNode;
}

export function BoardCanvas({ className = "", children }: Props) {
  const measureRef = useRef<HTMLDivElement>(null);
  const staticRef = useRef<HTMLCanvasElement>(null);
  const dynamicRef = useRef<HTMLCanvasElement>(null);
  const staticKey = useRef("");
  const [cell, setCell] = useState(30);
  const { boardWidth, boardHeight, hiddenRows } = gameMeta();

  useLayoutEffect(() => {
    const element = measureRef.current;
    if (!element) return;
    const measure = () => {
      const rect = element.getBoundingClientRect();
      const next = Math.floor(Math.min(rect.height / boardHeight, rect.width / boardWidth));
      setCell(Math.max(14, next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [boardHeight, boardWidth]);

  useLayoutEffect(() => {
    const staticCanvas = staticRef.current;
    const dynamicCanvas = dynamicRef.current;
    if (!staticCanvas || !dynamicCanvas) return;
    const width = boardWidth * cell;
    const height = boardHeight * cell;
    const staticCtx = setupCanvas(staticCanvas, width, height);
    const dynamicCtx = setupCanvas(dynamicCanvas, width, height);
    if (!staticCtx || !dynamicCtx) return;
    staticKey.current = "";
    let drawnVersion = -1;
    // Draw straight from the event callback instead of deferring to rAF: the
    // browser still composites on vsync, but an event that lands after the
    // current frame's rAF callbacks would otherwise wait a full frame.
    const draw = () => {
      const snapshot = gameSession.getSnapshot();
      if (!snapshot || snapshot.version === drawnVersion) return;
      drawnVersion = snapshot.version;
      const clearing =
        snapshot.phase.kind === "clearing"
          ? snapshot.phase.rows
              .map((row) => row - hiddenRows)
              .filter((row) => row >= 0 && row < boardHeight)
          : null;
      const key = `${snapshot.boardVersion}:${clearing ? clearing.join(",") : ""}`;
      if (key !== staticKey.current) {
        drawBoardStatic(staticCtx, snapshot.board, cell, clearing);
        staticKey.current = key;
      }
      drawBoardDynamic(dynamicCtx, snapshot, cell);
    };
    draw();
    return gameSession.subscribeFrame(draw);
  }, [boardHeight, boardWidth, cell, hiddenRows]);

  return (
    <div className="grid min-h-0 min-w-0 flex-1 place-items-center" ref={measureRef}>
      <div
        className={cx(
          "relative overflow-hidden rounded-md border-2 border-white/12 transition-[filter] duration-400",
          className,
        )}
        style={{ width: boardWidth * cell, height: boardHeight * cell }}
      >
        <canvas ref={staticRef} className="block" />
        <canvas ref={dynamicRef} className="absolute inset-0 block" />
        {children}
      </div>
    </div>
  );
}
