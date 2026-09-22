import { useCallback, useEffect, useRef, useState } from "react";
import { GameScreen } from "./components/GameScreen";
import { HighScoresScreen } from "./components/HighScoresScreen";
import { MainMenu } from "./components/MainMenu";
import { SettingsScreen } from "./components/SettingsScreen";
import { sfx } from "./lib/audio";
import { api } from "./lib/ipc";
import type { Settings } from "./lib/types";

type Screen = "menu" | "game" | "scores" | "settings";

const SAVE_DEBOUNCE_MS = 200;

export default function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [screen, setScreen] = useState<Screen>("menu");
  const [settingsOverGame, setSettingsOverGame] = useState(false);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [dbPath, setDbPath] = useState("");
  const [error, setError] = useState<string | null>(null);
  const saveTimer = useRef<number | null>(null);
  const saveSequence = useRef(0);

  useEffect(() => {
    api
      .getSettings()
      .then(setSettings)
      .catch((e) => setError(String(e)));
    api.getDbPath().then(setDbPath).catch(console.error);
  }, []);

  useEffect(() => {
    if (settings) sfx.configure(settings.soundEnabled, settings.soundVolume);
  }, [settings]);

  const updateSettings = useCallback((next: Settings) => {
    setSettings(next);
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    const sequence = ++saveSequence.current;
    saveTimer.current = window.setTimeout(() => {
      api
        .saveSettings(next)
        .then((saved) => {
          if (sequence === saveSequence.current) setSettings(saved);
        })
        .catch((e) => setError(String(e)));
    }, SAVE_DEBOUNCE_MS);
  }, []);

  const resetSettings = useCallback(() => {
    saveSequence.current++;
    api
      .resetSettings()
      .then(setSettings)
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
      <div className="relative flex h-full w-full flex-col gap-4.5 overflow-auto px-9 py-7">
        <h2 className="text-xl font-bold tracking-wider">Something went wrong</h2>
        <pre className="text-danger whitespace-pre-wrap">{error}</pre>
      </div>
    );
  }
  if (!settings)
    return (
      <div className="relative grid h-full w-full place-items-center text-muted">
        Loading…
      </div>
    );

  const settingsView = (
    <SettingsScreen
      settings={settings}
      dbPath={dbPath}
      onChange={updateSettings}
      onReset={resetSettings}
      onBack={() =>
        screen === "game" ? setSettingsOverGame(false) : setScreen("menu")
      }
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
        <div className="absolute inset-0 z-10 animate-fade-in bg-[#080a10]/96 backdrop-blur-[6px]">
          {settingsView}
        </div>
      )}
      {screen === "scores" && (
        <HighScoresScreen highlightId={highlightId} onBack={goMenu} />
      )}
      {screen === "settings" && settingsView}
    </>
  );
}
