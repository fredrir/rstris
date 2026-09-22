import type { ReactNode } from "react";

import { cx } from "../../lib/cx";

const BASE = "absolute inset-0 flex flex-col items-center justify-center gap-3.5 text-center";

interface OverlayProps {
  children: ReactNode;
  dim?: boolean;
  className?: string;
}

export function Overlay({ children, dim = true, className }: OverlayProps) {
  return (
    <div className={cx(BASE, dim && "animate-fade-in bg-[#080a10]/78", className)}>{children}</div>
  );
}

export type OverlayTone = "accent" | "danger";

const TONES: Record<OverlayTone, string> = {
  accent: "text-accent",
  danger: "text-danger",
};

interface TitleProps {
  children: ReactNode;
  tone?: OverlayTone;
}

export function OverlayTitle({ children, tone = "accent" }: TitleProps) {
  return (
    <h2 className={cx("font-mono text-[30px] font-bold tracking-[0.2em]", TONES[tone])}>
      {children}
    </h2>
  );
}
