use serde::{Deserialize, Serialize};

use super::engine::Phase;
use super::piece::Tetromino;
use super::scoring::ClearResult;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(
    tag = "type",
    rename_all = "snake_case",
    rename_all_fields = "camelCase"
)]
pub enum GameEvent {
    Move,
    Rotate,
    SoftDrop,
    HardDrop { distance: u32 },
    Lock,
    Hold,
    LineClear { result: ClearResult },
    LevelUp { level: u32 },
    GameOver,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PieceView {
    pub kind: Tetromino,
    pub cells: [[i32; 2]; 4],
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub version: u64,
    pub board_version: u64,
    /// Flat row-major visible cells: one byte per cell, 0 empty, 1..=7 tetromino.
    pub board: Vec<u8>,
    pub active: Option<PieceView>,
    pub ghost: Option<[[i32; 2]; 4]>,
    pub hold: Option<Tetromino>,
    pub hold_available: bool,
    pub next: Vec<Tetromino>,
    pub score: u64,
    pub level: u32,
    pub lines: u32,
    pub lines_to_next_level: u32,
    pub combo: i32,
    pub back_to_back: bool,
    pub phase: Phase,
    pub paused: bool,
    pub countdown_ms: Option<u64>,
    pub elapsed_ms: u64,
    pub pieces: u32,
    pub gravity_ms: u64,
    pub lock_progress: f32,
    pub last_clear: Option<ClearResult>,
    pub events: Vec<GameEvent>,
}
