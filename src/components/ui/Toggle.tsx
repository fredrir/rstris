import { cx } from "../../lib/cx";

interface Props {
  value: boolean;
  onChange: (value: boolean) => void;
  label?: string;
}

export function Toggle({ value, onChange, label }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      className={cx(
        "inline-flex cursor-pointer items-center gap-2 rounded-full border py-1 pr-2.5 pl-1",
        value ? "border-accent/50 text-accent" : "border-white/10 text-muted",
      )}
      onClick={() => onChange(!value)}
    >
      <span
        className={cx(
          "size-4.5 rounded-full transition-[background-color,transform] duration-100",
          value ? "bg-accent" : "bg-muted",
        )}
      />
      <span className="w-6 text-left">{value ? "On" : "Off"}</span>
    </button>
  );
}
