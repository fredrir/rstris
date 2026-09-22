import type { ReactNode } from "react";

import { cx } from "../../lib/cx";

const CELL = "border-b border-white/10 px-3 py-2.25";

interface CellProps {
  children?: ReactNode;
  numeric?: boolean;
  className?: string;
}

export function Th({ children, numeric = false, className }: CellProps) {
  return (
    <th
      className={cx(
        CELL,
        "text-[11px] tracking-[0.12em] text-muted uppercase",
        numeric ? "text-right font-mono tabular-nums" : "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, numeric = false, className }: CellProps) {
  return (
    <td className={cx(CELL, numeric && "text-right font-mono tabular-nums", className)}>
      {children}
    </td>
  );
}
