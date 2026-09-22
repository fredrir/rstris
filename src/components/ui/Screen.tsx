import type { ReactNode } from "react";

import { Page } from "./Page";

interface Props {
  children: ReactNode;
  title: string;
  actions?: ReactNode;
  className?: string;
}

export function Screen({ children, title, actions, className }: Props) {
  return (
    <Page className={className}>
      <header className="flex items-center justify-between">
        <h2 className="font-mono text-[26px] font-bold tracking-[0.16em] text-accent">{title}</h2>
        {actions ? <div className="flex gap-2">{actions}</div> : null}
      </header>
      {children}
    </Page>
  );
}
