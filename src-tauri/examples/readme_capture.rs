//! Records a deterministic play session of the real game engine for README media.
//!
//! Run with:
//!   cargo run --release --example readme_capture --manifest-path src-tauri/Cargo.toml -- <out.json>

use std::env;
use std::fs;
use std::path::PathBuf;
use std::time::Duration;

use serde::Serialize;

use rstris_lib::db::scores::ScoreEntry;
use rstris_lib::game::board::{Board, HEIGHT, WIDTH};
use rstris_lib::game::engine::ActivePiece;
use rstris_lib::game::{Game, GameConfig, InputAction, Rotation, Snapshot, Tetromino};
use rstris_lib::meta::game_meta;
use rstris_lib::settings::Settings;

const STEP_MS: u64 = 4;
const MIN_EMIT_MS: i64 = 16;
const ACTION_INTERVAL_MS: i64 = 26;
const THINK_MIN_MS: i64 = 100;
const THINK_MAX_MS: i64 = 260;
const SESSION_MS: i64 = 48_000;
const SEED: u64 = 0x5253_5452_4953;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Frame {
    t_ms: u64,
    snapshot: Snapshot,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Demo {
    meta: rstris_lib::meta::GameMeta,
    settings: Settings,
    scores: Vec<ScoreEntry>,
    frames: Vec<Frame>,
}

struct Rng(u64);

impl Rng {
    fn next(&mut self) -> u64 {
        // xorshift64*
        let mut x = self.0;
        x ^= x >> 12;
        x ^= x << 25;
        x ^= x >> 27;
        self.0 = x;
        x.wrapping_mul(0x2545_F491_4F6C_DD1D)
    }

    fn range(&mut self, min: i64, max: i64) -> i64 {
        if max <= min {
            return min;
        }
        min + (self.next() % (max - min) as u64) as i64
    }
}

/// Resting position reached by dropping `kind` at `x` in `rotation`.
fn landing(
    board: &Board,
    kind: Tetromino,
    rotation: Rotation,
    x: i32,
) -> Option<(i32, [(i32, i32); 4])> {
    let shape = kind.cells(rotation);
    let place = |y: i32| shape.map(|(cx, cy)| (x + cx, y + cy));
    let mut y = -3;
    while y <= HEIGHT as i32 && !board.fits(&place(y)) {
        y += 1;
    }
    if y > HEIGHT as i32 {
        return None;
    }
    while board.fits(&place(y + 1)) {
        y += 1;
    }
    Some((y, place(y)))
}

/// El-Tetris style heuristic: higher is better.
fn score_position(
    board: &Board,
    kind: Tetromino,
    cells: &[(i32, i32); 4],
    landing_height: f64,
) -> f64 {
    let mut next = board.clone();
    next.fill(cells, kind);
    let full = next.full_rows();
    let lines = full.len() as f64;
    next.clear_rows(&full);

    let rows = next.rows();
    let mut heights = [0f64; WIDTH];
    let mut holes = 0.0;
    for (y, row) in rows.iter().enumerate() {
        for (x, cell) in row.iter().enumerate() {
            if cell.is_some() {
                heights[x] = (HEIGHT - y) as f64;
            } else if heights[x] > 0.0 {
                holes += 1.0;
            }
        }
    }
    let aggregate_height: f64 = heights.iter().sum();
    let bumpiness: f64 = heights
        .windows(2)
        .map(|pair| (pair[1] - pair[0]).abs())
        .sum();

    -0.510_066 * aggregate_height + 0.760_666 * lines
        - 0.356_63 * holes
        - 0.184_483 * bumpiness
        - 0.6 * landing_height
}

fn choose_move(game: &Game, piece: &ActivePiece) -> (Rotation, i32) {
    let board = game.board();
    let rotations: &[Rotation] = if piece.kind == Tetromino::O {
        &[Rotation::Spawn]
    } else {
        &Rotation::ALL
    };
    let mut best: Option<(f64, Rotation, i32)> = None;
    for &rotation in rotations {
        for x in -3..(WIDTH as i32 + 3) {
            let Some((_, cells)) = landing(board, piece.kind, rotation, x) else {
                continue;
            };
            let bottom = cells.iter().map(|&(_, cy)| cy).max().unwrap_or(0);
            let landing_height = (HEIGHT as f64) - (bottom + 1) as f64;
            let value = score_position(board, piece.kind, &cells, landing_height);
            if best.is_none_or(|(best_value, _, _)| value > best_value + f64::EPSILON) {
                best = Some((value, rotation, x));
            }
        }
    }
    best.map(|(_, rotation, x)| (rotation, x))
        .unwrap_or((piece.rotation, piece.x))
}

fn demo_settings() -> Settings {
    Settings {
        player_name: "Player".to_string(),
        start_level: 1,
        ghost_piece: true,
        hold_enabled: true,
        popups_enabled: true,
        next_count: 5,
        ..Settings::default()
    }
}

fn demo_scores() -> Vec<ScoreEntry> {
    let rows = [
        ("NEO", 184_320u64, 12, 96, 4_182_000u64, 618, 7, 9, 2),
        ("ADA", 121_540, 10, 74, 3_204_000, 502, 5, 4, 1),
        ("RIPLEY", 98_760, 9, 61, 2_688_000, 441, 3, 3, 0),
        ("VOLT", 76_210, 8, 52, 2_140_000, 389, 2, 2, 0),
        ("MIRA", 54_980, 7, 44, 1_802_000, 341, 2, 1, 0),
        ("KAI", 38_400, 6, 37, 1_505_000, 295, 1, 1, 0),
        ("JUNO", 27_150, 5, 31, 1_286_000, 254, 1, 0, 0),
        ("ORION", 19_870, 4, 26, 1_072_000, 216, 0, 0, 0),
        ("SABLE", 12_640, 3, 21, 902_000, 180, 0, 0, 0),
        ("ECHO", 7_310, 2, 15, 688_000, 133, 0, 0, 0),
    ];
    rows.iter()
        .enumerate()
        .map(
            |(
                index,
                &(name, score, level, lines, duration_ms, pieces, tetrises, tspins, perfect_clears),
            )| {
                ScoreEntry {
                    id: (rows.len() - index) as i64,
                    name: name.to_string(),
                    score,
                    level,
                    lines,
                    start_level: 1,
                    duration_ms,
                    pieces,
                    max_combo: tetrises + tspins + 1,
                    tetrises,
                    tspins,
                    perfect_clears,
                    played_at: format!(
                        "2026-0{}-{:02}T1{}:{:02}:00.000Z",
                        (index % 8) + 1,
                        (index * 3) % 27 + 1,
                        index % 10,
                        (index * 7) % 60
                    ),
                }
            },
        )
        .collect()
}

fn main() {
    let out = env::args()
        .nth(1)
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("tools/readme/public/demo.json"));

    let config = GameConfig {
        seed: Some(SEED),
        ..GameConfig::default()
    };
    let mut game = Game::new(config);
    let mut rng = Rng(SEED ^ 0x9E37_79B9_7F4A_7C15);

    let mut frames: Vec<Frame> = Vec::new();
    let mut emitted_version = 0u64;
    let mut last_emit: i64 = -MIN_EMIT_MS;
    let mut t: i64 = 0;
    let mut next_action_at: i64 = 0;
    let mut plan: Option<(Rotation, i32)> = None;
    let mut planned_piece: Option<u32> = None;
    let mut plan_started_at: i64 = 0;

    while t < SESSION_MS {
        game.update(Duration::from_millis(STEP_MS));

        if game.is_over() {
            break;
        }

        // Plan once per spawned piece, after a short human-like pause.
        match game.active() {
            None => {
                plan = None;
                planned_piece = None;
            }
            Some(piece) => {
                let piece_id = game.summary().pieces;
                if planned_piece != Some(piece_id) {
                    planned_piece = Some(piece_id);
                    plan = Some(choose_move(&game, &piece));
                    plan_started_at = t;
                    next_action_at = t + rng.range(THINK_MIN_MS, THINK_MAX_MS);
                }
            }
        }

        // Execute the plan one input at a time so the piece visibly travels.
        if t >= next_action_at
            && let Some((target_rotation, target_x)) = plan
            && let Some(piece) = game.active()
        {
            if t - plan_started_at > 1600 {
                // Give up on an unreachable target so the demo keeps moving.
                game.apply(InputAction::HardDrop);
                plan = None;
                next_action_at = t + ACTION_INTERVAL_MS;
            } else if piece.rotation != target_rotation {
                game.apply(InputAction::RotateCw);
                next_action_at = t + ACTION_INTERVAL_MS;
            } else if piece.x < target_x {
                game.apply(InputAction::RightPress);
                game.apply(InputAction::RightRelease);
                next_action_at = t + ACTION_INTERVAL_MS;
            } else if piece.x > target_x {
                game.apply(InputAction::LeftPress);
                game.apply(InputAction::LeftRelease);
                next_action_at = t + ACTION_INTERVAL_MS;
            } else {
                game.apply(InputAction::HardDrop);
                plan = None;
                next_action_at = t + ACTION_INTERVAL_MS;
            }
        }

        if game.version() != emitted_version && (game.has_events() || t - last_emit >= MIN_EMIT_MS)
        {
            emitted_version = game.version();
            last_emit = t;
            frames.push(Frame {
                t_ms: t as u64,
                snapshot: game.snapshot(),
            });
        }

        t += STEP_MS as i64;
    }

    let demo = Demo {
        meta: game_meta(),
        settings: demo_settings(),
        scores: demo_scores(),
        frames,
    };

    let json = serde_json::to_string(&demo).expect("serialize demo");
    if let Some(parent) = out.parent() {
        fs::create_dir_all(parent).expect("create output dir");
    }
    fs::write(&out, json).expect("write demo json");

    let last = demo_last_summary(&demo);
    println!("wrote {} frames to {}", demo.frames.len(), out.display());
    println!("{last}");
}

fn demo_last_summary(demo: &Demo) -> String {
    match demo.frames.last() {
        Some(frame) => format!(
            "end: {}ms score={} level={} lines={}",
            frame.t_ms, frame.snapshot.score, frame.snapshot.level, frame.snapshot.lines
        ),
        None => "no frames".to_string(),
    }
}
