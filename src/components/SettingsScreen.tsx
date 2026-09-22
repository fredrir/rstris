import { useEffect, useState } from "react";

import { cx } from "../lib/cx";
import { ACTIONS, keyLabel, type ActionId } from "../lib/keys";
import { settingLimit } from "../lib/meta";
import type { SettingKey, Settings, SettingsPatch } from "../lib/types";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { FieldRow } from "./ui/FieldRow";
import { Screen } from "./ui/Screen";
import { Toggle } from "./ui/Toggle";

interface Props {
  settings: Settings;
  onChange: (patch: SettingsPatch) => void;
  onAssignKey: (action: ActionId, slot: number, code: string | null) => void;
  onReset: () => void;
  onBack: () => void;
}

interface Capture {
  id: ActionId;
  slot: number;
}

export function SettingsScreen({ settings, onChange, onAssignKey, onReset, onBack }: Props) {
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
          onAssignKey(capture.id, capture.slot, null);
          setCapture(null);
        } else if (event.code) {
          onAssignKey(capture.id, capture.slot, event.code);
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
  }, [capture, onAssignKey, onBack]);

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
              onChange={(event) => onChange({ playerName: event.target.value })}
            />
          </FieldRow>
        </Card>

        <Card title="Gameplay">
          <NumberRow
            settingKey="startLevel"
            label="Start level"
            value={settings.startLevel}
            onChange={(v) => onChange({ startLevel: v })}
          />
          <NumberRow
            settingKey="nextCount"
            label="Next previews"
            value={settings.nextCount}
            onChange={(v) => onChange({ nextCount: v })}
          />
          <FieldRow label="Ghost piece">
            <Toggle
              label="Ghost piece"
              value={settings.ghostPiece}
              onChange={(v) => onChange({ ghostPiece: v })}
            />
          </FieldRow>
          <FieldRow label="Hold piece">
            <Toggle
              label="Hold piece"
              value={settings.holdEnabled}
              onChange={(v) => onChange({ holdEnabled: v })}
            />
          </FieldRow>
        </Card>

        <Card title="Handling">
          <NumberRow
            settingKey="dasMs"
            label="DAS"
            value={settings.dasMs}
            onChange={(v) => onChange({ dasMs: v })}
          />
          <NumberRow
            settingKey="arrMs"
            label="ARR"
            value={settings.arrMs}
            onChange={(v) => onChange({ arrMs: v })}
          />
          <NumberRow
            settingKey="softDropFactor"
            label="Soft drop"
            value={settings.softDropFactor}
            onChange={(v) => onChange({ softDropFactor: v })}
          />
          <NumberRow
            settingKey="lockDelayMs"
            label="Lock delay"
            value={settings.lockDelayMs}
            onChange={(v) => onChange({ lockDelayMs: v })}
          />
        </Card>

        <Card title="Audio">
          <FieldRow label="Sound effects">
            <Toggle
              label="Sound effects"
              value={settings.soundEnabled}
              onChange={(v) => onChange({ soundEnabled: v })}
            />
          </FieldRow>
          <NumberRow
            settingKey="soundVolume"
            label="Volume"
            value={settings.soundVolume}
            onChange={(v) => onChange({ soundVolume: v })}
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
  settingKey: SettingKey;
  label: string;
  value: number;
  onChange: (v: number) => void;
}

function NumberRow({ settingKey, label, value, onChange }: NumberRowProps) {
  const { min, max, step, unit } = settingLimit(settingKey);
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
          {unit ?? ""}
        </span>
      </div>
    </FieldRow>
  );
}
