import { useLayoutEffect, useRef } from "react";

import { PREVIEW_SHAPES, drawPiece, setupCanvas } from "../lib/render";
import type { Tetromino } from "../lib/types";

interface Props {
  kind: Tetromino | null;
  size?: number;
  dim?: boolean;
}

export function PiecePreview({ kind, size = 18, dim = false }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const width = size * 4 + 8;
    const height = size * 2 + 8;
    const ctx = setupCanvas(canvas, width, height);
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    if (!kind) return;
    const shape = PREVIEW_SHAPES[kind];
    const cols = Math.max(...shape.map(([x]) => x)) + 1;
    const rows = Math.max(...shape.map(([, y]) => y)) + 1;
    drawPiece(ctx, kind, shape, size, (width - cols * size) / 2, (height - rows * size) / 2, {
      alpha: dim ? 0.3 : 1,
    });
  }, [kind, size, dim]);

  return <canvas ref={ref} className="piece-preview" />;
}
