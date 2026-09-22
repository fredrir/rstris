import { useEffect, useRef } from "react";

import { COLORS, drawPiece, setupCanvas } from "../lib/render";
import { gameMeta } from "../lib/meta";
import type { Tetromino } from "../lib/types";

interface Drifter {
  kind: Tetromino;
  x: number;
  y: number;
  speed: number;
  size: number;
  alpha: number;
}

const KINDS = Object.keys(COLORS) as Tetromino[];

function spawn(width: number, height: number, fromTop: boolean): Drifter {
  const size = 16 + Math.random() * 18;
  return {
    kind: KINDS[Math.floor(Math.random() * KINDS.length)] ?? "T",
    x: Math.random() * width,
    y: fromTop ? -size * 3 : Math.random() * height,
    speed: 12 + Math.random() * 28,
    size,
    alpha: 0.06 + Math.random() * 0.12,
  };
}

export function MenuBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const shapes = new Map(gameMeta().previewShapes.map((piece) => [piece.kind, piece.cells]));
    let drifters: Drifter[] = [];
    let frame = 0;
    let last = performance.now();
    const resize = () => {
      const { innerWidth, innerHeight } = window;
      setupCanvas(canvas, innerWidth, innerHeight);
      drifters = Array.from({ length: 18 }, () => spawn(innerWidth, innerHeight, false));
    };
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const ctx = setupCanvas(canvas, window.innerWidth, window.innerHeight);
      if (ctx) {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        drifters = drifters.map((d) => {
          const y = d.y + d.speed * dt;
          if (y > window.innerHeight + d.size * 2)
            return spawn(window.innerWidth, window.innerHeight, true);
          return { ...d, y };
        });
        for (const d of drifters) {
          const shape = shapes.get(d.kind);
          if (shape) drawPiece(ctx, d.kind, shape, d.size, d.x, d.y, { alpha: d.alpha });
        }
      }
      frame = requestAnimationFrame(tick);
    };
    resize();
    window.addEventListener("resize", resize);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 z-0" aria-hidden="true" />;
}
