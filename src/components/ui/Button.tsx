import type { ButtonHTMLAttributes } from "react";

import { cx } from "../../lib/cx";

export type ButtonVariant = "default" | "primary" | "danger";
export type ButtonSize = "md" | "sm" | "square";

const VARIANTS: Record<ButtonVariant, string> = {
  default: "border-white/10 bg-white/5 hover:bg-white/10",
  primary: "border-accent/50 bg-white/5 text-accent hover:bg-white/10",
  danger: "border-danger/50 bg-white/5 text-danger hover:bg-white/10",
};

const SIZES: Record<ButtonSize, string> = {
  md: "rounded-lg px-4 py-2",
  sm: "rounded-md px-2.5 py-1.25",
  square: "size-6.5 rounded-md p-0",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant = "default",
  size = "md",
  type = "button",
  className,
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={cx(
        "cursor-pointer border transition-colors duration-100 disabled:cursor-default disabled:opacity-40",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
