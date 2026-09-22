# rstris

Tetris. Rust engine + SQLite persistence (Tauri 2), React 19 + canvas frontend.

## Stack

| Layer | Value |
|---|---|
| Engine, scoring, DAS/ARR, persistence | Rust (`src-tauri/src`) |
| Storage | SQLite via `rusqlite` (bundled) + `rusqlite_migration` |
| Shell | Tauri 2 |
| UI | React 19, TypeScript, Vite, HTML canvas |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`) |
| Package manager | bun |

## Commands

```sh
bun install                      # frontend deps
bun tauri dev                    # run app (hot reload)
bun tauri build                  # bundle release app
bun run typecheck                # tsc
cargo test --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets
```

## Features

| Feature | Value |
|---|---|
| Rotation | SRS with wall kicks, 180° rotation |
| Randomizer | 7-bag |
| Scoring | Guideline: singles–tetris, T-spin / mini, back-to-back ×1.5, combos, perfect clears, soft/hard drop |
| Levels | 1–30, 10 lines per level, guideline gravity curve, selectable start level |
| Handling | DAS, ARR, soft drop factor, lock delay (15 move resets), hold, ghost, next queue (0–6) |
| High scores | Top 10 with name entry, per-game stats (time, pieces, tetrises, T-spins) |
| Stats | Aggregates over all games |
| Settings | Persisted, live-applied, rebindable keys (2 per action) |
| Audio | Synthesized Web Audio SFX, volume + toggle |

## Default keys

| Action | Keys |
|---|---|
| Move | ← → |
| Soft drop | ↓ |
| Hard drop | Space |
| Rotate CW | ↑, X |
| Rotate CCW | Z, L Ctrl |
| Rotate 180° | A |
| Hold | C, L Shift |
| Pause | Esc, P |

## Persistence

| Item | Value |
|---|---|
| File | `<app data dir>/rstris.sqlite3` (macOS: `~/Library/Application Support/com.fredrir.rstris/`) |
| Tables | `settings` (json blob), `scores` (one row per finished game) |
| Migrations | `src-tauri/src/db/mod.rs`, tracked with `PRAGMA user_version` |
| Path shown in app | Settings screen footer |

## Layout

| Path | Value |
|---|---|
| `src-tauri/src/game/` | `piece` (shapes, kicks), `board`, `bag`, `scoring`, `input` (DAS/ARR), `engine`, `snapshot` |
| `src-tauri/src/db/` | `scores`, `settings`, `stats` |
| `src-tauri/src/commands.rs` | Tauri IPC commands |
| `src-tauri/src/game_loop.rs` | 250 Hz update thread, emits `game-state` events |
| `src-tauri/tests/` | Mirrors `src/` modules |
| `src/lib/` | `types`, `ipc`, `keys`, `audio`, `render`, `format` |
| `src/components/` | Screens and overlays |
| `src/styles.css` | Tailwind entry: `@theme` tokens, keyframes, base layer |

## Styling

| Item | Value |
|---|---|
| Engine | Tailwind CSS 4 |
| Vite plugin | `@tailwindcss/vite` in `vite.config.ts` |
| Entry | `src/styles.css` → `@import "tailwindcss"` |
| Tokens | `@theme`: `--color-*`, `--font-*`, `--animate-*` |
| Components | Utility classes inline in JSX; shared strings for repeated patterns |
