import { useEffect, useState } from "react";

import { cx } from "../lib/cx";
import { ACTIONS, assignKey, keyLabel, type ActionId } from "../lib/keys";
import type { Settings } from "../lib/types";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { FieldRow } from "./ui/FieldRow";
import { Screen } from "./ui/Screen";
import { Toggle } from "./ui/Toggle";

interface Props {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onReset: () => void;
  onBack: () => void;
}

interface Capture {
  id: ActionId;
  slot: number;
}

export function SettingsScreen({ settings, onChange, onReset, onBack }: Props) {
  const [capture, setCapture] = useState<Capture | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (capture) {
        event.preventDefault();
        event.stopPropagation();
        if (event.code === "Escape") {
          setCapture(null);
        } else if (event.code === "Backspace" || event.code === "Delete") {
          onChange({
            ...settings,
            keys: assignKey(settings.keys, capture.id, capture.slot, null),
          });
          setCapture(null);
        } else if (event.code) {
          onChange({
            ...settings,
            keys: assignKey(settings.keys, capture.id, capture.slot, event.code),
          });
          setCapture(null);
        }
        return;
      }
      if (event.code === "Escape" && !(event.target instanceof HTMLInputElement)) {
        event.preventDefault();
        event.stopPropagation();
        onBack();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [capture, settings, onChange, onBack]);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    onChange({ ...settings, [key]: value });

  const setReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    setConfirmReset(false);
    onReset();
  };

  return (
    <Screen
      title="Settings"
      actions={
        <>
          <Button variant={confirmReset ? "danger" : "default"} onClick={setReset}>
            {confirmReset ? "Confirm reset" : "Reset"}
          </Button>
          <Button variant="primary" onClick={onBack}>
            Back
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3.5">
        <Card title="Player">
          <FieldRow label="Name">
            <input
              className="w-50 border-0 border-b border-b-white/10 px-2.5 py-1.5 select-text focus:border-b-accent focus:ring-0 focus:outline-none"
              maxLength={16}
              value={settings.playerName}
              onChange={(event) => set("playerName", event.target.value)}
            />
          </FieldRow>
        </Card>

        <Card title="Gameplay">
          <NumberRow
            label="Start level"
            value={settings.startLevel}
            min={1}
            max={20}
            onChange={(v) => set("startLevel", v)}
          />
          <NumberRow
            label="Next previews"
            value={settings.nextCount}
            min={0}
            max={6}
            onChange={(v) => set("nextCount", v)}
          />
          <FieldRow label="Ghost piece">
            <Toggle
              label="Ghost piece"
              value={settings.ghostPiece}
              onChange={(v) => set("ghostPiece", v)}
            />
          </FieldRow>
          <FieldRow label="Hold piece">
            <Toggle
              label="Hold piece"
              value={settings.holdEnabled}
              onChange={(v) => set("holdEnabled", v)}
            />
          </FieldRow>
        </Card>

        <Card title="Handling">
          <NumberRow
            label="DAS"
            unit="ms"
            value={settings.dasMs}
            min={0}
            max={500}
            step={5}
            onChange={(v) => set("dasMs", v)}
          />
          <NumberRow
            label="ARR"
            unit="ms"
            value={settings.arrMs}
            min={0}
            max={200}
            step={5}
            onChange={(v) => set("arrMs", v)}
          />
          <NumberRow
            label="Soft drop"
            unit="×"
            value={settings.softDropFactor}
            min={1}
            max={40}
            onChange={(v) => set("softDropFactor", v)}
          />
          <NumberRow
            label="Lock delay"
            unit="ms"
            value={settings.lockDelayMs}
            min={100}
            max={1500}
            step={50}
            onChange={(v) => set("lockDelayMs", v)}
          />
        </Card>

        <Card title="Audio">
          <FieldRow label="Sound effects">
            <Toggle
              label="Sound effects"
              value={settings.soundEnabled}
              onChange={(v) => set("soundEnabled", v)}
            />
          </FieldRow>
          <NumberRow
            label="Volume"
            unit="%"
            value={settings.soundVolume}
            min={0}
            max={100}
            step={5}
            onChange={(v) => set("soundVolume", v)}
          />
        </Card>

        <Card title="Controls" className="col-span-full">
          <div className="grid grid-cols-2 gap-x-10">
            {ACTIONS.map(({ id, label }) => (
              <FieldRow key={id} label={label}>
                <div className="flex gap-1.5">
                  {[0, 1].map((slot) => {
                    const code = settings.keys[id][slot];
                    const active = capture?.id === id && capture.slot === slot;
                    return (
                      <Button
                        key={slot}
                        size="sm"
                        className={cx(
                          "min-w-20.5 font-mono",
                          active
                            ? "animate-pulse-fast border-accent text-accent"
                            : !code && "text-muted",
                        )}
                        onClick={() => setCapture({ id, slot })}
                      >
                        {active ? "press key…" : code ? keyLabel(code) : "+"}
                      </Button>
                    );
                  })}
                </div>
              </FieldRow>
            ))}
          </div>
        </Card>
      </div>
    </Screen>
  );
}

interface NumberRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}

function NumberRow({ label, value, min, max, step = 1, unit = "", onChange }: NumberRowProps) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <FieldRow label={label}>
      <div className="flex items-center gap-2">
        <Button
          size="square"
          onClick={() => onChange(clamp(value - step))}
          aria-label={`decrease ${label}`}
        >
          −
        </Button>
        <input
          className="w-35 accent-accent"
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(clamp(Number(event.target.value)))}
        />
        <Button
          size="square"
          onClick={() => onChange(clamp(value + step))}
          aria-label={`increase ${label}`}
        >
          +
        </Button>
        <span className="min-w-14 text-right font-mono tabular-nums">
          {value}
          {unit}
        </span>
      </div>
    </FieldRow>
  );
}
