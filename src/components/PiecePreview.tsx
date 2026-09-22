import { useLayoutEffect, useRef } from "react";

import { gameMeta } from "../lib/meta";
import { drawPiece, setupCanvas } from "../lib/render";
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
    const shape = gameMeta().previewShapes.find((piece) => piece.kind === kind)?.cells ?? [];
    if (shape.length === 0) return;
    const xs = shape.map(([x]) => x);
    const ys = shape.map(([, y]) => y);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const cols = Math.max(...xs) - minX + 1;
    const rows = Math.max(...ys) - minY + 1;
    drawPiece(
      ctx,
      kind,
      shape,
      size,
      (width - cols * size) / 2 - minX * size,
      (height - rows * size) / 2 - minY * size,
      { alpha: dim ? 0.3 : 1 },
    );
  }, [kind, size, dim]);

  return <canvas ref={ref} className="block" />;
}
