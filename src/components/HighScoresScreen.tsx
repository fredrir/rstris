import { useEffect, useState } from "react";

import { formatDate, formatNumber, formatTime } from "../lib/format";
import { api } from "../lib/ipc";
import type { ScoreEntry, Stats } from "../lib/types";
import { HIGH_SCORE_LIMIT } from "../lib/types";

interface Props {
  highlightId: number | null;
  onBack: () => void;
}

async function fetchHighScores(): Promise<{ scores: ScoreEntry[]; stats: Stats }> {
  const [scores, stats] = await Promise.all([api.getHighScores(HIGH_SCORE_LIMIT), api.getStats()]);
  return { scores, stats };
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
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchHighScores()
      .then((loaded) => {
        if (cancelled) return;
        setScores(loaded.scores);
      })
      .catch((error) => console.error("high scores", error));
    return () => {
      cancelled = true;
    };
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
    const loaded = await fetchHighScores();
    setScores(loaded.scores);
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
          {scores.length === 0
            ? undefined
            : scores.map((entry, i) => (
                <tr
                  key={entry.id}
                  className={entry.id === highlightId ? "[&>td]:bg-accent/10" : ""}
                >
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
    </div>
  );
}

function rankClass(index: number) {
  if (index === 0) return "font-bold text-gold";
  if (index === 1) return "font-bold text-gray-300";
  if (index === 2) return "font-bold text-amber-600";
  return "text-muted";
}
