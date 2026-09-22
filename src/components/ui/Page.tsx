import type { ReactNode } from "react";

import { cx } from "../../lib/cx";

interface Props {
  children: ReactNode;
  className?: string;
}

export function Page({ children, className }: Props) {
  return (
    <div
      className={cx("relative flex size-full flex-col gap-4.5 overflow-auto px-9 py-7", className)}
    >
      {children}
    </div>
  );
}
