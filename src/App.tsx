import { useCallback, useEffect, useRef, useState } from "react";
import { GameScreen } from "./components/GameScreen";
import { HighScoresScreen } from "./components/HighScoresScreen";
import { MainMenu } from "./components/MainMenu";
import { SettingsScreen } from "./components/SettingsScreen";
import { Page } from "./components/ui/Page";
import { sfx } from "./lib/audio";
import { api } from "./lib/ipc";
import { loadGameMeta } from "./lib/meta";
import type { KeyAction, Settings, SettingsPatch } from "./lib/types";

type Screen = "menu" | "game" | "scores" | "settings";

const SAVE_DEBOUNCE_MS = 200;

export default function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [screen, setScreen] = useState<Screen>("menu");
  const [settingsOverGame, setSettingsOverGame] = useState(false);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const saveTimer = useRef<number | null>(null);
  const pendingPatch = useRef<SettingsPatch>({});
  const settingsVersion = useRef(0);

  useEffect(() => {
    Promise.all([api.getSettings(), loadGameMeta()])
      .then(([loaded]) => setSettings(loaded))
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    if (settings) sfx.configure(settings.soundEnabled, settings.soundVolume);
  }, [settings]);

  const flushSettings = useCallback(() => {
    const patch = pendingPatch.current;
    pendingPatch.current = {};
    if (Object.keys(patch).length === 0) return;
    const version = settingsVersion.current;
    api
      .updateSettings(patch)
      .then((saved) => {
        if (version === settingsVersion.current) setSettings(saved);
      })
      .catch((e) => setError(String(e)));
  }, []);

  const updateSettings = useCallback(
    (patch: SettingsPatch) => {
      setSettings((current) => (current ? { ...current, ...patch } : current));
      pendingPatch.current = { ...pendingPatch.current, ...patch };
      settingsVersion.current++;
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(flushSettings, SAVE_DEBOUNCE_MS);
    },
    [flushSettings],
  );

  const assignKey = useCallback((action: KeyAction, slot: number, code: string | null) => {
    const version = ++settingsVersion.current;
    api
      .assignKey(action, slot, code)
      .then((saved) => {
        if (version === settingsVersion.current) setSettings(saved);
      })
      .catch((e) => setError(String(e)));
  }, []);

  const resetSettings = useCallback(() => {
    const version = ++settingsVersion.current;
    pendingPatch.current = {};
    api
      .resetSettings()
      .then((saved) => {
        if (version === settingsVersion.current) setSettings(saved);
      })
      .catch((e) => setError(String(e)));
  }, []);

  const goMenu = useCallback(() => {
    setSettingsOverGame(false);
    setScreen("menu");
  }, []);

  const goScores = useCallback((id: number | null) => {
    setHighlightId(id);
    setSettingsOverGame(false);
    setScreen("scores");
  }, []);

  if (error) {
    return (
      <Page>
        <h2 className="text-xl font-bold tracking-wider">Something went wrong</h2>
        <pre className="whitespace-pre-wrap text-danger">{error}</pre>
      </Page>
    );
  }
  if (!settings)
    return <div className="relative grid size-full place-items-center text-muted">Loading…</div>;

  const settingsView = (
    <SettingsScreen
      settings={settings}
      onChange={updateSettings}
      onAssignKey={assignKey}
      onReset={resetSettings}
      onBack={() => (screen === "game" ? setSettingsOverGame(false) : setScreen("menu"))}
    />
  );

  return (
    <>
      {screen === "menu" && (
        <MainMenu
          onPlay={() => setScreen("game")}
          onScores={() => goScores(null)}
          onSettings={() => setScreen("settings")}
        />
      )}
      {screen === "game" && (
        <GameScreen
          settings={settings}
          inputEnabled={!settingsOverGame}
          onMenu={goMenu}
          onScores={goScores}
          onSettings={() => setSettingsOverGame(true)}
        />
      )}
      {screen === "game" && settingsOverGame && (
        <div className="absolute inset-0 z-10 animate-fade-in bg-[#080a10]">{settingsView}</div>
      )}
      {screen === "scores" && <HighScoresScreen highlightId={highlightId} onBack={goMenu} />}
      {screen === "settings" && settingsView}
    </>
  );
}
