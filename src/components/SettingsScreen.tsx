import { useEffect, useState } from "react";
import { ACTIONS, assignKey, keyLabel, type ActionId } from "../lib/keys";
import type { Settings } from "../lib/types";

interface Props {
  settings: Settings;
  dbPath: string;
  onChange: (settings: Settings) => void;
  onReset: () => void;
  onBack: () => void;
}

interface Capture {
  id: ActionId;
  slot: number;
}

export function SettingsScreen({
  settings,
  dbPath,
  onChange,
  onReset,
  onBack,
}: Props) {
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
            keys: assignKey(
              settings.keys,
              capture.id,
              capture.slot,
              event.code,
            ),
          });
          setCapture(null);
        }
        return;
      }
      if (
        event.code === "Escape" &&
        !(event.target instanceof HTMLInputElement)
      ) {
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
    <div className="screen page settings">
      <header className="page-header">
        <h2>Settings</h2>
        <div className="page-actions">
          <button
            className={confirmReset ? "button danger" : "button"}
            onClick={setReset}
          >
            {confirmReset ? "Confirm reset" : "Reset"}
          </button>

          <button className="button primary" onClick={onBack}>
            Back
          </button>
        </div>
      </header>

      <div className="settings-grid">
        <section className="card">
          <h3>Player</h3>
          <Row label="Name">
            <input
              className="text-input"
              maxLength={16}
              value={settings.playerName}
              onChange={(event) => set("playerName", event.target.value)}
            />
          </Row>
        </section>

        <section className="card">
          <h3>Gameplay</h3>
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
          <ToggleRow
            label="Ghost piece"
            value={settings.ghostPiece}
            onChange={(v) => set("ghostPiece", v)}
          />
          <ToggleRow
            label="Hold piece"
            value={settings.holdEnabled}
            onChange={(v) => set("holdEnabled", v)}
          />
        </section>

        <section className="card">
          <h3>Handling</h3>
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
        </section>

        <section className="card">
          <h3>Audio</h3>
          <ToggleRow
            label="Sound effects"
            value={settings.soundEnabled}
            onChange={(v) => set("soundEnabled", v)}
          />
          <NumberRow
            label="Volume"
            unit="%"
            value={settings.soundVolume}
            min={0}
            max={100}
            step={5}
            onChange={(v) => set("soundVolume", v)}
          />
        </section>

        <section className="card controls-card">
          <h3>Controls</h3>
          <div className="controls-rows">
            {ACTIONS.map(({ id, label }) => (
              <Row key={id} label={label}>
                <div className="key-slots">
                  {[0, 1].map((slot) => {
                    const code = settings.keys[id][slot];
                    const active = capture?.id === id && capture.slot === slot;
                    return (
                      <button
                        key={slot}
                        className={`key-slot${active ? " capturing" : ""}${code ? "" : " empty"}`}
                        onClick={() => setCapture({ id, slot })}
                      >
                        {active ? "press key…" : code ? keyLabel(code) : "+"}
                      </button>
                    );
                  })}
                </div>
              </Row>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="row">
      <span className="row-label">{label}</span>
      <div className="row-control">{children}</div>
    </div>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Row label={label}>
      <button
        className={`toggle${value ? " on" : ""}`}
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
      >
        <span className="toggle-knob" />
        <span className="toggle-text">{value ? "On" : "Off"}</span>
      </button>
    </Row>
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

function NumberRow({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
}: NumberRowProps) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <Row label={label}>
      <div className="number-control">
        <button
          className="step"
          onClick={() => onChange(clamp(value - step))}
          aria-label={`decrease ${label}`}
        >
          −
        </button>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(clamp(Number(event.target.value)))}
        />
        <button
          className="step"
          onClick={() => onChange(clamp(value + step))}
          aria-label={`increase ${label}`}
        >
          +
        </button>
        <span className="number-value mono">
          {value}
          {unit}
        </span>
      </div>
    </Row>
  );
}
