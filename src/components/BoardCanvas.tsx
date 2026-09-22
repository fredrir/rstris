import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { drawBoard, setupCanvas } from "../lib/render";
import { BOARD_HEIGHT, BOARD_WIDTH, type Snapshot } from "../lib/types";

interface Props {
  snapshot: Snapshot;
  className?: string;
  children?: ReactNode;
}

export function BoardCanvas({ snapshot, className = "", children }: Props) {
  const measureRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cell, setCell] = useState(30);

  useLayoutEffect(() => {
    const element = measureRef.current;
    if (!element) return;
    const measure = () => {
      const rect = element.getBoundingClientRect();
      const next = Math.floor(Math.min(rect.height / BOARD_HEIGHT, rect.width / BOARD_WIDTH));
      setCell(Math.max(14, next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = setupCanvas(canvas, BOARD_WIDTH * cell, BOARD_HEIGHT * cell);
    if (ctx) drawBoard(ctx, snapshot, cell);
  }, [snapshot, cell]);

  return (
    <div className="board-measure" ref={measureRef}>
      <div className={`board-frame ${className}`} style={{ width: BOARD_WIDTH * cell, height: BOARD_HEIGHT * cell }}>
        <canvas ref={canvasRef} className="board-canvas" />
        {children}
      </div>
    </div>
  );
}
