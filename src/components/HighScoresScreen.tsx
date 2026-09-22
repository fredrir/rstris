import { useEffect, useState } from "react";

import { formatDate, formatNumber, formatTime } from "../lib/format";
import { api } from "../lib/ipc";
import type { ScoreEntry, Stats } from "../lib/types";
import { HIGH_SCORE_LIMIT } from "../lib/types";

interface Props {
  highlightId: number | null;
  onBack: () => void;
}

const PAGE = "relative flex h-full w-full flex-col gap-4.5 overflow-auto px-9 py-7";
const BUTTON =
  "cursor-pointer rounded-lg border bg-white/5 px-4 py-2 transition-colors duration-100 hover:bg-white/10 disabled:cursor-default disabled:opacity-40";
const BUTTON_GHOST = `${BUTTON} border-white/10`;
const BUTTON_PRIMARY = `${BUTTON} border-accent/50 text-accent`;
const BUTTON_DANGER = `${BUTTON} border-danger/50 text-danger`;
const TH =
  "border-b border-white/10 px-3 py-2.25 text-[11px] uppercase tracking-[0.12em] text-muted";
const TH_NUM = `${TH} text-right font-mono tabular-nums`;
const TD = "border-b border-white/10 px-3 py-2.25";
const TD_NUM = `${TD} text-right font-mono tabular-nums`;

export function HighScoresScreen({ highlightId, onBack }: Props) {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const load = async () => {
    const [entries, aggregate] = await Promise.all([
      api.getHighScores(HIGH_SCORE_LIMIT),
      api.getStats(),
    ]);
    setScores(entries);
    setStats(aggregate);
  };

  useEffect(() => {
    void load().catch((error) => console.error("high scores", error));
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Escape" || event.code === "Backspace") onBack();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onBack]);

  const clear = async () => {
    await api.clearHighScores();
    setConfirmClear(false);
    await load();
  };

  return (
    <div className={PAGE}>
      <header className="flex items-center justify-between">
        <h2 className="font-mono text-[26px] font-bold tracking-[0.16em] text-accent">
          High Scores
        </h2>
        <div className="flex gap-2">
          {confirmClear ? (
            <>
              <button className={BUTTON_DANGER} onClick={() => void clear()}>
                Confirm clear
              </button>
              <button className={BUTTON_GHOST} onClick={() => setConfirmClear(false)}>
                Cancel
              </button>
            </>
          ) : (
            <button
              className={BUTTON_GHOST}
              onClick={() => setConfirmClear(true)}
              disabled={scores.length === 0}
            >
              Clear all
            </button>
          )}
          <button className={BUTTON_PRIMARY} onClick={onBack}>
            Back
          </button>
        </div>
      </header>

      {scores.length === 0 ? undefined : (
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={`${TH} text-left`}>#</th>
              <th className={`${TH} text-left`}>Name</th>
              <th className={TH_NUM}>Score</th>
              <th className={TH_NUM}>Level</th>
              <th className={TH_NUM}>Lines</th>
              <th className={TH_NUM}>Time</th>
              <th className={TH_NUM}>Tetrises</th>
              <th className={TH_NUM}>T-Spins</th>
              <th className={`${TH} text-left`}>Date</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((entry, i) => (
              <tr key={entry.id} className={entry.id === highlightId ? "[&>td]:bg-accent/10" : ""}>
                <td className={`${TD} w-10 font-mono ${rankClass(i)}`}>{i + 1}</td>
                <td className={TD}>{entry.name}</td>
                <td className={TD_NUM}>{formatNumber(entry.score)}</td>
                <td className={TD_NUM}>{entry.level}</td>
                <td className={TD_NUM}>{entry.lines}</td>
                <td className={TD_NUM}>{formatTime(entry.durationMs)}</td>
                <td className={TD_NUM}>{entry.tetrises}</td>
                <td className={TD_NUM}>{entry.tspins}</td>
                <td className={TD}>{formatDate(entry.playedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {stats && stats.games > 0 && (
        <section className="grid grid-cols-6 gap-2.5 max-[1000px]:grid-cols-4">
          <Stat label="Games" value={formatNumber(stats.games)} />
          <Stat label="Best score" value={formatNumber(stats.bestScore)} />
          <Stat label="Total score" value={formatNumber(stats.totalScore)} />
          <Stat label="Total lines" value={formatNumber(stats.totalLines)} />
          <Stat label="Most lines" value={formatNumber(stats.bestLines)} />
          <Stat label="Highest level" value={String(stats.highestLevel)} />
          <Stat label="Play time" value={formatTime(stats.totalTimeMs)} />
          <Stat label="Pieces" value={formatNumber(stats.totalPieces)} />
          <Stat label="Tetrises" value={formatNumber(stats.tetrises)} />
          <Stat label="T-Spins" value={formatNumber(stats.tspins)} />
          <Stat label="Perfect clears" value={formatNumber(stats.perfectClears)} />
          <Stat label="Best combo" value={String(stats.bestCombo)} />
        </section>
      )}
    </div>
  );
}

function rankClass(index: number) {
  if (index === 0) return "font-bold text-gold";
  if (index === 1) return "font-bold text-gray-300";
  if (index === 2) return "font-bold text-amber-600";
  return "text-muted";
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-[10px] border border-white/10 bg-white/4 px-3 py-2.5">
      <span className="text-[11px] tracking-[0.12em] text-muted uppercase">{label}</span>
      <span className="font-mono text-lg font-bold tabular-nums">{value}</span>
    </div>
  );
}
