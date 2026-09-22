import { api } from "./ipc";
import type { GameMeta, SettingKey, SettingLimit } from "./types";

interface MetaStore {
  meta: GameMeta | null;
  pending: Promise<GameMeta> | null;
}

// Stored on globalThis so Vite HMR does not drop meta that components already render from.
const globals = globalThis as unknown as { __rstrisMeta?: MetaStore };
const store = (globals.__rstrisMeta ??= { meta: null, pending: null });

export function loadGameMeta(): Promise<GameMeta> {
  store.pending ??= api.getGameMeta().then((meta) => {
    store.meta = meta;
    return meta;
  });
  return store.pending;
}

export function gameMeta(): GameMeta {
  if (!store.meta) throw new Error("game meta not loaded");
  return store.meta;
}

export function settingLimit(key: SettingKey): SettingLimit {
  const limit = gameMeta().limits.find((entry) => entry.key === key);
  if (!limit) throw new Error(`missing limit for ${key}`);
  return limit;
}
