import { useEffect, useState } from "react";

import { formatDate, formatNumber, formatTime } from "../lib/format";
import { api } from "../lib/ipc";
import type { ScoreEntry, Stats } from "../lib/types";
import { HIGH_SCORE_LIMIT } from "../lib/types";

interface Props {
  highlightId: number | null;
  onBack: () => void;
}

export function HighScoresScreen({ highlightId, onBack }: Props) {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const load = async () => {
    const [entries, aggregate] = await Promise.all([api.getHighScores(HIGH_SCORE_LIMIT), api.getStats()]);
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
    <div className="screen page">
      <header className="page-header">
        <h2>High Scores</h2>
        <div className="page-actions">
          {confirmClear ? (
            <>
              <button className="button danger" onClick={() => void clear()}>
                Confirm clear
              </button>
              <button className="button" onClick={() => setConfirmClear(false)}>
                Cancel
              </button>
            </>
          ) : (
            <button className="button" onClick={() => setConfirmClear(true)} disabled={scores.length === 0}>
              Clear all
            </button>
          )}
          <button className="button primary" onClick={onBack}>
            Back
          </button>
        </div>
      </header>

      {scores.length === 0 ? (
        <p className="empty">No games recorded yet. Go play one!</p>
      ) : (
        <table className="scores">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th className="num">Score</th>
              <th className="num">Level</th>
              <th className="num">Lines</th>
              <th className="num">Time</th>
              <th className="num">Tetrises</th>
              <th className="num">T-Spins</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((entry, i) => (
              <tr key={entry.id} className={entry.id === highlightId ? "highlight" : ""}>
                <td className={`rank r${i + 1}`}>{i + 1}</td>
                <td>{entry.name}</td>
                <td className="num">{formatNumber(entry.score)}</td>
                <td className="num">{entry.level}</td>
                <td className="num">{entry.lines}</td>
                <td className="num">{formatTime(entry.durationMs)}</td>
                <td className="num">{entry.tetrises}</td>
                <td className="num">{entry.tspins}</td>
                <td>{formatDate(entry.playedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {stats && stats.games > 0 && (
        <section className="stats-grid">
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
      <p className="footer-hint">Esc back</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-tile">
      <span className="stat-label">{label}</span>
      <span className="stat-value mono">{value}</span>
    </div>
  );
}
