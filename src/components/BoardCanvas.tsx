import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { cx } from "../lib/cx";
import { gameSession } from "../lib/game/session";
import { gameMeta } from "../lib/meta";
import { drawBoardDynamic, drawBoardStatic, setupCanvas } from "../lib/render";
import type { Snapshot } from "../lib/types";

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
  const { boardWidth, boardHeight } = gameMeta();

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
    let frameId = 0;

    const paint = (snapshot: Snapshot) => {
      // The board stays pre-collapse while the engine animates the clear, so
      // the rows it reports are hidden from the static layer until it settles.
      const rows = snapshot.clearFlash?.rows ?? null;
      const key = `${snapshot.boardVersion}:${rows ? rows.join(",") : ""}`;
      if (key !== staticKey.current) {
        drawBoardStatic(staticCtx, snapshot.board, cell, rows);
        staticKey.current = key;
      }
      drawBoardDynamic(dynamicCtx, snapshot, cell);
    };

    // Coalesce to the display refresh; the engine drives the clear animation
    // and emits progress, so this just paints the latest snapshot.
    const frame = () => {
      frameId = 0;
      const snapshot = gameSession.getSnapshot();
      if (snapshot) paint(snapshot);
    };

    const schedule = () => {
      if (!frameId) frameId = requestAnimationFrame(frame);
    };

    schedule();
    const unsubscribe = gameSession.subscribeFrame(schedule);
    return () => {
      unsubscribe();
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [boardHeight, boardWidth, cell]);

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
