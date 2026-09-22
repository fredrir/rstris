import { useEffect, useState, type ReactNode } from "react";
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

const PAGE =
  "relative flex h-full w-full flex-col gap-4.5 overflow-auto px-9 py-7";
const CARD = "rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3";
const H3 = "mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-muted";
const BUTTON =
  "cursor-pointer rounded-lg border bg-white/5 px-4 py-2 transition-colors duration-100 hover:bg-white/10";
const BUTTON_GHOST = `${BUTTON} border-white/10`;
const BUTTON_PRIMARY = `${BUTTON} border-accent/50 text-accent`;
const BUTTON_DANGER = `${BUTTON} border-danger/50 text-danger`;

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
    <div className={PAGE}>
      <header className="flex items-center justify-between">
        <h2 className="font-mono text-[26px] font-bold tracking-[0.16em] text-accent">
          Settings
        </h2>
        <div className="flex gap-2">
          <button
            className={confirmReset ? BUTTON_DANGER : BUTTON_GHOST}
            onClick={setReset}
          >
            {confirmReset ? "Confirm reset" : "Reset"}
          </button>

          <button className={BUTTON_PRIMARY} onClick={onBack}>
            Back
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3.5">
        <section className={CARD}>
          <h3 className={H3}>Player</h3>
          <Row label="Name">
            <input
              className="w-[200px] select-text rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1.5 outline-none focus:border-accent"
              maxLength={16}
              value={settings.playerName}
              onChange={(event) => set("playerName", event.target.value)}
            />
          </Row>
        </section>

        <section className={CARD}>
          <h3 className={H3}>Gameplay</h3>
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

        <section className={CARD}>
          <h3 className={H3}>Handling</h3>
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

        <section className={CARD}>
          <h3 className={H3}>Audio</h3>
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

        <section className={`${CARD} col-span-full`}>
          <h3 className={H3}>Controls</h3>
          <div className="grid grid-cols-2 gap-x-10">
            {ACTIONS.map(({ id, label }) => (
              <Row key={id} label={label}>
                <div className="flex gap-1.5">
                  {[0, 1].map((slot) => {
                    const code = settings.keys[id][slot];
                    const active = capture?.id === id && capture.slot === slot;
                    return (
                      <button
                        key={slot}
                        className={[
                          "min-w-[82px] cursor-pointer rounded-md border bg-white/5 px-2.5 py-1.25 font-mono",
                          active
                            ? "animate-pulse-fast border-accent text-accent"
                            : `border-white/10 ${code ? "" : "text-muted"}`,
                        ].join(" ")}
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

      <footer className="text-xs text-muted">{dbPath}</footer>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className="text-ink">{label}</span>
      <div className="flex flex-1 items-center justify-end">{children}</div>
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
        className={[
          "inline-flex cursor-pointer items-center gap-2 rounded-full border py-1 pr-2.5 pl-1",
          value
            ? "border-accent/50 text-accent"
            : "border-white/10 text-muted",
        ].join(" ")}
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
      >
        <span
          className={`size-4.5 rounded-full transition-[background-color,transform] duration-100 ${
            value ? "bg-accent" : "bg-muted"
          }`}
        />
        <span className="w-6 text-left">{value ? "On" : "Off"}</span>
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
      <div className="flex items-center gap-2">
        <button
          className="size-6.5 cursor-pointer rounded-md border border-white/10 bg-white/5 transition-colors duration-100 hover:bg-white/[0.12]"
          onClick={() => onChange(clamp(value - step))}
          aria-label={`decrease ${label}`}
        >
          −
        </button>
        <input
          className="w-[140px] accent-accent"
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(clamp(Number(event.target.value)))}
        />
        <button
          className="size-6.5 cursor-pointer rounded-md border border-white/10 bg-white/5 transition-colors duration-100 hover:bg-white/[0.12]"
          onClick={() => onChange(clamp(value + step))}
          aria-label={`increase ${label}`}
        >
          +
        </button>
        <span className="min-w-14 text-right font-mono tabular-nums">
          {value}
          {unit}
        </span>
      </div>
    </Row>
  );
}
