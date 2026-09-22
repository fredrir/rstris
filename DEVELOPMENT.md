# rstris — development

## Requirements

| Tool      | Version                   |
| --------- | ------------------------- |
| Rust      | stable (edition 2024)     |
| Bun       | 1.x                       |
| Xcode CLT | for the Tauri macOS build |

## Commands

| Command                                                           | Value                                      |
| ----------------------------------------------------------------- | ------------------------------------------ |
| `bun install`                                                     | frontend deps                              |
| `bun tauri dev`                                                   | run app (hot reload)                       |
| `bun tauri build`                                                 | bundle release app                         |
| `bun tauri icon app-icon.svg`                                     | regenerate `src-tauri/icons` from the logo |
| `bun run typecheck`                                               | tsc                                        |
| `bun run lint`                                                    | eslint                                     |
| `bun run format`                                                  | prettier                                   |
| `cargo test --manifest-path src-tauri/Cargo.toml`                 | engine + db tests                          |
| `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets` | lints                                      |

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

## Layout

| Path                         | Value                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `app-icon.svg`               | Logo source; `bun tauri icon app-icon.svg` regenerates `src-tauri/icons/`                                           |
| `src-tauri/src/game/`        | `piece` (shapes, kicks, wire codes), `board`, `bag`, `scoring`, `input` (DAS/ARR), `engine`, `snapshot`             |
| `src-tauri/src/meta.rs`      | Board geometry, preview shapes, setting limits served by `get_game_meta`                                            |
| `src-tauri/src/db/`          | `scores`, `settings`                                                                                                |
| `src-tauri/src/commands.rs`  | Tauri IPC commands                                                                                                  |
| `src-tauri/src/game_loop.rs` | 4 ms tick while playing, 50 ms idle; `game-state` emits on the next tick for events, else ≤ 60 Hz, plus `game-over` |
| `src-tauri/tests/`           | Mirrors `src/` modules                                                                                              |
| `src/components/`            | Screens and overlays                                                                                                |
| `src/components/ui/`         | `Button`, `Card`, `Screen`, `Page`, `Overlay`, `Table`, `Toggle`, `FieldRow` primitives                             |
| `src/lib/game/`              | `session` (snapshot store + frame/UI subscriptions), `event` (SFX + popups)                                         |
| `src/lib/`                   | `types`, `ipc`, `keys`, `meta`, `audio`, `render`, `format`, `cx`                                                   |
| `src/styles.css`             | Tailwind entry: `@theme` tokens, keyframes, base layer                                                              |
| `tools/readme/`              | README media capture (browser replay of the real engine, see below)                                                 |

## Runtime

| Flow         | Value                                                                                                                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Key press    | `key_input(code, pressed)` → `settings.keys.resolve` → engine input                                                                                                                        |
| Snapshot     | `game-state` event: monotonic `version`, `boardVersion`, flat `u8` board (0 empty, 1..=7 piece)                                                                                            |
| Line clear   | Rust drives an animated `clearFlash` (elapsed/duration) while the pre-collapse rows render; the next piece spawns at once and can move/rotate/hard-drop (hard drop settles the rows first) |
| Canvas       | `BoardCanvas` coalesces draws to `requestAnimationFrame`; static layer redraws only when `boardVersion` or clearing rows change                                                            |
| React chrome | `useSyncExternalStore` on selected fields; re-renders only when score/level/lines/hold/next/phase change                                                                                   |
| Game over    | Rust records non-qualifying runs and emits `game-over`; webview prompts for a name only when the run ranks                                                                                 |
| Settings     | `update_settings(patch)` / `assign_key` merge, clamp, persist, and return the authoritative settings                                                                                       |

## Persistence

| Item       | Value                                                                                        |
| ---------- | -------------------------------------------------------------------------------------------- |
| File       | `<app data dir>/rstris.sqlite3` (macOS: `~/Library/Application Support/com.fredrir.rstris/`) |
| Tables     | `settings` (json blob), `scores` (one row per finished game)                                 |
| Migrations | `src-tauri/src/db/mod.rs`, tracked with `PRAGMA user_version`                                |

## Styling

| Item        | Value                                            |
| ----------- | ------------------------------------------------ |
| Engine      | Tailwind CSS 4                                   |
| Vite plugin | `@tailwindcss/vite` in `vite.config.ts`          |
| Entry       | `src/styles.css` → `@import "tailwindcss"`       |
| Tokens      | `@theme`: `--color-*`, `--font-*`, `--animate-*` |
| Components  | Reusable primitives in `src/components/ui/`      |
| Class joins | `cx` from `src/lib/cx` for conditional classes   |

## README media

Screenshots and the gameplay clip are captured from the real UI. The desktop runtime is replaced by a browser mock, and gameplay comes from a recorded play session of the actual Rust engine.

| Step                | Command                                                     |
| ------------------- | ----------------------------------------------------------- |
| 1. Record a session | `cd tools/readme && bun run record`                         |
| 2. Compress it      | `gzip -9 -f tools/readme/public/demo.json`                  |
| 3. Build replay UI  | `bunx vite build --config tools/readme/demo.vite.config.ts` |
| 4. Capture media    | `cd tools/readme && bun install && node capture.mjs`        |

| Output        | Path                       |
| ------------- | -------------------------- |
| Screenshots   | `docs/screenshots/*.png`   |
| Gameplay loop | `docs/clips/gameplay.gif`  |
| Full clip     | `docs/clips/gameplay.webm` |
