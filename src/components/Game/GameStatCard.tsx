import { formatNumber } from "../../lib/format";

interface Props {
  label: string;
  value: number;
  textColor?: "muted" | "accent";
}

const GameStatCard = ({ label, value, textColor = "muted" }: Props) => {
  return (
    <div className="flex flex-col">
      <span className="font-mono font-bold tabular-nums">{label}</span>
      <span className={`text-xl text-[16px] tracking-[0.12em] text-${textColor} uppercase`}>
        {formatNumber(value)}
      </span>
    </div>
  );
};

export default GameStatCard;
