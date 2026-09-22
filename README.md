# rstris

Tetris. Rust owns the engine, input resolution, settings, scoring, and persistence (Tauri 2); React renders chrome and canvas frames from compact snapshots.

## Stack

| Layer                                 | Value                                                  |
| ------------------------------------- | ------------------------------------------------------ |
| Engine, scoring, DAS/ARR, persistence | Rust (`src-tauri/src`)                                 |
| Input, settings, board meta           | Rust column resolution + snapshots                     |
| Storage                               | SQLite via `rusqlite` (bundled) + `rusqlite_migration` |
| Shell                                 | Tauri 2                                                |
| UI                                    | React 19, TypeScript, Vite, HTML canvas                |
| Styling                               | Tailwind CSS 4 (`@tailwindcss/vite`)                   |
| Package manager                       | bun                                                    |

## Commands

```sh
bun install                      # frontend deps
bun tauri dev                    # run app (hot reload)
bun tauri build                  # bundle release app
bun tauri icon app-icon.svg      # regenerate src-tauri/icons from the logo
bun run typecheck                # tsc
cargo test --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets
```

## Features

| Feature     | Value                                                                                               |
| ----------- | --------------------------------------------------------------------------------------------------- |
| Rotation    | SRS with wall kicks, 180° rotation                                                                  |
| Randomizer  | 7-bag                                                                                               |
| Scoring     | Guideline: singles–tetris, T-spin / mini, back-to-back ×1.5, combos, perfect clears, soft/hard drop |
| Levels      | 1–30, 10 lines per level, guideline gravity curve, selectable start level                           |
| Handling    | DAS, ARR, soft drop factor, lock delay (15 move resets), hold, ghost, next queue (0–6)              |
| High scores | Top 10 with name entry, per-game stats (time, pieces, tetrises, T-spins)                            |
| Settings    | Persisted, live-applied, rebindable keys (2 per action)                                             |
| Audio       | Synthesized Web Audio SFX, volume + toggle                                                          |

## Default keys

| Action      | Keys       |
| ----------- | ---------- |
| Move        | ← →        |
| Soft drop   | ↓          |
| Hard drop   | Space      |
| Rotate CW   | ↑, X       |
| Rotate CCW  | Z, L Ctrl  |
| Rotate 180° | A          |
| Hold        | C, L Shift |
| Pause       | Esc, P     |

## Persistence

| Item       | Value                                                                                        |
| ---------- | -------------------------------------------------------------------------------------------- |
| File       | `<app data dir>/rstris.sqlite3` (macOS: `~/Library/Application Support/com.fredrir.rstris/`) |
| Tables     | `settings` (json blob), `scores` (one row per finished game)                                 |
| Migrations | `src-tauri/src/db/mod.rs`, tracked with `PRAGMA user_version`                                |

## Layout

| Path                         | Value                                                                                                                |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `app-icon.svg`               | Logo source; `bun tauri icon app-icon.svg` regenerates `src-tauri/icons/`                                            |
| `src-tauri/src/game/`        | `piece` (shapes, kicks, wire codes), `board`, `bag`, `scoring`, `input` (DAS/ARR), `engine`, `snapshot`              |
| `src-tauri/src/meta.rs`      | Board geometry, preview shapes, setting limits served by `get_game_meta`                                             |
| `src-tauri/src/db/`          | `scores`, `settings`                                                                                                 |
| `src-tauri/src/commands.rs`  | Tauri IPC commands                                                                                                   |
| `src-tauri/src/game_loop.rs` | 4 ms tick while playing, 50 ms idle; `game-state` emits on the next tick for events, else ≤ 125 Hz, plus `game-over` |
| `src-tauri/tests/`           | Mirrors `src/` modules                                                                                               |
| `src/components/`            | Screens and overlays                                                                                                 |
| `src/components/ui/`         | `Button`, `Card`, `Screen`, `Page`, `Overlay`, `Table`, `Toggle`, `FieldRow` primitives                              |
| `src/lib/game/`              | `session` (snapshot store + frame/UI subscriptions), `event` (SFX + popups)                                          |
| `src/lib/`                   | `types`, `ipc`, `keys`, `meta`, `audio`, `render`, `format`, `cx`                                                    |
| `src/styles.css`             | Tailwind entry: `@theme` tokens, keyframes, base layer                                                               |

## Runtime

| Flow         | Value                                                                                                       |
| ------------ | ----------------------------------------------------------------------------------------------------------- |
| Key press    | `key_input(code, pressed)` → `settings.keys.resolve` → engine input                                         |
| Snapshot     | `game-state` event: monotonic `version`, `boardVersion`, flat `u8` board (0 empty, 1..=7 piece)             |
| Canvas       | `BoardCanvas` draws on each snapshot; static layer redraws only when `boardVersion` or clearing rows change |
| React chrome | `useSyncExternalStore` on selected fields; re-renders only when score/level/lines/hold/next/phase change    |
| Game over    | Rust records non-qualifying runs and emits `game-over`; webview prompts for a name only when the run ranks  |
| Settings     | `update_settings(patch)` / `assign_key` merge, clamp, persist, and return the authoritative settings        |

## Styling

| Item        | Value                                            |
| ----------- | ------------------------------------------------ |
| Engine      | Tailwind CSS 4                                   |
| Vite plugin | `@tailwindcss/vite` in `vite.config.ts`          |
| Entry       | `src/styles.css` → `@import "tailwindcss"`       |
| Tokens      | `@theme`: `--color-*`, `--font-*`, `--animate-*` |
| Components  | Reusable primitives in `src/components/ui/`      |
| Class joins | `cx` from `src/lib/cx` for conditional classes   |
