import { gameMeta } from "./meta";
import type { Point, Snapshot, Tetromino } from "./types";

export const COLORS: Record<Tetromino, string> = {
  I: "#22d3ee",
  O: "#facc15",
  T: "#c084fc",
  S: "#4ade80",
  Z: "#f87171",
  J: "#60a5fa",
  L: "#fb923c",
};

// Indexed by the wire cell code from Rust: 0 empty, 1..=7 tetromino.
const CELL_COLORS = ["", COLORS.I, COLORS.O, COLORS.T, COLORS.S, COLORS.Z, COLORS.J, COLORS.L];

const GRID = "rgba(255, 255, 255, 0.045)";
const BOARD_BG = "#0d1019";

interface CellStyle {
  alpha?: number;
  ghost?: boolean;
  flash?: number;
  glow?: number;
}

export function drawCell(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  size: number,
  color: string,
  style: CellStyle = {},
): void {
  const inset = Math.max(1, Math.round(size * 0.06));
  const x = px + inset;
  const y = py + inset;
  const s = size - inset * 2;
  ctx.save();
  ctx.globalAlpha = style.alpha ?? 1;
  if (style.ghost) {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, size * 0.08);
    ctx.globalAlpha = (style.alpha ?? 1) * 0.55;
    ctx.strokeRect(
      x + ctx.lineWidth / 2,
      y + ctx.lineWidth / 2,
      s - ctx.lineWidth,
      s - ctx.lineWidth,
    );
    ctx.globalAlpha = (style.alpha ?? 1) * 0.12;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, s, s);
    ctx.restore();
    return;
  }
  if (style.glow) {
    ctx.shadowColor = color;
    ctx.shadowBlur = size * 0.6 * style.glow;
  }
  ctx.fillStyle = color;
  ctx.fillRect(x, y, s, s);
  ctx.shadowBlur = 0;
  const bevel = Math.max(1, Math.round(s * 0.16));
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.fillRect(x, y, s, bevel);
  ctx.fillRect(x, y, bevel, s);
  ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
  ctx.fillRect(x, y + s - bevel, s, bevel);
  ctx.fillRect(x + s - bevel, y, bevel, s);
  ctx.fillStyle = "rgba(255, 255, 255, 0.10)";
  ctx.fillRect(x + bevel, y + bevel, s - bevel * 2, s - bevel * 2);
  if (style.flash) {
    ctx.fillStyle = `rgba(255, 255, 255, ${style.flash})`;
    ctx.fillRect(x, y, s, s);
  }
  ctx.restore();
}

export function drawPiece(
  ctx: CanvasRenderingContext2D,
  kind: Tetromino | null,
  cells: Point[],
  size: number,
  originX: number,
  originY: number,
  style: CellStyle = {},
): void {
  if (!kind) return;
  for (const [cx, cy] of cells) {
    if (cy < 0) continue;
    drawCell(ctx, originX + cx * size, originY + cy * size, size, COLORS[kind], style);
  }
}

/** Background, grid, and settled cells. Redrawn only when the board changes. */
export function drawBoardStatic(
  ctx: CanvasRenderingContext2D,
  board: number[],
  size: number,
  clearingRows: number[] | null,
): void {
  const { boardWidth, boardHeight } = gameMeta();
  const width = boardWidth * size;
  const height = boardHeight * size;
  ctx.fillStyle = BOARD_BG;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = GRID;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 1; x < boardWidth; x++) {
    ctx.moveTo(x * size + 0.5, 0);
    ctx.lineTo(x * size + 0.5, height);
  }
  for (let y = 1; y < boardHeight; y++) {
    ctx.moveTo(0, y * size + 0.5);
    ctx.lineTo(width, y * size + 0.5);
  }
  ctx.stroke();

  const clearing = clearingRows ? new Set(clearingRows) : null;
  for (let y = 0; y < boardHeight; y++) {
    if (clearing?.has(y)) continue;
    for (let x = 0; x < boardWidth; x++) {
      const code = board[y * boardWidth + x];
      if (code === 0) continue;
      drawCell(ctx, x * size, y * size, size, CELL_COLORS[code] ?? "#fff");
    }
  }
}

/** Clearing animation, ghost, and active piece. Redrawn every frame. */
export function drawBoardDynamic(
  ctx: CanvasRenderingContext2D,
  snapshot: Snapshot,
  size: number,
): void {
  const { boardWidth, boardHeight, hiddenRows, clearAnimationMs } = gameMeta();
  ctx.clearRect(0, 0, boardWidth * size, boardHeight * size);

  if (snapshot.phase.kind === "clearing") {
    const progress = 1 - snapshot.phase.remainingMs / clearAnimationMs;
    for (const row of snapshot.phase.rows) {
      const y = row - hiddenRows;
      if (y < 0 || y >= boardHeight) continue;
      for (let x = 0; x < boardWidth; x++) {
        const code = snapshot.board[y * boardWidth + x];
        if (code === 0) continue;
        const shrink = Math.max(0, 1 - progress * 1.05);
        const cellSize = size * shrink;
        const offset = (size - cellSize) / 2;
        drawCell(ctx, x * size + offset, y * size + offset, cellSize, CELL_COLORS[code] ?? "#fff", {
          flash: Math.max(0, 0.9 - progress),
          alpha: Math.max(0.15, shrink),
        });
      }
    }
  }

  if (snapshot.ghost && snapshot.active) {
    drawPiece(ctx, snapshot.active.kind, snapshot.ghost, size, 0, 0, { ghost: true });
  }
  if (snapshot.active) {
    const glow = snapshot.lockProgress > 0 ? 0.4 + snapshot.lockProgress * 0.6 : 0;
    drawPiece(ctx, snapshot.active.kind, snapshot.active.cells, size, 0, 0, {
      glow,
      flash: snapshot.lockProgress * 0.25,
    });
  }
}

export function setupCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): CanvasRenderingContext2D | null {
  const dpr = window.devicePixelRatio || 1;
  const pixelWidth = Math.round(width * dpr);
  const pixelHeight = Math.round(height * dpr);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}
