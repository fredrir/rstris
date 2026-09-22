import { useEffect, useState } from "react";

import { cx } from "../lib/cx";
import { formatDate, formatNumber, formatTime } from "../lib/format";
import { api } from "../lib/ipc";
import type { ScoreEntry } from "../lib/types";
import { Button } from "./ui/Button";
import { Screen } from "./ui/Screen";
import { Td, Th } from "./ui/Table";

interface Props {
  highlightId: number | null;
  onBack: () => void;
}

function fetchHighScores(): Promise<ScoreEntry[]> {
  return api.getHighScores();
}

export function HighScoresScreen({ highlightId, onBack }: Props) {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchHighScores()
      .then((loaded) => {
        if (cancelled) return;
        setScores(loaded);
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
    setScores(await fetchHighScores());
  };

  return (
    <Screen
      title="High Scores"
      actions={
        <>
          {confirmClear ? (
            <>
              <Button variant="danger" onClick={() => void clear()}>
                Confirm clear
              </Button>
              <Button onClick={() => setConfirmClear(false)}>Cancel</Button>
            </>
          ) : (
            <Button onClick={() => setConfirmClear(true)} disabled={scores.length === 0}>
              Clear all
            </Button>
          )}
          <Button variant="primary" onClick={onBack}>
            Back
          </Button>
        </>
      }
    >
      <table className="w-full text-sm">
        <thead>
          <tr>
            <Th>#</Th>
            <Th>Name</Th>
            <Th numeric>Score</Th>
            <Th numeric>Level</Th>
            <Th numeric>Lines</Th>
            <Th numeric>Time</Th>
            <Th numeric>Tetrises</Th>
            <Th numeric>T-spins</Th>
            <Th>Date</Th>
          </tr>
        </thead>
        <tbody>
          {scores.map((entry, i) => (
            <tr key={entry.id} className={cx(entry.id === highlightId && "[&>td]:bg-accent/10")}>
              <Td className={cx("w-10 font-mono", rankClass(i))}>{i + 1}</Td>
              <Td>{entry.name}</Td>
              <Td numeric>{formatNumber(entry.score)}</Td>
              <Td numeric>{entry.level}</Td>
              <Td numeric>{entry.lines}</Td>
              <Td numeric>{formatTime(entry.durationMs)}</Td>
              <Td numeric>{entry.tetrises}</Td>
              <Td numeric>{entry.tspins}</Td>
              <Td>{formatDate(entry.playedAt)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </Screen>
  );
}

function rankClass(index: number) {
  if (index === 0) return "font-bold text-gold";
  if (index === 1) return "font-bold text-gray-300";
  if (index === 2) return "font-bold text-amber-600";
  return "text-muted";
}
