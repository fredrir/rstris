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
    <div className="grid min-h-0 min-w-0 flex-1 place-items-center" ref={measureRef}>
      <div
        className={`relative overflow-hidden rounded-md border-2 border-white/12 transition-[filter] duration-400 ${className}`}
        style={{ width: BOARD_WIDTH * cell, height: BOARD_HEIGHT * cell }}
      >
        <canvas ref={canvasRef} className="block" />
        {children}
      </div>
    </div>
  );
}
