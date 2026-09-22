import { cx } from "../../lib/cx";
import { formatNumber } from "../../lib/format";

type Tone = "muted" | "accent";

const TONES: Record<Tone, string> = {
  muted: "text-muted",
  accent: "text-accent",
};

interface Props {
  label: string;
  value: number;
  tone?: Tone;
}

const GameStatCard = ({ label, value, tone = "muted" }: Props) => {
  return (
    <div className="flex flex-col">
      <span className={cx("text-[16px] tracking-[0.12em] uppercase", TONES[tone])}>{label}</span>
      <span className="font-mono text-xl font-bold tabular-nums">{formatNumber(value)}</span>
    </div>
  );
};

export default GameStatCard;
