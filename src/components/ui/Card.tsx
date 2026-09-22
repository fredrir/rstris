import type { ReactNode } from "react";

import { cx } from "../../lib/cx";

interface Props {
  children: ReactNode;
  title?: string;
  className?: string;
}

export function Card({ children, title, className }: Props) {
  return (
    <section className={cx("border border-white/10 px-3.5 py-3", className)}>
      {title ? (
        <h3 className="mb-2 text-[11px] font-bold tracking-[0.14em] text-muted uppercase">
          {title}
        </h3>
      ) : null}
      {children}
    </section>
  );
}
