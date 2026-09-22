import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  label: string;
}

export function FieldRow({ children, label }: Props) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className="text-ink">{label}</span>
      <div className="flex flex-1 items-center justify-end">{children}</div>
    </div>
  );
}
